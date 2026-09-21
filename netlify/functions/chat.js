/**
 * Netlify Function: chat — sin dependencias (usa fetch nativo de Node 18+)
 * POST { messages:[{role,content}...] } -> { text, escalate }
 */
const SYSTEM_PROMPT = require("./lib/prompt.js");
const MODEL = "claude-sonnet-4-6";
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type"};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Método no permitido" }) };
  if (!process.env.ANTHROPIC_API_KEY) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Falta ANTHROPIC_API_KEY en Netlify" }) };
  try {
    const { messages } = JSON.parse(event.body || "{}");
    if (!Array.isArray(messages) || !messages.length) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "messages vacío" }) };
    const clean = messages.slice(-20).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 4000) }));
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1000, system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }], messages: clean })
    });
    if (!r.ok) { const e = await r.text(); console.error("anthropic", r.status, e); return { statusCode: r.status === 401 ? 401 : 502, headers: cors, body: JSON.stringify({ error: "Error del motor" }) }; }
    const d = await r.json();
    const text = (d.content || []).filter(c => c.type === "text").map(c => c.text).join("\n");
    return { statusCode: 200, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify({ text, escalate: text.includes("[[CONTACTO]]"), usage: d.usage }) };
  } catch (err) {
    console.error("chat error", err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Error procesando la consulta" }) };
  }
};
