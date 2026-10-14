// Asistente de WhatsApp (lib/wsp_agent.js + whatsapp.js) sin red: Claude, WhatsApp y el almacén se simulan.
// Cubre: asignación válida → apertura; reasignación no reinicia; otro número con el mismo texto → conversación normal;
// conversación → Claude con SYSTEM + contexto + historial, guard() sobre la salida; herramienta derivar → aviso al
// especialista (sin salud mental en el resumen) y estado derivado; rechazo del modelo → deriva; error de API → mensaje de
// reintento; webhook: GET de verificación, firma HMAC, parseo de eventos, mensajes propios ignorados.
process.env.WSP_APP_SECRET = "secreto-de-prueba"; process.env.WSP_VERIFY_TOKEN = "verifica-123"; process.env.WSP_TEMPLATE_INICIO = "";
const crypto = require("crypto");
const A = require("../netlify/functions/lib/wsp_agent.js"), W = require("../netlify/functions/lib/prompt_whatsapp.js"), api = require("../netlify/functions/lib/wsp_api.js");
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const ASIG = "+56 9 8883 0767", LEAD = "56990156640";
const asignacion = `Hola Asesoría IAsapre, tienes un nuevo lead asignado para gestión.
Camila Rojas
Renta imponible: $1.900.000
Región: Metropolitana
Clínica de preferencia: Clínica Alemana
Cargas familiares: Sí, 1 hija
Preferencia de contacto: Llamada
💬 Contacto rápido: https://wa.me/56990156640?text=Hola%20Camila
📋 Gestión en la plataforma: https://app.iasapre.cl/?lead=L-77`;

function mocks(respuestas) {
  const mem = new Map(), enviados = [], plantillas = [], llamadas = [], avisos = [];
  const cola = [...(respuestas || [])];
  return { enviados, plantillas, llamadas, avisos, mem, deps: {
    store: { get: async (k) => mem.get(k) || null, set: async (k, v) => { mem.set(k, JSON.parse(JSON.stringify(v))); } },
    enviarTexto: async (to, body) => { enviados.push({ to, body }); return { ok: true, id: "wamid." + enviados.length }; },
    enviarPlantilla: async (to, nombre, params) => { plantillas.push({ to, nombre, params }); return { ok: true }; },
    claude: async (body) => { llamadas.push(body); const r = cola.shift(); if (r instanceof Error) throw r; return r || { stop_reason: "end_turn", content: [{ type: "text", text: "Respuesta de prueba. ¿Me cuentas en qué Isapre estás?" }] }; },
    notificarEspecialista: async (resumen, meta) => { avisos.push({ resumen, meta }); return [{ ok: true }]; },
    plantillaInicio: "" } };
}
const txt = (t) => ({ stop_reason: "end_turn", content: [{ type: "text", text: t }] });

