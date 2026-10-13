// node sim.js [N]  → simula N conversaciones y reporta métricas
const KB=require("../public/kb_offline.js"); globalThis.KB_OFF=KB.KB_OFF;
const Bot=require("../public/nico_bot.js");
const N=parseInt(process.argv[2]||"3000"); let seed=42; const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;}; const pick=a=>a[Math.floor(rnd()*a.length)];

// preguntas etiquetadas: [texto, ids aceptables (regex)]
const Q=[
 // costo
 ["quiero pagar menos",/bajar_costo|fonasa/],["pago demasiado por mi plan",/bajar_costo|fonasa|segunda/],["como bajo el precio de mi isapre",/bajar_costo|fonasa/],["mi plan esta muy caro",/bajar_costo|fonasa|segunda/],["no me alcanza la plata pa la isapre",/bajar_costo|fonasa|cesant/],["se puede bajar mi plan?",/bajar_costo|fonasa/],["estoy pagando 250 lucas, es mucho?",/bajar_costo|fonasa|cuanto|segunda/],
 // clínica
 ["quiero atenderme en la clinica davila",/mejor_clinica/],["me cubre bien en la alemana?",/mejor_clinica/],["que tal la cobertura en redsalud",/mejor_clinica/],["quiero mejor cobertura en mi clinica",/mejor_clinica/],["la santa maria esta en mi plan?",/mejor_clinica/],["me atiendo en indisa",/mejor_clinica/],
 // tratamiento
 ["que me cubre para mi tratamiento",/tratamiento/],["me cubren la insulina?",/tratamiento|medicamentos|diabetes/],["cubren la quimio?",/tratamiento|cancer/],["que pasa con mis controles",/tratamiento/],["mis remedios de la diabetes los cubre la isapre",/tratamiento|medicamentos|diabetes/],["me cubren los examenes",/tratamiento|copago/],
 // pasos
 ["como pido el cambio de plan",/pasos_plan/],["paso a paso porfa",/pasos_plan/],["quiero cambiarme de plan",/pasos_plan/],["como cambio mi plan sin declaracion",/pasos_plan|preex_dentro/],["me pueden pedir declaracion de salud si me cambio de plan",/pasos_plan|preex_dentro/],
 // alza / cautivo
 ["me subieron el plan",/cautivo|alza/],["me llego la carta de adecuacion",/cautivo|alza/],["puedo reclamar el alza?",/cautivo|alza|reclamo/],["subio mucho la isapre este año",/cautivo|alza/],
 // otra isapre
 ["y si igual intento otra isapre",/intentar_otra/],["que pasa si no declaro la diabetes",/intentar_otra|preex_no_declare/],["puedo ocultar mi enfermedad",/intentar_otra|preex_no_declare/],["quiero cambiarme de isapre igual",/intentar_otra|cambiar_isapre|cambio_isapre/],["otra isapre me acepta?",/intentar_otra|preex_cambio|cambiar/],
 // fonasa
 ["me conviene irme a fonasa",/fonasa/],["y fonasa?",/fonasa/],["en que tramo quedo",/fonasa|tramo|cuanto/],["si me paso a fonasa puedo volver",/fonasa/],["el consultorio es gratis?",/fonasa/],
 // complementario
 ["que es un seguro complementario",/complementario/],["como armo fonasa mas seguro",/complementario/],["que es la mcc de fonasa",/complementario/],["el seguro de mi pega me cubre?",/complementario/],
 // cuanto pago
 ["cuanto deberia pagar",/cuanto_pago/],["cuanto es mi 7%",/cuanto_pago|siete/],["cuanto me descuentan de salud",/cuanto_pago|siete/],
 // caec
 ["que es la caec",/deducible|caec/],["cuanto es el deducible",/deducible|caec/],["si me hospitalizan y la cuenta es enorme",/deducible|caec|urgencia/],
 // otros
 ["me diagnosticaron despues de entrar a la isapre",/no_es_preex/],["tengo depresion, me afecta?",/salud_mental/],["la ansiedad es preexistencia?",/salud_mental/],
 ["que beneficios tiene mi isapre",/beneficios/],["tienen convenio dental?",/beneficios|dental/],
 ["que es un tope",/tope/],["que son las coberturas restringidas",/restringidas/],["como activo el ges",/ges/],["que es la ley ricarte soto",/ricarte/],["me rechazaron una licencia",/licencia/],
 ["no me lee la huella en la clinica",/huella/],["me pidieron cheque en la urgencia",/urgencia/],["quede cesante",/cesantia/],["que pasa con mis excedentes",/siete|excedente|ley_corta/],["me deben plata por la ley corta",/ley_corta/],
 ["quiero hablar con nico",/escalar/],["me pueden llamar?",/escalar/],["hablar con una persona",/escalar/],
 ["hola",/saludo|menu/],["gracias!",/gracias/],["muchas gracias nico",/gracias/],
];
// respuestas cortas contextuales
const SHORT=["si","sí porfa","dale","ok","ya","no","no gracias"];
const PREF=["","","","hola ","oye ","nico ","una pregunta, ","consulta: ","disculpa, "];
const SUF=["","","","?","??"," porfa"," por favor"," gracias"];
function ruido(s){let x=s;if(rnd()<.3)x=x.replace(/[áéíóú]/g,m=>"aeiou"["áéíóú".indexOf(m)]);
 if(rnd()<.25){const w=x.split(" ");const i=Math.floor(rnd()*w.length);if(w[i].length>5){const j=1+Math.floor(rnd()*(w[i].length-2));w[i]=w[i].slice(0,j)+w[i].slice(j+1);}x=w.join(" ");}
 if(rnd()<.2)x=x.toUpperCase();return pick(PREF)+x+pick(SUF);}

