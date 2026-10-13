globalThis.KB_OFF=require("../public/kb_offline.js").KB_OFF;const B=require("../public/nico_bot.js");
const A={nombre:"Felipe",isapre:"Banmédica",renta:"2400000",cargas:"2",clinica_interes:"Clínica Santa María",preexistencias:"No",detalle_preexistencias:""};
const NA={nombre:"Marta",isapre:"Colmena",renta:"1100000",cargas:"no",clinica_interes:"Indisa",preexistencias:"Sí",detalle_preexistencias:"tuve un infarto el 2022"};
const H=[
[A,"buenas! una consultita",/menu|saludo/],[A,"mi plan es muy malo me cubre poquito",/comparar|bajar|tope|leer/],[A,"me dijeron que con otra isapre pagaria menos es cierto?",/comparar|bajar|cambio|intentar/],
[A,"la verdad no entiendo para que pago tanto",/comparar|bajar|leer/],[A,"tengo 3 hijos y mi señora, cuanto me saldria",/cargas|comparar|cuanto/],[A,"y en la santa maria me cubren bien?",/mejor_clinica|comparar/],
[A,"cuando me puedo cambiar",/cambio_isapre|alza|cautivo/],[A,"mi esposa tiene ansiedad, la tiene que declarar?",/salud_mental|cargas/,/no se declara|Ley 21/i],[A,"oiga y el ges que es",/ges/],
[A,"me cobraron 2 millones por una operacion",/deducible|tope|rechazo|copago/],[A,"no quiero cambiarme, solo saber si mi plan esta bien",/leer_plan|comparar|bajar/],[A,"hablame claro, me conviene o no cambiarme?",/comparar|cambio/],
[NA,"me quiero cambiar pero tuve un infarto",/intentar_otra|cambio/],[NA,"o sea que no tengo opcion?",/intentar|bajar|no_entendi|empatia|comparar|menu/],[NA,"y que puedo hacer entonces",/bajar|leer|tratamiento|no_entendi|menu|empatia|comparar/],
[NA,"me estan cobrando mucho y no me puedo ir",/bajar_costo|cautivo/],[NA,"la caec me sirve?",/deducible|caec/],[NA,"puedo meter a mi pareja al plan?",/cargas/],
[A,"eres persona o maquina",/bot/],[A,"jajaja ok gracias",/gracias/],[NA,"muchas gracias, me ayudaste harto",/gracias/],
];
let ok=0;const bad=[];
for(const [lead,q,re,must] of H){B.start(lead);const r=B.reply(q);const good=re.test(r.id)&&(!must||must.test(r.t));if(good)ok++;else bad.push(r.id.padEnd(16)+" ← "+q);}
console.log(`A ciegas: ${ok}/${H.length} = ${(100*ok/H.length).toFixed(0)}%`);console.log(bad.join("\n"));
