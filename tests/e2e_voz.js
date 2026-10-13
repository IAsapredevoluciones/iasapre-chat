// Prueba de voz en navegador simulado: micrófono con reconocimiento falso que entrega transcripciones parciales y finales
const {JSDOM}=require("jsdom");const fs=require("fs");
const html=require("./inline.js")();
const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:"https://example.org/",beforeParse(w){
 w.webkitSpeechRecognition=class{start(){setTimeout(()=>{this.onstart&&this.onstart();const parts=w.__dictado;parts.forEach((p,i)=>setTimeout(()=>{const res=[Object.assign([{transcript:p}],{isFinal:i===parts.length-1})];this.onresult({results:res});if(i===parts.length-1)setTimeout(()=>this.onend&&this.onend(),50);},200*(i+1)));},50);}stop(){this.onend&&this.onend();}};
 w.HTMLElement.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};}});
const w=dom.window,d=w.document,sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const f=d.getElementById("f");const set=(n,v)=>{f.elements[n].value=v;};
 set("nombre","Ramón Díaz");set("edad","55");set("telefono","912345678");set("isapre","Consalud");set("renta","1300000");set("region","RM");set("comuna","Puente Alto");set("cargas","no");set("clinica_interes","Clínica Dávila");set("preexistencias","Sí");set("detalle_preexistencias","diabetes");
 f.dispatchEvent(new w.Event("submit",{cancelable:true}));for(let i=0;i<160&&(i<4||w.eval("busy"));i++)await sleep(500);
 const n0=d.querySelectorAll("#msgs .bub").length;
 w.__dictado=["eh bueno","eh bueno o sea pago como doscientas","eh bueno o sea pago como doscientas mil lucas y gano un millon trescientos es mucho"];
 d.getElementById("mic").click();for(let i=0;i<60;i++){await sleep(500);if(!w.eval("busy")&&i>6)break;}
 const b=[...d.querySelectorAll("#msgs .bub")].map(x=>x.textContent);
 console.log("Mensaje enviado por voz:",b[n0]);console.log("Respuesta:",b.slice(n0+1).join(" | ").slice(0,300));
 console.log("Panel:",d.getElementById("dbg").textContent.slice(-120));
 // navegador sin reconocimiento → aviso de dictado
 delete w.webkitSpeechRecognition;})();
