// Barrido: todas las combinaciones perfil × pregunta. Ninguna respuesta puede presentar salud mental como preexistencia/restricción.
const P=process.env.NB_PUBLIC||require("path").join(__dirname,"..","public");globalThis.KB_OFF=require(P+"/kb_offline.js").KB_OFF;const B=require(P+"/nico_bot.js");
const MH=/(depresi|ansiedad|bipolar|esquizofren|salud mental|psiquiatr|psicolog|tdah|autismo|anorexia|bulimia)/i, BAD=/(restricci|restring|preexist|rechaz|no (son |es )?afiliable|18 meses)/i, OK=/(no (se )?(la |lo |las |los )?declar|no pueden|ni restring|ni rechaz|no te pueden|no (es|son) preexistencia|no cuenta|ya no se puede restringir|no puede(n)? usarse|ley 21\.?331)/i;
const nn=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const perfiles=["depresión","ansiedad generalizada con sertralina","trastorno bipolar","esquizofrenia","TDAH","depresión y diabetes","ansiedad e hipertensión","autismo (TEA)","bulimia hace 3 años","diabetes tipo 2",""];
const preguntas=["tengo depresion, me afecta?","la ansiedad es preexistencia?","me van a restringir por mi depresion","me aceptan en otra isapre si tengo bipolaridad","tengo que declarar que voy al psicologo?","que es una preexistencia","que son las coberturas restringidas","me puedo cambiar con preexistencia","otra isapre me acepta?","cubren psicologo?","me rechazaron por depresion","tengo tdah, me cobran mas?","mi hijo tiene autismo, lo puedo agregar?","que pasa si no declaro mi ansiedad","quiero cambiarme de isapre","cuales son las enfermedades que no aceptan"];
let total=0,fallas=[];
for(const pe of perfiles)for(const isa of ["Colmena","Fonasa"]){B.start({nombre:"Ana",isapre:isa,renta:"1500000",preexistencias:pe?"Sí":"No",detalle_preexistencias:pe});
 const chk=(txt,ctx)=>{for(const s of txt.split(/(?<=[.!?])\s+/)){const x=nn(s);if(MH.test(x)&&BAD.test(x)&&!OK.test(x))fallas.push(ctx+" ⟶ "+s.slice(0,140));}};
 chk(B.start({nombre:"Ana",isapre:isa,renta:"1500000",preexistencias:pe?"Sí":"No",detalle_preexistencias:pe}).t,"[inicio "+pe+"]");
 for(const q of preguntas){const r=B.reply(q);total++;chk(r.t,"["+pe+"|"+q+"]");}}
console.log(`Barrido salud mental: ${total} respuestas revisadas, ${fallas.length} inconsistencias`);fallas.slice(0,8).forEach(f=>console.log(" ✗ "+f));
