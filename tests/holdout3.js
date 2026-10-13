globalThis.KB_OFF=require("../public/kb_offline.js").KB_OFF;const B=require("../public/nico_bot.js");
const H=[
["tengo cancer de mama y estoy en colmena, me quiero cambiar a banmedica",/intentar_otra/],
["estoy en fonasa y tengo diabetes, que me recomiendas",/fonasa|tratamiento|complementario|comparar/],
["cuanto es mi deducible caec si pago 4 uf",/deducible|caec/],
["me van a operar de la rodilla en la santa maria",/mejor_clinica|deducible/],
["la isapre no me quiere pagar la licencia de mi depresion",/licencia/],
["que es una preexistencia",/preex/],
["mi plan dice libre eleccion, es malo?",/tipos_plan|libre_vs_pref/],
["puedo pasarme a fonasa y despues volver a isapre?",/fonasa/],
["cual es el plan mas barato de banmedica",/bajar_costo|pasos/],
["tengo hipertension y diabetes, me pueden subir el plan por eso?",/cautivo|terminar|alza/],
["me llegó la cuenta de la clínica de 5 millones",/deducible|copago|rechazo/],
["que cubre el ges para la retinopatia",/tratamiento|ges/],
["me sirve el seguro de colmena oncologico",/complementario|beneficios|catastrof/],
["hola, quiero saber si me conviene seguir pagando",/bajar_costo|fonasa|segunda/],
["mi esposa esta embarazada y yo tengo diabetes, que hacemos",/embarazo|cargas|tratamiento/],
["como uso mi caec",/deducible|caec/],
["no se en que tramo de fonasa estoy",/fonasa/],
["quiero una segunda opinion de mi plan",/leer_plan|segunda|escalar/],
["el doctor me pidio examenes caros y no se si los cubre",/tratamiento|copago|tope/],
["me siento estafado por la isapre",/reclamo|rechazo|leer|escalar|no_entendi|ack|empatia/],
];
let ok=0;const bad=[];
for(const [q,re] of H){B.start({nombre:"Lucía",isapre:"Colmena",renta:"1700000",cargas:"no",preexistencias:"Sí",detalle_preexistencias:"cancer de mama 2024"});const r=B.reply(q);if(re.test(r.id))ok++;else bad.push(r.id.padEnd(22)+" ← "+q);}
console.log(`Held-out 3: ${ok}/${H.length} = ${(100*ok/H.length).toFixed(0)}%`);console.log(bad.join("\n"));
