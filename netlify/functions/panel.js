// Netlify Function (formato moderno): panel — revisión de conversaciones y eventos del asistente de WhatsApp (solo lectura).
// Protegido con autenticación básica (PANEL_USUARIO / PANEL_SECRET). Lógica en lib/panel_core.js.
// URL: https://iasapre-chat.netlify.app/.netlify/functions/panel
import core from "./lib/panel_core.js";
import moderno from "./lib/moderno.js";
const handler = core.crearHandler();
export default async (req) => moderno.aResponse(await handler(await moderno.aEvento(req)));
