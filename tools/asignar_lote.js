#!/usr/bin/env node
// Asigna leads al asistente de WhatsApp en lote (llama al endpoint /.netlify/functions/asignar por cada uno).
// Uso:  ASIGNAR_SECRET=xxx node tools/asignar_lote.js leads.json
//   leads.json = [{ "nombre": "Camila Rojas", "telefono": "+56 9 9015 6640", "leadId": "d9b4…", "renta": "…", "region": "…", "clinica": "…", "cargas": "…", "contacto": "…" }, …]
//   (también acepta un CSV con cabecera: nombre,telefono,leadId,renta,region,clinica,cargas,contacto)
// Para cada lead el asistente abre la conversación con la plantilla aprobada (asesoria_inicio) o, si la persona ya conversaba, solo actualiza sus datos.
// Si el secreto no está en el entorno, lo pide por consola (no queda en el historial del shell).
const fs = require("fs"), readline = require("readline");
const URL_ = process.env.ASIGNAR_URL || "https://iasapre-chat.netlify.app/.netlify/functions/asignar";
function leer(path) {
  const txt = fs.readFileSync(path, "utf8").trim();
  if (txt.startsWith("[")) return JSON.parse(txt);
  const [cab, ...filas] = txt.split(/\r?\n/).filter(Boolean); const cols = cab.split(",").map((c) => c.trim());
  return filas.map((f) => { const v = f.split(","); const o = {}; cols.forEach((c, i) => { o[c] = (v[i] || "").trim(); }); return o; });
}
function pedir(pregunta) { return new Promise((res) => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); rl.question(pregunta, (r) => { rl.close(); res(r.trim()); }); }); }
(async () => {
  const archivo = process.argv[2]; if (!archivo) { console.error("Uso: ASIGNAR_SECRET=xxx node tools/asignar_lote.js leads.json"); process.exit(1); }
  const secreto = process.env.ASIGNAR_SECRET || (await pedir("Pega el ASIGNAR_SECRET y pulsa Enter: "));
  const leads = leer(archivo); let ok = 0;
  for (const l of leads) {
    const r = await fetch(URL_, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + secreto }, body: JSON.stringify(l) });
    const j = await r.json().catch(() => ({})); if (r.ok && j.ok) ok++;
    console.log(`${r.ok && j.ok ? "✔" : "✘"} ${l.nombre || "?"} · ${l.telefono || "?"} → ${r.status} ${j.tipo || ""} ${j.accion || ""} ${j.enviado === false ? "(NO ENVIADO)" : ""} ${j.error || ""}`);
  }
  console.log(`\n${ok}/${leads.length} asignaciones aceptadas.`);
})();
