// Transcripción de audios de WhatsApp (notas de voz ogg/opus). Proveedor según variables de entorno (Netlify):
//   OPENAI_API_KEY   → OpenAI Audio Transcriptions (modelo STT_MODEL, por defecto gpt-4o-mini-transcribe)
//   DEEPGRAM_API_KEY → Deepgram (modelo STT_MODEL, por defecto nova-3)
// STT_PROVIDER fuerza uno ("openai" | "deepgram"). Sin clave configurada → configurado() = false y el agente pide el mensaje por escrito.
// Nunca se registra el contenido del audio ni la transcripción en logs.
function proveedor(env) {
  env = env || process.env;
  const p = String(env.STT_PROVIDER || "").toLowerCase();
  if (p === "openai" && env.OPENAI_API_KEY) return "openai";
  if (p === "deepgram" && env.DEEPGRAM_API_KEY) return "deepgram";
  if (env.OPENAI_API_KEY) return "openai";
  if (env.DEEPGRAM_API_KEY) return "deepgram";
  return "";
}
const configurado = (env) => !!proveedor(env);

const ext = (mime) => (/ogg|opus/.test(mime || "") ? "ogg" : /mp4|m4a|aac/.test(mime || "") ? "m4a" : /mpeg|mp3/.test(mime || "") ? "mp3" : /wav/.test(mime || "") ? "wav" : /webm/.test(mime || "") ? "webm" : "ogg");

/** buffer (Buffer|ArrayBuffer|Uint8Array), mime → texto transcrito (string, puede ser ""). Lanza si falla. */
async function transcribir(buffer, mime, env) {
  env = env || process.env;
  const prov = proveedor(env); if (!prov) throw new Error("STT no configurado");
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  const tipo = String(mime || "audio/ogg").split(";")[0].trim();
  if (prov === "openai") {
    const fd = new FormData();
    fd.append("file", new Blob([bytes], { type: tipo }), "audio." + ext(tipo));
    fd.append("model", env.STT_MODEL || "gpt-4o-mini-transcribe");
    fd.append("language", "es");
    fd.append("response_format", "json");
    const r = await fetch((env.OPENAI_API_BASE || "https://api.openai.com/v1") + "/audio/transcriptions", { method: "POST", headers: { Authorization: "Bearer " + env.OPENAI_API_KEY }, body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error("STT openai " + r.status + " " + ((j.error && j.error.message) || ""));
    return String(j.text || "").trim();
  }
  const u = (env.DEEPGRAM_API_BASE || "https://api.deepgram.com/v1") + "/listen?model=" + encodeURIComponent(env.STT_MODEL || "nova-3") + "&language=es&smart_format=true";
  const r = await fetch(u, { method: "POST", headers: { Authorization: "Token " + env.DEEPGRAM_API_KEY, "Content-Type": tipo }, body: bytes });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("STT deepgram " + r.status + " " + (j.err_msg || j.error || ""));
  try { return String(j.results.channels[0].alternatives[0].transcript || "").trim(); } catch (e) { return ""; }
}

module.exports = { transcribir, configurado, proveedor, ext };
