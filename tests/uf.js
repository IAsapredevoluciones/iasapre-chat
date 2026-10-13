// UF dinámica en el motor: setUF()/uf(), validación de rango y uso en los cálculos (el motor sigue offline: no hace red)
globalThis.KB_OFF=require("../public/kb_offline.js").KB_OFF;const B=require("../public/nico_bot.js");
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
const fmt=n=>"$"+Math.round(n).toLocaleString("es-CL");
ok(B.uf()===41000&&B.UF_DEFAULT===41000,"valor de respaldo 41.000");
ok(B.setUF("abc")===41000&&B.setUF(5)===41000&&B.setUF(999999)===41000&&B.setUF(null)===41000,"valores inválidos o fuera de rango se ignoran");
ok(B.setUF(41146.83)===41146.83&&B.uf()===41146.83,"setUF acepta la UF del día");
B.start({nombre:"Ana",isapre:"Colmena",renta:"10000000",cargas:"no",preexistencias:"No"});
let r=B.reply("cuanto es el 7% de mi sueldo");ok(r.t.includes(fmt(90*41146.83*0.07)),"7% con tope imponible usa la UF nueva: "+fmt(90*41146.83*0.07));
r=B.reply("cuanto es el deducible de la caec");ok(r.t.includes(fmt(60*41146.83))&&r.t.includes(fmt(126*41146.83)),"deducible CAEC (60–126 UF) usa la UF nueva");
B.setUF(42000);B.start({nombre:"Ana",isapre:"Colmena",renta:"10000000",cargas:"no",preexistencias:"No"});
r=B.reply("cuanto es el 7% de mi sueldo");ok(r.t.includes(fmt(90*42000*0.07)),"al cambiar la UF cambian los cálculos");
ok(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|new WebSocket/.test(require("fs").readFileSync(require.resolve("../public/nico_bot.js"),"utf8")),"el motor no hace llamadas de red");
B.setUF(41000);
console.log(fails.length?"FALLAS:\n - "+fails.join("\n - "):"UF dinámica OK: setUF/uf, rango, cálculos y motor sin red");process.exit(fails.length?1:0);
