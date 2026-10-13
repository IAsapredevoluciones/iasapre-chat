#!/usr/bin/env node
// Prueba de humo contra PRODUCCIÓN (npm run smoke): descarga el motor y la KB publicados y corre contra ellos
// los mismos barridos de la batería (cortafuegos de salud mental + auditoría de cifras) y los marcadores de la v6.
// Uso: node tests/remote_smoke.js   (o SMOKE_URL=https://otro-sitio node tests/remote_smoke.js)
const fs=require("fs"),path=require("path"),os=require("os"),{spawnSync}=require("child_process");
const BASE=(process.env.SMOKE_URL||"https://iasapre-chat.netlify.app").replace(/\/$/,""); // sitio nuevo (13-oct-2026); el antiguo iasapre.netlify.app quedó en otra cuenta con la v3
const fails=[];const ok=(c,m)=>{console.log((c?" ✔ ":" ✘ ")+m);if(!c)fails.push(m);};
(async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),"iasapre-smoke-"));
 const get=async(p)=>{const ctrl=new AbortController();const to=setTimeout(()=>ctrl.abort(),20000);try{const r=await fetch(BASE+p,{signal:ctrl.signal,headers:{"cache-control":"no-cache"}});if(!r.ok)throw new Error(p+" → HTTP "+r.status);return await r.text();}finally{clearTimeout(to);}};
 try{
  const bot=await get("/nico_bot.js"),kb=await get("/kb_offline.js"),page=await get("/orientador");
  fs.writeFileSync(path.join(dir,"nico_bot.js"),bot);fs.writeFileSync(path.join(dir,"kb_offline.js"),kb);
  console.log(`Producción: ${BASE} · nico_bot.js ${(bot.length/1024).toFixed(0)} KB · kb_offline.js ${(kb.length/1024).toFixed(0)} KB`);
  ok(/urgencia_ley/.test(bot),"nico_bot.js publicado contiene urgencia_ley (v6)");
  ok(/handoff/.test(bot),"nico_bot.js publicado contiene handoff (v6)");
  ok(/notify\(/.test(page),"orientador publicado avisa al equipo (notify)");
  ok(/debug=1/.test(page),"orientador publicado oculta el panel de depuración salvo ?debug=1");
  ok(/mindicador\.cl\/api\/uf/.test(page),"orientador publicado carga la UF del día");
  globalThis.KB_OFF=require(path.join(dir,"kb_offline.js")).KB_OFF;const B=require(path.join(dir,"nico_bot.js"));
  ok(B&&typeof B.start==="function"&&typeof B.reply==="function"&&typeof B.guard==="function","motor remoto carga y exporta start/reply/guard");
  const g=B.guard("Hola. La depresión es una preexistencia y te pueden restringir 18 meses. Sigue con tu plan.");
  ok(!/preexistencia y te pueden restringir/i.test(g)&&/21\.?331/.test(g),"guard() remoto elimina la frase y cita la Ley 21.331");
  const r0=B.start({nombre:"Prueba",isapre:"Colmena",renta:"1500000",preexistencias:"No"});ok(r0&&typeof r0.t==="string"&&r0.t.length>20,"start() remoto responde");
  const r1=B.reply("eres un bot?");ok(/asistente/i.test(r1.t)&&/IAsapre/.test(r1.t),"se identifica como asistente de IAsapre");
  for(const t of ["mh_sweep.js","audit_sweep.js"]){const r=spawnSync("node",[path.join(__dirname,t)],{encoding:"utf8",env:{...process.env,NB_PUBLIC:dir},timeout:180000});const o=(r.stdout||"")+(r.stderr||"");const m=o.match(/(\d+) (inconsistencias|hallazgos)/);ok(r.status===0&&!!m&&m[1]==="0",t+" contra producción: "+(m?o.split("\n")[0]:o.slice(0,120)));}
 }catch(e){ok(false,"error: "+(e&&e.message));}
 finally{try{fs.rmSync(dir,{recursive:true,force:true});}catch(e){}}
 console.log(fails.length?`\n✘ Humo remoto: ${fails.length} falla(s) en ${BASE}`:`\n✔ Humo remoto OK (${BASE})`);process.exit(fails.length?1:0);})();
