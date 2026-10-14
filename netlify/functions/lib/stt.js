// Transcripción de audios de WhatsApp (notas de voz ogg/opus). Proveedor según variables de entorno (Netlify):
//   OPENAI_API_KEY   → OpenAI Audio Transcriptions (modelo STT_MODEL, por defecto gpt-4o-mini-transcribe); respeta OPENAI_BASE_URL (Netlify AI Gateway)
//   DEEPGRAM_API_KEY → Deepgram (modelo STT_MODEL, por defecto nova-3)
// STT_PROVIDER fuerza uno ("openai" | "deepgram"). Sin clave configurada → configurado() = false y el agente pide el mensaje por escrito.
// Nunca se registra el contenido del audio ni la transcripción en logs.
// GEMINI_API_KEY + GOOGLE_GEMINI_BASE_URL → Gemini (audio nativo). Netlify AI Gateway inyecta ambas en las funciones, así que
// funciona sin configurar nada (se cobra en créditos de Netlify). Con una clave propia de OpenAI (sin OPENAI_BASE_URL) se prefiere OpenAI.
function proveedor(env) {
  env = env || process.env;
  const p = String(env.STT_PROVIDER || "").toLowerCase();
  const gemini = !!(env.GEMINI_API_KEY && env.GOOGLE_GEMINI_BASE_URL);
  if (p === "openai" && env.OPENAI_API_KEY) return "openai";
  if (p === "deepgram" && env.DEEPGRAM_API_KEY) return "deepgram";
  if (p === "gemini" && gemini) return "gemini";
  if (env.OPENAI_API_KEY && !env.OPENAI_BASE_URL) return "openai"; // clave propia de OpenAI
  if (env.DEEPGRAM_API_KEY) return "deepgram";
  if (gemini) return "gemini";
  if (env.OPENAI_API_KEY) return "openai"; // vía gateway
  return "";
}

/** fetch con límite de tiempo: la función debe responder siempre (si el audio no se puede transcribir, se pide por escrito). */
async function fetchT(url, opts, ms) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms || 12000);
  try { return await fetch(url, { ...(opts || {}), signal: ac.signal }); } finally { clearTimeout(t); }
}
const configurado = (env) => !!proveedor(env);

const ext = (mime) => (/ogg|opus/.test(mime || "") ? "ogg" : /mp4|m4a|aac/.test(mime || "") ? "m4a" : /mpeg|mp3/.test(mime || "") ? "mp3" : /wav/.test(mime || "") ? "wav" : /webm/.test(mime || "") ? "webm" : "ogg");

/** buffer (Buffer|ArrayBuffer|Uint8Array), mime → texto transcrito (string, puede ser ""). Lanza si falla. */
async function transcribir(buffer, mime, env) {
  env = env || process.env;
  const prov = proveedor(env); if (!prov) throw new Error("STT no configurado");
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  const tipo = String(mime || "audio/ogg").split(";")[0].trim();
  if (prov === "gemini") {
    const base = String(env.GOOGLE_GEMINI_BASE_URL).replace(/\/+$/, ""), modelo = env.STT_MODEL || "gemini-2.5-flash";
    const b64 = Buffer.from(bytes).toString("base64");
    const r = await fetchT(`${base}/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: tipo, data: b64 } }, { text: "Transcribe literalmente esta nota de voz (español de Chile). Responde solo con el texto dicho, sin comillas ni comentarios. Si no se entiende nada, responde vacío." }] }], generationConfig: { temperature: 0 } }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error("STT gemini " + r.status + " " + ((j.error && j.error.message) || ""));
    try { return j.candidates[0].content.parts.map((x) => x.text || "").join("").trim(); } catch (e) { return ""; }
  }
  if (prov === "openai") {
    const fd = new FormData();
    fd.append("file", new Blob([bytes], { type: tipo }), "audio." + ext(tipo));
    fd.append("model", env.STT_MODEL || "gpt-4o-mini-transcribe");
    fd.append("language", "es");
    fd.append("response_format", "json");
    // Netlify AI Gateway inyecta OPENAI_API_KEY + OPENAI_BASE_URL en las funciones: la clave solo sirve contra esa URL.
    const base = String(env.OPENAI_API_BASE || env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
    const r = await fetchT(base + "/audio/transcriptions", { method: "POST", headers: { Authorization: "Bearer " + env.OPENAI_API_KEY }, body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error("STT openai " + r.status + " " + ((j.error && j.error.message) || ""));
    return String(j.text || "").trim();
  }
  const u = (env.DEEPGRAM_API_BASE || "https://api.deepgram.com/v1") + "/listen?model=" + encodeURIComponent(env.STT_MODEL || "nova-3") + "&language=es&smart_format=true";
  const r = await fetchT(u, { method: "POST", headers: { Authorization: "Token " + env.DEEPGRAM_API_KEY, "Content-Type": tipo }, body: bytes });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("STT deepgram " + r.status + " " + (j.err_msg || j.error || ""));
  try { return String(j.results.channels[0].alternatives[0].transcript || "").trim(); } catch (e) { return ""; }
}

module.exports = { transcribir, configurado, proveedor, ext, fetchT };
