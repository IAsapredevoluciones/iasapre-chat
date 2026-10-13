globalThis.KB_OFF=require("../public/kb_offline.js").KB_OFF;const B=require("../public/nico_bot.js");
// SEGUNDO SET A CIEGAS, escrito después de los ajustes; no se ajusta nada con él.
const A={nombre:"Paula",isapre:"Consalud",renta:"1600000",cargas:"1",clinica_interes:"RedSalud Providencia",preexistencias:"No",detalle_preexistencias:""};
const NA={nombre:"Hugo",isapre:"Vida Tres",renta:"3000000",cargas:"no",clinica_interes:"Clínica Alemana",preexistencias:"Sí",detalle_preexistencias:"cancer de colon 2023"};
const H=[
[A,"holi",/saludo|menu/],[A,"necesito cambiar mi isapre urgente",/cambio_isapre|comparar|intentar/],[A,"cual es la isapre mas barata",/comparar|bajar/],[A,"mi plan sube todos los años y ya no da mas",/cautivo|bajar|comparar/],
[A,"es verdad que si declaro depresion no me aceptan?",/salud_mental/,/no se declara|Ley 21/i],[A,"y mi hijo con tdah?",/salud_mental|cargas/,/no se declara|Ley 21|21\.331/i],[A,"redsalud o bupa que es mejor",/mejor_clinica|comparar/],
[A,"cuanto deberia pagar con mi sueldo",/cuanto_pago|bajar|comparar/],[A,"no se nada de isapres explicame",/leer_plan|menu|no_entendi|comparar/],[A,"me da lata cambiarme, es mucho tramite?",/cambio_isapre|miedo/],
[NA,"me puedo cambiar a colmena?",/intentar_otra|cambio/],[NA,"estoy pagando como 400 lucas, es mucho",/bajar_costo/],[NA,"que pasa si me suben el plan y no me puedo ir",/cautivo/],[NA,"la quimio me la cubre la isapre?",/tratamiento/],
[NA,"me da miedo que me echen de la isapre",/terminar|empatia|miedo/],[NA,"y el olvido oncologico como funciona",/cancer|olvido|kb:/],[NA,"ya gracias, eso era",/gracias/],
];
let ok=0;const bad=[];
for(const [lead,q,re,must] of H){B.start(lead);const r=B.reply(q);const good=re.test(r.id)&&(!must||must.test(r.t));if(good)ok++;else bad.push(r.id.padEnd(16)+" ← "+q);}
console.log(`A ciegas 2: ${ok}/${H.length} = ${(100*ok/H.length).toFixed(0)}%`);console.log(bad.join("\n"));
