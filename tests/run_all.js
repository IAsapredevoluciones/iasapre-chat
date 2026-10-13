#!/usr/bin/env node
// Corre toda la batería y resume. Uso: node tests/run_all.js [--fast (sin jsdom)] [--nosim (sin simulaciones, ~10 s)] [--only <texto>]
const {spawnSync}=require("child_process");const path=require("path");
const args=process.argv.slice(2);const fast=args.includes("--fast");const nosim=args.includes("--nosim");const oi=args.indexOf("--only");const only=oi>=0?args[oi+1]:null;
const num=(re,s)=>{const m=s.match(re);return m?parseFloat(m[1]):NaN;};
const pct=s=>num(/(\d+)\/(\d+) = (\d+)%/.test(s)?/\d+\/\d+ = (\d+)%/:/NOMATCH/,s);
const T=[
 {f:"holdout.js",nm:"Held-out 1 (45)",ok:o=>pct(o)>=100},
 {f:"holdout2.js",nm:"Held-out 2 (25)",ok:o=>pct(o)>=100},
 {f:"holdout3.js",nm:"Held-out 3 (20)",ok:o=>pct(o)>=100},
 {f:"holdout_conv.js",nm:"Conversacional (32)",ok:o=>pct(o)>=100},
 {f:"blind.js",nm:"A ciegas 1 (21)",ok:o=>pct(o)>=95},
 {f:"blind2.js",nm:"A ciegas 2 (17)",ok:o=>pct(o)>=95},
 {f:"blind3.js",nm:"A ciegas 3 (20)",ok:o=>pct(o)>=95},
 {f:"blind4.js",nm:"A ciegas 4 · temas nuevos (21)",ok:o=>pct(o)>=95},
 {f:"mh_sweep.js",nm:"Cortafuegos salud mental",ok:o=>num(/(\d+) inconsistencias/,o)===0},
 {f:"audit_sweep.js",nm:"Auditoría de cifras prohibidas",ok:o=>num(/(\d+) hallazgos/,o)===0},
 {f:"uf.js",nm:"UF dinámica (motor: setUF/uf, rango y fallback)",ok:o=>/UF dinámica OK/.test(o)},
 {f:"chat_guard.js",nm:"Backend chat.js: guard() sobre la respuesta del modelo",ok:o=>/chat guard OK/.test(o)},
 {f:"sim3.js",sim:1,a:["6000"],nm:"Simulación v3 (6.000 conv.)",ok:o=>num(/Comprensión: ([\d.]+)%/,o)>=99&&num(/salud mental: (\d+)/,o)===0&&num(/derivación no pedida: ([\d.]+)%/,o)===0},
 {f:"sim.js",sim:1,a:["4000"],nm:"Simulación v1 (4.000 conv.)",ok:o=>num(/Comprensión[^:]*: ([\d.]+)%/,o)>=98},
 {f:"ui_smoke.js",nm:"UI: burbujas iniciales (jsdom)",e2e:1,ok:o=>/Burbujas iniciales: \d+/.test(o)},
 {f:"e2e_flow.js",nm:"E2E: traspaso de leads (jsdom)",e2e:1,ok:o=>/E2E OK/.test(o)},
 {f:"e2e_voz.js",nm:"E2E: dictado por voz (jsdom)",e2e:1,ok:o=>/Mensaje enviado por voz: eh bueno/.test(o)&&/Respuesta: \S/.test(o)},
 {f:"ui_debug.js",nm:"UI: panel de depuración solo con ?debug=1 (jsdom)",e2e:1,ok:o=>/Panel debug OK/.test(o)},
 {f:"ui_uf.js",nm:"UI: UF desde mindicador con caché y fallback (jsdom)",e2e:1,ok:o=>/UF página OK/.test(o)},
];
let bad=0;const rows=[];
for(const t of T){if(fast&&t.e2e)continue;if(nosim&&t.sim)continue;if(only&&!(t.f.includes(only)||(only==="e2e"&&t.e2e)))continue;
 const r=spawnSync("node",[path.join(__dirname,t.f),...(t.a||[])],{encoding:"utf8",timeout:240000,cwd:__dirname});
 const o=(r.stdout||"")+(r.stderr||"");let ok=false;try{ok=t.ok(o)&&r.status===0;}catch(e){}
 if(!ok)bad++;rows.push([ok?"✔":"✘",t.nm,(o.split("\n").find(l=>l.trim())||"").slice(0,70)]);if(!ok)console.log("\n--- "+t.f+" ---\n"+o.slice(0,1500));}
console.log("\n"+rows.map(r=>r.join("  ")).join("\n"));
console.log(`\n${bad?"✘ "+bad+" prueba(s) fallaron":"✔ Todo en verde"} (${rows.length} pruebas)`);process.exit(bad?1:0);
