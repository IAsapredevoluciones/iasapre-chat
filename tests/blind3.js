globalThis.KB_OFF=require("../public/kb_offline.js").KB_OFF;const B=require("../public/nico_bot.js");
// SET A CIEGAS 3 (escrito ahora, sin ajustar después): temas nuevos, voz y flujos de conversión
const AF={nombre:"Rocío",isapre:"Colmena",renta:"1800000",cargas:"1",clinica_interes:"",comuna:"La Serena",preexistencias:"No",detalle_preexistencias:""};
const RE={nombre:"Tomás",isapre:"Banmédica",renta:"2200000",cargas:"no",clinica_interes:"Clínica Las Condes",preexistencias:"Sí",detalle_preexistencias:"asma"};
const NA={nombre:"Gloria",isapre:"Cruz Blanca",renta:"1000000",cargas:"no",clinica_interes:"Clínica Bupa Santiago",preexistencias:"Sí",detalle_preexistencias:"diabetes con insulina"};
const FO={nombre:"Iván",isapre:"Fonasa",renta:"700000",cargas:"2",preexistencias:"Sí",detalle_preexistencias:"cáncer de próstata 2025"};
const H=[
[AF,"eh hola quería saber cuál isapre me conviene en la serena",/region_info|compar/],[AF,"que onda el seguro complementario vale la pena",/complementario/],[AF,"los seguros tienen carencia",/complementario/],
[AF,"que es eso de las veces arancel",/tope/],[AF,"me puedo atender en cualquier clinica con mi isapre",/libre_vs_pref/],[AF,"colmena es buena o mejor me cambio",/isapre_info|compar|cambio/],
[RE,"con el asma me van a poner restriccion",/cambio_isapre|hipertension|preex|intentar|compar/],[RE,"y la las condes con que isapre conviene",/mejor_clinica|compar/],[RE,"ok dale armemos la comparacion",/comparar_si|compar/],
[NA,"necesito hablar con un ejecutivo",/sin_ejecutivo|escalar/],[NA,"para que me sirve un ejecutivo entonces",/sin_ejecutivo/],[NA,"como uso la caec si me hospitalizan",/caec|deducible/],
[NA,"la ricarte soto me cubre la insulina",/ricarte|tratamiento/],[NA,"o sea que no me puedo cambiar nunca",/intentar|cambio|no_entendi|empatia|menu/],
[FO,"me conviene seguir en fonasa con el cancer",/fonasa|tratamiento|complementario/],[FO,"existe algun seguro que me cubra aunque tenga cancer",/complementario|catastrof|compar/],[FO,"cuanto pago en fonasa ganando setecientas mil",/cuanto|fonasa/],
[AF,"oye y la urgencia integral que es",/urgencia_int|urgencia_red/],[AF,"por que me cobran precio ges aparte",/prima_ges/],[AF,"pucha no entiendo nada de mi plan ayudame",/leer_plan|menu/],
];
let ok=0;const bad=[];for(const [l,q,re] of H){B.start(l);const r=B.reply(q);if(re.test(r.id))ok++;else bad.push(r.id.padEnd(16)+" ← "+q);}
console.log(`A ciegas 3: ${ok}/${H.length} = ${(100*ok/H.length).toFixed(0)}%`);console.log(bad.join("\n"));
