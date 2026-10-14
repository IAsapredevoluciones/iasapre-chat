// Panel de revisión del canal WhatsApp: conversaciones guardadas, cada respuesta del asistente y el registro
// de eventos (qué llegó, de quién, qué se hizo). Protegido con autenticación básica del navegador: usuario PANEL_USUARIO
// (por defecto "iasapre") y contraseña PANEL_SECRET; si no existe, vale ASIGNAR_SECRET. Sin ninguna de las dos responde 503.
// URL: https://iasapre-chat.netlify.app/.netlify/functions/panel  (?tel=569…  detalle · ?eventos=1  registro)
// Contiene datos de salud: nunca se indexa, no se cachea y no se envía a terceros.
const crypto = require("crypto");
const { fmtCL } = require("./prompt_whatsapp.js");
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hora = (t) => { try { const d = typeof t === "number" ? new Date(t) : new Date(String(t)); return isNaN(d) ? String(t || "") : d.toLocaleString("es-CL", { timeZone: "America/Santiago", hour12: false }); } catch (e) { return String(t || ""); } };
const igual = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
/** Contraseña del panel: PANEL_SECRET; si no está, se usa ASIGNAR_SECRET (ya cargado en Netlify) para no depender de otra variable. */
const clave = (env) => env.PANEL_SECRET || env.ASIGNAR_SECRET || "";
const HEAD = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };
const CSS = "body{font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;margin:0;background:#f4f8ff;color:#0d1421;font-size:16px}header{background:#2f5fd8;color:#fff;padding:12px 16px;display:flex;gap:16px;align-items:center;flex-wrap:wrap}header a{color:#fff;text-decoration:none;font-weight:600}main{padding:12px 16px;max-width:980px;margin:0 auto}table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid #e6edf8;vertical-align:top}th{background:#eef3ff;font-size:14px}tr:hover td{background:#fafcff}.b{display:inline-block;padding:2px 8px;border-radius:999px;font-size:13px;background:#e6edf8}.b.der{background:#e96f9a;color:#fff}.b.ok{background:#69cbc1;color:#0d1421}.b.no{background:#ffd9d9}.chat{display:flex;flex-direction:column;gap:8px}.m{max-width:80%;padding:10px 12px;border-radius:14px;white-space:pre-wrap;line-height:1.35}.u{align-self:flex-end;background:#d9fdd3;border-bottom-right-radius:4px}.a{align-self:flex-start;background:#fff;border-bottom-left-radius:4px;border:1px solid #e6edf8}.t{font-size:12px;color:#667;margin-top:4px}.box{background:#fff;border-radius:12px;padding:12px 14px;margin-bottom:12px;border:1px solid #e6edf8}small{color:#667}@media(max-width:600px){th:nth-child(4),td:nth-child(4){display:none}}";
const pagina = (titulo, cuerpo) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(titulo)} · IAsapre</title><style>${CSS}</style></head><body><header><a href="?">Conversaciones</a><a href="?eventos=1">Eventos</a><a href="?asignar=1">Asignar leads</a><small style="color:#dfe8ff">Asistente WhatsApp +56 9 5373 0030 </small></header><main>${cuerpo}</main></body></html>`;

function noAutorizado() { return { statusCode: 401, headers: { ...HEAD, "WWW-Authenticate": 'Basic realm="Panel IAsapre", charset="UTF-8"' }, body: pagina("Acceso", "<div class=box>Necesitas usuario y contraseña del panel.</div>") }; }

function autorizado(event, env) {
  const h = (event.headers && (event.headers.authorization || event.headers.Authorization)) || "";
  const m = /^Basic (.+)$/.exec(h); if (!m) return false;
  let dec = ""; try { dec = Buffer.from(m[1], "base64").toString("utf8"); } catch (e) { return false; }
  const i = dec.indexOf(":"); if (i < 0) return false;
  return igual(dec.slice(0, i), env.PANEL_USUARIO || "iasapre") && igual(dec.slice(i + 1), clave(env));
}

/** Conversación con la persona esperando respuesta (último turno suyo, o último envío del bot fallido) y no derivada. */
const pendiente = (c) => { const h = c.historial || [], u = h[h.length - 1]; return !!(u && !c.derivado && (u.role === "user" || u.enviado === false)); };
const btnRetomar = (c, aviso) => `<form method="post" action="?tel=${esc(c.telefono)}" style="display:inline"><input type="hidden" name="accion" value="retomar"><button class="b" style="cursor:pointer;border:0;background:#2f5fd8;color:#fff">${aviso ? "Retomar (responder ahora)" : "Retomar"}</button></form>`;

function vistaLista(convs, msg) {
  const filas = convs.map((c) => { const L = c.lead || {}; const ult = c.historial && c.historial.length ? c.historial[c.historial.length - 1] : null; const pend = pendiente(c);
    return `<tr${pend ? ' style="background:#fff7e6"' : ""}><td><a href="?tel=${esc(c.telefono)}"><b>${esc(L.nombre || c.nombrePerfil || "Sin nombre")}</b></a><br><small>${esc(fmtCL(c.telefono) || c.telefono)}</small></td><td>${c.derivado ? '<span class="b der">derivada</span>' : pend ? '<span class="b no">sin responder</span> ' + btnRetomar(c) : '<span class="b">en asesoría</span>'}${L.leadId ? ' <span class="b">lead</span>' : ""}${c.asignaciones ? ` <small>${c.asignaciones} asig.</small>` : ""}</td><td>${(c.historial || []).length} turnos<br><small>${esc(hora(c.actualizado || c.creado))}</small></td><td><small>${esc(ult ? (ult.role === "assistant" ? "Bot: " : "Persona: ") + String(ult.content || "").slice(0, 90) : "")}</small></td></tr>`; }).join("");
  const der = convs.filter((c) => c.derivado).length, pend = convs.filter(pendiente).length;
  return pagina("Conversaciones", `${msg ? `<div class=box>${esc(msg)}</div>` : ""}<div class=box><b>${convs.length}</b> conversaciones · <b>${der}</b> derivadas · <b>${pend}</b> sin responder · ${convs.filter((c) => c.lead && c.lead.leadId).length} con lead de la plataforma. <small>Se guardan los últimos 80 turnos por persona. "Retomar" responde al mensaje pendiente (o reabre con la plantilla si pasaron más de 24 h). Para repetir una prueba, el especialista escribe <code>#reiniciar</code> al asistente.</small></div><table><tr><th>Persona</th><th>Estado</th><th>Actividad</th><th>Último mensaje</th></tr>${filas || '<tr><td colspan=4>Aún no hay conversaciones.</td></tr>'}</table>`);
}

