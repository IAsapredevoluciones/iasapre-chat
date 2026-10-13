globalThis.KB_OFF=require("../public/kb_offline.js").KB_OFF;const B=require("../public/nico_bot.js");
const N=parseInt(process.argv[2]||"10000");let seed=7;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};const pick=a=>a[Math.floor(rnd()*a.length)];
const Q={
 costo:[["quiero pagar menos",/bajar|compar|fonasa/],["pago mucho por mi isapre",/bajar|compar|segunda|fonasa/],["mi plan es carisimo",/bajar|compar/],["gano un millon y medio y pago doscientos mil es mucho",/bajar|compar|cuanto|fonasa/]],
 comparar:[["quiero comparar planes",/compar|bajar/],["cual isapre me conviene",/compar|bajar|isapre_info/],["hay algo mejor que mi plan",/compar|bajar/],["que plan me recomiendas",/compar|bajar/]],
 clinica:[["me atiendo en la clinica alemana",/mejor_clinica|compar/],["que isapre cubre mejor la davila",/mejor_clinica|compar/],["quiero atenderme en redsalud",/mejor_clinica|compar/]],
 isapre:[["que tal colmena",/isapre_info/],["banmedica es buena",/isapre_info/],["pros de consalud",/isapre_info/],["como es cruz blanca",/isapre_info/]],
 region:[["vivo en temuco que isapre me conviene",/region_info|compar/],["en concepcion cual isapre es mejor",/region_info|compar/],["soy de antofagasta que isapre",/region_info|compar/]],
 compl:[["como funciona un seguro complementario",/complementario/],["que es la carencia del seguro",/complementario/],["que es el bmi",/complementario/],["me sirve un seguro oncologico",/catastrof|complementario/]],
 topes:[["que es un tope",/tope/],["que significa veces arancel",/tope/],["mi plan dice 100 por ciento pero pague igual",/tope/]],
 caec:[["que es la caec",/caec|deducible/],["como activo la caec",/caec_act/],["cuanto es el deducible caec",/deducible|caec/]],
 ges:[["como funciona el ges",/ges/],["que cubre el ges",/ges|tratamiento/],["el ges cubre la diabetes",/tratamiento|ges|diabetes/]],
 lrs:[["que es la ley ricarte soto",/ricarte/],["la ricarte soto cubre mi tratamiento",/ricarte|tratamiento/],["cuantas enfermedades cubre la ricarte soto",/ricarte/]],
 alza:[["me subieron el plan",/cautivo|alza/],["me llego la carta de alza",/cautivo|alza/]],
 cambio:[["como me cambio de isapre",/cambio_isapre|intentar|pasos/],["cuanto demora cambiarse",/cambio_isapre|demora/]],
 mental:[["tengo depresion me afecta",/salud_mental/],["la ansiedad se declara",/salud_mental/],["mi hijo tiene tdah lo tengo que declarar",/salud_mental/]],
 tramites:[["me rechazaron una licencia",/licencia/],["no me lee la huella",/huella/],["me pidieron un cheque en urgencias",/urgencia/],["como pido un reembolso",/reembolso|copago/],["que pasa con mis excedentes",/excedente|siete/]],
 fonasa:[["me conviene fonasa",/fonasa|compar/],["en que tramo de fonasa quedo",/fonasa|cuanto/]],
 ejecutivo:[["necesito un ejecutivo",/sin_ejecutivo|compar|escalar/],["quiero hablar con nico",/escalar|sin_ejecutivo/]],
 conv:[["hola",/saludo|menu/],["ayuda",/menu/],["eres un bot",/bot/],["gracias",/gracias/],["estoy desesperada con la isapre",/empatia|menu|no_entendi/]],
};
const CATS=Object.keys(Q);
const FILLERS=["eh ","bueno ","o sea ","mira ","pucha ","este ",""];
function texto(s){let x=s;if(rnd()<.25){const w=x.split(" ");const i=Math.floor(rnd()*w.length);if(w[i].length>5){const j=1+Math.floor(rnd()*(w[i].length-2));w[i]=w[i].slice(0,j)+w[i].slice(j+1);}x=w.join(" ");}if(rnd()<.15)x=x.toUpperCase();return pick(["","","hola ","oye ","consulta "])+x+pick(["","?","??"," porfa"]);}
function audio(s){return (pick(FILLERS)+s.replace(/[?!.,]/g,"")+pick([""," eh"," no se"," cachai"])).toLowerCase();}
const PERF=[["no_af","diabetes tipo 2"],["no_af","infarto con stent"],["no_af","cancer de mama 2024"],["no_af","dialisis"],["res","hipertension"],["res","hipotiroidismo"],["res","asma"],["ok",""],["ok","depresion"]];
const st={conv:0,turns:0,lab:0,ok:0,miss:0,mh:0,noafConv:0,noafEscForzada:0,noafEscPedida:0,afConv:0,afCompar:0,afOfertas:0,fails:{},voz:0,vozOk:0};
const MH=/(depresi|ansiedad|bipolar|tdah|salud mental)/i,BAD=/(restricci|restring|preexist|rechaz|18 meses)/i,OKN=/(no (se )?(la |lo )?declar|no pueden|ni restring|ni rechaz|no te pueden|no (es|son) preexistencia|no cuenta|ya no se puede restringir|no puede(n)? usarse|ley 21\.?331)/i;
const nn=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"");
for(let c=0;c<N;c++){const [tipo,cond]=pick(PERF);const isa=pick(["Banmédica","Colmena","Consalud","Cruz Blanca","Vida Tres","Fonasa"]);
 B.start({nombre:pick(["Ana","Luis","María José","Pedro"]),isapre:isa,renta:String(pick([600000,900000,1500000,2500000,4000000])),cargas:pick(["no","1","2","3"]),clinica_interes:pick(["Clínica Dávila","Clínica Alemana","RedSalud","Indisa",""]),comuna:pick(["Maipú","Temuco","Viña del Mar",""]),preexistencias:cond?"Sí":"No",detalle_preexistencias:cond});
 const af=B._state().p.afiliable;st.conv++;if(af)st.afConv++;else st.noafConv++;let pidio=false,forz=false,comp=false;const voz=rnd()<.35;
 for(let k=0,n=3+Math.floor(rnd()*5);k<n;k++){let q,exp=null;const prev=B._state();
  if(prev.pending==="comparar"||prev.pending==="comparar_si"){st.afOfertas++;if(rnd()<.55){q=pick(["si","dale","ya","sí quiero","ok"]);}}
  if(!q){const [s,re]=pick(Q[pick(CATS)]);q=voz?audio(s):texto(s);exp=re;if(/nico|ejecutivo/.test(s))pidio=true;}
  const r=B.reply(q);st.turns++;if(voz)st.voz++;
  for(const sen of r.t.split(/(?<=[.!?])\s+/)){const x=nn(sen);if(MH.test(x)&&BAD.test(x)&&!OKN.test(x))st.mh++;}
  if(r.id==="no_entendi"||r.id==="escalar_auto")st.miss++;if(r.escalar&&!pidio)forz=true;if(r.id==="comparar_si")comp=true;
  if(exp){st.lab++;if(exp.test(r.id)){st.ok++;if(voz)st.vozOk++;}else{const key=(voz?"[voz] ":"")+q.slice(0,60)+" → "+r.id;st.fails[key]=(st.fails[key]||0)+1;}}}
 if(!af){if(forz)st.noafEscForzada++;if(pidio)st.noafEscPedida++;}else if(comp)st.afCompar++;}
const pc=(a,b)=>(100*a/b).toFixed(1)+"%";
console.log(`Conversaciones ${st.conv} · turnos ${st.turns} (${pc(st.voz,st.turns)} por voz)`);
console.log(`Comprensión: ${pc(st.ok,st.lab)} (${st.lab-st.ok} errores) · sin entender: ${pc(st.miss,st.turns)}`);
console.log(`Inconsistencias salud mental: ${st.mh}`);
console.log(`No afiliables: ${st.noafConv} conv · derivación no pedida: ${pc(st.noafEscForzada,st.noafConv)} · pidieron hablar con alguien: ${pc(st.noafEscPedida,st.noafConv)}`);
console.log(`Afiliables: ${st.afConv} conv · terminaron con comparación pedida: ${pc(st.afCompar,st.afConv)}`);
Object.entries(st.fails).sort((a,b)=>b[1]-a[1]).slice(0,22).forEach(([k,v])=>console.log(String(v).padStart(5),k));
