// UF del día en la landing: mindicador.cl → NicoBot.setUF, caché en localStorage por día, fallback a la constante si falla
const {JSDOM}=require("jsdom");const html=require("./inline.js")();
const hoy=new Date().toISOString().slice(0,10);
function carga(fetchImpl,seed){const calls=[];const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:"https://iasapre.netlify.app/orientador?debug=1",beforeParse(w){
 w.fetch=async(u,o)=>{calls.push(String(u));return fetchImpl(String(u));};w.HTMLElement.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};if(seed)w.localStorage.setItem("iasapre_uf",JSON.stringify(seed));}});
 return {w:dom.window,d:dom.window.document,calls};}
const okResp=v=>({ok:true,status:200,json:async()=>({codigo:"uf",serie:[{fecha:hoy+"T03:00:00.000Z",valor:v}]})});
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 // 1) API responde → se usa y se cachea
 const A=carga(u=>/mindicador/.test(u)?okResp(41146.83):{ok:false,status:404,json:async()=>({})});await sleep(300);
 ok(A.w.NicoBot.uf()===41146.83,"UF de la API aplicada al motor");
 ok(A.calls.filter(u=>/mindicador\.cl\/api\/uf/.test(u)).length===1,"una sola llamada a mindicador");
 const c=JSON.parse(A.w.localStorage.getItem("iasapre_uf")||"null");ok(c&&c.valor===41146.83&&c.fecha===hoy,"UF cacheada en localStorage con la fecha de hoy");
 ok(!A.calls.some(u=>/mindicador/.test(u)&&/[?&]/.test(u)),"la URL de la UF no lleva parámetros (sin datos del usuario)");
 // 2) caché de hoy → no llama a la API
 const B=carga(u=>okResp(99999),{valor:41200.5,fecha:hoy});await sleep(300);
 ok(B.w.NicoBot.uf()===41200.5&&!B.calls.some(u=>/mindicador/.test(u)),"con caché de hoy usa el valor guardado sin llamar a la API");
 // 3) caché vieja → vuelve a llamar
 const C=carga(u=>okResp(41300),{valor:41200.5,fecha:"2026-01-01"});await sleep(300);
 ok(C.w.NicoBot.uf()===41300&&C.calls.some(u=>/mindicador/.test(u)),"caché de otro día se renueva");
 // 4) API falla → fallback a la constante y el chat sigue funcionando
 const D=carga(u=>{throw new Error("sin red");});await sleep(300);
 ok(D.w.NicoBot.uf()===41000,"si la API falla se usa la UF de respaldo (41.000)");
 const f=D.d.getElementById("f");const set=(n,v)=>{f.elements[n].value=v;};set("nombre","Rosa");set("edad","40");set("telefono","912345678");set("isapre","Colmena");set("renta","1500000");set("region","RM");set("comuna","Maipú");set("cargas","no");set("preexistencias","No");set("que_busca","pagar menos");
 f.dispatchEvent(new D.w.Event("submit",{cancelable:true}));await sleep(2500);
 ok(D.d.querySelectorAll("#msgs .bub").length>0,"el chat parte aunque la UF no cargue");
 ok(/UF usada:\s*41\.000 \(fallback\)/.test(D.d.getElementById("dbg").textContent),"el panel de depuración muestra UF y origen (fallback)");
 // 5) valor absurdo de la API → se rechaza
 const E=carga(u=>okResp(5));await sleep(300);ok(E.w.NicoBot.uf()===41000&&!E.w.localStorage.getItem("iasapre_uf"),"valor fuera de rango no se usa ni se cachea");
 console.log(fails.length?"FALLAS:\n - "+fails.join("\n - "):"UF página OK: API, caché diaria, renovación, fallback y rango");process.exit(fails.length?1:0);})();
