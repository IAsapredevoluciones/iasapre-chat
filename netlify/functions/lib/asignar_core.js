// Lógica del endpoint asignar (CommonJS, testeable). La función Netlify en formato moderno está en ../asignar.js.
// Recibe asignaciones de leads por HTTP desde app.iasapre.cl (alternativa al mensaje de WhatsApp,
// porque dos números de la API de WhatsApp no pueden escribirse entre sí). Protegida con el secreto ASIGNAR_SECRET.
// POST /.netlify/functions/asignar  · header: Authorization: Bearer <ASIGNAR_SECRET>
// body JSON: { "texto": "<asignación con el formato de la sección 1.2>" }  o bien
//            { "nombre", "telefono", "leadId", "renta", "region", "clinica", "cargas", "contacto", +opcionales "edad", "isapre", "comuna", "preexistencias", "tipo", "resumen" }
//            o { "reiniciar": "<teléfono>" } para borrar la conversación guardada de ese número (pruebas).
// Responde 200 {ok, tipo, accion, enviado}. La lógica es la misma que para una asignación recibida por WhatsApp (lib/wsp_agent.js).
const { NUMEROS } = require("./prompt_whatsapp.js");
const { manejarEntrante, crearNotificador, claudeHTTP } = require("./wsp_agent.js");
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" };
const json = (statusCode, body) => ({ statusCode, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** Convierte campos sueltos al texto con el formato oficial de asignación (sección 1.2 del rol). */
function textoAsignacion(d) {
  const tel = String(d.telefono || "").replace(/\D/g, "");
  return ["Hola Asesoría IAsapre, tienes un nuevo lead asignado para gestión.", String(d.nombre || "Sin nombre").trim(),
    `Renta imponible: ${d.renta || "No informado"}`, `Región: ${d.region || "No informado"}`, `Clínica de preferencia: ${d.clinica || "No informado"}`,
    `Cargas familiares: ${d.cargas || "No informado"}`, `Preferencia de contacto: ${d.contacto || "Sin definir"}`,
    ...(d.edad ? [`Edad: ${d.edad}`] : []), ...(d.isapre ? [`Isapre actual: ${d.isapre}`] : []), ...(d.comuna ? [`Comuna: ${d.comuna}`] : []),
    ...(d.preexistencias ? [`Preexistencias: ${String(d.preexistencias).replace(/\s+/g, " ")}`] : []), ...(d.tipo ? [`Tipo de lead: ${d.tipo}`] : []),
    ...(d.resumen ? [`Resumen del formulario: ${String(d.resumen).replace(/\s+/g, " ").slice(0, 1500)}`] : []),
    `💬 Contacto rápido: https://wa.me/${tel}?text=${encodeURIComponent("Hola " + String(d.nombre || "").split(" ")[0])}`,
    `📋 Gestión en la plataforma: https://app.iasapre.cl/?lead=${d.leadId || ""}`].join("\n");
}

function crearHandler(depsOverride) {
  return async function handler(event) {
    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors };
    if (event.httpMethod !== "POST") return json(405, { error: "Método no permitido" });
    const env = process.env;
    if (!env.ASIGNAR_SECRET) return json(500, { error: "Falta ASIGNAR_SECRET en Netlify" });
    const auth = (event.headers && (event.headers.authorization || event.headers.Authorization)) || "";
    if (auth !== "Bearer " + env.ASIGNAR_SECRET) return json(401, { error: "No autorizado" });
    let d = {}; try { d = JSON.parse(event.body || "{}"); } catch (e) { return json(400, { error: "JSON inválido" }); }
    if (d.reiniciar) { // {reiniciar: "<teléfono>"}: borra la conversación guardada (para volver a probar un caso desde cero)
      const tel = String(d.reiniciar).replace(/\D/g, ""); if (tel.length < 9) return json(400, { error: "Teléfono inválido" });
      const store = (depsOverride && depsOverride.store) || (() => { const st = require("./store.js"); st.conectar(event); return { del: st.delConv }; })();
      await store.del(tel); console.log("asignar", JSON.stringify({ tipo: "reinicio" })); return json(200, { ok: true, tipo: "reinicio" });
    }
    const texto = typeof d.texto === "string" && d.texto.trim() ? d.texto : textoAsignacion(d);
    if (!/wa\.me\/\d{9,12}/.test(texto)) return json(400, { error: "Falta el teléfono del lead (telefono o link wa.me)" });
    let deps = depsOverride;
    if (!deps) {
      const wsp = require("./wsp_api.js"), store = require("./store.js"); store.conectar(event);
      deps = { store: { get: store.getConv, set: store.setConv, del: store.delConv }, enviarTexto: wsp.enviarTexto, enviarPlantilla: wsp.enviarPlantilla, claude: claudeHTTP, notificarEspecialista: crearNotificador(wsp, env), plantillaInicio: env.WSP_TEMPLATE_INICIO || "" };
    }
    try {
      const r = await manejarEntrante({ from: NUMEROS.asignaciones, nombre: "Plataforma", texto }, deps);
      console.log("asignar", JSON.stringify({ tipo: r.tipo, accion: r.accion, enviado: r.enviado })); // sin datos personales
      if (!depsOverride) { try { const st = require("./store.js"); await st.registrarEvento({ canal: "http", tipo: r.tipo, accion: r.accion, enviado: r.enviado, de: "app.iasapre.cl", lead: r.telefono, error: r.error }); } catch (e) {} }
      const motivo = r.enviado === false ? (/access blocked|190|401|token|session/i.test(r.error || "") ? "WhatsApp del asistente desconectado temporalmente (" + r.error + ")" : /131026|not a valid WhatsApp|incapable|undeliverable/i.test(r.error || "") ? "número inválido o sin WhatsApp (" + r.error + ")" : r.error) : undefined;
      return json(r.tipo === "asignacion" ? 200 : 422, { ok: r.tipo === "asignacion", tipo: r.tipo, accion: r.accion, enviado: r.enviado, ...(motivo ? { error: motivo, reintento_automatico: true } : {}) });
    } catch (e) { console.error("asignar", e && e.message); return json(500, { error: "Error al procesar la asignación" }); }
  };
}
module.exports = { crearHandler, textoAsignacion };
