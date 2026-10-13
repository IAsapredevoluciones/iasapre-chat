/**
 * Netlify Function: orientar
 * POST con el lead del formulario de iasapre.cl → clasifica preexistencias y, si no es afiliable en otras isapres,
 * genera una asesoría personalizada (Claude; respaldo con plantilla) y la devuelve lista para enviar por WhatsApp/email.
 *
 * Body esperado (mismos campos del "Nuevo Lead Recibido"; todos opcionales salvo nombre):
 * { nombre, edad, email, telefono, isapre, plan_actual, renta, region, comuna, cargas, edad_cargas,
 *   preexistencias: "Sí"|"No", detalle_preexistencias, contacto_pref, que_busca, clinica_interes, imc, origen }
 *
 * Respuesta: { lead_id, nivel, hallazgos, resumen, derivar_ejecutivo, mensaje, canal_sugerido, link_whatsapp_lead,
 *              link_whatsapp_ejecutivo, nota_interna, generado_por }
 */
const { clasificar } = require("../../lib/reglas.js");
const { SYSTEM, userMessage, WSP } = require("../../lib/prompt.js");
const { generar } = require("../../lib/plantilla.js");
let PLANES = {}; try { PLANES = require("../../data/planes.json"); } catch (e) {}

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, X-Api-Secret" };
const slug = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");

async function conClaude(lead, clasif, planes) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: process.env.MODEL || "claude-sonnet-4-6", max_tokens: 700, temperature: 0.8,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMessage(lead, clasif, planes) }] }),
  });
  if (!r.ok) { console.error("anthropic", r.status, await r.text()); return null; }
  const d = await r.json();
  const text = (d.content || []).filter(c => c.type === "text").map(c => c.text).join("\n").trim();
  return text.length > 80 ? text : null;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Método no permitido" }) };
  if (process.env.API_SECRET && event.headers["x-api-secret"] !== process.env.API_SECRET) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "No autorizado" }) };
  try {
    const lead = JSON.parse(event.body || "{}");
    if (!lead.nombre) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Falta nombre" }) };
    const detalle = [lead.detalle_preexistencias, lead.que_busca].filter(Boolean).join(". ");
    const clasif = clasificar(detalle, { imc: lead.imc });
    const lead_id = lead.lead_id || Date.now();

    // Solo se orienta automáticamente a quienes no son afiliables en otras isapres (o si se fuerza con ?todos=1)
    const forzar = event.queryStringParameters && event.queryStringParameters.todos === "1";
    if (clasif.nivel !== "no_afiliable" && !forzar) {
      return { statusCode: 200, headers: { ...cors, "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id, ...clasif, derivar_ejecutivo: true, mensaje: null, accion: "flujo_normal",
          nota_interna: clasif.nivel === "restringible" ? "Afiliable con restricción 18 meses: asignar ejecutivo normal y advertirle la restricción." : "Asignar ejecutivo según ranking normal." }) };
    }

    const planes = PLANES[slug(lead.isapre)] || [];
    let mensaje = null, generado_por = "plantilla";
    try { mensaje = await conClaude(lead, clasif, planes); if (mensaje) generado_por = "claude"; } catch (e) { console.error("claude error", e); }
    if (!mensaje) mensaje = generar(lead, clasif, planes);

    const pila = String(lead.nombre).trim().split(/\s+/)[0];
    const link_whatsapp_lead = `https://wa.me/${WSP}?text=${encodeURIComponent(`Hola Nico, soy ${pila}. Me llegó tu mensaje de IAsapre y quiero que revisemos mi plan de ${lead.isapre || "salud"}.`)}`;
    const tel = String(lead.telefono || "").replace(/\D/g, "");
    const link_whatsapp_ejecutivo = tel ? `https://wa.me/${tel.startsWith("56") ? tel : "56" + tel}?text=${encodeURIComponent(mensaje)}` : null;
    const nota_interna = `LEAD DE ORIENTACIÓN · ${clasif.hallazgos.map(h => h.nombre).join("; ")} · Isapre actual: ${lead.isapre || "s/d"} · Renta: ${lead.renta || "s/d"} · Cargas: ${lead.cargas || "no"} · Clínica: ${lead.clinica_interes || "s/d"}. Estrategia: ${/fonasa/i.test(lead.isapre || "") || !lead.isapre ? "orientar a Fonasa + seguro complementario (no es afiliable en isapre)" : "optimizar dentro de su isapre actual (cambio de plan sin nueva Declaración de Salud) o Fonasa + complementario"}. No asignar a ejecutivo de otra isapre.`;

    const out = { lead_id, ...clasif, derivar_ejecutivo: true, accion: "orientacion_automatica", mensaje, generado_por,
      canal_sugerido: /email|correo/i.test(lead.contacto_pref || "") ? "email" : "whatsapp", link_whatsapp_lead, link_whatsapp_ejecutivo, nota_interna,
      timestamp: new Date().toISOString() };

    // Reenvío opcional a la plataforma / WhatsApp API (webhooks por variable de entorno)
    const posts = [];
    for (const k of ["LEADS_WEBHOOK", "WHATSAPP_WEBHOOK"]) if (process.env[k]) posts.push(fetch(process.env[k], { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...out, lead }) }));
    await Promise.allSettled(posts);

    return { statusCode: 200, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify(out) };
  } catch (e) {
    console.error("orientar error", e);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Error procesando el lead" }) };
  }
};
