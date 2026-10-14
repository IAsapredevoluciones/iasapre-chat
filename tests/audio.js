// Audios de WhatsApp: parseo del evento, descarga del medio, transcripción (OpenAI/Deepgram con fetch simulado), respuesta del
// agente con la transcripción, mensaje de disculpa sin STT, y "#reiniciar" desde el número del especialista.
const crypto = require("crypto");
const A = require("../netlify/functions/lib/wsp_agent.js"), api = require("../netlify/functions/lib/wsp_api.js"), stt = require("../netlify/functions/lib/stt.js");
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
function mocks(extra) { const mem = new Map(), enviados = [], llamadas = []; return { mem, enviados, llamadas, deps: Object.assign({
  store: { get: async (k) => mem.get(k) || null, set: async (k, v) => { mem.set(k, JSON.parse(JSON.stringify(v))); }, del: async (k) => { mem.delete(k); } },
  enviarTexto: async (to, body) => { enviados.push({ to, body }); return { ok: true }; }, enviarPlantilla: async () => ({ ok: true }),
  claude: async (cuerpo) => { llamadas.push(cuerpo); return { stop_reason: "end_turn", content: [{ type: "text", text: "Buenísimo. ¿En qué Isapre estás?" }] }; },
  notificarEspecialista: async () => [], plantillaInicio: "" }, extra || {}) }; }
const firmar = (raw) => "sha256=" + crypto.createHmac("sha256", "sec").update(raw).digest("hex");
const eventoAudio = (id) => ({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: "1318618498009778" }, contacts: [{ wa_id: "56977770000", profile: { name: "Rosa" } }],
  messages: [{ from: "56977770000", id: id || "wamid.a1", timestamp: "1", type: "audio", audio: { id: "MEDIA123", mime_type: "audio/ogg; codecs=opus", voice: true } }] } }] }] });