(async () => {
  // 1) asignación válida → apertura generada por el modelo y enviada al lead
  let M = mocks([txt("Hola Camila! ¿Cómo estás? Te escribe el asistente de IAsapre porque pediste asesoría sobre tu plan de salud; es gratis. ¿Hoy estás en Isapre o en Fonasa?")]);
  let r = await A.manejarEntrante({ from: ASIG, nombre: "Plataforma", texto: asignacion }, M.deps);
  ok(r.tipo === "asignacion" && r.accion === "abierta" && r.enviado, "asignación válida abre la conversación: " + JSON.stringify(r));
  ok(M.enviados.length === 1 && M.enviados[0].to === LEAD && /asistente de IAsapre/.test(M.enviados[0].body) && /gratis/.test(M.enviados[0].body), "primer mensaje al lead, no a la plataforma");
  let conv = M.mem.get(LEAD); ok(conv && conv.lead.nombre === "Camila Rojas" && conv.lead.leadId === "L-77" && conv.lead.clinica === "Clínica Alemana" && conv.historial.length === 1 && conv.historial[0].role === "assistant", "estado guardado por teléfono del lead con datos del formulario");
  ok(M.llamadas[0].messages[M.llamadas[0].messages.length - 1].content.includes("Nueva asignación recibida") && M.llamadas[0].system[1].text.includes("Camila Rojas") && M.llamadas[0].system[1].text.includes("Llamada"), "el modelo recibe la instrucción de apertura y el contexto del lead");
  // 1b) con plantilla configurada se usa la plantilla (fuera de la ventana de 24 h)
  let P = mocks(); P.deps.plantillaInicio = "asesoria_inicio";
  r = await A.manejarEntrante({ from: ASIG, texto: asignacion }, P.deps);
  ok(P.plantillas.length === 1 && P.plantillas[0].nombre === "asesoria_inicio" && P.plantillas[0].params[0] === "Camila" && P.enviados.length === 0 && P.llamadas.length === 0, "apertura por plantilla aprobada, sin llamar al modelo");
  // 2) reasignación del mismo lead → no reinicia
  r = await A.manejarEntrante({ from: ASIG, texto: asignacion.replace("$1.900.000", "$2.100.000") }, M.deps);
  conv = M.mem.get(LEAD); ok(r.accion === "retomada" && M.enviados.length === 1 && conv.lead.renta === "$2.100.000" && conv.asignaciones === 2, "reasignación: actualiza datos, no manda otro saludo");
  // 3) mismo texto desde otro número → conversación normal (no asignación)
  let O = mocks([txt("Hola! ¿En qué te ayudo con tu plan?")]);
  r = await A.manejarEntrante({ from: "56911112222", nombre: "Alguien", texto: asignacion }, O.deps);
  ok(r.tipo === "conversacion" && O.enviados[0].to === "56911112222" && !O.mem.get(LEAD), "asignación desde otro número = mensaje normal de esa persona; no toca al lead");
  // 4) conversación: contexto, historial, guard()
  M = mocks([txt("Gracias. La depresión es una preexistencia y te pueden restringir 18 meses. Sobre tu plan, ¿cuánto pagas hoy?")]);
  M.mem.set(LEAD, conv);
  r = await A.manejarEntrante({ from: LEAD, nombre: "Camila", texto: "Hola, estoy en Colmena y tengo depresión, me afecta?" }, M.deps);
  const b = M.llamadas[0];
  ok(b.model === A.MODEL && b.system[0].text === W.SYSTEM && b.system[0].cache_control && b.system[1].text.includes("CONTEXTO") && b.tools[0].name === "derivar" && b.tools[0].strict === true && b.tool_choice.type === "auto" && b.fallbacks === "default", "cuerpo de la llamada: SYSTEM cacheado + contexto, herramienta derivar estricta, tool_choice auto, fallbacks");
  ok(b.messages[0].role === "user" && b.messages[b.messages.length - 1].content.includes("Colmena"), "historial alterna roles y termina con el mensaje de la persona");
  ok(M.enviados.length === 1 && !/preexistencia y te pueden restringir/i.test(M.enviados[0].body) && /21\.?331/.test(M.enviados[0].body) && /cuánto pagas hoy/.test(M.enviados[0].body), "guard() limpia salud mental en la respuesta enviada y conserva el resto");
  conv = M.mem.get(LEAD); ok(conv.historial.length === 3 && conv.historial[1].role === "user" && conv.historial[2].role === "assistant", "historial actualizado (apertura, persona, respuesta)");
  // 5) herramienta derivar → aviso al especialista, estado derivado, mensaje 3.2
  M = mocks([{ stop_reason: "tool_use", content: [{ type: "text", text: "Esta consulta la va a ver mejor un especialista de nuestro equipo. Le paso tu caso y te escribirá desde el número +56 9 8538 0357. 🙌" }, { type: "tool_use", id: "tu_1", name: "derivar", input: { prevision: "Colmena, plan desconocido", edadCargas: "38 / 1 hija (6)", renta: "$1.900.000", regionClinica: "RM / Clínica Alemana", preexistencias: "hipertensión, depresión", busca: "cotización concreta", conversado: "Explicado 7% y topes.", motivo: "pide cotización", urgencia: "Alta" } }] }]);
  M.mem.set(LEAD, conv);
  r = await A.manejarEntrante({ from: LEAD, texto: "quiero una cotizacion concreta ya" }, M.deps);
  ok(r.derivado && M.avisos.length === 1 && M.avisos[0].resumen.startsWith("🔔 Derivación IAsapre\nLead: Camila Rojas · +56 9 9015 6640\nPlataforma: https://app.iasapre.cl/?lead=L-77"), "derivación con nombre, teléfono y lead de la asignación");
  ok(/Preexistencias: hipertensión\n/.test(M.avisos[0].resumen) && !/depresi/.test(M.avisos[0].resumen) && /Urgencia: Alta/.test(M.avisos[0].resumen), "el resumen al especialista no lleva salud mental");
  ok(M.avisos[0].meta.urgencia === "Alta" && M.avisos[0].meta.leadId === "L-77", "meta para Discord/CRM");
  ok(M.enviados.length === 1 && /8538 0357/.test(M.enviados[0].body), "la persona recibe el mensaje de derivación");
  conv = M.mem.get(LEAD); ok(conv.derivado === true && !!conv.derivadoEn, "conversación marcada como derivada");
  // 5b) sin texto junto a la herramienta → mensaje 3.2 por defecto; contexto informa que ya está derivada
  M = mocks([{ stop_reason: "tool_use", content: [{ type: "tool_use", id: "tu_2", name: "derivar", input: { prevision: "Fonasa", edadCargas: "70", renta: "No informado", regionClinica: "Valparaíso", preexistencias: "No", busca: "reclamo por licencia", conversado: "—", motivo: "tema legal", urgencia: "Media" } }] }, txt("Tranquilo, el especialista te escribirá desde +56 9 8538 0357. Mientras, ¿alguna duda simple?")]);
  await A.manejarEntrante({ from: "56955550000", nombre: "Pedro", texto: "me rechazaron la licencia y quiero demandar" }, M.deps);
  ok(M.enviados[0].body === A.MSG_DERIVACION && M.avisos[0].resumen.includes("Lead: Pedro · +56 9 5555 0000") && M.avisos[0].resumen.includes("sin ID de lead"), "sin texto del modelo se usa el mensaje 3.2; persona sin asignación usa el nombre del perfil");
  await A.manejarEntrante({ from: "56955550000", texto: "y ahora que hago" }, M.deps);
  ok(M.llamadas[1].system[1].text.includes("YA DERIVADA"), "tras derivar, el contexto se lo recuerda al modelo");
  // 6) rechazo del modelo → deriva y responde con mensaje seguro
  M = mocks([{ stop_reason: "refusal", content: [], stop_details: { type: "refusal", category: "general_harms" } }]);
  r = await A.manejarEntrante({ from: "56966660000", texto: "..." }, M.deps);
  ok(r.derivado && M.avisos.length === 1 && /especialista/.test(M.enviados[0].body), "refusal → derivación + mensaje seguro");
  // 7) error de API → mensaje de reintento, nada se pierde
  M = mocks([new Error("API 529")]);
  r = await A.manejarEntrante({ from: "56977770000", texto: "hola" }, M.deps);
  ok(r.error === "API 529" && /repites/.test(M.enviados[0].body) && M.mem.get("56977770000").historial.length === 2, "error de API: mensaje de reintento y historial guardado");
  // 8) mensajes propios / vacíos se ignoran
  ok((await A.manejarEntrante({ from: W.NUMEROS.asistente, texto: "hola" }, M.deps)).tipo === "ignorado" && (await A.manejarEntrante({ from: "56912345678", texto: "   " }, M.deps)).tipo === "ignorado", "ignora mensajes propios y vacíos");
  // 9) webhook: verificación GET
  const H = A.crearHandler({ ...mocks([txt("Hola, ¿en qué te ayudo?")]).deps });
  let g = await H({ httpMethod: "GET", queryStringParameters: { "hub.mode": "subscribe", "hub.verify_token": "verifica-123", "hub.challenge": "reto-42" } });
  ok(g.statusCode === 200 && g.body === "reto-42", "GET de verificación devuelve el challenge");
  g = await H({ httpMethod: "GET", queryStringParameters: { "hub.mode": "subscribe", "hub.verify_token": "otro", "hub.challenge": "x" } }); ok(g.statusCode === 403, "verify_token incorrecto → 403");
  // 10) webhook POST: firma y parseo
  const evento = { object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { contacts: [{ wa_id: "56988880000", profile: { name: "Lucía" } }], messages: [{ from: "56988880000", id: "wamid.1", timestamp: "1", type: "text", text: { body: "hola, quiero ver mi plan" } }, { from: "56988880000", id: "wamid.2", type: "image" }], statuses: [{ id: "x", status: "delivered" }] } }] }] };
  const raw = JSON.stringify(evento), firma = "sha256=" + crypto.createHmac("sha256", "secreto-de-prueba").update(raw).digest("hex");
  const Mw = mocks([txt("Hola Lucía! ¿Cómo estás? ¿En qué Isapre estás hoy?")]); const Hw = A.crearHandler(Mw.deps);
  let p = await Hw({ httpMethod: "POST", headers: { "x-hub-signature-256": "sha256=mala" }, body: raw }); ok(p.statusCode === 401, "firma inválida → 401");
  p = await Hw({ httpMethod: "POST", headers: { "x-hub-signature-256": firma }, body: raw });
  ok(p.statusCode === 200 && JSON.parse(p.body).n === 2 && Mw.enviados.length === 2 && Mw.enviados[0].to === "56988880000" && /Lucía/.test(Mw.enviados[0].body) && Mw.enviados[1].body === A.MSG_NO_TEXTO && Mw.llamadas.length === 1, "evento firmado: responde al texto, a la imagen avisa que solo lee texto/audio (sin llamar al modelo) e ignora los estados");
  ok(Mw.mem.get("56988880000").nombrePerfil === "Lucía", "nombre del perfil guardado");
  p = await Hw({ httpMethod: "POST", headers: { "x-hub-signature-256": firma }, body: Buffer.from(raw).toString("base64"), isBase64Encoded: true }); ok(p.statusCode === 200, "cuerpo en base64 también se verifica");
  ok(api.parsearWebhook(evento).length === 2 && api.parsearWebhook({}).length === 0, "parsearWebhook");
  // 10b) eventos dirigidos a OTRO número de la misma cuenta (p. ej. el WhatsApp de devoluciones) se ignoran sin responder
  process.env.WSP_PHONE_NUMBER_ID = "111222333";
  const otro = JSON.parse(JSON.stringify(evento)); otro.entry[0].changes[0].value.metadata = { phone_number_id: "999888777", display_phone_number: "56985380357" };
  const rawO = JSON.stringify(otro), firmaO = "sha256=" + crypto.createHmac("sha256", "secreto-de-prueba").update(rawO).digest("hex");
  const Mo = mocks([txt("no debería llegar")]); const Ho = A.crearHandler(Mo.deps);
  p = await Ho({ httpMethod: "POST", headers: { "x-hub-signature-256": firmaO }, body: rawO });
  ok(p.statusCode === 200 && Mo.enviados.length === 0 && Mo.llamadas.length === 0, "mensajes para otro número (devoluciones) se ignoran: no se responde ni se llama al modelo");
  const mio = JSON.parse(JSON.stringify(evento)); mio.entry[0].changes[0].value.metadata = { phone_number_id: "111222333" };
  const rawM = JSON.stringify(mio), firmaM = "sha256=" + crypto.createHmac("sha256", "secreto-de-prueba").update(rawM).digest("hex");
  const Mm = mocks([txt("Hola Lucía!")]); const Hm = A.crearHandler(Mm.deps);
  p = await Hm({ httpMethod: "POST", headers: { "x-hub-signature-256": firmaM }, body: rawM });
  ok(p.statusCode === 200 && Mm.enviados.length === 2 && Mm.llamadas.length === 1, "mensajes para el número del asistente sí se responden");
  delete process.env.WSP_PHONE_NUMBER_ID;
  ok(api.verificarFirma(raw, firma, "secreto-de-prueba") && !api.verificarFirma(raw, firma, "otro") && !api.verificarFirma(raw, "", "secreto-de-prueba"), "verificarFirma");
  // 10b) asignación de la plataforma que llega como "unsupported" (plantilla con botones)
  const evU = { object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { messages: [{ from: "56988830767", id: "wamid.u1", type: "unsupported", errors: [{ code: 131051 }] }] } }] }] };
  const rawU = JSON.stringify(evU), firmaU = "sha256=" + crypto.createHmac("sha256", "secreto-de-prueba").update(rawU).digest("hex");
  const Mu = mocks([txt("x")]); const Hu = A.crearHandler(Mu.deps); const errU = console.error; console.error = () => {};
  p = await Hu({ httpMethod: "POST", headers: { "x-hub-signature-256": firmaU }, body: rawU }); console.error = errU;
  ok(p.statusCode === 200 && Mu.enviados.length === 0 && Mu.llamadas.length === 0, "asignación ilegible de la plataforma: no responde ni llama al modelo");
  // 11) notificador: Discord sin salud; CRM con resumen; WhatsApp al especialista
  const posts = []; const fetchReal = global.fetch; global.fetch = async (u, o) => { posts.push({ u, body: JSON.parse(o.body) }); return { ok: true, json: async () => ({}) }; };
  const envN = { LEADS_WEBHOOK: "https://crm.test/hook", DISCORD_WEBHOOK: "https://discord.test/hook" };
  const wspMock = { enviarTexto: async (to, body) => { posts.push({ u: "wsp:" + to, body }); return { ok: true }; }, enviarPlantilla: async () => ({ ok: true }) };
  const notificar = A.crearNotificador(wspMock, envN);
  const resumen = W.formatDerivacion({ nombre: "Ana", telefono: "56990000000", leadId: "L-1", preexistencias: "diabetes", motivo: "x" });
  await notificar(resumen, { nombre: "Ana", telefono: "56990000000", leadId: "L-1", urgencia: "Alta" });
  global.fetch = fetchReal;
  const disc = posts.find((p) => /discord/.test(p.u)), crm = posts.find((p) => /crm/.test(p.u)), wa = posts.find((p) => /^wsp:/.test(p.u));
  ok(disc && !/diabetes/.test(JSON.stringify(disc.body)) && /Ana/.test(disc.body.content) && /L-1/.test(disc.body.content), "Discord: sin datos de salud, con nombre, teléfono y link");
  ok(crm && crm.body.stage === "derivacion_wsp" && /diabetes/.test(crm.body.resumen), "CRM recibe el resumen completo");
  ok(wa && wa.u === "wsp:56985380357" && /🔔 Derivación IAsapre/.test(wa.body), "WhatsApp al especialista +56 9 8538 0357");
  // 11b) si el texto rebota (ventana de 24 h cerrada) se usa la plantilla; si el texto llega, no se manda plantilla
  const pl = []; const wspMock2 = { enviarTexto: async () => ({ ok: false, status: 400, error: "Re-engagement message" }), enviarPlantilla: async (to, nombre, params) => { pl.push({ to, nombre, params }); return { ok: true }; } };
  const errReal = console.error; console.error = () => {};
  const rs = await A.crearNotificador(wspMock2, { WSP_TEMPLATE_DERIVACION: "derivacion_iasapre" })(resumen, { nombre: "Ana", telefono: "56990000000", leadId: "L-1", urgencia: "Alta" });
  console.error = errReal;
  ok(rs[0] && rs[0].ok && pl.length === 1 && pl[0].to === "56985380357" && pl[0].nombre === "derivacion_iasapre" && pl[0].params.join("|") === "Ana|+56 9 9000 0000|Alta|https://app.iasapre.cl/?lead=L-1", "texto rebotado → plantilla con nombre, teléfono, urgencia y link");
  const pl2 = []; await A.crearNotificador({ enviarTexto: async () => ({ ok: true }), enviarPlantilla: async (...a) => { pl2.push(a); return { ok: true }; } }, { WSP_TEMPLATE_DERIVACION: "derivacion_iasapre" })(resumen, { nombre: "Ana", telefono: "56990000000" });
  ok(pl2.length === 0, "texto entregado → sin plantilla");
  const ef = api.estadosFallidos({ entry: [{ changes: [{ value: { statuses: [{ id: "x", status: "failed", recipient_id: "569", errors: [{ code: 131047, title: "Re-engagement message" }] }, { id: "y", status: "delivered" }] } }] }] });
  ok(ef.length === 1 && ef[0].code === 131047 && /Re-engagement/.test(ef[0].title) && !JSON.stringify(ef).includes("569"), "estadosFallidos: solo código y título");
  console.log(fails.length ? "FALLAS:\n - " + fails.join("\n - ") : "WhatsApp agente OK: asignación, reasignación, origen inválido, guard, derivación sin salud mental, refusal, errores, webhook (firma/verificación/parseo), avisos");
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log("FALLAS:\n - excepción: " + (e && e.stack)); process.exit(1); });
