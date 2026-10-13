#!/usr/bin/env node
// Chat interactivo con el bot en la terminal.  Uso: node tools/chat_cli.js [afiliable|restringible|noafiliable|fonasa]
const path=require("path");globalThis.KB_OFF=require("../public/kb_offline.js").KB_OFF;const B=require("../public/nico_bot.js");
const P={afiliable:{nombre:"Camila Reyes",edad:34,isapre:"Cruz Blanca",renta:"1900000",cargas:"1",clinica_interes:"Clínica Alemana",comuna:"Ñuñoa",region:"RM",preexistencias:"No",que_busca:"pago 280 mil",contacto_pref:"WhatsApp"},
 restringible:{nombre:"Tomás Soto",edad:45,isapre:"Banmédica",renta:"2400000",cargas:"2",clinica_interes:"Clínica Las Condes",preexistencias:"Sí",detalle_preexistencias:"hipertensión y depresión",contacto_pref:"WhatsApp"},
 noafiliable:{nombre:"Gloria Paz",edad:58,isapre:"Colmena",renta:"1500000",cargas:"no",clinica_interes:"Clínica Dávila",preexistencias:"Sí",detalle_preexistencias:"diabetes tipo 2 con insulina",contacto_pref:"WhatsApp"},
 fonasa:{nombre:"Iván Mora",edad:41,isapre:"Fonasa",renta:"700000",cargas:"2",preexistencias:"No",contacto_pref:"Llamada"}};
const lead=P[process.argv[2]||"afiliable"];if(!lead){console.log("perfiles:",Object.keys(P).join(", "));process.exit(1);}
const show=r=>{console.log("\n"+r.t.split(/\n\n/).map(x=>"🤖 "+x).join("\n")+(r.chips&&r.chips.length?"\n   ["+r.chips.join(" | ")+"]":""));};
const s=B.start(lead);console.log("PERFIL:",JSON.stringify(lead));show(s);
const rl=require("readline").createInterface({input:process.stdin,output:process.stdout,prompt:"\n🧑 > "});rl.prompt();
rl.on("line",l=>{l=l.trim();if(l===":lead"){console.log(JSON.stringify(B.lead(),null,1));console.log(B.handoff().resumen);console.log("WA:",B.waTexto());}
 else if(l===":q"||l==="salir")process.exit(0);else if(l){const r=B.reply(l);console.log("   (intención:",r.id,r.conf?r.conf.toFixed(1):"",")");show(r);}rl.prompt();});
