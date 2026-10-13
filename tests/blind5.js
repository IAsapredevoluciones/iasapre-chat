// Set a ciegas 5 (escrito ANTES de ajustar el motor, 12-oct-2026; medía 19/25 = 76 % antes de las reglas, 25/25 después): cambio de plan, alzas, urgencia, licencias,
// seguros, Fonasa vs isapre y cargas. Frases realistas: typos, jerga chilena y transcripciones de audio.
globalThis.KB_OFF=require("../public/kb_offline.js").KB_OFF;const B=require("../public/nico_bot.js");
const AF={nombre:"Pamela",isapre:"Banmédica",renta:"1700000",cargas:"1",clinica_interes:"Clínica Santa María",comuna:"La Florida",preexistencias:"No",detalle_preexistencias:""};
const NA={nombre:"Luis",isapre:"Consalud",renta:"1300000",cargas:"no",clinica_interes:"Clínica Dávila",preexistencias:"Sí",detalle_preexistencias:"insuficiencia renal crónica en diálisis"};
const H=[
 // cambio de plan / isapre
 [AF,"oe me kiero cambiar de plan pero no cacho si puedo ahora o tengo q esperar",/cambio_isapre|cuando|pasos_plan|cambio_plan/],
 [AF,"eh bueno mira yo llevo como ocho meses en la isapre y quiero cambiarme a otra, se puede o no",/cambio_isapre|cuando/],
 [AF,"si me cambio de isapre cuanto demora en empezar a correr el plan nuevo",/cuando|cambio_isapre|pasos_plan/,/subsiguiente|mes/i],
 [AF,"pucha es que pago 190 lucas y siento que es mucho, hay algo mas barato",/bajar_costo|cuanto_pago|comparar|ahorro/],
 // alzas
 [AF,"me llego una carta que me suben el plan un 3 coma 5 por ciento, es legal eso",/alza|cautivo/,/3,5/],
 [AF,"me subieron el plan en junio y no me avisaron nada, que hago",/alza|cautivo|reclamo/],
 [NA,"a mi me suben el plan todos los años y como tengo dialisis no me puedo ir a otra isapre, estoy atrapado",/cautivo|alza/],
 [AF,"hasta cuando puedo reclamar por el alza del precio base",/alza|cautivo/],
 // urgencia
 [AF,"anoche fui a la posta de la clinica y me cobraron una brutalidad, eso es urgencia o no",/urgencia|urgencia_ley|urgencia_red|urgencia_int/],
 [AF,"em si me da un infarto y me llevan a cualquier clinica me cubren igual",/urgencia_ley|urgencia_red/],
 [AF,"en la clinica me pidieron un pagare para atender a mi mama en urgencia",/urgencia_ley/,/no pueden|ninguna clínica|pagaré|pagare/i],
 [AF,"cual es la clinica de urgencia de mi plan",/urgencia_red/],
 // licencias
 [AF,"me rechasaron la licencia medica, quien ve eso la isapre o la compin",/licencia/],
 [AF,"recien entre a trabajar y me enferme, me pagan la licencia o no",/licencia/],
 [AF,"llevo dos meses con licencia y la isapre me la redujo a 15 dias",/licencia/],
 // seguros complementarios
 [AF,"en la pega me ofrecen un seguro complementario, vale la pena tenerlo aparte de la isapre",/complementario|complementario_det/],
 [NA,"si me voy a fonasa puedo contratar un seguro complementario igual",/complementario_fonasa|complementario|fonasa/],
 [AF,"el seguro complementario cubre lo que no cubre el plan o como funciona",/complementario|complementario_det/],
 // fonasa vs isapre
 [AF,"oye y la verdad me conviene mas fonasa o isapre con lo que gano",/fonasa|comparar|libre_vs_pref/],
 [NA,"mi señora dice q me vaya a fonasa tramo b que es gratis",/fonasa/],
 [AF,"que diferencia hay entre fonasa libre eleccion y una isapre",/fonasa|libre_vs_pref/],
 // cargas
 [AF,"quiero meter a mi pareja como carga, no estamos casados",/cargas_kb|cargas/],
 [AF,"cuanto me sube el plan si agrego a mi guagua que nacio la semana pasada",/cargas_kb|cargas|cuanto_pago/],
 [AF,"mi hijo cumplio 24 y sigue estudiando, sigue siendo carga?",/cargas_kb|cargas/],
 [NA,"mi hija tiene diabetes, la puedo poner de carga en otra isapre o la rechazan",/cargas_kb|cargas|preex|rechazo|diabetes/],
];
let ok=0;const bad=[];for(const [l,q,re,must] of H){B.start(l);const r=B.reply(q);const good=re.test(r.id)&&(!must||must.test(r.t));if(good)ok++;else bad.push(r.id.padEnd(16)+" ← "+q+(must&&!must.test(r.t)?" [falta "+must+"]":""));}
console.log(`A ciegas 5 (cambio/alzas/urgencia/licencias/seguros/fonasa/cargas): ${ok}/${H.length} = ${(100*ok/H.length).toFixed(0)}%`);console.log(bad.join("\n"));
