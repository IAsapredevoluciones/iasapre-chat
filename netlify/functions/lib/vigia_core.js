// Vigía del canal WhatsApp (función programada cada 10 min, netlify/functions/vigia.js):
// 1) Verifica que el token y el número sirvan para enviar (si no, deja un aviso rojo en el panel y un evento "alerta").
// 2) Retoma automáticamente las conversaciones con un mensaje de la persona sin responder (o un envío fallido)
//    dentro de la ventana de 24 h, para que el asistente nunca quede callado por una falla puntual.
// 3) Avisa en el panel si Meta lleva horas sin enviar mensajes al webhook habiendo conversaciones activas.
const VENTANA = 23.5 * 3600 * 1000, ESPERA = 90 * 1000, MAX_POR_VUELTA = 20;

const VENTANA_APERTURA = 7 * 24 * 3600 * 1000; // aperturas que no salieron (p. ej. WhatsApp caído): se reintentan con plantilla hasta 7 días
const MAX_APERTURAS = 3, ESPERA_APERTURA = 3 * 3600 * 1000; // máximo 3 intentos, separados por 3 h (131026 = número sin WhatsApp: no insistir cada 10 min)

/** Momento desde el que la conversación espera algo del asistente, o null. Las aperturas fallidas (sin respuesta de la persona) cuentan. */
function pendienteDe(c) {
  const h = c.historial || [], u = h[h.length - 1]; if (!u) return null;
  if (u.role === "user") return u.t || 0;
  if (!c.derivado && u.enviado === false) { const uu = [...h].reverse().find((x) => x.role === "user"); return uu ? uu.t || 0 : null; }
  return null;
}
function aperturaFallida(c) {
  const h = c.historial || [], u = h[h.length - 1];
  if (!(!c.derivado && u && u.role === "assistant" && u.enviado === false && !h.some((x) => x.role === "user"))) return null;
  return h.filter((x) => x.role === "assistant" && x.enviado === false).length >= MAX_APERTURAS ? null : u.t || 0;
}

async function ejecutar(deps, ahora) {
  ahora = ahora || Date.now();
  const previo = (await deps.getEstado("salud").catch(() => null)) || {};
  const conexion = await deps.verificarConexion();
  const salud = { revisado: new Date(ahora).toISOString(), conexion, retomadas: 0, caidaDesde: null, sinWebhookDesde: null };
  if (!conexion.ok) {
    salud.caidaDesde = previo.conexion && previo.conexion.ok === false ? previo.caidaDesde || previo.revisado : salud.revisado;
    if (!(previo.conexion && previo.conexion.ok === false)) await deps.registrarEvento({ canal: "vigia", tipo: "alerta", error: "WhatsApp desconectado: " + conexion.error }).catch(() => {});
    await deps.setEstado("salud", salud);
    return salud; // sin conexión no se puede retomar nada
  }
  if (previo.conexion && previo.conexion.ok === false) await deps.registrarEvento({ canal: "vigia", tipo: "reconectado", error: "" }).catch(() => {});
  const convs = await deps.listarConvs();
  const pendientes = convs.map((c) => { const t = pendienteDe(c); if (t != null) return { c, t, max: VENTANA }; const ta = aperturaFallida(c); return ta != null ? { c, t: ta, max: VENTANA_APERTURA, espera: ESPERA_APERTURA } : null; })
    .filter((x) => x && ahora - x.t > (x.espera || ESPERA) && ahora - x.t < x.max).sort((a, b) => a.t - b.t).slice(0, MAX_POR_VUELTA);
  for (const { c } of pendientes) {
    let r; try { r = await deps.retomar(c.telefono); } catch (e) { r = { tipo: "error", error: String(e && e.message) }; }
    if (r && (r.tipo === "retomada" || r.tipo === "reabierta")) salud.retomadas++;
    await deps.registrarEvento({ canal: "vigia", tipo: "retomada_auto", accion: r && r.tipo, enviado: r && r.enviado, de: c.telefono, error: r && r.error }).catch(() => {});
  }
  // Resúmenes de derivación en cola con el formato antiguo: se rehacen (hasta 4 por vuelta, en paralelo) antes de entregárselos al especialista
  if (deps.rehacerResumen && deps.resumenAntiguo) {
    const viejos = convs.filter(deps.resumenAntiguo).slice(0, 6);
    const rs = await Promise.allSettled(viejos.map((c) => deps.rehacerResumen(c.telefono)));
    salud.resumenesRehechos = rs.filter((x) => x.status === "fulfilled" && x.value).length;
  }
  // Si el especialista le escribió al asistente en las últimas 23 h, los avisos en cola (ya completos) se le mandan como texto sin esperar
  if (deps.ventanaEspecialista && deps.entregarAvisos) {
    try { if (await deps.ventanaEspecialista(ahora)) { const e = await deps.entregarAvisos(); salud.avisosEntregados = e.n; if (e.n) await deps.registrarEvento({ canal: "vigia", tipo: "avisos_entregados", accion: String(e.n) }).catch(() => {}); } } catch (e) { console.error("vigia avisos", e && e.message); }
  }
  // ¿Meta dejó de enviar? Última actividad de una persona vs. conversaciones activas en las últimas 24 h
  const ultUser = Math.max(0, ...convs.map((c) => { const u = [...(c.historial || [])].reverse().find((x) => x.role === "user"); return u ? u.t || 0 : 0; }));
  const ultBot = Math.max(0, ...convs.map((c) => { const u = [...(c.historial || [])].reverse().find((x) => x.role === "assistant"); return u ? u.t || 0 : 0; }));
  if (ultBot && ahora - ultBot < 24 * 3600 * 1000 && ultUser && ahora - ultUser > 6 * 3600 * 1000) salud.sinWebhookDesde = new Date(ultUser).toISOString();
  await deps.setEstado("salud", salud);
  return salud;
}

const ESP = () => String(process.env.WSP_ESPECIALISTA || require("./prompt_whatsapp.js").NUMEROS.especialista).replace(/\D/g, "");
function depsReales() {
  const st = require("./store.js"), wsp = require("./wsp_api.js"), A = require("./wsp_agent.js");
  st.conectar({ moderno: true });
  return { getEstado: st.getEstado, setEstado: st.setEstado, registrarEvento: st.registrarEvento, listarConvs: st.listarConvs, verificarConexion: wsp.verificarConexion,
    retomar: (tel) => A.retomar(tel, A.depsReales({ moderno: true })), rehacerResumen: (tel) => A.rehacerResumen(tel, A.depsReales({ moderno: true })), resumenAntiguo: A.resumenAntiguo,
    ventanaEspecialista: async (ahora) => (ahora || Date.now()) - (await A.ultimoDelEspecialista(ESP())) < 23 * 3600 * 1000,
    entregarAvisos: () => A.entregarAvisos(A.depsReales({ moderno: true }), ESP(), { soloCompletos: true }) };
}

module.exports = { ejecutar, depsReales, pendienteDe, aperturaFallida, MAX_APERTURAS };
