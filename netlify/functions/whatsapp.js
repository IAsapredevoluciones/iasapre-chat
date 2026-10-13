// Netlify Function: whatsapp — webhook de WhatsApp Business Cloud API (Meta) para el asistente de IAsapre (+56 9 5373 0030).
// GET: verificación del webhook (hub.verify_token = WSP_VERIFY_TOKEN). POST: mensajes entrantes (firma X-Hub-Signature-256 con WSP_APP_SECRET).
// Lógica en lib/wsp_agent.js (asignaciones desde +56 9 8883 0767, asesoría con Claude + guard(), derivación a +56 9 8538 0357).
// URL del webhook: https://iasapre-chat.netlify.app/.netlify/functions/whatsapp · Guía: docs/CANAL_WHATSAPP.md
exports.handler = require("./lib/wsp_agent.js").crearHandler();
