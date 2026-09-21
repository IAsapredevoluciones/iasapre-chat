// Netlify Function: contact — recibe leads del chatbot y los reenvía a webhooks configurados
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type"};
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Método no permitido" }) };
  try {
    const d = JSON.parse(event.body || "{}");
    if (!d.name || !d.phone) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Faltan nombre o teléfono" }) };
    const lead = { id: Date.now(), name: d.name, phone: d.phone, email: d.email || "", preference: d.preference || "whatsapp", question: d.question || "", transcript: d.transcript || [], source: d.source || "chatbot", page: d.page || "", timestamp: d.timestamp || new Date().toISOString() };
    const posts = [];
    for (const k of ["LEADS_WEBHOOK", "ZAPIER_WEBHOOK"]) if (process.env[k]) posts.push(fetch(process.env[k], { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) }));
    if (process.env.DISCORD_WEBHOOK) posts.push(fetch(process.env.DISCORD_WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: `📞 Nuevo lead IAsapre\n**${lead.name}** · ${lead.phone} · ${lead.email}\nPrefiere: ${lead.preference}\nConsulta: ${lead.question}\nOrigen: ${lead.page}` }) }));
    await Promise.allSettled(posts);
    console.log("LEAD", JSON.stringify(lead));
    return { statusCode: 200, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify({ status: "success", id: lead.id }) };
  } catch (e) {
    console.error("contact error", e);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Error al procesar contacto" }) };
  }
};
