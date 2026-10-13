// Prueba local: node test/run.js   (usa Claude si existe ANTHROPIC_API_KEY, si no la plantilla)
const { handler } = require("../netlify/functions/orientar.js");
const leads = require("./leads_prueba.json");
(async () => {
  for (const lead of leads) {
    const r = await handler({ httpMethod: "POST", headers: {}, body: JSON.stringify(lead), queryStringParameters: {} });
    const o = JSON.parse(r.body);
    console.log("\n==============================", lead.nombre, "→", o.nivel, "|", o.accion, "|", o.generado_por || "-");
    console.log(o.hallazgos.map(h => h.nombre).join(" · "));
    if (o.mensaje) console.log("\n" + o.mensaje + "\n\n[link lead] " + o.link_whatsapp_lead.slice(0, 60) + "…\n[nota interna] " + o.nota_interna);
    else console.log("[nota interna] " + o.nota_interna);
  }
})();
