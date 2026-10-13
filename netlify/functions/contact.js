// Netlify Function: contact — recibe leads del chatbot y los reenvía a webhooks configurados.
// Privacidad: el texto con detalles de salud SOLO viaja a LEADS_WEBHOOK / ZAPIER_WEBHOOK (tu CRM) y solo desde la etapa
// "comparacion"/"escalar" (cuando la persona pidió que el equipo la contacte). Discord y los logs NO reciben datos de salud.
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type"};
const STAGES = ["form","comparacion","escalar","wa_click"];
const TIERS = {caliente:"🔥",tibio_alto:"🟠",tibio:"🟡",familiar:"👪",orientacion_insiste:"🙋",orientacion_resuelto:"✅",nuevo:"🆕"};
const clip = (s, n) => String(s == null ? "" : s).slice(0, n);
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Método no permitido" }) };
  try {
    if ((event.body || "").length > 20000) return { statusCode: 413, headers: cors, body: JSON.stringify({ error: "Mensaje demasiado grande" }) };
    const d = JSON.parse(event.body || "{}");
    if (d.hp) return { statusCode: 200, headers: cors, body: JSON.stringify({ status: "success" }) }; // honeypot anti-bots
    const phone = clip(d.phone, 30).replace(/[^\d+]/g, "");
    if (!d.name || phone.replace(/\D/g, "").length < 8) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Faltan nombre o teléfono válido" }) };
    const stage = STAGES.includes(d.stage) ? d.stage : "form";
    const full = stage === "comparacion" || stage === "escalar";
    const lead = {
      id: Date.now(), stage, tier: clip(d.tier, 30) || "nuevo", score: Number(d.score) || 0,
      name: clip(d.name, 120), phone, email: clip(d.email, 120), preference: clip(d.preference || "whatsapp", 20),
      question: full ? clip(d.question, 500) : "", resumen: full ? clip(d.resumen, 3000) : clip(d.resumen, 200),
      nota_interna: clip(d.nota_interna, 300),
      transcript: full && Array.isArray(d.transcript) ? d.transcript.slice(-12).map(x => clip(x, 400)) : [],
      source: clip(d.source || "chatbot", 40), page: clip(d.page, 300), timestamp: d.timestamp || new Date().toISOString(),
    };
    const posts = [];
    for (const k of ["LEADS_WEBHOOK", "ZAPIER_WEBHOOK"]) if (process.env[k]) posts.push(fetch(process.env[k], { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) }));
    if (process.env.DISCORD_WEBHOOK) {
      const emo = TIERS[lead.tier] || "🆕";
      const hot = stage === "comparacion" || stage === "escalar" || stage === "wa_click";
      const titulo = stage === "form" ? "Nuevo formulario" : stage === "comparacion" ? "PIDIÓ COMPARACIÓN" : stage === "escalar" ? "PIDIÓ HABLAR CON UNA PERSONA" : "Abrió WhatsApp";
      posts.push(fetch(process.env.DISCORD_WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: `${emo} ${hot ? "**" + titulo + "**" : titulo} · ${lead.tier} · puntaje ${lead.score}\n**${lead.name}** · ${lead.phone}${lead.email ? " · " + lead.email : ""}\nPrefiere: ${lead.preference}\n${lead.nota_interna}\n(El detalle del caso está en tu CRM/webhook)` }) }));
    }
    if (posts.length === 0) console.warn("LEAD SIN DESTINO CONFIGURADO (define LEADS_WEBHOOK o DISCORD_WEBHOOK en Netlify)", JSON.stringify({ id: lead.id, stage: lead.stage, tier: lead.tier, name: lead.name, phone: lead.phone, preference: lead.preference })); // respaldo: contacto sin datos de salud
    await Promise.allSettled(posts);
    console.log("LEAD", JSON.stringify({ id: lead.id, stage: lead.stage, tier: lead.tier, score: lead.score })); // sin datos personales ni de salud
    return { statusCode: 200, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify({ status: "success", id: lead.id }) };
  } catch (e) {
    console.error("contact error", e && e.message);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Error al procesar contacto" }) };
  }
};