function vistaDetalle(c, msg) {
  const L = c.lead || {};
  const datos = [["Nombre", L.nombre || c.nombrePerfil], ["Teléfono", fmtCL(c.telefono) || c.telefono], ["Lead", L.leadId ? `<a href="https://app.iasapre.cl/?lead=${esc(L.leadId)}">${esc(L.leadId)}</a>` : "sin asignación (escribió por su cuenta)"], ["Renta (form.)", L.renta], ["Región (form.)", L.region], ["Clínica (form.)", L.clinica], ["Cargas (form.)", L.cargas], ["Estado", c.derivado ? `DERIVADA el ${esc(c.derivadoEn || "")}` : "en asesoría"], ["Creada", hora(c.creado)], ["Última actividad", hora(c.actualizado)]]
    .filter(([, v]) => v).map(([k, v]) => `<div><small>${esc(k)}:</small> ${k === "Lead" ? v : esc(v)}</div>`).join("");
  const msgs = (c.historial || []).map((h) => `<div class="m ${h.role === "assistant" ? "a" : "u"}">${esc(h.content)}<div class=t>${h.role === "assistant" ? "Asistente" : "Persona"}${h.audio ? " · 🎙️ audio transcrito" : ""}${h.enviado === false ? " · <b>NO ENTREGADO</b>" + (h.falla ? " (" + esc(h.falla) + ")" : "") : ""} · ${esc(hora(h.t))}</div></div>`).join("");
  const nuncaRespondio = !c.derivado && (c.historial || []).length && !(c.historial || []).some((h) => h.role === "user");
  const btnReenviar = nuncaRespondio && !pendiente(c) ? `<div style="margin-top:8px"><small>La persona aún no responde.</small> <form method="post" action="?tel=${esc(c.telefono)}" style="display:inline"><input type="hidden" name="accion" value="reenviar"><button class="b" style="cursor:pointer;border:0;background:#2f5fd8;color:#fff">Reenviar apertura (plantilla)</button></form></div>` : "";
  return pagina(L.nombre || c.nombrePerfil || c.telefono, `${msg ? `<div class=box>${esc(msg)}</div>` : ""}<div class=box>${datos}${pendiente(c) ? `<div style="margin-top:8px"><span class="b no">sin responder</span> ${btnRetomar(c, true)}</div>` : ""}${btnReenviar}</div><div class=chat>${msgs || "<div class=box>Sin mensajes.</div>"}</div>`);
}

