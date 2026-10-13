// Endpoint HTTP de asignaciones (netlify/functions/asignar.js): secreto obligatorio, acepta texto o campos, misma lógica que una asignación por WhatsApp.
process.env.ASIGNAR_SECRET = "secreto-asignar";
const F = require("../netlify/functions/asignar.js");
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
function mocks() { const mem = new Map(), enviados = [], plantillas = []; return { mem, enviados, plantillas, deps: { store: { get: async (k) => mem.get(k) || null, set: async (k, v) => { mem.set(k, v); } },
  enviarTexto: async (to, body) => { enviados.push({ to, body }); return { ok: true }; }, enviarPlantilla: async (to, nombre, params) => { plantillas.push({ to, nombre, params }); return { ok: true }; },
  claude: async () => ({ stop_reason: "end_turn", content: [{ type: "text", text: "Hola Camila! ¿Cómo estás? Te escribe el asistente de IAsapre porque pediste asesoría; es gratis. ¿Estás en Isapre o Fonasa?" }] }),
  notificarEspecialista: async () => [], plantillaInicio: "" } }; }
(async () => {
  const M = mocks(); const H = F.crearHandler(M.deps);
  let r = await H({ httpMethod: "POST", headers: {}, body: JSON.stringify({ nombre: "Camila Rojas", telefono: "+56 9 9015 6640", leadId: "L-77" }) });
  ok(r.statusCode === 401, "sin secreto → 401");
  r = await H({ httpMethod: "POST", headers: { authorization: "Bearer otro" }, body: "{}" }); ok(r.statusCode === 401, "secreto incorrecto → 401");
  r = await H({ httpMethod: "POST", headers: { authorization: "Bearer secreto-asignar" }, body: JSON.stringify({ nombre: "Camila Rojas", telefono: "+56 9 9015 6640", leadId: "L-77", renta: "$1.900.000", region: "RM", clinica: "Clínica Alemana", cargas: "Sí, 1", contacto: "WhatsApp" }) });
  const b = JSON.parse(r.body);
  ok(r.statusCode === 200 && b.ok && b.tipo === "asignacion" && b.accion === "abierta" && b.enviado, "asignación por campos → abre conversación: " + r.body);
  ok(M.enviados.length === 1 && M.enviados[0].to === "56990156640" && /asistente de IAsapre/.test(M.enviados[0].body), "mensaje de apertura al lead");
  const c = M.mem.get("56990156640"); ok(c && c.lead.nombre === "Camila Rojas" && c.lead.leadId === "L-77" && c.lead.clinica === "Clínica Alemana" && c.lead.renta === "$1.900.000", "datos del lead guardados");
  r = await H({ httpMethod: "POST", headers: { authorization: "Bearer secreto-asignar" }, body: JSON.stringify({ texto: F.textoAsignacion({ nombre: "Pedro Soto", telefono: "56955550000", leadId: "L-2" }) }) });
  ok(r.statusCode === 200 && JSON.parse(r.body).accion === "abierta" && M.enviados.length === 2, "asignación por texto con el formato oficial");
  r = await H({ httpMethod: "POST", headers: { authorization: "Bearer secreto-asignar" }, body: JSON.stringify({ nombre: "Sin tel" }) }); ok(r.statusCode === 400, "sin teléfono → 400");
  r = await H({ httpMethod: "GET", headers: {} }); ok(r.statusCode === 405, "GET → 405");
  console.log(fails.length ? "FALLAS:\n - " + fails.join("\n - ") : "Asignar OK: secreto, campos o texto, apertura al lead y datos guardados"); process.exit(fails.length ? 1 : 0);
})();
