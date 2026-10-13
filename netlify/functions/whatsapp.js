// Netlify Function (formato moderno, Request/Response): whatsapp — webhook de WhatsApp Business Cloud API (Meta)
// para el asistente de IAsapre (+56 9 5373 0030).
// GET: verificación del webhook (hub.verify_token = WSP_VERIFY_TOKEN). POST: mensajes entrantes (firma X-Hub-Signature-256 con WSP_APP_SECRET).
// Lógica en lib/wsp_agent.js (asignaciones desde +56 9 8883 0767, asesoría con Claude + guard(), derivación a +56 9 8538 0357).
// Formato moderno = Netlify Blobs con consistencia fuerte (el clásico perdía turnos entre mensajes seguidos).
// URL del webhook: https://iasapre-chat.netlify.app/.netlify/functions/whatsapp · Guía: docs/CANAL_WHATSAPP.md
import agente from "./lib/wsp_agent.js";
import moderno from "./lib/moderno.js";
const handler = agente.crearHandler();
export default async (req) => moderno.aResponse(await handler(await moderno.aEvento(req)));
