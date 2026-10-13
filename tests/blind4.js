globalThis.KB_OFF=require("../public/kb_offline.js").KB_OFF;const B=require("../public/nico_bot.js");
const AF={nombre:"Daniela",isapre:"Cruz Blanca",renta:"2100000",cargas:"2",clinica_interes:"Clínica Alemana",comuna:"Providencia",preexistencias:"No",detalle_preexistencias:""};
const NA={nombre:"Mario",isapre:"Colmena",renta:"1500000",cargas:"no",clinica_interes:"Clínica Dávila",preexistencias:"Sí",detalle_preexistencias:"diabetes tipo 2"};
const H=[
[AF,"como se cual es mi red de urgencia",/urgencia_red/,/carátula|caratula/i],[AF,"a que clinica tengo que ir si me pasa algo urgente",/urgencia_red|urgencia_int|urgencia$/],[AF,"mi plan tiene urgencia integral?",/urgencia_red|urgencia_int/],
[AF,"en una urgencia me pidieron un cheque en garantia",/urgencia_ley/,/no pueden|ninguna clínica/i],[AF,"como funciona la ley de urgencia",/urgencia_ley/,/5%/],[AF,"me llevaron a otra clinica en una urgencia vital, que hago",/urgencia_ley|urgencia_red/],
[AF,"de quien es la clinica santa maria",/grupos/,/Banmédica/],[AF,"que clinicas tiene cada isapre",/grupos/],[AF,"colmena tiene clinicas propias",/grupos/,/Colmena/],
[AF,"que hace la superintendencia de salud",/superintendencia/],[AF,"donde reclamo contra mi isapre",/reclamo|superintendencia/],[AF,"mi hijo nacio con sindrome de down, lo tengo que declarar",/preex_congenita/,/354/],
[NA,"mi enfermedad es ges y es preexistente igual me la cubren",/ges_preex|diabetes|preex/],[AF,"cuanto subieron los planes este año",/alza|cautivo/,/3,5%/],[AF,"me aumentaron el plan en junio",/alza|cautivo/],
[AF,"no me lee la huella para comprar el bono",/huella/,/534|cédula|cedula/i],[AF,"como activo la caec si me hospitalizan",/caec_act|caec/,/48 horas/],[AF,"cuanto es el deducible de la caec con 2 hijos",/deducible|caec/],
[AF,"que enfermedades cubre la ley ricarte soto",/ricarte/,/27/],[AF,"cual es el tope imponible para el 7%",/siete|tope/],[NA,"y si pasaron 5 años desde que declare una enfermedad",/preex_no_declare|preex|cancer/],
];
let ok=0;const bad=[];for(const [l,q,re,must] of H){B.start(l);const r=B.reply(q);const good=re.test(r.id)&&(!must||must.test(r.t));if(good)ok++;else bad.push(r.id.padEnd(16)+" ← "+q+(must&&!must.test(r.t)?" [falta "+must+"]":""));}
console.log(`A ciegas 4 (temas nuevos): ${ok}/${H.length} = ${(100*ok/H.length).toFixed(0)}%`);console.log(bad.join("\n"));
