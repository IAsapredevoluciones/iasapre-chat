// Estilo de atención de Nico por WhatsApp (docs/ESTILO_WSP_NICO.md): apertura "Hola! ¿Cómo estás?", sin "¡", sin cadenas de "!",
// cierres "cualquier duda me avisas / quedo atento", registro chileno cercano ("te tinca", "nomás", "con calma", "primer barrido"),
// oferta de Meet para ver la letra chica, y nunca hacerse pasar por Nico.
globalThis.KB_OFF=require("../public/kb_offline.js").KB_OFF;const B=require("../public/nico_bot.js");
const P=[{nombre:"Pamela",isapre:"Banmédica",renta:"1700000",cargas:"1",clinica_interes:"Clínica Santa María",preexistencias:"No"},
 {nombre:"Luis",isapre:"Consalud",renta:"1300000",cargas:"no",clinica_interes:"Clínica Dávila",preexistencias:"Sí",detalle_preexistencias:"diabetes tipo 2"},
 {nombre:"Carolina",isapre:"Cruz Blanca",renta:"2600000",cargas:"2",preexistencias:"Sí",detalle_preexistencias:"hipertensión"},
 {nombre:"Andrés",isapre:"Fonasa",renta:"900000",cargas:"no",preexistencias:"Sí",detalle_preexistencias:"depresión"},
 {nombre:"",isapre:"Colmena",renta:"",cargas:"",preexistencias:"No"}];
const Q=["me subieron el plan","cuanto es el deducible de la caec","que es una preexistencia","quiero comparar","si quiero la comparacion","que miro al comparar","cuanto es mi 7%","me conviene fonasa","no me lee la huella","tengo depresion","como reclamo","cuanto demora el cambio","me cobran por la asesoria","gracias","eres un bot?","ayuda","como funciona la ley de urgencia","que es un tope","quiero hablar con nico","de quien es colmena","me rechazaron una licencia","mi hijo tiene tdah","no se","tengo miedo de cambiarme","que pierdo si me cambio","cuando conviene cambiarse","cuanto me ahorro","que documentos necesito","conforme con mi plan","y los excedentes"];
const starts=[],all=[],byId={};
for(const l of P){const s=B.start(l);starts.push(s.t);all.push(s.t);for(const q of Q){const r=B.reply(q);all.push(r.t);(byId[r.id]=byId[r.id]||[]).push(r.t);}}
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
ok(starts.every(t=>/^Hola( [^!]+)?! ¿Cómo estás\? (Soy|Te escribe) el asistente de IAsapre/.test(t)),"todas las aperturas: 'Hola <nombre>! ¿Cómo estás? Soy el asistente de IAsapre'");
ok(!all.some(t=>/¡/.test(t)),"nunca abre con '¡' (Nico escribe 'Buenísimo!', 'Quedo atento!')");
ok(!all.some(t=>/![^\n]{0,25}!/.test(t)),"sin cadenas de exclamaciones");
ok(!all.some(t=>/\b(estimad[oa]|usted|cordialmente|no dude|le informamos|a su disposición)\b/i.test(t)),"sin registro formal");
ok(!all.some(t=>/soy nico|\(soy nico\)|te contacto yo|me llamo nico/i.test(t)),"nunca se hace pasar por Nico");
const bot=all.filter(t=>/asistente virtual de IAsapre/.test(t));ok(bot.length>=P.length,"reconoce ser el asistente virtual cuando le preguntan");
const cierres=all.filter(t=>/(me avisas|quedo atento|cualquier duda|avísame si te queda)/i.test(t)).length;ok(cierres>=all.length*0.2,`cierres de Nico en ≥20 % de las respuestas (${cierres}/${all.length})`);
const chile=all.filter(t=>/(te tinca|nomás|con calma|primer barrido|buenísimo|obvio|al tiro|harto)/i.test(t)).length;ok(chile>=all.length*0.15,`marcas chilenas cercanas en ≥15 % (${chile}/${all.length})`);
const sinPreg=all.filter(t=>!/[?]["”]?\s*$/.test(t));ok(sinPreg.filter(t=>/(me avisas|quedo atento|cualquier duda|avísame|whatsapp|dime |me cuentas|pégalas|nos avisas|que estés)/i.test(t.slice(-240))).length>=sinPreg.length*0.8,"las respuestas que no terminan en pregunta cierran como Nico (≥80 %)");
const pushes=[];for(const n of ["","A","Jo","Ana"]){B.start({nombre:n,isapre:"Colmena",renta:"1800000",cargas:"1",clinica_interes:"Clínica Alemana",preexistencias:"No"});B.reply("que es un tope");pushes.push(B.reply("no me lee la huella").t);}
const ctas=["te hago un primer barrido","análisis honesto","sin apuro","con calma más adelante"].filter(k=>pushes.some(t=>t.includes(k)));ok(ctas.length===4,"rotan las 4 formas de ofrecer la comparación según la persona ("+ctas.length+"/4)");
ok(pushes.every(t=>/compar/i.test(t)),"la invitación a comparar aparece en el segundo turno para afiliables");
const cmp=(byId["comparar_si"]||[]).join("\n");ok(/escríbenos ahora por WhatsApp/.test(cmp)&&/Meet/.test(cmp)&&/calendly\.com\/nico-iasapre/.test(cmp),"al pedir comparación: WhatsApp + opción de reunión por Meet (Calendly)");
ok((byId["comparar"]||[]).some(t=>/(te consulto|primer barrido|sigue siendo tu mejor opción)/.test(t)),"califica como Nico: 'te consulto…', 'primer barrido', 'si tu plan sigue siendo tu mejor opción te lo decimos'");
ok(!all.some(t=>/🙌|👋|😊|🎉/.test(t)),"sin emojis decorativos (Nico casi no usa)");
ok(!all.some(t=>/\bcach(o|ar|as|ai)\b|no rentable/i.test(t)),"nunca 'cacho' ni 'no rentable' (regla del canal WhatsApp)");
console.log(fails.length?"FALLAS:\n - "+fails.join("\n - "):`Estilo OK: ${all.length} respuestas revisadas (${P.length} perfiles × ${Q.length} preguntas) con el estilo de Nico`);process.exit(fails.length?1:0);
