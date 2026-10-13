#!/usr/bin/env node
// Muestra los puntajes de intención de una frase.  Uso: node tools/dbg.js "me subieron el plan" [afiliable|noafiliable]
globalThis.KB_OFF=require("../public/kb_offline.js").KB_OFF;const B=require("../public/nico_bot.js");
const afi={nombre:"Ana",isapre:"Colmena",renta:"1500000",cargas:"1",preexistencias:"No"},no={nombre:"Ana",isapre:"Colmena",renta:"1500000",preexistencias:"Sí",detalle_preexistencias:"diabetes tipo 2"};
B.start(process.argv[3]==="noafiliable"?no:afi);const f=process.argv[2]||"";console.log("puntajes:",JSON.stringify(B._dbg(f)));const r=B.reply(f);console.log("→",r.id,"\n"+r.t);