const ISAP=["Banmédica","Colmena","Consalud","Cruz Blanca","Vida Tres","Nueva Masvida","Esencial","Fonasa","Otra / sin previsión"];
const COND=["diabetes tipo 2 con metformina","diabetes tipo 1, uso insulina","cáncer de mama 2023 en tratamiento","linfoma, terminé quimio el 2024","obesidad imc 38","me hice manga gástrica en 2024","infarto 2023 con 2 stent","insuficiencia renal, estoy en diálisis","vih en tratamiento","lupus","artritis reumatoide con biológico","esclerosis múltiple","hepatitis c","parkinson","trasplante de riñón"];
const CLIN=["Clínica Dávila","Clínica Alemana","RedSalud Providencia","Clínica Santa María","Indisa","Bupa Reñaca","UC Christus","",""];
const stats={conv:0,turns:0,ok:0,bad:0,miss:0,esc:0,escExplicit:0,convEsc:0,convResolved:0,byId:{},fails:{}};
for(let c=0;c<N;c++){
 const lead={nombre:pick(["María José Pérez","Juan Soto","Camila Rojas","Pedro","Andrea Muñoz","Luis","Francisca Díaz"]),edad:25+Math.floor(rnd()*45),isapre:pick(ISAP),renta:String(pick([450000,700000,900000,1200000,1600000,2200000,3500000,6000000])),
  region:"RM",comuna:pick(["Maipú","Ñuñoa","La Florida","Viña del Mar","Concepción",""]),cargas:pick(["no","1","2","3","4 o más"]),clinica_interes:pick(CLIN),preexistencias:"Sí",detalle_preexistencias:pick(COND),que_busca:pick(["bajar el costo","mejor cobertura","",""]),contacto_pref:"WhatsApp"};
 const s=Bot.start(lead); if(!s.t||s.t.length<200){stats.fails["start_corto"]=(stats.fails["start_corto"]||0)+1;}
 stats.conv++; let esc=false, escExplicit=false; const turns=2+Math.floor(rnd()*6);
 for(let k=0;k<turns;k++){
  let q,exp;
  if(rnd()<.18&&k>0){q=pick(SHORT);exp=null;}
  else if(rnd()<.12){q=pick(s.chips.length?s.chips:["hola"]);exp=null;}
  else {const it=pick(Q);q=ruido(it[0]);exp=it[1];}
  const prevId=Bot._state().last;const prevNeed=Bot._state().need;const r=Bot.reply(q); stats.turns++; if(/gracias/i.test(q)&&r.id==="fonasa")stats.fails["DBG prev="+prevId+" need="+prevNeed+" q="+q]=1;
  if(!r.t||r.t.length<20)stats.fails["vacía:"+q]=(stats.fails["vacía:"+q]||0)+1;
  if(/undefined|NaN|null|\$NaN/.test(r.t))stats.fails["dato roto:"+r.id]=(stats.fails["dato roto:"+r.id]||0)+1;
  if(r.escalar){esc=true;if(r.id==="escalar")escExplicit=true;}
  if(r.id==="no_entendi"||r.id==="escalar_auto")stats.miss++;
  stats.byId[r.id]=(stats.byId[r.id]||0)+1;
  if(exp){ if(exp.test(r.id))stats.ok++; else {stats.bad++;if(r.id==="no_entendi"&&/hola/i.test(q))stats.fails["RAW:"+JSON.stringify(q)]=1;const key=q.toLowerCase().replace(/^(hola |oye |nico |una pregunta, |consulta: |disculpa, )/,"").replace(/[?]+$| porfa$| por favor$| gracias$/,"")+" → "+r.id;stats.fails[key]=(stats.fails[key]||0)+1;} }
 }
 if(esc)stats.convEsc++; if(escExplicit)stats.escExplicit++; if(!esc||escExplicit)stats.convResolved++;
}
const lab=stats.ok+stats.bad;
console.log(`Conversaciones: ${stats.conv} · turnos: ${stats.turns}`);
console.log(`Comprensión (pregunta → respuesta correcta): ${(100*stats.ok/lab).toFixed(1)}%  (${stats.bad} errores de ${lab})`);
console.log(`Turnos sin entender: ${(100*stats.miss/stats.turns).toFixed(1)}%`);
console.log(`Conversaciones derivadas a Nico: ${(100*stats.convEsc/stats.conv).toFixed(1)}%  (de ellas, porque la persona lo pidió: ${(100*stats.escExplicit/stats.conv).toFixed(1)}%)`);
console.log(`Conversaciones resueltas por el bot (sin derivación forzada): ${(100*(stats.conv-(stats.convEsc-stats.escExplicit))/stats.conv).toFixed(1)}%`);
const top=Object.entries(stats.fails).sort((a,b)=>b[1]-a[1]).slice(0,25);console.log("\nErrores más frecuentes:");for(const [k,v] of top)console.log(String(v).padStart(5),k);
