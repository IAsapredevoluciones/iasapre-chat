// Estado de conversaciones (lib/store.js): fusión de historiales entre invocaciones paralelas, adaptador moderno (lib/moderno.js)
// y rechazo de reintentos duplicados de Meta en el agente.
const S = require("../netlify/functions/lib/store.js"), M = require("../netlify/functions/lib/moderno.js"), A = require("../netlify/functions/lib/wsp_agent.js");
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
(async () => {
  // Fusión: dos invocaciones leyeron el mismo estado (u1) y cada una agregó su turno; ninguna debe perderse.
  const base = { telefono: "56911111111", nombrePerfil: "Ana", lead: null, historial: [{ role: "user", content: "hola", t: 1, id: "m1" }], derivado: false, derivadoEn: null, asignaciones: 0, creado: "c" };
  const inv1 = { ...base, historial: [...base.historial, { role: "user", content: "estoy en Colmena", t: 2, id: "m2" }, { role: "assistant", content: "ok Colmena", t: 6 }] };
  const inv2 = { ...base, historial: [...base.historial, { role: "user", content: "sin cargas", t: 3, id: "m3" }, { role: "assistant", content: "ok cargas", t: 5 }], derivado: true, derivadoEn: "hoy", lead: { nombre: "Ana" } };
  const f = S.fusionar(inv1, inv2);
  ok(f.historial.length === 5 && f.historial.map((h) => h.t).join(",") === "1,2,3,5,6", "fusión: une los turnos de ambas invocaciones en orden: " + f.historial.map((h) => h.t));
  ok(f.derivado === true && f.derivadoEn === "hoy" && f.lead && f.lead.nombre === "Ana" && f.creado === "c", "fusión: derivación pegajosa, lead y creado");
  ok(S.fusionar(null, inv1) === inv1 && S.fusionar(inv1, null) === inv1, "fusión con vacío");
  // Tope de turnos
  const largo = { ...base, historial: Array.from({ length: 120 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "x" + i, t: i + 1 })) };
  ok(S.fusionar(base, largo).historial.length === 80, "fusión recorta a 80 turnos");
  // Memoria (sin Blobs): setConv fusiona con lo guardado
  await S.setConv("+56 9 1111 1111", inv1); await S.setConv("56911111111", inv2);
  const g = await S.getConv("56911111111"); ok(g && g.historial.length === 5 && g.derivado, "setConv en memoria fusiona en vez de pisar");
  // Adaptador moderno
  const req = new Request("https://iasapre-chat.netlify.app/.netlify/functions/whatsapp?hub.mode=subscribe&hub.verify_token=abc&hub.challenge=123", { method: "GET" });
  const ev = await M.aEvento(req);
  ok(ev.httpMethod === "GET" && ev.queryStringParameters["hub.verify_token"] === "abc" && ev.queryStringParameters["hub.challenge"] === "123" && ev.body === "" && ev.moderno === true, "aEvento GET con query");
  const cuerpo = JSON.stringify({ object: "whatsapp_business_account", entry: [], ñ: "áéí" });
  const req2 = new Request("https://x.netlify.app/.netlify/functions/whatsapp", { method: "POST", headers: { "Content-Type": "application/json", "X-Hub-Signature-256": "sha256=ff" }, body: cuerpo });
  const ev2 = await M.aEvento(req2);
  ok(ev2.httpMethod === "POST" && ev2.headers["x-hub-signature-256"] === "sha256=ff" && ev2.body === cuerpo && ev2.isBase64Encoded === false, "aEvento POST: cabeceras en minúscula y cuerpo crudo intacto (UTF-8)");
  const res = M.aResponse({ statusCode: 403, headers: { "Content-Type": "text/plain" }, body: "verify_token incorrecto" });
  ok(res.status === 403 && (await res.text()) === "verify_token incorrecto" && res.headers.get("content-type") === "text/plain", "aResponse conserva estado, cuerpo y cabeceras");
  ok(M.aResponse({ statusCode: 200, body: String(123) }).status === 200, "aResponse con challenge");
  // Webhook completo en formato moderno: GET de verificación y POST con firma
  process.env.WSP_VERIFY_TOKEN = "tok-verif"; process.env.WSP_APP_SECRET = "sec";
  const H = A.crearHandler({ store: { get: async () => null, set: async () => {} }, enviarTexto: async () => ({ ok: true }), enviarPlantilla: async () => ({ ok: true }), claude: async () => ({ stop_reason: "end_turn", content: [{ type: "text", text: "Hola! ¿Cómo estás?" }] }), notificarEspecialista: async () => [], plantillaInicio: "" });
  const r1 = M.aResponse(await H(await M.aEvento(new Request("https://x.netlify.app/.netlify/functions/whatsapp?hub.mode=subscribe&hub.verify_token=tok-verif&hub.challenge=777"))));
  ok(r1.status === 200 && (await r1.text()) === "777", "verificación GET vía adaptador devuelve el challenge");
  const crypto = require("crypto"); const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
  const firma = "sha256=" + crypto.createHmac("sha256", "sec").update(body, "utf8").digest("hex");
  const r2 = M.aResponse(await H(await M.aEvento(new Request("https://x.netlify.app/.netlify/functions/whatsapp", { method: "POST", headers: { "x-hub-signature-256": firma }, body }))));
  ok(r2.status === 200, "POST firmado vía adaptador → 200");
  const r3 = M.aResponse(await H(await M.aEvento(new Request("https://x.netlify.app/.netlify/functions/whatsapp", { method: "POST", headers: { "x-hub-signature-256": "sha256=00" }, body }))));
  ok(r3.status === 401, "POST con firma inválida vía adaptador → 401");
  // Reintento duplicado de Meta (mismo messageId) no se procesa dos veces
  const mem = new Map(), enviados = [];
  const deps = { store: { get: async (k) => mem.get(k) || null, set: async (k, v) => { mem.set(k, JSON.parse(JSON.stringify(v))); } }, enviarTexto: async (to, b) => { enviados.push(b); return { ok: true }; }, enviarPlantilla: async () => ({ ok: true }),
    claude: async () => ({ stop_reason: "end_turn", content: [{ type: "text", text: "Buenísimo, te ayudo." }] }), notificarEspecialista: async () => [], plantillaInicio: "" };
  const a1 = await A.manejarEntrante({ from: "56922222222", nombre: "Luis", texto: "hola", messageId: "wamid.1" }, deps);
  const a2 = await A.manejarEntrante({ from: "56922222222", nombre: "Luis", texto: "hola", messageId: "wamid.1" }, deps);
  ok(a1.tipo === "conversacion" && a2.tipo === "ignorado" && a2.motivo === "duplicado" && enviados.length === 1, "reintento con el mismo messageId se ignora");
  const c = mem.get("56922222222"); ok(c.historial[0].id === "wamid.1", "el historial guarda el id del mensaje");
  if (fails.length) { console.log("✘ Store/moderno: " + fails.length + " fallas\n - " + fails.join("\n - ")); process.exit(1); }
  console.log("Store OK: fusión de historiales, consistencia por modo, adaptador moderno (GET/POST firmado), duplicados ignorados");
})();
