// chat.js (fallback a la API de Claude) aplica guard() a lo que devuelve el modelo: la salud mental nunca sale como preexistencia/restricción
process.env.ANTHROPIC_API_KEY="clave-de-prueba";
const calls=[];let respuesta="Hola. La depresión es una preexistencia y te pueden restringir 18 meses. Lo demás de tu plan sigue igual.";
global.fetch=async(u,o)=>{calls.push({u,o});return {ok:true,status:200,json:async()=>({content:[{type:"text",text:respuesta}],usage:{input_tokens:1,output_tokens:1}}),text:async()=>""};};
const {handler}=require("../netlify/functions/chat.js");
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
(async()=>{
 const r=await handler({httpMethod:"POST",body:JSON.stringify({messages:[{role:"user",content:"tengo depresion, me afecta para cambiarme?"}]})});
 const d=JSON.parse(r.body);
 ok(r.statusCode===200,"responde 200");
 ok(calls.length===1&&/api\.anthropic\.com/.test(calls[0].u),"llama a la API una vez");
 ok(!/preexistencia y te pueden restringir/i.test(d.text),"frase de salud mental eliminada por guard()");
 ok(/21\.?331/.test(d.text),"agrega la aclaración de la Ley 21.331");
 ok(/sigue igual/.test(d.text),"conserva el resto de la respuesta");
 respuesta="Tu plan cubre psicólogo con bonos. [[CONTACTO]]";
 const r2=await handler({httpMethod:"POST",body:JSON.stringify({messages:[{role:"user",content:"cubren psicologo?"}]})});const d2=JSON.parse(r2.body);
 ok(/psicólogo con bonos/.test(d2.text)&&d2.escalate===true,"respuesta limpia pasa intacta y mantiene la señal [[CONTACTO]]");
 const r3=await handler({httpMethod:"POST",body:"{}"});ok(r3.statusCode===400,"sin mensajes → 400");
 console.log(fails.length?"FALLAS:\n - "+fails.join("\n - "):"chat guard OK: el servidor filtra salud mental igual que el cliente");process.exit(fails.length?1:0);})();
