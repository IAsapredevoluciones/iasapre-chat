globalThis.KB_OFF=require("../public/kb_offline.js").KB_OFF;const B=require("../public/nico_bot.js");
// [perfil, mensaje, ids aceptables, debe contener (opcional)]
const A={nombre:"Carla",isapre:"Cruz Blanca",renta:"1900000",cargas:"1",clinica_interes:"Clínica Alemana",preexistencias:"No",detalle_preexistencias:""};
const AH={...A,preexistencias:"Sí",detalle_preexistencias:"hipotiroidismo"};
const NA={nombre:"Jorge",isapre:"Consalud",renta:"1300000",cargas:"2",clinica_interes:"Clínica Dávila",preexistencias:"Sí",detalle_preexistencias:"diabetes tipo 2"};
const H=[
[A,"hola buenas tardes",/saludo/],[A,"ayuda",/menu/],[A,"tengo una duda",/menu/],[A,"???",/menu/],[A,"eres un bot?",/bot/,/asistente virtual/],[NA,"estoy hablando con una persona real?",/bot/,/asistente virtual/],
[A,"oye weon no entiendes nada",/reparar/],[A,"cual es el clima hoy",/fuera_tema/],
[A,"estoy desesperada, la isapre me subio el plan otra vez",/cautivo/,/entiendo|lamento/i],[NA,"tengo mucho miedo de quedarme sin cobertura",/empatia|terminar|tratamiento|bajar/],
[A,"quiero ver si hay algo mejor",/comparar|bajar/,/compar/i],[A,"que isapre me conviene para la alemana",/comparar|mejor_clinica/,/Banmédica|Colmena/],[A,"me subieron el plan",/cautivo/,/compar/i],
[A,"me quiero ir a fonasa",/fonasa/,/compar/i],[A,"pago mucho",/bajar_costo|comparar/,/compar/i],[AH,"me aceptan con hipotiroidismo en otra isapre?",/cambio_isapre|intentar|hipertension|preex/],
[NA,"y si me cambio a banmedica?",/intentar_otra/],[NA,"pago mucho",/bajar_costo/,/dentro de Consalud/],[NA,"que isapre me conviene",/comparar|bajar/],
[A,"estoy en colmena ahora y me atiendo en la santa maria, sirve?",/mejor_clinica|comparar/,/Santa María/],
[A,"me rechazaron un examen y ademas me subieron el plan",/rechazo|cautivo/,/También me preguntaste|alza|rechazo/i],
[A,"tengo depresion, me van a rechazar en otra isapre?",/salud_mental|cambio_isapre|intentar/,/no se declara|Ley 21/i],
[A,"cuanto me cuesta cambiarme",/cambio_isapre|comparar|cuanto/],[A,"ok",/ack|comparar_si|bajar|cambio/],
[A,"gano 2 palos y pago 250 lucas",/bajar_costo|comparar|cuanto/],[NA,"no se que hacer con mi plan",/leer_plan|empatia|bajar|menu|no_entendi/],
[A,"me pasaron un plan con 100% en la alemana es bueno",/mejor_clinica|tope|comparar/],[A,"k onda kn la caec",/deducible|caec/],[A,"wena, keria saber si me combiene cambiarme",/cambio_isapre|comparar|intentar/],
[A,"necesito un plan bueno y barato",/comparar|bajar/],[NA,"me siento estafada",/empatia/],[A,"y eso cuanto demora",/cambio_isapre|demora/],
];
let ok=0;const bad=[];
for(const [lead,q,re,must] of H){B.start(lead);const r=B.reply(q);const good=re.test(r.id)&&(!must||must.test(r.t));if(good)ok++;else bad.push(r.id.padEnd(16)+" ← "+q+(must&&!must.test(r.t)?"  [falta: "+must+"] → "+r.t.slice(0,90):""));}
console.log(`Conversacional: ${ok}/${H.length} = ${(100*ok/H.length).toFixed(0)}%`);console.log(bad.join("\n"));
