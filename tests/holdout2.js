globalThis.KB_OFF=require("../public/kb_offline.js").KB_OFF;const B=require("../public/nico_bot.js");
// SET NUEVO, escrito después de ajustar: mide generalización real
const H=[
["buenas, mi isapre me cobra 320 mil y gano 2 palos, es normal?",/bajar_costo|cuanto|fonasa/],
["me puedo cambiar a un plan mas barato sin que me pidan la declaracion de salud de nuevo?",/pasos_plan|preex_dentro|bajar/],
["la clinica bupa me queda al lado, que tal es para mi",/mejor_clinica/],
["en marzo me llego una carta diciendo que el plan sube 3,5%",/cautivo|alza/],
["con mi diabetes que medicamentos me cubren gratis",/tratamiento|medicamentos|ges/],
["que pasa si me interno en la clinica por la diabetes, cuanto pago",/deducible|tratamiento/],
["tengo esclerosis multiple y uso un biologico muy caro",/tratamiento|ricarte|deducible/],
["puedo usar los excedentes para pagar los remedios?",/siete|excedente|medicamentos/],
["mi hija de 26 sigue en mi plan, la puedo dejar?",/cargas|hijos/],
["no quiero que nadie me llame, solo dime que hago",/bajar|pasos|leer|ack|tratamiento|sin_llamadas/],
["si me quedan debiendo la licencia que hago",/licencia/],
["que tan malo es que mi plan sea cerrado",/tipos_plan/],
["me ofrecieron un plan con 90% en la davila, es bueno?",/mejor_clinica|tope|tipos/],
["el vendedor me dijo que no declarara mi enfermedad",/intentar_otra|vendedor|preex/],
["hay alguna isapre que acepte diabeticos?",/intentar_otra|diabetes|preex/],
["mi tramo de fonasa cual seria?",/fonasa|cuanto/],
["que me conviene mas, un plan mas caro o un seguro aparte?",/complementario|bajar|fonasa|comparar/],
["me quede sin trabajo y tengo cancer, que pasa con mi isapre",/cesantia|cesant/],
["como hago para que me devuelvan los excesos",/siete|excedente|doble|ley_corta/],
["el ges me cubre la insulina?",/tratamiento|ges|medicamentos/],
["pueden subirme el plan por tener diabetes?",/cautivo|terminar|alza/],
["quiero bajar mi plan pero me da miedo perder cobertura",/bajar_costo|miedo/],
["la dialisis me sale muy cara",/deducible|tratamiento|renal/],
["en regiones que clinica conviene con consalud",/mejor_clinica|beneficios|clinica|isapre_info/],
["necesito hablar con alguien hoy",/escalar/],
];
let ok=0;const bad=[];
for(const [q,re] of H){B.start({nombre:"Pedro Soto",isapre:"Banmédica",renta:"2000000",cargas:"1",clinica_interes:"",preexistencias:"Sí",detalle_preexistencias:"diabetes tipo 2 con insulina"});const r=B.reply(q);if(re.test(r.id))ok++;else bad.push(r.id.padEnd(22)+" ← "+q);}
console.log(`Held-out 2: ${ok}/${H.length} = ${(100*ok/H.length).toFixed(0)}%`);console.log(bad.join("\n"));
