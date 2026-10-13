// WhatsApp Business Cloud API (Meta) — envío de mensajes, verificación del webhook y parseo de eventos. Sin dependencias.
// Variables de entorno (Netlify): WSP_TOKEN (token permanente del usuario de sistema), WSP_PHONE_NUMBER_ID,
// WSP_APP_SECRET (firma X-Hub-Signature-256), WSP_VERIFY_TOKEN (texto que tú eliges para registrar el webhook),
// WSP_TEMPLATE_LANG (es_CL por defecto). Ver docs/CANAL_WHATSAPP.md.
const crypto = require("crypto");
const API = process.env.WSP_API_BASE || "https://graph.facebook.com/v21.0";
const digitos = (s) => String(s || "").replace(/\D/g, "");

function cfg() {
  return { token: process.env.WSP_TOKEN || "", phoneId: process.env.WSP_PHONE_NUMBER_ID || "", secret: process.env.WSP_APP_SECRET || "",
    verify: process.env.WSP_VERIFY_TOKEN || "", lang: process.env.WSP_TEMPLATE_LANG || "es_CL" };
}

async function enviar(payload) {
  const c = cfg();
  if (!c.token || !c.phoneId) return { ok: false, status: 0, error: "Faltan WSP_TOKEN o WSP_PHONE_NUMBER_ID" };
  try {
    const r = await fetch(`${API}/${c.phoneId}/messages`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + c.token }, body: JSON.stringify({ messaging_product: "whatsapp", ...payload }) });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) console.error("whatsapp api", r.status, body && body.error && body.error.message); // sin contenido del mensaje
    return { ok: r.ok, status: r.status, id: body && body.messages && body.messages[0] && body.messages[0].id, error: body && body.error && body.error.message };
  } catch (e) { console.error("whatsapp api", e && e.message); return { ok: false, status: 0, error: e && e.message }; }
}

/** Texto libre: solo funciona dentro de la ventana de 24 h desde el último mensaje de la persona. */
const enviarTexto = (to, body) => enviar({ to: digitos(to), type: "text", text: { body: String(body || "").slice(0, 4096), preview_url: false } });

/** Plantilla aprobada (para abrir conversación fuera de la ventana de 24 h). params = textos del cuerpo, en orden. */
const enviarPlantilla = (to, nombre, params, lang) => enviar({ to: digitos(to), type: "template", template: { name: nombre, language: { code: lang || cfg().lang },
  components: params && params.length ? [{ type: "body", parameters: params.map((p) => ({ type: "text", text: String(p).replace(/[\n\t]+/g, " ").replace(/ {5,}/g, "    ").slice(0, 1024) })) }] : [] } });

const marcarLeido = (messageId) => (messageId ? enviar({ status: "read", message_id: messageId }) : Promise.resolve({ ok: false }));

/** Verifica X-Hub-Signature-256 contra el cuerpo crudo. */
function verificarFirma(rawBody, header, secret) {
  if (!secret || !header) return false;
  const esperado = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody || "", "utf8").digest("hex");
  const a = Buffer.from(String(header)), b = Buffer.from(esperado);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Responde al GET de verificación del webhook (Meta). */
function verificarWebhook(query, verifyToken) {
  const q = query || {};
  if (q["hub.mode"] === "subscribe" && q["hub.verify_token"] && verifyToken && q["hub.verify_token"] === verifyToken) return { statusCode: 200, body: String(q["hub.challenge"] || "") };
  return { statusCode: 403, body: "verify_token incorrecto" };
}

/** Extrae los mensajes entrantes de un evento del webhook: [{from, nombre, texto, messageId, tipo, timestamp}]. Ignora estados de entrega. */
function parsearWebhook(body) {
  const out = [];
  try {
    for (const entry of (body && body.entry) || []) for (const ch of entry.changes || []) {
      const v = ch.value || {}; if (ch.field && ch.field !== "messages") continue;
      const phoneNumberId = (v.metadata && v.metadata.phone_number_id) || "";
      const nombres = {}; for (const c of v.contacts || []) if (c.wa_id) nombres[c.wa_id] = (c.profile && c.profile.name) || "";
      for (const m of v.messages || []) {
        let texto = "";
        if (m.type === "text") texto = (m.text && m.text.body) || "";
        else if (m.type === "button") texto = (m.button && m.button.text) || "";
        else if (m.type === "interactive") texto = (m.interactive && ((m.interactive.button_reply && m.interactive.button_reply.title) || (m.interactive.list_reply && m.interactive.list_reply.title))) || "";
        const media = (m.type === "audio" && m.audio) || (m.type === "voice" && m.voice) || null;
        out.push({ from: digitos(m.from), nombre: nombres[m.from] || "", texto, messageId: m.id, tipo: m.type, timestamp: m.timestamp, phoneNumberId,
          mediaId: media ? media.id : undefined, mime: media ? media.mime_type : undefined });
      }
    }
  } catch (e) {}
  return out;
}

/** Descarga un medio (nota de voz) de la Cloud API: GET /{media_id} → url temporal → bytes. Devuelve {buffer, mime}. */
async function descargarMedia(mediaId) {
  const c = cfg(); if (!c.token) throw new Error("Falta WSP_TOKEN");
  const r1 = await fetch(`${API}/${encodeURIComponent(mediaId)}`, { headers: { Authorization: "Bearer " + c.token } });
  const meta = await r1.json().catch(() => ({}));
  if (!r1.ok || !meta.url) throw new Error("media " + r1.status + " " + ((meta.error && meta.error.message) || "sin url"));
  const r2 = await fetch(meta.url, { headers: { Authorization: "Bearer " + c.token } });
  if (!r2.ok) throw new Error("media descarga " + r2.status);
  return { buffer: Buffer.from(await r2.arrayBuffer()), mime: meta.mime_type || r2.headers.get("content-type") || "audio/ogg" };
}

/** Estados de entrega con error (p. ej. plantilla no aprobada, ventana de 24 h cerrada): [{code, title}] sin datos personales. */
function estadosFallidos(body) {
  const out = [];
  try {
    for (const entry of (body && body.entry) || []) for (const ch of entry.changes || []) for (const st of (ch.value && ch.value.statuses) || [])
      if (st.status === "failed") for (const e of st.errors || [{}]) out.push({ code: e.code, title: e.title || (e.error_data && e.error_data.details) || "" });
  } catch (e) {}
  return out;
}

module.exports = { enviarTexto, enviarPlantilla, marcarLeido, verificarFirma, verificarWebhook, parsearWebhook, estadosFallidos, descargarMedia, cfg, digitos };