function vistaEventos(evs) {
  const filas = evs.map((e) => `<tr><td><small>${esc(hora(e.t))}</small></td><td>${esc(e.canal || "")}<br><small>${esc(e.de ? (fmtCL(e.de) || e.de) : "")}${e.nombre ? " · " + esc(e.nombre) : ""}</small></td><td><span class="b ${e.tipo === "error" || e.tipo === "asignacion_invalida" || e.tipo === "asignacion_no_legible" || e.tipo === "entrega_fallida" ? "no" : e.enviado ? "ok" : ""}">${esc(e.tipo || "")}</span>${e.accion ? " " + esc(e.accion) : ""}${e.motivo ? "<br><small>" + esc(e.motivo) + "</small>" : ""}${e.derivado ? ' <span class="b der">derivó</span>' : ""}${e.lead ? `<br><small>lead → <a href="?tel=${esc(e.lead)}">${esc(fmtCL(e.lead) || e.lead)}</a></small>` : ""}${e.error ? "<br><small>" + esc(e.error) + "</small>" : ""}</td><td><small>${esc(e.clase || "")}</small></td></tr>`).join("");
  return pagina("Eventos", `<div class=box>Últimos ${evs.length} eventos del webhook y del endpoint de asignaciones (más recientes primero). Tipos: <code>conversacion</code>, <code>asignacion</code> (abierta/retomada), <code>asignacion_invalida</code>, <code>asignacion_no_legible</code> (la plataforma mandó una asignación por WhatsApp que Meta no deja leer: hay que asignarla desde aquí), <code>ignorado</code> (otro número, sin texto, duplicado), <code>audio_*</code>, <code>reinicio</code>, <code>entrega_fallida</code> (Meta no pudo entregar un mensaje del asistente), <code>error</code>.</div><table><tr><th>Cuándo</th><th>Origen</th><th>Qué pasó</th><th>Tipo msg</th></tr>${filas || '<tr><td colspan=4>Sin eventos todavía.</td></tr>'}</table>`);
}

/** Las acciones (POST) solo se aceptan desde el propio panel: bloquea formularios de otros sitios que reutilicen la sesión del navegador. */
function mismoOrigen(event) {
  const h = event.headers || {};
  // Sec-Fetch-Site lo pone el navegador y no se puede falsificar desde otra página: es la señal principal.
  // (Origin llega como "null" en el propio panel porque las páginas se sirven con Referrer-Policy: no-referrer.)
  const sfs = h["sec-fetch-site"]; if (sfs) return sfs === "same-origin" || sfs === "none";
  const o = h.origin; if (!o) return true; // clientes sin navegador (curl) con usuario y contraseña
  if (o === "null") return false;
  try { return !event.rawUrl || new URL(o).host === new URL(event.rawUrl).host; } catch (e) { return false; }
}