(async () => {
  process.env.WSP_APP_SECRET = "sec"; process.env.WSP_VERIFY_TOKEN = "v";
  // parseo
  const ms = api.parsearWebhook(eventoAudio());
  ok(ms.length === 1 && ms[0].tipo === "audio" && ms[0].mediaId === "MEDIA123" && /ogg/.test(ms[0].mime) && ms[0].texto === "" && ms[0].nombre === "Rosa", "parsearWebhook expone mediaId y mime del audio");
  // descargarMedia con fetch simulado
  const fetchReal = global.fetch; const pedidos = [];
  process.env.WSP_TOKEN = "tok";
  global.fetch = async (u, o) => { pedidos.push({ u: String(u), auth: o && o.headers && (o.headers.Authorization || o.headers.authorization) });
    if (/MEDIA123$/.test(String(u))) return { ok: true, status: 200, json: async () => ({ url: "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1", mime_type: "audio/ogg" }) };
    if (/lookaside/.test(String(u))) return { ok: true, status: 200, headers: { get: () => "audio/ogg" }, arrayBuffer: async () => new Uint8Array([79, 103, 103, 83]).buffer };
    return { ok: false, status: 404, json: async () => ({}) }; };
  const med = await api.descargarMedia("MEDIA123");
  ok(med.buffer.length === 4 && med.mime === "audio/ogg" && pedidos.length === 2 && pedidos.every((p) => p.auth === "Bearer tok"), "descargarMedia: metadatos + bytes con el token");
  // stt: openai
  let capt = null; global.fetch = async (u, o) => { capt = { u: String(u), o }; return { ok: true, status: 200, json: async () => ({ text: " hola, quiero cambiarme de isapre " }) }; };
  ok(!stt.configurado({}) && stt.proveedor({ OPENAI_API_KEY: "k" }) === "openai" && stt.proveedor({ DEEPGRAM_API_KEY: "d" }) === "deepgram" && stt.proveedor({ OPENAI_API_KEY: "k", DEEPGRAM_API_KEY: "d", STT_PROVIDER: "deepgram" }) === "deepgram", "proveedor según variables");
  let t = await stt.transcribir(Buffer.from([1, 2, 3]), "audio/ogg; codecs=opus", { OPENAI_API_KEY: "k" });
  ok(t === "hola, quiero cambiarme de isapre" && /api\.openai\.com\/v1\/audio\/transcriptions$/.test(capt.u) && capt.o.headers.Authorization === "Bearer k" && capt.o.body instanceof FormData && capt.o.body.get("model") === "gpt-4o-mini-transcribe" && capt.o.body.get("language") === "es" && capt.o.body.get("file").name === "audio.ogg", "OpenAI: multipart con archivo, modelo e idioma");
  // stt: openai vía Netlify AI Gateway (OPENAI_BASE_URL)
  global.fetch = async (u, o) => { capt = { u: String(u), o }; return { ok: true, status: 200, json: async () => ({ text: "hola" }) }; };
  t = await stt.transcribir(Buffer.from([1]), "audio/ogg", { OPENAI_API_KEY: "gw", OPENAI_BASE_URL: "https://gateway.netlify.test/openai/" });
  ok(t === "hola" && capt.u === "https://gateway.netlify.test/openai/audio/transcriptions", "OpenAI respeta OPENAI_BASE_URL del AI Gateway: " + capt.u);
  // stt: deepgram
  global.fetch = async (u, o) => { capt = { u: String(u), o }; return { ok: true, status: 200, json: async () => ({ results: { channels: [{ alternatives: [{ transcript: "tengo dos cargas" }] }] } }) }; };
  t = await stt.transcribir(new Uint8Array([1]).buffer, "audio/ogg", { DEEPGRAM_API_KEY: "d" });
  ok(t === "tengo dos cargas" && /api\.deepgram\.com\/v1\/listen\?model=nova-3&language=es/.test(capt.u) && capt.o.headers.Authorization === "Token d" && capt.o.headers["Content-Type"] === "audio/ogg", "Deepgram: bytes crudos con el tipo y la clave");
  // error del proveedor
  global.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: { message: "bad key" } }) });
  let err = null; try { await stt.transcribir(Buffer.from([1]), "audio/ogg", { OPENAI_API_KEY: "k" }); } catch (e) { err = e; }
  ok(err && /STT openai 401/.test(err.message), "error del proveedor se propaga");
  global.fetch = fetchReal;
  // agente: audio transcrito → se responde con la transcripción como texto del usuario
  const M = mocks({ transcribir: async (id) => (id === "MEDIA123" ? "hola, quiero saber si me conviene cambiarme" : "") });
  const H = A.crearHandler(M.deps); const raw = JSON.stringify(eventoAudio());
  let r = await H({ httpMethod: "POST", headers: { "x-hub-signature-256": firmar(raw) }, body: raw });
  ok(r.statusCode === 200 && M.enviados.length === 1 && /Isapre/.test(M.enviados[0].body) && M.llamadas.length === 1, "audio transcrito → Claude responde");
  const c = M.mem.get("56977770000"); ok(c && c.historial[0].content === "hola, quiero saber si me conviene cambiarme" && c.historial[0].audio === true && c.historial[0].id === "wamid.a1", "la transcripción queda en el historial marcada como audio");
  ok(/hola, quiero saber si me conviene cambiarme/.test(JSON.stringify(M.llamadas[0].messages)), "Claude recibe la transcripción");
  // transcripción vacía / error → disculpa
  const M2 = mocks({ transcribir: async () => { throw new Error("caído"); } }); const H2 = A.crearHandler(M2.deps);
  const errReal = console.error; console.error = () => {};
  r = await H2({ httpMethod: "POST", headers: { "x-hub-signature-256": firmar(raw) }, body: raw }); console.error = errReal;
  ok(M2.enviados.length === 1 && M2.enviados[0].body === A.MSG_AUDIO && M2.llamadas.length === 0 && !M2.mem.get("56977770000"), "STT caído → pide el mensaje por escrito, no llama a Claude");
  // sin STT configurado → disculpa
  const M3 = mocks({ transcribir: null }); const H3 = A.crearHandler(M3.deps);
  r = await H3({ httpMethod: "POST", headers: { "x-hub-signature-256": firmar(raw) }, body: raw });
  ok(M3.enviados.length === 1 && M3.enviados[0].body === A.MSG_AUDIO, "sin STT → pide el mensaje por escrito");
  ok(!/escuch|audio/i.test(A.MSG_AUDIO.match(/mental|preexist/) || ""), "mensaje de audio sin términos sensibles");
  // imagen/sticker → aviso de solo texto; reacción → silencio
  const evImg = { object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { messages: [{ from: "56977770000", id: "wamid.i1", type: "image", image: { id: "IMG" } }, { from: "56977770000", id: "wamid.r1", type: "reaction", reaction: { emoji: "👍" } }] } }] }] };
  const M4 = mocks(); const H4 = A.crearHandler(M4.deps); const rawI = JSON.stringify(evImg);
  r = await H4({ httpMethod: "POST", headers: { "x-hub-signature-256": firmar(rawI) }, body: rawI });
  ok(M4.enviados.length === 1 && M4.enviados[0].body === A.MSG_NO_TEXTO && M4.llamadas.length === 0, "imagen → aviso de solo texto; reacción → nada");
  // #reiniciar desde el especialista borra su conversación; desde otro número es texto normal
  const M5 = mocks(); M5.mem.set("56985380357", { telefono: "56985380357", historial: [{ role: "user", content: "x", t: 1 }], derivado: true, lead: null });
  let a = await A.manejarEntrante({ from: "56985380357", nombre: "Nico", texto: "#reiniciar", messageId: "wamid.z" }, M5.deps);
  ok(a.tipo === "reinicio" && !M5.mem.get("56985380357") && M5.enviados[0].body === A.MSG_REINICIO && M5.llamadas.length === 0, "#reiniciar del especialista borra la conversación");
  a = await A.manejarEntrante({ from: "56977770000", nombre: "Rosa", texto: "#reiniciar", messageId: "wamid.y" }, M5.deps);
  ok(a.tipo === "conversacion" && M5.llamadas.length === 1, "#reiniciar de otra persona se trata como texto normal");
  if (fails.length) { console.log("✘ Audio: " + fails.length + " fallas\n - " + fails.join("\n - ")); process.exit(1); }
  console.log("Audio OK: parseo, descarga, STT OpenAI/Deepgram, agente con transcripción, disculpas sin STT/imagen, #reiniciar del especialista");
})();
