// Netlify Function: asignar — recibe asignaciones de leads por HTTP desde app.iasapre.cl (alternativa al mensaje de WhatsApp,
// porque dos números de la API de WhatsApp no pueden escribirse entre sí). Protegida con el secreto ASIGNAR_SECRET.
// POST /.netlify/functions/asignar  · header: Authorization: Bearer <ASIGNAR_SECRET>
// body JSON: { "texto": "<asignación con el formato de la sección 1.2>" }  o bien
//            { "nombre", "telefono", "leadId", "renta", "region", "clinica", "cargas", "contacto" }
// Responde 200 {ok, tipo, accion, enviado}. La lógica es la misma que para una asignación recibida por WhatsApp (lib/wsp_agent.js).
const { NUMEROS } = require("./lib/prompt_whatsapp.js");
const { manejarEntrante, crearNotificador, claudeHTTP } = require("./lib/wsp_agent.js");
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" };
const json = (statusCode, body) => ({ statusCode, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** Convierte campos sueltos al texto con el formato oficial de asignación (sección 1.2 del rol). */
function textoAsignacion(d) {
  const tel = String(d.telefono || "").replace(/\D/g, "");
  return ["Hola Asesoría IAsapre, tienes un nuevo lead asignado para gestión.", String(d.nombre || "Sin nombre").trim(),
    `Renta imponible: ${d.renta || "No informado"}`, `Región: ${d.region || "No informado"}`, `Clínica de preferencia: ${d.clinica || "No informado"}`,
    `Cargas familiares: ${d.cargas || "No informado"}`, `Preferencia de contacto: ${d.contacto || "Sin definir"}`,
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
    const texto = typeof d.texto === "string" && d.texto.trim() ? d.texto : textoAsignacion(d);
    if (!/wa\.me\/\d{9,12}/.test(texto)) return json(400, { error: "Falta el teléfono del lead (telefono o link wa.me)" });
    let deps = depsOverride;
    if (!deps) {
      const wsp = require("./lib/wsp_api.js"), store = require("./lib/store.js"); store.conectar(event);
      deps = { store: { get: store.getConv, set: store.setConv }, enviarTexto: wsp.enviarTexto, enviarPlantilla: wsp.enviarPlantilla, claude: claudeHTTP, notificarEspecialista: crearNotificador(wsp, env), plantillaInicio: env.WSP_TEMPLATE_INICIO || "" };
    }
    try {
      const r = await manejarEntrante({ from: NUMEROS.asignaciones, nombre: "Plataforma", texto }, deps);
      console.log("asignar", JSON.stringify({ tipo: r.tipo, accion: r.accion, enviado: r.enviado })); // sin datos personales
      return json(r.tipo === "asignacion" ? 200 : 422, { ok: r.tipo === "asignacion", tipo: r.tipo, accion: r.accion, enviado: r.enviado });
    } catch (e) { console.error("asignar", e && e.message); return json(500, { error: "Error al procesar la asignación" }); }
  };
}
exports.handler = crearHandler();
exports.crearHandler = crearHandler; exports.textoAsignacion = textoAsignacion;