/** Leads pegados en el formulario: JSON (arreglo) o CSV con cabecera nombre,telefono,leadId,renta,region,clinica,cargas,contacto,… */
function leerLeads(txt) {
  txt = String(txt || "").trim(); if (!txt) return [];
  if (txt.startsWith("[")) { const a = JSON.parse(txt); return Array.isArray(a) ? a : []; }
  const [cab, ...filas] = txt.split(/\r?\n/).filter((l) => l.trim()); const cols = cab.split(",").map((c) => c.trim());
  return filas.map((f) => { const v = f.split(","); const o = {}; cols.forEach((c, i) => { o[c] = (v[i] || "").trim(); }); return o; });
}

function vistaAsignar(resultados, error) {
  const filas = (resultados || []).map((r) => `<tr><td><b>${esc(r.nombre || "?")}</b><br><small>${esc(r.telefono || "")}</small></td><td><span class="b ${r.ok ? "ok" : "no"}">${r.ok ? esc(r.accion || "ok") : "error"}</span>${r.enviado === false ? ' <span class="b no">NO ENVIADO</span>' : ""}${r.error ? "<br><small>" + esc(r.error) + "</small>" : ""}</td><td>${r.telefono ? `<a href="?tel=${esc(String(r.telefono).replace(/\D/g, ""))}">ver conversación</a>` : ""}</td></tr>`).join("");
  return pagina("Asignar leads", `${error ? `<div class=box><span class="b no">error</span> ${esc(error)}</div>` : ""}${resultados ? `<div class=box><b>${resultados.filter((r) => r.ok).length}/${resultados.length}</b> asignaciones aceptadas.</div><table><tr><th>Lead</th><th>Resultado</th><th></th></tr>${filas}</table><br>` : ""}
<div class=box><b>Asignar leads al asistente.</b> Pega un arreglo JSON o un CSV con cabecera <code>nombre,telefono,leadId,renta,region,clinica,cargas,contacto</code> (opcionales: <code>edad,isapre,comuna,preexistencias,tipo,resumen</code>). A cada lead nuevo el asistente le escribe con la plantilla aprobada; si ya conversaba, solo se actualizan sus datos. Es lo mismo que hará app.iasapre.cl con el endpoint <code>asignar</code>.</div>
<form method="post" action="?asignar=1"><input type="hidden" name="accion" value="asignar"><textarea name="leads" rows="14" style="width:100%;box-sizing:border-box;font-family:ui-monospace,monospace;font-size:14px;border-radius:12px;border:1px solid #c9d6ee;padding:10px" placeholder='[{"nombre":"Camila Rojas","telefono":"+56 9 1234 5678","leadId":"...","isapre":"Colmena"}]'></textarea><br><br><button class="b" style="cursor:pointer;border:0;background:#2f5fd8;color:#fff;font-size:16px;padding:10px 18px">Asignar y escribirles</button></form>`);
}

