// Fallas de entrega informadas por Meta (status "failed"): se marca el mensaje como no entregado en la conversación,
// queda en el registro de eventos y la conversación pasa a "sin responder" para poder retomarla.
const crypto = require("crypto");
const A = require("../netlify/functions/lib/wsp_agent.js"), api = require("../netlify/functions/lib/wsp_api.js"), S = require("../netlify/functions/lib/store.js"), P = require("../netlify/functions/lib/panel_core.js");
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
(async () => {
  process.env.WSP_APP_SECRET = "sec";
  const mem = new Map();
  const store = { get: async (k) => mem.get(k) || null, set: async (k, v) => { mem.set(k, JSON.parse(JSON.stringify(v))); } };
  mem.set("56971563526", { telefono: "56971563526", nombrePerfil: "Luis", lead: { nombre: "LUIS PRUEBA" }, historial: [{ role: "assistant", content: "[Plantilla asesoria_inicio] Hola LUIS!", t: 1, enviado: true, wamid: "wamid.X1" }], derivado: false });
  const ev = { object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { statuses: [{ id: "wamid.X1", status: "failed", recipient_id: "56971563526", errors: [{ code: 131042, title: "Business eligibility payment issue" }] }, { id: "wamid.Y", status: "delivered", recipient_id: "56900000000" }] } }] }] };
  ok(api.fallasEntrega(ev).length === 1 && api.fallasEntrega(ev)[0].para === "56971563526" && api.fallasEntrega(ev)[0].id === "wamid.X1", "fallasEntrega con id y destinatario");
  const H = A.crearHandler({ store, registrarEventos: true, enviarTexto: async () => ({ ok: true }), enviarPlantilla: async () => ({ ok: true }), claude: async () => ({}), notificarEspecialista: async () => [], plantillaInicio: "asesoria_inicio" });
  const raw = JSON.stringify(ev), firma = "sha256=" + crypto.createHmac("sha256", "sec").update(raw).digest("hex");
  const err = console.error; console.error = () => {};
  const r = await H({ httpMethod: "POST", headers: { "x-hub-signature-256": firma }, body: raw }); console.error = err;
  const c = mem.get("56971563526");
  ok(r.statusCode === 200 && c.historial[0].enviado === false && /131042/.test(c.historial[0].falla) && /método de pago/.test(c.historial[0].falla), "la plantilla queda marcada como no entregada con el motivo");
  ok(P.pendiente(c), "la conversación pasa a 'sin responder' (se puede retomar)");
  const evs = await S.listarEventos(5); ok(evs.some((e) => e.tipo === "entrega_fallida" && /131042/.test(e.error) && e.de === "56971563526"), "evento entrega_fallida registrado");
  // sin wamid: marca el último del asistente
  mem.set("56981856335", { telefono: "56981856335", historial: [{ role: "assistant", content: "a", t: 1, enviado: true }, { role: "assistant", content: "b", t: 2, enviado: true }] });
  await A.marcarFalla({ para: "56981856335", id: "otro", code: 131026, title: "x" }, store);
  const c2 = mem.get("56981856335"); ok(c2.historial[1].enviado === false && c2.historial[0].enviado === true && /no tiene WhatsApp/.test(c2.historial[1].falla), "sin wamid → último mensaje del asistente");
  // retomar después de una plantilla fallida (ventana cerrada, sin mensajes de la persona) → reenvía la plantilla
  const pl = []; const rr = await A.retomar("56971563526", { store, enviarTexto: async () => ({ ok: true }), enviarPlantilla: async (to, n, p) => { pl.push({ to, n, p }); return { ok: true, id: "wamid.X2" }; }, claude: async () => ({}), notificarEspecialista: async () => [], plantillaInicio: "asesoria_inicio" });
  ok(rr.tipo === "reabierta" && rr.enviado && pl.length === 1 && pl[0].p[0] === "LUIS" && mem.get("56971563526").historial.slice(-1)[0].wamid === "wamid.X2", "retomar reenvía la plantilla y guarda el nuevo wamid");
  // reenviar apertura a un lead que nunca respondió (aunque el envío no se haya marcado como fallido)
  mem.set("56955550000", { telefono: "56955550000", lead: { nombre: "Victoria Prueba" }, historial: [{ role: "assistant", content: "[Plantilla] Hola", t: 1, enviado: true }], derivado: false });
  const pl2 = []; const dd = { store, enviarTexto: async () => ({ ok: true }), enviarPlantilla: async (to, n, p) => { pl2.push(p); return { ok: true, id: "w" }; }, claude: async () => ({}), notificarEspecialista: async () => [], plantillaInicio: "asesoria_inicio" };
  let r2 = await A.retomar("56955550000", dd); ok(r2.tipo === "sin_pendiente" && pl2.length === 0, "sin pedirlo, no se reenvía");
  r2 = await A.retomar("56955550000", dd, { reenviarApertura: true }); ok(r2.tipo === "reabierta" && pl2.length === 1 && pl2[0][0] === "Victoria", "reenviarApertura → plantilla de nuevo");
  mem.set("56955550001", { telefono: "56955550001", historial: [{ role: "assistant", content: "Hola", t: 1, enviado: true }, { role: "user", content: "hola", t: 2 }, { role: "assistant", content: "x", t: 3, enviado: true }], derivado: false });
  r2 = await A.retomar("56955550001", dd, { reenviarApertura: true }); ok(r2.tipo === "sin_pendiente", "si la persona ya respondió, no se reenvía la apertura");
  // fusionar: el estado nuevo gana para el mismo turno
  const a = { historial: [{ role: "assistant", content: "x", t: 5, enviado: true }] }, b = { historial: [{ role: "assistant", content: "x", t: 5, enviado: false, falla: "131042" }] };
  ok(S.fusionar(a, b).historial[0].enviado === false && S.fusionar(a, b).historial.length === 1, "fusionar conserva la marca de falla");
  if (fails.length) { console.log("✘ Entrega: " + fails.length + " fallas\n - " + fails.join("\n - ")); process.exit(1); }
  console.log("Entrega OK: fallas de Meta marcadas en la conversación y en eventos, retomar reenvía la plantilla");
})();
