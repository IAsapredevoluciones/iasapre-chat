// Netlify Function (formato moderno, Request/Response): asignar — asignaciones de leads por HTTP desde app.iasapre.cl.
// POST /.netlify/functions/asignar · header Authorization: Bearer <ASIGNAR_SECRET> · body {texto} o {nombre, telefono, leadId, …}
// Lógica en lib/asignar_core.js; adaptador en lib/moderno.js. Formato moderno = Netlify Blobs con consistencia fuerte.
import core from "./lib/asignar_core.js";
import moderno from "./lib/moderno.js";
const handler = core.crearHandler();
export default async (req) => moderno.aResponse(await handler(await moderno.aEvento(req)));