function crearHandler(depsOverride) {
  return async function handler(event) {
    const env = (depsOverride && depsOverride.env) || process.env;
    if (event.httpMethod !== "GET" && event.httpMethod !== "POST") return { statusCode: 405, headers: HEAD, body: "Método no permitido" };
    if (!clave(env)) return { statusCode: 503, headers: HEAD, body: pagina("Panel", "<div class=box>Falta configurar <code>PANEL_SECRET</code> (o <code>ASIGNAR_SECRET</code>) en Netlify → Environment variables, y redeployar.</div>") };
    if (!autorizado(event, env)) return noAutorizado();
    let store = depsOverride && depsOverride.store;
    if (!store) { const st = require("./store.js"); st.conectar(event); store = { listar: st.listarConvs, obtener: st.getConv, eventos: st.listarEventos }; }
    const q = event.queryStringParameters || {};
    try {
      if (event.httpMethod === "POST") { // acciones del panel: retomar una conversación sin responder, asignar leads
        if (!mismoOrigen(event)) return { statusCode: 403, headers: HEAD, body: pagina("Acción", "<div class=box>Acción rechazada: debe hacerse desde el propio panel.</div>") };
        const form = new URLSearchParams(event.body || ""); const accion = form.get("accion");
        if (accion === "asignar") {
          let leads; try { leads = leerLeads(form.get("leads")); } catch (e) { return { statusCode: 400, headers: HEAD, body: vistaAsignar(null, "No se pudo leer el JSON/CSV: " + (e && e.message)) }; }
          if (!leads.length) return { statusCode: 400, headers: HEAD, body: vistaAsignar(null, "No hay leads en el texto pegado.") };
          if (leads.length > 50) return { statusCode: 400, headers: HEAD, body: vistaAsignar(null, "Máximo 50 leads por vez.") };
          const asignar = (depsOverride && depsOverride.asignar) || (async (d) => {
            if (!env.ASIGNAR_SECRET) return { ok: false, error: "Falta ASIGNAR_SECRET en Netlify" };
            const core = require("./asignar_core.js"); // mismo flujo que el endpoint; el secreto se usa solo en el servidor
            const r = await core.crearHandler()({ ...event, httpMethod: "POST", headers: { authorization: "Bearer " + env.ASIGNAR_SECRET }, body: JSON.stringify(d) });
            let j = {}; try { j = JSON.parse(r.body || "{}"); } catch (e) {} return j;
          });
          const res = [];
          for (const d of leads) { let j = {}; try { j = await asignar(d); } catch (e) { j = { ok: false, error: String(e && e.message) }; } res.push({ nombre: d.nombre, telefono: d.telefono, ok: !!j.ok, accion: j.accion, enviado: j.enviado, error: j.error || (j.ok ? "" : j.tipo) }); }
          console.log("panel asignar", JSON.stringify({ n: res.length, ok: res.filter((r) => r.ok).length })); // sin datos personales
          return { statusCode: 200, headers: HEAD, body: vistaAsignar(res) };
        }
        if (!["retomar", "reenviar"].includes(accion) || !q.tel) return { statusCode: 400, headers: HEAD, body: pagina("Acción", "<div class=box>Acción no reconocida. <a href='?'>Volver</a></div>") };
        const retomar = (depsOverride && depsOverride.retomar) || (async (tel, op) => { const A = require("./wsp_agent.js"); return A.retomar(tel, A.depsReales(event), op); });
        const r = await retomar(q.tel, accion === "reenviar" ? { reenviarApertura: true } : undefined);
        const texto = { retomada: "Respondido: el asistente contestó el mensaje pendiente.", reabierta: accion === "reenviar" ? "Apertura reenviada con la plantilla. Si Meta no la entrega, aparecerá como NO ENTREGADO aquí y en Eventos en unos segundos." : "Reabierta: pasaron más de 24 h, se envió la plantilla de apertura.", ya_derivada: "No se retoma: la conversación ya fue derivada al especialista.", sin_pendiente: "No había mensaje pendiente.", sin_conversacion: "No existe esa conversación.", ventana_cerrada_sin_plantilla: "Pasaron más de 24 h y no hay plantilla configurada (WSP_TEMPLATE_INICIO).", rechazo: "El modelo rechazó responder; revisa el caso.", error: "Error al responder: " + (r.error || "") }[r.tipo] || r.tipo;
        const c = await store.obtener(q.tel);
        return { statusCode: 200, headers: HEAD, body: c ? vistaDetalle(c, texto + (r.enviado === false ? " (el envío por WhatsApp falló)" : "")) : vistaLista(await store.listar(), texto) };
      }
      if (q.tel) { const c = await store.obtener(q.tel); return { statusCode: c ? 200 : 404, headers: HEAD, body: c ? vistaDetalle(c) : pagina("No encontrada", "<div class=box>No hay conversación con ese número. <a href='?'>Volver</a></div>") }; }
      if (q.asignar) return { statusCode: 200, headers: HEAD, body: vistaAsignar() };
      if (q.eventos) return { statusCode: 200, headers: HEAD, body: vistaEventos(await store.eventos(Math.min(Number(q.n) || 150, 500))) };
      return { statusCode: 200, headers: HEAD, body: vistaLista(await store.listar()) };
    } catch (e) { console.error("panel", e && e.message); return { statusCode: 500, headers: HEAD, body: pagina("Error", "<div class=box>Error al leer el almacén.</div>") }; }
  };
}

module.exports = { crearHandler, autorizado, vistaLista, vistaDetalle, vistaEventos, vistaAsignar, leerLeads, mismoOrigen, esc, pendiente };
