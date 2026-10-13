// El panel de depuración de la landing solo se muestra con ?debug=1 (en producción el usuario final no lo ve)
const {JSDOM}=require("jsdom");const html=require("./inline.js")();
function carga(url){const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url,beforeParse(w){w.fetch=async()=>({ok:false,status:0,json:async()=>({})});w.HTMLElement.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};}});
 const w=dom.window,d=w.document,f=d.getElementById("f");const set=(n,v)=>{f.elements[n].value=v;};
 set("nombre","Rosa Pérez");set("edad","40");set("telefono","912345678");set("isapre","Colmena");set("renta","1500000");set("region","RM");set("comuna","Maipú");set("cargas","no");set("preexistencias","No");set("que_busca","pagar menos");
 return {w,d,f};}
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const A=carga("https://iasapre.netlify.app/orientador");ok(A.d.getElementById("dbg").hidden===true,"antes de enviar el formulario el panel está oculto");
 A.f.dispatchEvent(new A.w.Event("submit",{cancelable:true}));await sleep(2500);
 ok(A.d.getElementById("dbg").hidden===true&&A.w.getComputedStyle(A.d.getElementById("dbg")).display==="none","sin ?debug=1 el panel sigue oculto tras enviar");
 ok(/Panel de prueba/.test(A.d.getElementById("dbg").innerHTML),"el panel igual se llena (para QA con ?debug=1 en caliente)");
 const B=carga("https://iasapre.netlify.app/orientador?debug=1");B.f.dispatchEvent(new B.w.Event("submit",{cancelable:true}));await sleep(2500);
 ok(B.d.getElementById("dbg").hidden===false&&B.w.getComputedStyle(B.d.getElementById("dbg")).display!=="none","con ?debug=1 el panel se ve");
 ok(/Avisos enviados al equipo/.test(B.d.getElementById("dbg").textContent)&&/UF usada/.test(B.d.getElementById("dbg").textContent),"el panel muestra avisos y UF");
 const C=carga("https://iasapre.netlify.app/orientador?debug=10&x=1");C.f.dispatchEvent(new C.w.Event("submit",{cancelable:true}));await sleep(500);
 ok(C.d.getElementById("dbg").hidden===true,"?debug=10 no cuenta como debug=1");
 console.log(fails.length?"FALLAS:\n - "+fails.join("\n - "):"Panel debug OK: oculto por defecto, visible solo con ?debug=1");process.exit(fails.length?1:0);})();
