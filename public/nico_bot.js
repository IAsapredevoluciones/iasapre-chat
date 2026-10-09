/* ===== NicoBot · asesor autónomo IAsapre (sin motor externo) =====
 * API:  NicoBot.clasificar(texto,{imc}) · NicoBot.start(lead) → {t,chips} · NicoBot.reply(texto) → {t,chips,escalar,id,conf}
 * Requiere (opcional) kb_offline.js cargado antes: usa KB_OFF como base estática de respaldo.
 */
(function(root){
const WSP_H="+56 9 8538 0357", UF=40400, TOPE_UF=87.8;
const fmt=n=>"$"+Math.round(n).toLocaleString("es-CL");
const TYPO=[[/\bkeria\b/g,"queria"],[/\bkiero\b/g,"quiero"],[/\bcombiene\b/g,"conviene"],[/\bxq\b|\bpq\b/g,"porque"],[/\bk onda\b/g,"que onda"],[/\bkn\b/g,"con"],[/\bq\b/g,"que"],[/\bwena\b/g,"hola"],[/\bisapres?\b/g,m=>m],[/\bnose\b/g,"no se"],[/\bxfa\b|\bpls\b/g,"porfa"]];
const norm=s=>TYPO.reduce((a,[r,v])=>a.replace(r,v),String(s||"").toLowerCase()).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/(\d)[.,](\d)/g,"$1$2").replace(/[^a-z0-9%$\s]/g," ").replace(/\s+/g," ").trim();
const pila=n=>String(n||"").trim().split(/\s+/)[0]||"";
const pick=(a,i)=>a[Math.abs(i)%a.length];

/* ---------- datos: isapres, clínicas, condiciones ---------- */
const ISAPRES={
 banmedica:{n:"Banmédica",g:"Grupo Banmédica",red:["Clínica Santa María","Clínica Dávila","Dávila Vespucio","Ciudad del Mar (Viña)","Clínica Biobío (Concepción)","centros Vida Integra"],
  extra:"Salud Extendida (sumas hasta dos familiares que están en Fonasa a la red Banmédica pagando una prima aparte), Club Banmédica, telemedicina en planes seleccionados y chequeo preventivo",dental:"Uno Salud Dental y el seguro Banmédica Dental",web:"banmedica.cl"},
 vidatres:{n:"Vida Tres",g:"Grupo Banmédica",red:["Clínica Santa María","Clínica Dávila","la red Banmédica"],extra:"los beneficios del grupo Banmédica",dental:"la red dental del grupo Banmédica",web:"vidatres.cl"},
 consalud:{n:"Consalud",g:"RedSalud (Cámara Chilena de la Construcción)",red:["RedSalud Vitacura","RedSalud Providencia","RedSalud Santiago","RedSalud en regiones (Elqui, Iquique, Rancagua, Temuco, Magallanes)"],
  extra:"RedSalud Beneficios (descuentos en dental, óptica y farmacias), programa Vida Sana y la app Consalud Móvil con telemedicina",dental:"RedSalud Dental",web:"consalud.cl"},
 cruzblanca:{n:"Cruz Blanca",g:"Bupa",red:["Clínica Bupa Santiago","Bupa Reñaca","Bupa Antofagasta","centros IntegraMédica"],
  extra:"Bupa Bienestar (telemedicina 24/7 y apoyo psicológico), Club Cruz Blanca y un seguro catastrófico Bupa opcional",dental:"Bupa Dental",web:"cruzblanca.cl"},
 colmena:{n:"Colmena",g:"independiente (no es dueña de clínicas)",red:["convenios en muchas clínicas (Alemana, Las Condes, Indisa, UC, Santa María, regiones)"],
  extra:"el club Colmena Contigo y seguros complementarios contratables aparte (catastrófico, oncológico y dental)",dental:"Colmena Dental",web:"colmena.cl"},
 nuevamasvida:{n:"Nueva Masvida",g:"",red:["sus clínicas en convenio"],extra:"los beneficios de su club",dental:"su red dental en convenio",web:"nuevamasvida.cl"},
 esencial:{n:"Esencial",g:"",red:["sus clínicas en convenio"],extra:"los beneficios de su app",dental:"su red dental en convenio",web:"somosesencial.cl"},
};
function isapreKey(s){const x=norm(s).replace(/\s/g,"");if(!x)return null;
 if(/fonasa/.test(x))return "fonasa"; if(/banmed/.test(x))return "banmedica"; if(/vida ?3|vidatres/.test(x))return "vidatres"; if(/consalud/.test(x))return "consalud";
 if(/cruzblanca|bupa/.test(x))return "cruzblanca"; if(/colmena/.test(x))return "colmena"; if(/masvida/.test(x))return "nuevamasvida"; if(/esencial/.test(x))return "esencial";
 if(/otra|sin|ninguna|no tengo/.test(norm(s)))return "ninguna"; return null;}
const CLINICAS=[
 [/santa maria/,"Clínica Santa María","banmedica"],[/davila/,"Clínica Dávila","banmedica"],[/ciudad del mar/,"Clínica Ciudad del Mar","banmedica"],[/biobio/,"Clínica Biobío","banmedica"],[/vida integra/,"Vida Integra","banmedica"],
 [/redsalud|red salud|tabancura|elqui|mayor temuco/,"RedSalud","consalud"],
 [/bupa|integramedica|renaca|vitacura/,"red Bupa","cruzblanca"],
 [/alemana/,"Clínica Alemana",null],[/las condes/,"Clínica Las Condes",null],[/uc christus|clinica uc|san carlos|catolica/,"Red UC Christus",null],[/indisa/,"Clínica Indisa",null],[/los andes|uandes/,"Clínica U. de los Andes",null],[/meds/,"Clínica Meds",null],[/hospital del profesor/,"Hospital del Profesor",null],[/clinico u de chile|jj aguirre|universidad de chile/,"Hospital Clínico U. de Chile",null],[/andes salud/,"Andes Salud",null],[/achs/,"Clínicas Achs Salud",null],[/sanatorio aleman/,"Sanatorio Alemán",null],[/interclinica/,"InterClínica",null]
];
const CLIN_ISA=[
 [/santa maria/,["banmedica*","vidatres","colmena"]],[/davila|vespucio/,["banmedica*","vidatres","colmena"]],[/ciudad del mar/,["banmedica*","colmena","cruzblanca"]],[/biobio/,["banmedica*","consalud"]],
 [/alemana de (temuco|valdivia|osorno)/,["colmena","cruzblanca","banmedica"]],[/alemana/,["banmedica","colmena"]],[/las condes/,["banmedica","colmena"]],[/uc christus|clinica uc|catolica|marcoleta/,["banmedica","colmena"]],
 [/san carlos/,["consalud","colmena"]],[/indisa/,["banmedica","colmena","consalud"]],[/los andes|uandes/,["banmedica","colmena"]],[/meds/,["banmedica","colmena"]],[/cordillera/,["consalud","colmena"]],
 [/redsalud|red salud/,["consalud*","colmena","banmedica","cruzblanca"]],[/bupa|integramedica|renaca/,["cruzblanca*","colmena"]],[/clinico u|universidad de chile|jj aguirre/,["consalud","colmena","cruzblanca"]],
 [/hospital del profesor/,["colmena","cruzblanca"]],[/andes salud/,["consalud","colmena","banmedica"]],[/achs/,["consalud","colmena","banmedica"]],[/sanatorio aleman/,["consalud","banmedica"]],[/interclinica/,["banmedica","colmena","cruzblanca"]]];
function isapresEn(c){if(!c)return null;const x=norm(c.n||c);for(const [re,l] of CLIN_ISA)if(re.test(x))return l.map(k=>{const d=k.endsWith("*");const key=k.replace("*","");return (ISAPRES[key]?ISAPRES[key].n:key)+(d?" (dueña de la clínica)":"");});return null;}
function clinicaDe(s){const x=norm(s);for(const [re,n,g] of CLINICAS)if(re.test(x))return {n,g};return null;}

const CONDS={
 diabetes:{n:"diabetes",ges:"La diabetes tipo 2 (y la tipo 1) está en el GES: controles, exámenes y los medicamentos de la canasta (como metformina e insulinas) con receta GES en la red que te designen. También son GES la retinopatía diabética y la prevención de enfermedad renal. En isapre pagas máximo 20% de un arancel bajo; en Fonasa tramo A y B, 0%.",caec:false},
 cancer_reciente:{n:"cáncer",ges:"La mayoría de los cánceres frecuentes están en el GES (mama, próstata, colon y recto, estómago, cuello uterino, testículo, linfomas, leucemias y cánceres infantiles, entre otros), con plazos garantizados y copago acotado. Para lo que no cubre el GES está la CAEC, y algunos tratamientos de alto costo (como mama HER2+) van por Ley Ricarte Soto al 100%.",caec:true},
 obesidad:{n:"obesidad o cirugía bariátrica",ges:"La obesidad no está en el GES, pero sí lo están varias de sus complicaciones (diabetes, hipertensión, apnea en ciertos casos, artrosis de cadera y rodilla en mayores de 65). La cirugía bariátrica, si la necesitas, suele ser cobertura restringida en los planes: revisa ese punto en tu carátula.",caec:false},
 renal:{n:"enfermedad renal",ges:"La enfermedad renal crónica avanzada está en el GES, incluida la diálisis, con copago acotado; y la CAEC te cubre el 100% de los copagos sobre el deducible dentro de su red.",caec:true},
 trasplante:{n:"un trasplante",ges:"Varios trasplantes y sus controles tienen cobertura GES, y la CAEC te protege en hospitalizaciones de alto costo; algunos medicamentos inmunosupresores entran por la canasta GES.",caec:true},
 vih:{n:"VIH",ges:"El VIH está en el GES, incluido el tratamiento antirretroviral, con confidencialidad garantizada. En Fonasa tramo A y B es sin copago.",caec:false},
 cardio_grave:{n:"un problema cardíaco",ges:"El infarto agudo, los marcapasos por trastornos de conducción, la hipertensión y las cardiopatías congénitas operables están en el GES; y en hospitalizaciones de alto costo la CAEC te deja con copago cero sobre el deducible.",caec:true},
 hepatica:{n:"una enfermedad hepática crónica",ges:"Las hepatitis B y C están en el GES con tratamiento; para hospitalizaciones de alto costo está la CAEC.",caec:true},
 neuro_grave:{n:"una enfermedad neurológica",ges:"El ACV isquémico, la epilepsia, el Parkinson y la esclerosis múltiple recurrente remitente están en el GES; y ciertos tratamientos de esclerosis múltiple van por Ley Ricarte Soto al 100%.",caec:true},
 autoinmune_activa:{n:"una enfermedad autoinmune",ges:"La artritis reumatoide y el lupus están en el GES, y las terapias biológicas de artritis reumatoide refractaria y esclerosis múltiple pueden ir por Ley Ricarte Soto al 100%.",caec:true},
};

/* ---------- clasificación (corregida: salud mental no se declara) ---------- */
const REGLAS=[
 ["diabetes","no_afiliable",/diabet|insulin|glicemia alta|hba1c|metformin|\bdm ?2\b|\bdm ?1\b/],
 ["cancer_reciente","no_afiliable",/cancer|tumor maligno|neoplasia|quimio|radioterapia|leucemia|linfoma|melanoma|carcinoma|oncolog/,/hace (mas de )?([5-9]|1\d|2\d) anos|mas de (cinco|5) anos|olvido oncol|alta hace ([5-9]|1\d)/],
 ["obesidad","no_afiliable",/obesidad|obes[oa]|imc ?(3[5-9]|4\d|5\d)|bariatric|bypass gastrico|manga gastrica|manga|balon gastrico/],
 ["renal","no_afiliable",/insuficiencia renal|dialisis|enfermedad renal cronica|\berc\b/],
 ["trasplante","no_afiliable",/trasplant/],
 ["vih","no_afiliable",/\bvih\b|\bhiv\b|\bsida\b/],
 ["cardio_grave","no_afiliable",/infarto|bypass coronario|stent|insuficiencia cardiaca|marcapaso|fibrilacion|cardiopatia/],
 ["hepatica","no_afiliable",/cirrosis|hepatitis (b|c)\b|hepatitis cronica/],
 ["neuro_grave","no_afiliable",/esclerosis|parkinson|\bacv\b|accidente cerebro ?vascular|epilepsia|\bela\b/],
 ["autoinmune_activa","no_afiliable",/lupus|artritis reumatoide|crohn|colitis ulcerosa|biologico|espondilitis/],
 ["salud_mental","protegido",/depresi|ansiedad|bipolar|esquizofren|psiquiatr|psicolog|sertralina|escitalopram|fluoxetina|tdah|panico|toc\b|psicosis/],
 ["hta","restringible",/hipertension|presion alta|\bhta\b|losartan|enalapril/],
 ["tiroides","restringible",/tiroid|levotiroxina|eutirox|hashimoto/],
 ["asma","restringible",/\basma|salbutamol|inhalador/],
 ["colesterol","restringible",/colesterol|dislipid|atorvastatina|triglic/],
 ["embarazo","restringible",/embaraz|gestacion|semanas de embarazo/],
 ["osteo","restringible",/hernia (discal|lumbar|cervical)|artrosis|menisco|ligamento|hombro|columna|escoliosis|rodilla/],
 ["apnea","restringible",/apnea|cpap/],
 ["sobrepeso","restringible",/sobrepeso|imc ?3[0-4]/],
 ["cirugia_pasada","evaluar",/operad|cirugia|intervencion|apendic|vesicula|hernia inguinal/],
];
const NOMBRE={diabetes:"diabetes",cancer_reciente:"cáncer con menos de 5 años desde el alta",obesidad:"obesidad / cirugía bariátrica",renal:"enfermedad renal",trasplante:"trasplante",vih:"VIH",cardio_grave:"cardiopatía importante",hepatica:"enfermedad hepática crónica",neuro_grave:"enfermedad neurológica",autoinmune_activa:"autoinmune con tratamiento",salud_mental:"salud mental (no se declara por ley)",hta:"hipertensión",tiroides:"tiroides",asma:"asma",colesterol:"colesterol",embarazo:"embarazo",osteo:"osteoarticular",apnea:"apnea del sueño",sobrepeso:"sobrepeso",cirugia_pasada:"cirugía previa"};
function clasificar(txt,ex={}){
 const x=norm(txt), imc=ex.imc?Number(ex.imc):null, h=[];
 if(imc>=35)h.push({id:"obesidad",nivel:"no_afiliable",nombre:"IMC "+imc});else if(imc>=30)h.push({id:"sobrepeso",nivel:"restringible",nombre:"IMC "+imc});
 for(const [id,nivel,re,exc] of REGLAS){ if(re.test(x)&&!h.some(z=>z.id===id)){ if(exc&&exc.test(x))h.push({id:id+"_superado",nivel:"evaluar",nombre:"cáncer con alta hace 5+ años (olvido oncológico)"}); else h.push({id,nivel,nombre:NOMBRE[id]}); } }
 if(!h.length&&x&&!/^(no|nada|ninguna|sin)\b/.test(x))h.push({id:"otro",nivel:"evaluar",nombre:"condición declarada"});
 const ord={no_afiliable:4,restringible:3,evaluar:2,protegido:1,sin_impacto:0};
 const nivel=h.reduce((m,z)=>ord[z.nivel]>ord[m]?z.nivel:m,"sin_impacto");
 return {nivel,hallazgos:h,resumen:{no_afiliable:"No afiliable como persona nueva en otra isapre: optimizar dentro de su isapre o Fonasa.",restringible:"Afiliable con restricción de hasta 18 meses (mínimo 25% del plan) para esa patología.",evaluar:"Revisar caso a caso.",protegido:"Salud mental: por ley no se declara ni restringe.",sin_impacto:"Sin preexistencias relevantes."}[nivel]};
}

/* ---------- cortafuegos de consistencia ---------- */
const MH=/(depresi|ansiedad|bipolar|esquizofren|salud mental|psiquiatr|psicolog|tdah|deficit atencional|trastorno (mental|de panico|obsesivo|alimentari|de la conducta|del animo)|autismo|\btea\b|anorexia|bulimia|discapacidad (psiquica|intelectual)|enfermedad(es)? mental)/;
const RESTR=/(restricci|restring|preexist|declarar|declaracion|rechaz|no (son |es )?afiliable|18 meses|25%|limite de sesiones|cobertura reducida)/;
const NEG_OK=/(no (se )?(la |lo |las |los )?declar|no pueden (preguntar|restringir|rechazar|usar|pedir)|ni (restringir|rechazar|pedir|restring)|no te pueden|sin restricci|no (es|son) preexistencia|no cuenta|ya no se puede restringir|no puede(n)? usarse)/;
const MH_FACT="Ojo: la salud mental (depresión, ansiedad, bipolaridad, TDAH, etc.) no se declara y no puede usarse para restringir ni rechazar; así lo establece la Ley 21.331 desde 2022.";
function guard(txt){if(!txt)return txt;let hit=false;
 const out0=String(txt).split(/\n\n+/).map(par=>par.split("\n").map(line=>{const parts=line.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡0-9"👉])/);
  return parts.filter(s=>{const x=norm(s);if(MH.test(x)&&RESTR.test(x)&&!NEG_OK.test(x)){hit=true;return false;}return true;}).join(" ");}).filter(l=>l.trim()).join("\n")).filter(p=>p.trim()).join("\n\n");
 let out=out0;if(hit&&!/ley 21\.?331/i.test(out))out+=(out?"\n\n":"")+MH_FACT;return out;}

/* ---------- perfil y cálculos ---------- */
let S=null; // estado de la conversación
function num(s){const x=String(s||"").toLowerCase().replace(/\s/g,"");let m=x.match(/(\d+[.,]?\d*)\s*(mm|millon|millones|palos?|m\b)/);if(m)return parseFloat(m[1].replace(",","."))*1e6;
 m=x.match(/(\d+)\s*(lucas|mil|k)\b/);if(m)return parseInt(m[1])*1000; const d=x.replace(/[^\d]/g,"");return d?parseInt(d):null;}
function montos(raw){const x=String(raw||"").toLowerCase();const R=/(\d[\d.,]*\s*(mil|lucas|palos?|millones?|mm|k)?)/;
 const g=x.match(new RegExp("(gano|sueldo|renta|liquido|imponible|me pagan)[^\\d]{0,20}"+R.source));const c=x.match(new RegExp("(pago|cobra|cobran|cuesta|plan de|sale|descuentan)[^\\d]{0,20}"+R.source));
 return {renta:g?num(g[2]):null,pago:c?num(c[2]):null};}
function cargasN(s){const x=norm(s);if(!x||/^no|ninguna|0/.test(x))return 0;const m=x.match(/\d+/);return m?parseInt(m[0]):1;}
function perfil(lead){
 const p={nombre:pila(lead.nombre)||"",edad:parseInt(lead.edad)||null,isapre:isapreKey(lead.isapre),isapreTxt:lead.isapre||"",renta:num(lead.renta),cargas:cargasN(lead.cargas),edadCargas:lead.edad_cargas||"",
  region:lead.region||"",comuna:lead.comuna||"",clinica:lead.clinica_interes?clinicaDe(lead.clinica_interes)||{n:lead.clinica_interes,g:undefined}:null,busca:norm(lead.que_busca||""),contacto:lead.contacto_pref||"WhatsApp"};
 p.clasif=clasificar([lead.preexistencias==="No"?"":lead.detalle_preexistencias,lead.preexistencias==="No"?"":""].join(" "),{imc:lead.imc});
 p.cond=p.clasif.hallazgos.find(h=>h.nivel==="no_afiliable");
 p.enIsapre=p.isapre&&p.isapre!=="fonasa"&&p.isapre!=="ninguna";p.afiliable=p.clasif.nivel!=="no_afiliable";
 const mm=montos(lead.que_busca||"");if(mm.pago)p.pago=mm.pago;else{const z=String(lead.que_busca||"").match(/(\d[\d.,]*\s*(mil|lucas))/i);if(z)p.pago=num(z[1]);}
 return p;}
function siete(p){if(!p.renta)return null;return Math.min(p.renta,TOPE_UF*UF)*0.07;}
function tramo(p){const r=p.renta;if(r==null)return null;if(r<=0)return "A";let t=r<=539000?"B":r<=786940?"C":"D";if(p.cargas>=3&&t!=="B")t=t==="D"?"C":"B";return t;}
function gesCopago(t){return t==="A"||t==="B"?"0%":t==="C"?"10%":"20%";}
function isapreN(p){return p.enIsapre&&ISAPRES[p.isapre]?ISAPRES[p.isapre].n:(p.isapreTxt&&!/fonasa|otra/i.test(p.isapreTxt)?p.isapreTxt:"tu isapre");}

/* ---------- bloques personalizados ---------- */
function bloqueClinica(p){
 const c=p.clinica; if(!c)return "";
 const due=c.g&&ISAPRES[c.g]?ISAPRES[c.g].n:null;
 if(p.enIsapre){
  if(c.g===p.isapre||(c.g==="banmedica"&&p.isapre==="vidatres")) return `${c.n} es de la red de tu propia isapre, así que ahí ${isapreN(p)} suele tener sus mejores planes preferentes: pide específicamente planes con ${c.n} como prestador preferente y mira el tope hospitalario.`;
  if(due) return `${c.n} es de la red ${due}, no de ${isapreN(p)}; igual puedes atenderte ahí, solo que la cobertura depende del convenio. Pide a ${isapreN(p)} los planes que tengan ${c.n} como prestador preferente y, si no hay, compara el % y tope de libre elección ahí.`;
  return `${c.n} no pertenece a ninguna isapre, así que la cobertura ahí depende del convenio de cada plan: pide a ${isapreN(p)} sus planes con ${c.n} como prestador preferente y compara el tope hospitalario.`;
 }
 return `En ${c.n} puedes atenderte con Fonasa usando bonos de libre elección si está en convenio (revísalo en fonasa.gob.cl) o con el seguro complementario.`;
}
function bloqueCosto(p){
 const s=siete(p); if(!s)return "";
 if(p.enIsapre&&p.pago){const dif=p.pago-s;return dif>0?`Tu 7% legal es aprox. ${fmt(s)} y me cuentas que pagas cerca de ${fmt(p.pago)}: son ${fmt(dif)} extra al mes, así que hay margen para ${p.afiliable?"encontrar algo mejor comparando con otras isapres":"ajustar dentro de "+isapreN(p)}.`:`Tu 7% legal es aprox. ${fmt(s)} y pagas menos que eso, así que tu plan ya es eficiente en precio y te genera excedentes; lo que conviene mirar es la cobertura.`;}
 if(p.enIsapre) return `Tu 7% legal es aprox. ${fmt(s)} al mes. Si hoy pagas bastante más que eso, hay margen para buscar ${p.afiliable?"en otras isapres":"un plan de "+isapreN(p)} que calce mejor; si pagas menos, se te generan excedentes que son tuyos.`;
 return `Tu 7% (aprox. ${fmt(s)}) va a Fonasa sin importar tu salud${tramo(p)?`, y con esa renta${p.cargas>=3?" y tus cargas":""} quedas en el tramo ${tramo(p)}`:""}.`;
}
function bloqueCond(p){const c=p.cond&&CONDS[p.cond.id];return c?(p.enIsapre?c.ges:c.ges.replace(/[^.]*carátula[^.]*\./g,"").trim())+(c.caec&&p.enIsapre?" Si te toca una hospitalización cara, activa la CAEC antes de que se acumulen las cuentas.":""):"";}

/* ---------- primer mensaje ---------- */
function start(lead){
 const p=perfil(lead); S={p,turn:0,last:null,pending:null,miss:0,topics:new Set()};
 const n=p.nombre?` ${p.nombre}`:""; const seed=(p.nombre||"x").length+(p.edad||0);
 if(p.clasif.nivel!=="no_afiliable") return startOtro(p,n);
 const condN=p.cond?CONDS[p.cond.id].n:"lo que declaras";
 const lugar=p.comuna||p.region?` desde ${p.comuna||p.region}`:"";
 const car=p.cargas?`, con ${p.cargas} carga${p.cargas>1?"s":""}`:"";
 let t=pick([`Hola${n}, soy el asistente de IAsapre. Leí tu formulario${lugar}${car} y te voy a hablar con la verdad, que es para lo que nos escribiste.`,
             `Hola${n} 👋 Te escribe el asistente de IAsapre. Revisé lo que nos contaste${lugar}${car} y prefiero ser directo desde el primer mensaje.`],seed)+"\n\n";
 t+=`Con ${condN}, hoy ninguna isapre te va a aceptar como afiliación nueva. No es personal: es cómo funciona su evaluación de salud. Y no te conviene omitirlo en la Declaración de Salud, porque si después lo detectan pueden negarte cobertura y terminar el contrato.\n\n`;
 if(p.enIsapre){
  t+=`Lo bueno: ya estás en ${isapreN(p)} y ahí nadie te puede sacar por estar enfermo${p.cond&&p.cond.id!=="obesidad"?" ni por usar el plan":""}. Además, cambiarte de plan dentro de ${isapreN(p)} no exige una nueva Declaración de Salud, así que esa es tu cancha para mejorar.`;
  const bc=bloqueCosto(p), bl=bloqueClinica(p);
  if(bc||bl) t+="\n\n"+[bc,bl].filter(Boolean).join(" ");
  const g=bloqueCond(p); if(g) t+="\n\n"+g;
  t+=`\n\n¿Qué te importa más ahora: bajar lo que pagas, mejorar la cobertura en tu clínica, o entender qué te cubre para tu tratamiento?`;
  S.pending="objetivo";
  return {t,chips:["Bajar lo que pago","Mejor cobertura en mi clínica","Qué me cubre para mi tratamiento","¿Y si igual intento otra isapre?","Hablar con Nico"]};
 }
 t+=`Para tu caso, lo más sólido es Fonasa: no pregunta preexistencias, no te restringe nada y tu 7% ${p.renta?`(aprox. ${fmt(siete(p))})`:""} te da acceso a la red pública con copago cero y a clínicas privadas con bonos de libre elección.`;
 const tr=tramo(p); if(tr) t+=` Con tu renta${p.cargas>=3?" y tus cargas":""} quedarías en el tramo ${tr}, así que el GES te sale con ${gesCopago(tr)} de copago.`;
 const g=bloqueCond(p); if(g) t+="\n\n"+g;
 t+=`\n\nSi quieres más protección en clínicas, se puede sumar un seguro complementario (ojo: muchos individuales excluyen preexistencias; los colectivos de empresa suelen ser más flexibles). ¿Te explico cómo armarlo?`;
 S.pending="complementario";
 return {t,chips:["Sí, cómo armo Fonasa + seguro","¿Cuánto pago en Fonasa?","Qué me cubre el GES","Atenderme en mi clínica","Hablar con Nico"]};
}
function startOtro(p,n){
 const c=p.clasif; let t;
 if(c.nivel==="restringible"){const h=c.hallazgos.filter(z=>z.nivel==="restringible").map(z=>z.nombre).join(" y ");
  t=`Hola${n}, soy el asistente de IAsapre. Leí tu formulario. Con ${h}, las isapres normalmente te aceptan, pero pueden restringir esa patología hasta 18 meses (con mínimo 25% del plan); el resto se cubre normal desde el día uno.${c.hallazgos.some(z=>z.id==="salud_mental")?" Y lo de salud mental no se declara: por ley (21.331) no cuenta como preexistencia.":""}\n\nIgual vale la pena comparar: si otra isapre te cubre mejor tu clínica o te cobra menos, el ahorro suele compensar esa restricción.${bloqueCosto(p)?" "+bloqueCosto(p):""}${isapresEn(p.clinica)?` En ${p.clinica.n} las isapres con mejores convenios son ${isapresEn(p.clinica).join(", ")}.`:""}\n\nUn ejecutivo te va a mandar la comparación por ${p.contacto}. Mientras, pregúntame lo que quieras.`;}
 else if(c.nivel==="protegido") t=`Hola${n}, soy el asistente de IAsapre. Algo importante: desde 2022 las isapres no pueden preguntar ni restringir por salud mental (depresión, ansiedad, bipolaridad, etc.), así que eso no debe ir en tu Declaración de Salud ni te puede jugar en contra. Tu caso sigue el flujo normal: un ejecutivo te mandará la comparación por ${p.contacto}. ¿Te ayudo con alguna duda mientras?`;
 else if(c.hallazgos.some(z=>/superado/.test(z.id))) t=`Hola${n}, soy el asistente de IAsapre. Si ya pasaron 5 años desde que terminaste el tratamiento sin recaída, aplica la Ley de Olvido Oncológico: no estás obligado a declararlo y no te lo pueden usar para restringir ni rechazar. Así que puedes cotizar normal; un ejecutivo te contacta por ${p.contacto}. ¿Alguna duda?`;
 else t=`Hola${n}, soy el asistente de IAsapre. Leí tu formulario.\n\nTu caso es bueno para comparar: no tienes nada que te restrinja, así que puedes elegir entre los planes de todas las isapres.${bloqueCosto(p)?" "+bloqueCosto(p):""}${isapresEn(p.clinica)?` En ${p.clinica.n} las isapres con mejores convenios hoy son ${isapresEn(p.clinica).join(", ")}.`:""}\n\nUn ejecutivo te va a mandar hasta 3 alternativas por ${p.contacto}. Mientras, pregúntame lo que quieras.`;
 S.pending=null;
 return {t,chips:["¿Qué miro al comparar?","¿Cómo es el cambio de isapre?","¿Qué es un tope?","Hablar con Nico"]};
}

/* ---------- respuestas dinámicas (usan el perfil) ---------- */
const D={
 bajar_costo(p,q){if(p.afiliable){const m=montos(q||"");if(m.renta)p.renta=m.renta;if(m.pago)p.pago=m.pago;return D.comparar(p);}const m=montos(q||"");if(m.renta)p.renta=m.renta;if(m.pago)p.pago=m.pago;const s=siete(p);S.pending="pasos_plan";
  let cuenta="";if(s&&p.pago){const dif=p.pago-s;cuenta=dif>0?`Con lo que me cuentas: tu 7% es aprox. ${fmt(s)} y pagas ${fmt(p.pago)}, o sea ${fmt(dif)} extra al mes (${Math.round(100*p.pago/p.renta)}% de tu sueldo). Hay espacio para ajustar.\n\n`:`Con lo que me cuentas, pagas menos que tu 7% (aprox. ${fmt(s)}), así que te generas excedentes: tu plan ya es eficiente en precio; lo que conviene revisar es la cobertura.\n\n`;}
  return {t:cuenta+`Para bajar lo que pagas sin perder lo que tienes cubierto, la jugada es un cambio de plan dentro de ${isapreN(p)} (sin nueva Declaración de Salud).${s?` Tu meta es un plan que quede cerca de tu 7%, aprox. ${fmt(s)} al mes${p.cargas?` (con tus ${p.cargas} carga${p.cargas>1?"s":""} incluidas)`:""}.`:""}\n\nLo que más baja el precio sin dañarte: 1) pasar de libre elección a un plan preferente en la clínica que de verdad usas; 2) revisar si estás pagando beneficios que no ocupas; 3) si tu isapre te subió el plan este año, como cautivo por salud puedes reclamar el alza (te explico cómo).\n\nOjo con lo que NO conviene tocar: la cobertura hospitalaria y la CAEC, que es lo que te protege con tu diagnóstico. ¿Te paso el paso a paso para pedir el cambio?`,chips:["Sí, el paso a paso","Cómo reclamo el alza","¿Me conviene irme a Fonasa?","Hablar con Nico"]};},
 mejor_clinica(p){if(p.afiliable)return D.comparar(p);S.pending="pasos_plan";const bl=bloqueClinica(p);
  return {t:(bl||`Dime cuál es la clínica que más usas y te digo cómo se mueve ${isapreN(p)} ahí.`)+`\n\nLo que tienes que mirar en cada plan que te ofrezcan: el % hospitalario en esa clínica y, sobre todo, el TOPE (día cama, pabellón y honorarios). Un 100% con tope bajo puede dejarte copagos grandes. Si dice "sin tope" en tu clínica, buena señal. ¿Te paso el paso a paso para pedirlo?`,chips:p.clinica?["Sí, el paso a paso","¿Qué es un tope?","Cómo funciona la CAEC","Hablar con Nico"]:["Clínica Dávila","Clínica Alemana","RedSalud","Otra clínica"]};},
 tratamiento(p){const c=p.cond&&CONDS[p.cond.id];S.pending="caec";
  return {t:(c?c.ges:"Si tu diagnóstico está en el GES, tienes plazos garantizados y copago acotado.")+`\n\nEn 3 pasos: 1) pide a tu médico el formulario de notificación GES y actívalo en ${p.enIsapre?"la sucursal virtual de "+isapreN(p):"tu consultorio u hospital"}; te asignan un prestador de la red GES. 2) ${p.enIsapre?"Para hospitalizaciones o tratamientos caros que no sean GES, activa la CAEC antes de que se acumulen las cuentas: sobre el deducible pagas 0% en su red.":"En Fonasa, la red pública es con copago cero y tiene su propia protección para enfermedades catastróficas."} 3) Mientras estés en tratamiento, no te cambies de plan ni de previsión sin revisarlo antes.\n\n¿Quieres que te explique cuánto sería tu deducible CAEC?`,chips:p.enIsapre?["Sí, mi deducible CAEC","¿Cómo activo el GES?","¿Qué es la Ley Ricarte Soto?","Hablar con Nico"]:["¿Cómo activo el GES?","Fonasa + seguro complementario","Hablar con Nico"]};},
 pasos_plan(p){if(p.afiliable)return D.cambio_isapre(p);const I=ISAPRES[p.isapre];S.pending=null;const s=siete(p);
  return {t:`Paso a paso para cambiarte de plan dentro de ${isapreN(p)}:\n1) Descarga tu plan actual (la carátula en PDF) en la sucursal virtual${I?" de "+I.web:""}.\n2) Pídele a tu ejecutivo o por la sucursal la lista de planes que puedes contratar, con precio y tabla de prestadores. Dile qué buscas: ${p.busca||"un plan que calce con tu 7% y te cubra bien en tu clínica"}${p.clinica?`, en ${p.clinica.n}`:""}.\n3) Compara 4 cosas: precio final vs tu 7%${s?` (~${fmt(s)})`:""}, % y tope hospitalario en tu clínica, red GES/CAEC y coberturas restringidas.\n4) Exige el plan nuevo en PDF antes de firmar. No te pueden pedir una nueva Declaración de Salud: si lo hacen, pídelo por escrito y nos avisas.\n5) Rige desde el mes siguiente.\n\nSi te mandan opciones y no sabes cuál elegir, pégalas acá o mándalas al WhatsApp ${WSP_H} y te digo cuál conviene.`,chips:["¿Qué es un tope?","Cómo reclamo el alza","¿Me conviene Fonasa?","Gracias"]};},
 cautivo(p){if(p.afiliable){S.pending="comparar";return {t:`El alza de 2026 tuvo un tope de 3,5% sobre el precio base, y la carta de marzo te da plazo hasta fines de mayo para cambiarte de plan o de isapre sin esperar el año. Como tú sí puedes cambiarte, la mejor respuesta a un alza no es aceptarla: es comparar. Muchas veces otra isapre te da lo mismo o más por menos.\n\n¿Te armamos la comparación?`,chips:["Sí, quiero la comparación","¿Cómo es el cambio de isapre?","Hablar con Nico"]};}S.pending=null;
  return {t:`Como no puedes cambiarte de isapre por tu salud, eres "cautivo" y tienes un derecho especial: puedes reclamar el alza de precio base.\n\nCómo: 1) Antes del plazo que indica la carta de adecuación (la de marzo), envía un reclamo por escrito a ${isapreN(p)} diciendo que no aceptas el alza y que eres cautivo por salud. 2) La isapre tiene 15 días hábiles para responder. 3) Si no te convence, reclama en la Superintendencia (supersalud.gob.cl, con ClaveÚnica) adjuntando la carta de alza, la respuesta y un certificado o antecedente médico de tu condición; pides que te apliquen el indicador para cotizantes cautivos.\n\nTexto que puedes usar: "Por medio de la presente rechazo la adecuación de precio base informada en la carta de fecha ___, en mi calidad de cotizante cautivo por condición de salud (adjunto antecedentes). Solicito se me aplique el reajuste correspondiente a cotizantes cautivos conforme a la normativa de la Superintendencia de Salud."`,chips:["¿Qué es la Superintendencia?","Bajar lo que pago","Gracias"]};},
 intentar_otra(p,q){if(p.afiliable)return C.MALO.test(norm(q||""))||/menos|barat|mejor|conviene/.test(norm(q||""))?D.comparar(p):D.cambio_isapre(p);S.pending=null;
  return {t:`Puedes postular, nadie te lo prohíbe, pero tienes que declarar tu ${p.cond?CONDS[p.cond.id].n:"condición"} y lo más probable es que te rechacen la afiliación (no te cuesta nada, solo tiempo). Lo que sí te pido: no la omitas. Si la isapre después detecta que la tenías diagnosticada, puede negarte cobertura justo cuando más la necesitas y terminar el contrato, y ahí quedas sin isapre y con la enfermedad.\n\n${p.enIsapre?`Y muy importante: no renuncies a ${isapreN(p)} antes de tener la aceptación por escrito de la otra; si te desafilias y te rechazan, no puedes volver.`:"Mientras tanto, Fonasa te recibe sin preguntas."}`,chips:p.enIsapre?["Mejor optimizo en mi isapre","Bajar lo que pago","¿Me conviene Fonasa?"]:["Fonasa + seguro complementario","Qué me cubre el GES"]};},
 fonasa(p){const s=siete(p),tr=tramo(p);if(p.afiliable&&p.enIsapre){S.pending="comparar";return {t:`Fonasa siempre es una opción: pagas solo tu 7%${s?` (aprox. ${fmt(s)})`:""}, sin cobro por cargas${tr?`, y quedarías en tramo ${tr}`:""}. Pero antes de irte, compara: si te atiendes en clínicas privadas, normalmente otra isapre con plan preferente en tu clínica te deja mejor cubierto por un precio parecido, y si sales y luego te diagnostican algo, volver a una isapre puede costar.\n\n¿Comparamos primero tu plan con las otras isapres?`,chips:["Sí, quiero la comparación","¿Qué miro al comparar?","¿Cuánto pago en Fonasa?"]};}S.pending=p.enIsapre?null:"complementario";
  let t=p.enIsapre?`Fonasa siempre te recibe, sin preguntar por tu salud. Pero piénsalo bien: si sales de ${isapreN(p)} con tu diagnóstico, no puedes volver a una isapre.\n\n`:"";
  t+=`En Fonasa pagas solo tu 7%${s?` (aprox. ${fmt(s)})`:""}, sin cobro por cargas ni por edad${tr?`, y quedarías en tramo ${tr}: GES con ${gesCopago(tr)} de copago, red pública con copago cero${tr!=="A"?" y bonos de libre elección en clínicas en convenio":""}`:""}.`;
  if(p.enIsapre){const r=p.renta;t+=`\n\n${r&&r<1200000||p.cargas>=3?"Con tu renta"+(p.cargas>=3?" y tus cargas":"")+", Fonasa más un seguro complementario puede salirte bastante más barato.":"Con tu renta, normalmente conviene más optimizar tu plan en la isapre, porque la cobertura en clínicas es mejor."} La regla: compara lo que pagas hoy contra tu 7%; si la diferencia es grande y casi no usas clínicas privadas, Fonasa gana; si te atiendes en clínicas o estás en tratamiento, quédate y mejora tu plan.`;}
  return {t,chips:p.enIsapre?["Bajar lo que pago","¿Qué es un seguro complementario?","Hablar con Nico"]:["Sí, cómo armo Fonasa + seguro","Qué me cubre el GES","Hablar con Nico"]};},
 complementario_fonasa(p){S.pending=null;const tr=tramo(p);
  return {t:`Cómo armar Fonasa + seguro, paso a paso:\n1) Afíliate o confirma tu tramo en Mi Fonasa (fonasa.gob.cl, con ClaveÚnica)${tr?`; con tu renta serías tramo ${tr}`:""}.\n2) Si tu empleador tiene seguro colectivo, pregúntalo primero: suelen aceptar preexistencias o tener condiciones más flexibles que los individuales.\n3) Si cotizas uno individual, pregunta por escrito si excluye tu ${S.p.cond?CONDS[S.p.cond.id].n:"condición"}; muchos lo hacen. Aun así sirve para todo lo demás (accidentes, otras enfermedades).\n4) Revisa en fonasa.gob.cl la Modalidad de Cobertura Complementaria (MCC): es el seguro con sello Fonasa, de prima plana, sin discriminar por edad ni preexistencias; se ha ido implementando por etapas, así que confirma si ya puedes inscribirte.\n5) Para tu diagnóstico, activa el GES en tu consultorio u hospital: es tu mejor protección.`,chips:["Qué me cubre el GES","¿Cuánto pago en Fonasa?","Gracias"]};},
 cuanto_pago(p){const s=siete(p);S.pending=null;
  if(!s)return {t:"Para calcularlo necesito tu renta imponible aproximada (la que sale en tu liquidación). ¿Cuánto es?",chips:["$800.000","$1.500.000","$2.500.000"],need:"renta"};
  return {t:`Con una renta imponible de ${fmt(p.renta)}, tu 7% legal es aprox. ${fmt(s)} al mes${p.renta>TOPE_UF*UF?" (llegas al tope imponible)":""}. ${p.enIsapre?`Si tu plan en ${isapreN(p)} cuesta más, pagas la diferencia; si cuesta menos, te quedan excedentes que puedes usar en copagos, remedios o dental, y se devuelven en enero.`:`En Fonasa eso es todo lo que pagas, y quedas en tramo ${tramo(p)}.`}`,chips:p.enIsapre?["Bajar lo que pago","¿Me conviene Fonasa?"]:["Qué me cubre el GES","Fonasa + seguro complementario"]};},
 deducible(p){S.pending=null;
  const r=p.renta; let t=`El deducible CAEC es 30 veces tu cotización mensual del plan, con mínimo 60 UF y máximo 126 UF (aprox. ${fmt(60*UF)} a ${fmt(126*UF)}), por persona y por enfermedad, acumulado en 12 meses. Sobre eso, la isapre te cubre el 100% en su red CAEC.`;
  if(r){const cot=Math.max(siete(p),0)/UF;const d=Math.min(Math.max(30*cot,60),126);t+=` Si tu plan cuesta cerca de tu 7%, tu deducible rondaría ${d.toFixed(0)} UF (~${fmt(d*UF)}).`;}
  t+=` Y la isapre debe ofrecerte un préstamo para pagar el deducible en cuotas. Actívala antes o al inicio del tratamiento: lo que pagaste antes puede no contar.`;
  return {t,chips:["¿Cómo activo el GES?","¿Qué es la Ley Ricarte Soto?","Gracias"]};},
 no_es_preex(p){S.pending=null;return {t:`Clave: si te diagnosticaron estando ya afiliado a ${isapreN(p)}, eso NO es preexistencia. Tu isapre tiene que cubrirlo igual que cualquier otra cosa de tu plan, sin restricciones. Las preexistencias son solo lo diagnosticado antes de firmar el contrato. Si te están restringiendo algo que apareció después, es reclamable.`,chips:["¿Cómo reclamo?","Qué me cubre para mi tratamiento"]};},
 salud_mental(p){S.pending=null;return {t:`Buena noticia: desde 2022 (Ley 21.331) las isapres no pueden preguntar por enfermedades de salud mental en la Declaración de Salud, ni pedir antecedentes, ni vender planes que restrinjan esa cobertura. Así que depresión, ansiedad, bipolaridad u otros diagnósticos de salud mental no se declaran y no te pueden usar para rechazarte. La depresión (desde los 15 años), el trastorno bipolar y la esquizofrenia además están en el GES.`,chips:["¿Cómo activo el GES?","Fonasa o isapre"]};},
 clinica_q(p,q){const c=clinicaDe(q);if(c){S.p.clinica=c;} return D.mejor_clinica(S.p);},
 beneficios(p){const I=ISAPRES[p.isapre];S.pending=null;if(!I)return {t:"Dime en qué isapre estás y te cuento sus beneficios fuera del plan (dental, telemedicina, descuentos).",chips:["Banmédica","Consalud","Cruz Blanca","Colmena"],need:"isapre"};
  return {t:`Además del plan, ${I.n} tiene ${I.extra}. En dental, lo que más sirve es ${I.dental}; fuera del GES, el plan base cubre poco en todas las isapres. Y recuerda: el GES dental cubre urgencias odontológicas, embarazadas, niños de 6 y adultos de 60. Todo eso se revisa en ${I.web} o la app.`,chips:["Bajar lo que pago","Gracias"]};},
 familiar(p,q){S.pending=null;const enf=/(diabet|cancer|alzheimer|parkinson|demencia|enferm|diagnost|vih|renal|infarto|lupus)/.test(q);
  return {t:`Agregar a alguien a tu plan como carga es posible (cónyuge o conviviente civil, hijos hasta 18 o 24 si estudian, padres reconocidos como carga, o cualquier persona como "carga médica" pagando su factor). Pero esa persona también llena Declaración de Salud${enf?", y con una enfermedad como esa lo más probable es que la isapre la rechace o restrinja igual que si se afiliara sola":""}.${enf?`\n\nAlternativas reales: si está en Fonasa, que active el GES de su enfermedad y use la red pública; y si tú estás en Banmédica, existe "Salud Extendida", que permite sumar hasta dos familiares que siguen en Fonasa a la red Banmédica pagando una prima aparte.`:""}\n\nPara sacar a alguien de tu plan (por ejemplo una ex pareja), lo pides por escrito a tu isapre con el documento que acredite el cambio; desde ahí deja de cobrarse su factor.`,chips:["¿Cuánto sube el plan por una carga?","Bajar lo que pago","Hablar con Nico"]};},
 leer_plan(p){S.pending=null;const I=ISAPRES[p.isapre];
  return {t:`Vamos simple. Descarga tu plan (la "carátula", un PDF) en la sucursal virtual${I?" de "+I.web:" de tu isapre"} y mira solo 4 cosas:\n1) Precio: compáralo con tu 7%${siete(p)?` (~${fmt(siete(p))})`:""}. Si pagas mucho más, hay margen.\n2) Tabla de prestadores: en qué clínicas tienes cobertura "preferente"${p.clinica?` y si aparece ${p.clinica.n}`:""}.\n3) Hospitalario: el % y el TOPE de día cama, pabellón y honorarios en tu clínica. "Sin tope" es buena señal; un tope bajo hace que el 100% no sea 100%.\n4) Coberturas restringidas: la lista aparte de lo que cubre menos.\n\nSi quieres, me pegas acá lo que dice cada punto y te lo traduzco, o lo mandas al WhatsApp ${WSP_H} para que Nico lo revise contigo.`,chips:["¿Qué es un tope?","Bajar lo que pago","Hablar con Nico"]};},
 seguros(p,q){if(!p.enIsapre)return D.complementario_fonasa(p);S.pending=null;const cn=p.cond?CONDS[p.cond.id].n:null;
  return {t:`Los seguros complementarios, oncológicos o catastróficos que venden las isapres y aseguradoras (por ejemplo los de Colmena o Bupa) se contratan aparte y casi todos excluyen las enfermedades que ya tenías al contratar.${cn?` Con ${cn} ya diagnosticado, lo más probable es que no te cubran eso, aunque sí sirven para todo lo demás (accidentes, otras enfermedades).`:""} Antes de pagar uno, pide por escrito si excluye tu condición.\n\nPara tu diagnóstico, tu protección de verdad ya la tienes: el GES (si tu patología está en la lista) y la CAEC de tu plan, que deja tus copagos en cero sobre el deducible dentro de su red.`,chips:["Cómo funciona la CAEC","Qué me cubre para mi tratamiento","Bajar lo que pago"]};},
 comparar(p){S.pending="comparar_si";const isa=isapresEn(p.clinica),s=siete(p);const r=p.clasif.hallazgos.filter(h=>h.nivel==="restringible").map(h=>h.nombre);
  let t=`Para tu caso, lo que más rinde es comparar tu plan con los de las otras isapres: muchas veces aparece uno igual o mejor por menos plata, o con mejor cobertura en tu clínica.`;
  if(isa)t+=`\n\nEn ${p.clinica.n}, las isapres con mejores convenios hoy son ${isa.join(", ")}${p.enIsapre&&!isa.some(x=>x.startsWith(isapreN(p)))?`; ${isapreN(p)} no está entre las más fuertes ahí, así que hay espacio para mejorar`:""}.`;
  else if(!p.clinica)t+=`\n\nDime qué clínica usas o te gustaría usar y te digo qué isapres cubren mejor ahí.`;
  if(s)t+=` Tu 7% es aprox. ${fmt(s)}: la idea es apuntar a planes cerca de ese monto${p.pago&&p.pago>s?` (hoy pagas ${fmt(p.pago-s)} más que eso)`:""}.`;
  if(r.length)t+=`\n\nOjo: con ${r.join(" y ")}, la nueva isapre puede restringir esa patología hasta 18 meses (mínimo 25% del plan); el resto se cubre normal desde el primer día. En la comparación ponemos eso en la balanza.`;
  t+=`\n\nCon tus datos, un ejecutivo de IAsapre te arma hasta 3 alternativas con los más de 2.200 planes vigentes, gratis. ¿Te la armamos?`;
  return {t,chips:["Sí, quiero la comparación","¿Qué miro al comparar?","¿Cómo es el cambio de isapre?","Hablar con Nico"]};},
 comparar_si(p){S.pending=null;S.comparacion=true;
  return {t:`¡Listo${p.nombre?", "+p.nombre:""}! Quedó pedida tu comparación. Un ejecutivo de IAsapre te va a mandar hasta 3 planes de distintas isapres por ${p.contacto||"WhatsApp"}${p.clinica?`, pensando en ${p.clinica.n}`:""}, normalmente dentro del mismo día hábil.\n\nPara que salga más precisa, ten a mano la carátula de tu plan actual (el PDF de la sucursal virtual). Y mientras, pregúntame lo que quieras.`,chips:["¿Qué miro al comparar?","¿Cómo es el cambio de isapre?","¿Qué es un tope?"]};},
 que_mirar(p){S.pending="comparar";return {t:`Al comparar planes, mira 5 cosas y en este orden:\n1) La clínica: que sea prestador preferente en la que realmente usas${p.clinica?` (${p.clinica.n})`:""}.\n2) Hospitalario: % y TOPE de día cama, pabellón y honorarios ahí. "Sin tope" es buena señal.\n3) Precio final con GES incluido, frente a tu 7%${siete(p)?` (~${fmt(siete(p))})`:""}.\n4) Ambulatorio: consultas y exámenes, que es lo que más usas en el año.\n5) Restricciones: coberturas restringidas y, si declaras algo, cuánto tiempo te lo restringen.\n\n¿Quieres que te armemos la comparación con esos criterios?`,chips:["Sí, quiero la comparación","¿Cómo es el cambio de isapre?"]};},
 cambio_isapre(p){S.pending="comparar";const r=p.clasif.hallazgos.filter(h=>h.nivel==="restringible").map(h=>h.nombre);
  return {t:`Cambiarte de isapre es más simple de lo que parece:\n1) Requisitos: 12 meses en el sistema isapre (no en la misma) y sin deudas con tu isapre actual.\n2) Llenas la Declaración de Salud de la nueva isapre (para ti y tus cargas)${r.length?`; con ${r.join(" y ")} pueden restringir esa patología hasta 18 meses`:""}. La salud mental no se declara.\n3) Firmas el contrato y la nueva isapre hace el traspaso; tu plan nuevo rige desde el 1° del mes siguiente. Tienes 10 días hábiles para retractarte.\n4) Nunca renuncies a tu isapre actual antes de tener la aceptación de la nueva.\n\nNosotros te acompañamos en todo el trámite sin costo. ¿Te armamos la comparación para elegir?`,chips:["Sí, quiero la comparación","¿Qué miro al comparar?"]};},
 escalar(p){S.pending=null;return {t:`Claro. Escríbele a Nico directo al WhatsApp ${WSP_H}: con tu carátula te dice en la misma conversación qué plan te conviene. Es gratis. Si prefieres, usa el botón verde de arriba y el mensaje va con tus datos.`,chips:[],escalar:true};},
};

/* ---------- intenciones (orden = prioridad en empates) ---------- */
const KBR=(id)=>(p)=>{const kb=(typeof KB_OFF!=="undefined"?KB_OFF:root.KB_OFF)||[];const e=kb.find(z=>z.id===id);S.pending=null;return {t:e?e.r.replace(/\{n\}/g,p.nombre||"").replace(/\{isapre\}/g,isapreN(p)).replace(/\{wsp\}/g,WSP_H).replace(/\s{2,}/g," "):"",chips:sugerir(p,id)};};
const INT=[
 {id:"licencia",k:["licencia","licencias","licencia medica","compin","suseso","subsidio"],f:KBR("licencia"),w:2.5},
 {id:"huella",k:["huella","huellero","imed","i-med","bono electronico"],f:KBR("huella"),w:1.5},
 {id:"urgencia",k:["urgencia","cheque","pagare","garantia","riesgo vital","emergencia"],f:KBR("urgencia"),w:1.4},
 {id:"cesantia",k:["cesante","cesantia","despidieron","sin pega","sin trabajo","finiquito"],f:KBR("cesantia"),w:1.4},
 {id:"ley_corta",k:["ley corta","me deben plata","devolucion","devuelvan"],f:KBR("ley_corta"),w:1.4},
 {id:"ges",k:["ges","auge","activo el ges","activar el ges","notificacion ges"],f:KBR("ges"),w:1.2},
 {id:"tope",k:["tope","topes","veces arancel"],f:KBR("tope"),w:1.3},
 {id:"restringidas",k:["restringida","restringidas","exclusiones","excluido"],f:KBR("restringidas"),w:1.3},
 {id:"ricarte",k:["ricarte","ricarte soto","alto costo"],f:KBR("ricarte_soto"),w:1.5},
 {id:"cargas_kb",k:["carga","cargas","agregar a","meter a","sacar a","incluir a","mis papas","mis padres","mi mama","mi papa","mi hijo","mi hija","mi señora","mi esposa","mi esposo","mi pareja","mi ex","guagua","familia"],f:D.familiar,w:1.1},
 {id:"cambio_trabajo",k:["me cambie de pega","cambie de trabajo","nuevo trabajo","nuevo empleador","no tengo isapre","no aparezco","no me aparece","dicen que no tengo"],f:KBR("cambio_trabajo"),w:1.6},
 {id:"leer_plan",k:["no entiendo mi plan","no entiendo nada","leer mi plan","entender mi plan","caratula","carátula","que significa mi plan","explicame mi plan","mi plan esta bien","saber si mi plan"],f:D.leer_plan,w:1.3},
 {id:"terminar_contrato",k:["me pueden echar","me van a echar","echar por estar enfermo","terminar mi contrato","sacarme de la isapre"],f:KBR("terminar_contrato"),w:1.5},
 {id:"segunda_opinion",k:["plan para mi familia","familia de","revisen mi plan","me revise el plan","revisar mi plan","barrido"],f:(p)=>D.leer_plan(p),w:1.2},
 {id:"vendedor",k:["vendedor","agente","agente de ventas","me dijo que no declarara","me dijeron que no declarara","no declarara","comision"],f:KBR("vendedor"),w:1.6},
 {id:"excedentes",k:["excedentes","excedente","excesos","exceso","plata acumulada","saldo a favor"],f:KBR("siete_porciento"),w:1.5},
 {id:"rechazo",k:["rechazo","rechazaron","me rechazo","negaron la cobertura","no me cubrieron"],f:KBR("rechazo"),w:1.2},
 {id:"comparar",k:["comparar","comparacion","comparativo","cotizar","cotizacion de planes","otras isapres","otro plan mejor","mejores planes","que isapre me conviene","cual isapre","cual es la mejor isapre","mejor isapre","recomiendas","que plan me conviene","algo mejor","hay algo mejor","ver opciones","opciones","alternativas","mejorar mi plan","plan bueno y barato","bueno y barato"],f:(p)=>p.afiliable?D.comparar(p):D.bajar_costo(p,""),w:1.3},
 {id:"que_mirar",k:["que miro al comparar","que miro","que comparo","como comparo","en que me fijo","que debo mirar"],f:D.que_mirar,w:1.5},
 {id:"cambio_isapre",k:["como es el cambio de isapre","cambio de isapre","como me cambio","cambiarme de isapre","requisitos para cambiarme","traspaso","cuanto demora el cambio","cambiarme","me conviene cambiarme","cuanto demora","cuanto me cuesta cambiarme","cuando me puedo cambiar","me puedo cambiar","mucho tramite","es mucho tramite"],f:(p)=>p.afiliable?D.cambio_isapre(p):D.intentar_otra(p),w:1.2},
 {id:"reembolso",k:["reembolso","reembolsar","boleta","reembolsan"],f:KBR("copago"),w:1.4},
 {id:"saludo",k:["hola","holi","holis","wenas","buenas","buenos dias","buenas tardes","buenas noches","alo"],f:(p)=>{S.pending=null;return {t:`Hola${p.nombre?" "+p.nombre:""} 👋 Cuéntame qué necesitas: puedo ayudarte a bajar lo que pagas, mejorar la cobertura en tu clínica, entender qué te cubre para tu diagnóstico o ver si te conviene Fonasa.`,chips:sugerir(p)};},w:0.75},
 {id:"escalar",k:["hablar con nico","hablar con alguien","hablar con una persona","persona real","humano","ejecutivo","asesor","me llamen","llamame","llamenme","contactarme","que me contacten","whatsapp","wsp","agendar","reunion","llamar","pueden llamar","me llaman","llamada"],f:D.escalar,w:1.2},
 {id:"bajar_costo",k:["bajar lo que pago","bajar el costo","pago mucho","muy caro","caro","mas barato","barato","ahorrar","pagar menos","bajar el plan","bajar mi plan","reducir","me sale caro","no me alcanza","plata","lucas","demasiado","pago demasiado","precio","bajo el precio","bajar el precio","cuesta mucho","sale muy caro","rebajar"],f:D.bajar_costo,need:"isapre"},
 {id:"mejor_clinica",k:["mejor cobertura","mejor cobertura en mi clinica","mi clinica","atenderme en","clinica","cobertura en","me cubre en","prestador preferente","preferente"],f:D.mejor_clinica},
 {id:"tratamiento",k:["tratamiento","que me cubre","me cubren","cubre mi","que cubre","mi enfermedad","mi diagnostico","controles","remedios de mi","insulina","quimio","dialisis","examenes"],f:D.tratamiento},
 {id:"pasos_plan",k:["paso a paso","cambio de plan","cambiarme de plan","otro plan","como pido","como lo pido","como cambio","pedir el cambio","cambiar el plan","nuevo plan"],f:D.pasos_plan},
 {id:"cautivo",k:["reclamo el alza","reclamar el alza","alza","subieron","me subieron","carta de adecuacion","adecuacion","reajuste","cautivo","subio el plan","aumento","subio mucho","subio","subieron el precio","alzaron"],f:D.cautivo},
 {id:"intentar_otra",k:["intento otra isapre","otra isapre","cambiarme de isapre","cambiar de isapre","no declarar","sin declarar","ocultar","no decir","si no digo","postular","igual intento","me arriesgo","ocultar mi enfermedad","ocultar","esconder","mentir","no la declaro","no lo declaro"],f:D.intentar_otra,w:1.3},
 {id:"fonasa",k:["fonasa","irme a fonasa","pasarme a fonasa","volver a fonasa","me conviene fonasa","sector publico","consultorio","consultorio es gratis","es gratis el consultorio","tramo","en que tramo","cesfam","hospital publico","red publica"],f:D.fonasa,w:1.1},
 {id:"complementario_fonasa",k:["seguro complementario","complementario","armo fonasa","fonasa + seguro","fonasa mas seguro","seguro de salud","mcc","mcc de fonasa","cobertura complementaria","seguro colectivo","seguro de mi pega","seguro de la empresa","seguro de mi trabajo","mi pega","seguro oncologico","oncologico","seguro catastrofico","catastrofico"],f:(p,q)=>D.seguros(p,q),w:1.2},
 {id:"cuanto_pago",k:["cuanto pago","cuanto deberia pagar","cuanto es mi 7","mi 7%","siete por ciento","cuanto me descuentan","me descuentan","descuentan","descuento de salud","cotizacion","cuanto cuesta"],f:D.cuanto_pago},
 {id:"deducible",k:["deducible","caec","catastrofic","cuenta grande","hospitalizacion cara","cuentas de la clinica","hospitalizan","hospitalizacion","cuenta enorme","cuenta es enorme","me opero","cirugia cara"],f:D.deducible},
 {id:"no_es_preex",k:["me diagnosticaron despues","despues de afiliarme","estando en la isapre","ya estaba en la isapre","diagnostico nuevo","me salio despues","aparecio despues"],f:D.no_es_preex,w:1.3},
 {id:"salud_mental",k:["depresion","ansiedad","bipolar","psiquiatra","psicologo","salud mental","esquizofrenia","tdah","panico","autismo","tea","trastorno"],f:D.salud_mental,w:1.1},
 {id:"beneficios",k:["beneficios","descuentos","dental","dentista","telemedicina","club","convenio dental","salud extendida","lentes"],f:D.beneficios},
];
const SI=/^(si|sí|sii+|dale|ok|okay|ya|bueno|claro|porfa|por favor|perfecto|de una|obvio|me sirve|bkn|bacan|si porfa|si por favor|ya po)\b/;
const NO=/^(no|nop|nones|no gracias|despues|después|mas rato)\b/;
const GRACIAS=/(\bg\w{0,2}acias\b|gra+c?i?as|grax|grasias|graci|muchas gracias|te pasaste|vale|genial|buenisimo|excelente|grande)/;

function lev(a,b){if(Math.abs(a.length-b.length)>1)return 9;const m=[...Array(b.length+1).keys()];for(let i=1;i<=a.length;i++){let prev=m[0];m[0]=i;for(let j=1;j<=b.length;j++){const t=m[j];m[j]=Math.min(m[j]+1,m[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=t;}}return m[b.length];}
const EXACT=new Set(["pagare","garantia","tope","topes","alza","caro","ges","mcc","tramo","bono","club"]);
function wmatch(t,w){if(t===w)return 1;if(EXACT.has(w)||t.length<4||w.length<4)return 0;if(lev(t,w)<=1)return .8;if(w.length>7&&t.length>=7&&t.slice(0,7)===w.slice(0,7))return .7;return 0;}
function score(q,kws){const toks=q.split(" ");let s=0;for(const kw of kws){const k=norm(kw);if(!k)continue;const kw2=k.split(" ");
  if((" "+q+" ").includes(" "+k+" ")){s+=2+1.5*(kw2.length-1);continue;}
  if(kw2.length===1){let b=0;for(const t of toks)b=Math.max(b,wmatch(t,k));if(b)s+=2*b*.75;continue;}
  let ok=0,pos=[];for(const w of kw2){let b=0,bi=-1;toks.forEach((t,i)=>{const m=wmatch(t,w)||(w.length<=3&&t===w?1:0);if(m>b){b=m;bi=i;}});if(!b){ok=0;break;}ok+=b;pos.push(bi);}
  if(ok&&(Math.max(...pos)-Math.min(...pos))>kw2.length+1)ok=0;
  if(ok)s+=(2+1.5*(kw2.length-1))*.8*(ok/kw2.length);}return s;}

const C={MALO:/(plan (es |esta )?(muy )?(malo|pesimo|penca|charcha)|cubre (muy )?(poco|poquito|nada)|mala cobertura|no me cubre nada|pagaria menos|pagar menos en otra|otra isapre (mas barata|mejor)|mas barata|mas barato)/,NOCAMBIO:/(no (me )?quiero cambiar(me)?|sin cambiarme|no pienso cambiarme|solo (quiero )?saber si mi plan|si mi plan esta bien|mi plan esta bien)/,MHQ:/(declar|preexist|acept|rechaz|afecta|restring|cobran mas|me suben|con )/,HOSP:/(intern|hospitaliz|operar|opero|operacion|cirugia|pabellon|cuenta de la clinica)/,TRAT:/(biologico|dialisis|quimio|insulina|remedio|medicament|tratamiento|terapia|farmac)/,NOLLAMEN:/(no quiero que (nadie )?me (llame|llamen|contacte|contacten)|sin que me llamen|no me llamen|sin llamadas)/,ALZA:/\b(sub(e|en|ieron|io|ir|iendo)|alza|adecuacion|reajust|aumenta)/,PAGO:/\b(pag(o|ar|ando|ue|amos)|plata|lucas|caro|precio|cuesta|cuota|monto)\b/,DEUDA:/(no tengo plata|no puedo pagar|no alcanzo a pagar|deuda|\\bmora\\b|me van a cobrar|atrasad|no he pagado|dejar de pagar)/,
 FAMILIA:/\b(cargas?|papas?|(?<!cancer de )(?<!cancer a la )mama|padres?|madre|hij[oa]s?|guagua|bebe|esposa|esposo|senora|marido|pareja|ex|suegr[oa]s?|familia|conviviente)\b/,
 AFILIAR:/(me quiero cambiar|quiero cambiarme|me puedo cambiar|cambiarme de isapre|(me )?cambi(o|ar|arme) a (la )?(banmedica|colmena|consalud|cruz blanca|vida tres|nueva masvida|masvida|esencial)|irme a (banmedica|colmena|consalud|cruz blanca|vida tres|masvida|esencial)|cambiar(me)? a (banmedica|colmena|consalud|cruz blanca|vida tres|nueva masvida|masvida|esencial)|pasarme a (banmedica|colmena|consalud|cruz blanca|vida tres|masvida|esencial)|entrar a|ingresar|me recib|me acept|me toman|afiliar|otra isapre|alguna isapre|cambiarme de isapre|cambiar de isapre|me reciben|me aceptan)/,
 COND:/(diabet|cancer|vih|lupus|bypass|manga|obes|infarto|renal|dialisis|alzheimer|parkinson|esclerosis|hepatitis|trasplant|enfermedad|enferm[oa]|diagnost|tumor|artritis|stent)/,
 AYUDA:/(ayuda|no entiendo|me revise|me revisen|revisar mi|explic|me oriente)/,GES:/\b(ges|auge)\b/,DESPUES:/(ya estaba|estando en|despues de (entrar|afiliarme)|cuando ya|ya era de|ya tenia la isapre)/,
 TRABAJO:/\b(pega|trabajo|empleador|empresa)\b/,NOISAPRE:/(no tengo isapre|no aparezco|no tengo plan|no me aparece|dicen que no tengo|sin isapre)/,CIEN:/(100%|100 %|cien por ciento|pague un monton|pague mucho igual|igual pague|igual me cobraron)/};
function concept(q,id){let b=0;const has=k=>C[k].test(q);
 if(id==="cautivo"&&has("ALZA"))b+=3+(has("COND")?1:0);
 if(id==="bajar_costo"&&(has("PAGO")||/cobra/.test(q))&&!has("ALZA")&&!has("DEUDA")&&!has("CIEN")&&!has("TRAT")&&!has("HOSP"))b+=1.5+(/\b(gano|sueldo|renta)\b/.test(q)?2:0);
 if(id==="deducible"&&has("HOSP")&&!/rechaz|negar|negaron/.test(q)&&!has("AFILIAR"))b+=4;
 if(id==="bajar_costo"&&(has("TRAT")||has("HOSP")))b-=3;
 if(id==="rechazo"&&/rechaz|negaron|no me cubrieron|no me quieren cubrir/.test(q)&&!/licencia/.test(q))b+=4;
 if(id==="tratamiento"&&has("TRAT")&&(has("COND")||/caro|cara|sale|cuesta/.test(q)))b+=3;
 if(id==="excedentes"&&/excedente|exceso/.test(q))b+=2;
 if(id==="vendedor"&&/vendedor|agente/.test(q))b+=3;
 if(id==="escalar"&&has("NOLLAMEN"))b-=20;
 if(id==="cesantia"&&has("DEUDA"))b+=4;
 if(id==="cargas_kb"&&has("FAMILIA")&&!has("ALZA"))b+=2.5;
 if(id==="intentar_otra"&&has("AFILIAR")&&!has("FAMILIA"))b+=3+(/puedo (entrar|cambiarme)|me (aceptan|reciben|toman)|acepte/.test(q)?1.5:0);
 if(id==="no_es_preex"&&has("DESPUES"))b+=4;
 if(id==="tratamiento"&&has("GES")&&has("COND"))b+=4.5;
 if(id==="tope"&&has("CIEN"))b+=4;
 if(id==="cambio_trabajo"&&has("TRABAJO")&&has("NOISAPRE"))b+=4;
 if(id==="leer_plan"&&has("AYUDA")&&/\bplan\b/.test(q))b+=2.5;
 if(/reembols|boleta/.test(q)){if(id==="reembolso")b+=4;if(/cambio_isapre|comparar/.test(id))b-=4;}
 if(/cambi\w* (a|de) (un |otro |mi )?plan/.test(q)&&!/isapre (a|de)/.test(q)){if(id==="pasos_plan")b+=4;if(id==="cambio_isapre")b-=3;}
 if(has("MALO")&&(id==="comparar"))b+=4;
 if(has("MALO")&&id==="tratamiento")b-=3;
 if(has("NOCAMBIO")){if(id==="leer_plan")b+=4;if(/cambio_isapre|intentar_otra|comparar/.test(id))b-=4;}
 if(MH.test(q)&&has("MHQ")&&id==="salud_mental")b+=5;
 if(MH.test(q)&&/cargas_kb|intentar_otra|cambio_isapre/.test(id))b-=3;
 return b;}
const EMO=/(desesperad|angustiad|preocupad|miedo|asustad|no se que hacer|estresad|chat[oa] de|estoy hart[oa]|hart[oa] de|indignad|enojad|rabia|estafad|abuso|injusto|me siento mal|lloran|triste)/;
const VAGO=/^(ayuda|ayudame|necesito ayuda|consulta|una consulta|tengo una (duda|consulta|pregunta)|duda|pregunta|info|informacion|hola necesito ayuda|me ayudas|puedes ayudarme|tengo un problema|un problema|\?+|ehh?|mmm+|oye)$/;
const BOT=/(eres (un |una )?(bot|robot|ia|inteligencia artificial|humano|persona|real|maquina)|hablo con (una persona|un humano|alguien real|un bot)|es automatico|me responde una maquina|chatgpt|es un robot|estoy hablando con)/;
const INSULTO=/(weon|hueon|culiao|ql\b|tonto|inutil|no sirves|no entiendes nada|mierda|estupid|idiota)/;
const OFF=/(clima|temperatura hoy|chiste|futbol|partido|receta de|seguro (de|del) auto|horoscopo|bitcoin|cripto|netflix)/;
const LABEL={bajar_costo:"Pagar menos",comparar:"Comparar con otras isapres",mejor_clinica:"Cobertura en mi clínica",tratamiento:"Lo que me cubre para mi tratamiento",cautivo:"El alza de mi plan",intentar_otra:"Cambiarme de isapre",cambio_isapre:"Cambiarme de isapre",fonasa:"Pasarme a Fonasa",complementario_fonasa:"Seguros complementarios",cuanto_pago:"Cuánto debería pagar",deducible:"La CAEC / cuentas grandes",licencia:"Licencias médicas",huella:"Falla de huella",urgencia:"Urgencias",cesantia:"Cesantía / deuda",ges:"GES",tope:"Topes",rechazo:"Un rechazo de cobertura",cargas_kb:"Cargas familiares",leer_plan:"Entender mi plan",reclamo:"Reclamar"};
const ACK={cautivo:["Entiendo, te llegó el alza.","Ok, vamos con el alza."],bajar_costo:["Vamos a eso.","Entiendo, quieres pagar menos."],tratamiento:["Vamos a lo de tu tratamiento.","Bien, lo que te cubre."],rechazo:["Uf, entiendo, eso molesta.","Ok, un rechazo se puede pelear."],licencia:["Entiendo, lo de la licencia."],deducible:["Buena pregunta, porque ahí es donde más se paga."],comparar:["¡Buena idea!","Claro, comparemos."]};
function capturar(p,raw){const x=norm(raw);let cambio=false;
 const mi=x.match(/(estoy en|soy de|mi isapre es|tengo|afiliad[oa] a|cotizo en) (la isapre )?(banmedica|colmena|consalud|cruz blanca|vida tres|nueva masvida|masvida|esencial|fonasa)/);
 if(mi){const k=isapreKey(mi[3]);if(k&&k!==p.isapre){p.isapre=k;p.enIsapre=k!=="fonasa";cambio=true;}}
 const c=clinicaDe(raw);if(c&&/(me atiendo|atenderme|uso la|voy a la|mi clinica|queda cerca|vivo cerca|me gustaria|prefiero)/.test(x)){p.clinica=c;cambio=true;}
 const m=montos(raw);if(m.renta){p.renta=m.renta;cambio=true;}if(m.pago){p.pago=m.pago;cambio=true;}
 const cg=x.match(/tengo (\d|un|una|dos|tres|cuatro) (hij|carga)/);if(cg){p.cargas={un:1,una:1,dos:2,tres:3,cuatro:4}[cg[1]]||parseInt(cg[1]);cambio=true;}
 return cambio;}
function reply(texto){
 if(!S) start({});
 const p=S.p, q=norm(texto); S.turn++;
 let pre="";
 const out=(r,id,conf)=>{S.last=id;S.topics.add(id);if(r.need)S.need=r.need;else S.need=null;S.miss=0;
  let t=r.t;const a=ACK[id];if(a&&q.split(" ").length>3&&!pre)t=pick(a,S.turn)+" "+t;if(pre)t=pre+" "+t;
  let ch=r.chips||[];
  if(p.afiliable&&!S.comparacion&&!/comparar|que_mirar|cambio_isapre|gracias|escalar|saludo|ack|no$|menu|bot|reparar|fuera_tema|empatia|desambiguar/.test(id)&&S.turn%2===0&&!/compar/i.test(t)){t+=`\n\n👉 Con tu perfil, lo que más te puede servir es comparar tu plan con el de otras isapres: muchas veces hay uno igual o mejor por menos. ¿Te armo la comparación?`;S.pending="comparar";ch=["Sí, quiero la comparación"].concat(ch.filter(c=>!/compar/i.test(c))).slice(0,4);}
  return {t:guard(t),chips:ch,escalar:!!r.escalar,id,conf};};
 capturar(p,texto);
 if(BOT.test(q))return out({t:`Te soy honesto: soy el asistente virtual de IAsapre. Respondo al tiro con la información de tu caso y todo lo que te digo está basado en la normativa vigente. Si en algún momento prefieres que una persona del equipo lo revise, Nico te atiende por WhatsApp al ${WSP_H}. ¿En qué te ayudo?`,chips:sugerir(p)},"bot",1);
 if(INSULTO.test(q))return out({t:`Perdón si no te estoy ayudando como necesitas. Cuéntame en una frase qué pasó con tu isapre y lo vemos; o si prefieres, Nico te atiende directo por WhatsApp al ${WSP_H}.`,chips:sugerir(p).concat([])},"reparar",1);
 if(!q||VAGO.test(q))return out({t:`¡Claro! ¿Sobre qué es? Elige un tema o cuéntamelo con tus palabras, como te salga.`,chips:p.afiliable?["Comparar con otras isapres","Me subieron el plan","Un rechazo de cobertura","Licencias médicas"]:["Pagar menos","Lo que me cubre para mi tratamiento","El alza de mi plan","Licencias médicas"]},"menu",1);
 if(EMO.test(q)){pre=pick(["Te entiendo, y es muy válido sentirse así cuando la isapre complica las cosas. Vamos por partes.","Lamento que estés pasando por esto. Te ayudo a ordenarlo."],S.turn);}
 // 1) datos que pedimos
 if(S.need==="renta"){const v=num(texto);if(v){p.renta=v;return out(D.cuanto_pago(p),"cuanto_pago",1);}}
 if(S.need==="isapre"){const k=isapreKey(texto);if(k){p.isapre=k;p.enIsapre=k!=="fonasa"&&k!=="ninguna";return out(p.enIsapre?D.beneficios(p):D.fonasa(p),"dato_isapre",1);}}
 const cl=clinicaDe(texto); if(cl&&!/urgencia|cheque|hospitaliz|cuenta|licencia|huella/.test(q)){p.clinica=cl;return out(D.mejor_clinica(p),"mejor_clinica",2);}
 if(C.NOLLAMEN.test(q)){S.miss=0;const f=p.enIsapre?D.bajar_costo:D.fonasa;const r=f(p,texto);return out({t:"Sin problema, nadie te va a llamar: lo resolvemos por acá. "+r.t,chips:r.chips.filter(c=>c!=="Hablar con Nico")},"sin_llamadas",1);}
 const LBL=Object.entries(LABEL).find(([k,v])=>norm(v)===q);if(LBL){const it=INT.find(i=>i.id===LBL[0]);if(it)return out(it.f(p,texto),it.id,2);}
 if(/^si,? quiero la comparacion$|^quiero la comparacion$|^comparar con otras isapres$/.test(q))return out(p.afiliable?D.comparar_si(p):D.bajar_costo(p,""),p.afiliable?"comparar_si":"bajar_costo",2);
 // 2) sí / no contextual
 if(SI.test(q)&&!GRACIAS.test(q)&&q.split(" ").length<=4&&S.pending){const pd=S.pending;const map={comparar:[D.comparar_si,"comparar_si"],comparar_si:[D.comparar_si,"comparar_si"],objetivo:[p.enIsapre?D.bajar_costo:D.fonasa,p.enIsapre?"bajar_costo":"fonasa"],pasos_plan:[D.pasos_plan,"pasos_plan"],complementario:[D.complementario_fonasa,"complementario_fonasa"],caec:[D.deducible,"deducible"]};const f=map[pd];if(f)return out(f[0](p),f[1],1);}
 if(SI.test(q)&&!GRACIAS.test(q)&&q.split(" ").length<=4){S.miss=0;S.last="ack";return {t:"¡Buena! ¿Con qué seguimos? Elige una opción o escríbeme tu duda con tus palabras.",chips:sugerir(p),id:"ack",conf:1};}
 if(NO.test(q)&&q.split(" ").length<=3){S.pending=null;return out({t:"Perfecto. ¿Hay algo más que te preocupe de tu plan o de tu salud previsional? Te respondo acá mismo.",chips:p.enIsapre?["Bajar lo que pago","Qué me cubre para mi tratamiento","Hablar con Nico"]:["Qué me cubre el GES","¿Cuánto pago en Fonasa?"]},"no",1);}
 const resto=q.replace(/\bg\w{0,2}acias\b|muchas|gra+c?i?as|grax|grasias|graci|nico|te pasaste|vale|genial|buenisimo|excelente|grande|ok|ya|bacan|hola/g,"").trim();
 if(GRACIAS.test(q)&&resto.replace(/\b(eso era|eso es todo|nada mas|todo bien|listo|me ayudaste|harto|mucho)\b/g,"").trim().split(" ").filter(Boolean).length<=2&&!INT.some(it=>it.id!=="saludo"&&score(resto,it.k)*(it.w||1)>=1.15)) return out({t:`De nada${p.nombre?", "+p.nombre:""} 🙌 Cuando tengas las opciones de plan o la carta de tu isapre, mándalas por acá o al WhatsApp ${WSP_H} y lo vemos. ¡Que estés bien!`,chips:[]},"gracias",1);
 // 3) intenciones dinámicas
 let best=null,second=null;
 for(const it of INT){const cb=concept(q,it.id);if(it.id==="saludo"&&q.replace(/\b(oye|una|pregunta|consulta|disculpa|porfa|por|favor|nico|buenas|buenos|tardes|dias|noches|hola|wena|wenas|holi|holis)\b/g,"").trim().split(" ").length>2)continue;let s=score(q,it.k)*(it.w||1)+cb;if(s>0&&(!best||s>best.s)){second=best;best={it,s};}else if(s>0&&(!second||s>second.s))second={it,s};}
 // 4) base estática
 let stat=null; if(root.KB_OFF||typeof KB_OFF!=="undefined"){const kb=root.KB_OFF||KB_OFF;for(const e of kb){if(/^(salud_mental|preex_cambio|clinica|saludo|gracias|cual_isapre)$/.test(e.id))continue;const s=score(q,e.k)*(e.pri||1);if(s>0&&(!stat||s>stat.s))stat={e,s};}}
 const dynOK=best&&best.s>=1.15, statOK=stat&&stat.s>=2;
 if(dynOK&&second&&second.it.id!==best.it.id&&best.s<2.6&&second.s>=best.s*0.9&&LABEL[best.it.id]&&LABEL[second.it.id]&&LABEL[best.it.id]!==LABEL[second.it.id]&&!concept(q,best.it.id)){
  S.pending=null;return out({t:`Para no responderte otra cosa: ¿me preguntas por ${LABEL[best.it.id].toLowerCase()} o por ${LABEL[second.it.id].toLowerCase()}?`,chips:[LABEL[best.it.id],LABEL[second.it.id]]},"desambiguar",best.s);}
 if(dynOK&&(!statOK||best.s>=stat.s*0.8||concept(q,best.it.id)>0)){
  const partes=String(texto).split(/\?|\by tambien\b|\badem[aá]s\b/i).map(s=>s.trim()).filter(s=>s.split(" ").length>=3);
  if(partes.length>=2){let otro=null;for(const pt of partes.slice(1)){const qq=norm(pt);for(const it of INT){if(it.id===best.it.id||it.id==="saludo")continue;const sc=score(qq,it.k)*(it.w||1)+concept(qq,it.id);if(sc>=2&&LABEL[it.id]&&(!otro||sc>otro.s))otro={it,s:sc};}}
   if(otro){const r1=best.it.f(p,texto);const o=out(r1,best.it.id,best.s);o.t+=`\n\nTambién me preguntaste por ${LABEL[otro.it.id].toLowerCase()}: ¿te lo explico?`;o.chips=[LABEL[otro.it.id]].concat(o.chips).slice(0,4);return o;}}
  if(best.it.need==="isapre"&&!p.enIsapre&&best.it.id==="bajar_costo") return out(D.fonasa(p),"fonasa",best.s);
  if(best.it.id==="clinica_q")return out(D.clinica_q(p,texto),"mejor_clinica",best.s);
  if(best.it.id==="mejor_clinica"&&cl)p.clinica=cl;
  return out(best.it.f(p,texto),best.it.id,best.s);
 }
 if(statOK){const isN=isapreN(p);let t=stat.e.r.replace(/\{n\}/g,p.nombre||"").replace(/\{isapre\}/g,isN).replace(/\{wsp\}/g,WSP_H).replace(/\s{2,}/g," ").replace(/ ,/g,",").replace(/Hola\s+👋/,"Hola 👋");
  if(p.cond&&/cambiar_isapre|preex_cambio/.test(stat.e.id))t+=`\n\nEn tu caso, con ${CONDS[p.cond.id].n}, el camino es quedarte y mejorar dentro de ${isN}.`;
  return out({t,chips:sugerir(p,stat.e.id)},"kb:"+stat.e.id,stat.s);}
 if(dynOK)return out(best.it.f(p,texto),best.it.id,best.s);
 // 5) no entendió
 if(OFF.test(q))return out({t:`Eso se me escapa 😅 Yo te ayudo con isapres, Fonasa, coberturas, GES, licencias y reclamos. ¿Hay algo de tu plan que quieras revisar?`,chips:sugerir(p)},"fuera_tema",0);
 if(pre)return out({t:`¿Me cuentas qué pasó? Por ejemplo: te rechazaron algo, te subieron el plan, una cuenta grande o una licencia.`,chips:p.afiliable?["Un rechazo de cobertura","El alza de mi plan","Comparar con otras isapres"]:["Un rechazo de cobertura","El alza de mi plan","Lo que me cubre para mi tratamiento"]},"empatia",0);
 S.miss++;
 if(S.miss>=2){S.miss=0;return {t:`Para no hacerte perder tiempo con esa pregunta, mejor la ve Nico en persona: escríbele al WhatsApp ${WSP_H} y te responde. Mientras, también puedo ayudarte con estas:`,chips:sugerir(p),escalar:true,id:"escalar_auto",conf:0};}
 return {t:pick([`Creo que no te entendí bien. ¿Me lo dices de otra forma, aunque sea con pocas palabras? Por ejemplo: "pagar menos", "me rechazaron algo" o "me subieron el plan".`,`Perdona, no me quedó claro. ¿Es sobre el precio de tu plan, sobre algo que no te cubrieron, o sobre otra cosa?`],S.turn),chips:sugerir(p),id:"no_entendi",conf:0};
}
function sugerir(p,last){if(p&&p.afiliable)return ["Comparar con otras isapres","¿Qué miro al comparar?","Me subieron el plan","Hablar con Nico"].filter(c=>!S||!S.topics.has(c));const base=p.enIsapre?["Bajar lo que pago","Qué me cubre para mi tratamiento","Cómo reclamo el alza","¿Me conviene Fonasa?"]:["Qué me cubre el GES","¿Cuánto pago en Fonasa?","Fonasa + seguro complementario"];
 return base.filter(c=>!S||!S.topics.has(c)).slice(0,3).concat(["Hablar con Nico"]);}

const _start=start;function startG(lead){const r=_start(lead);return {t:guard(r.t),chips:r.chips};}
root.NicoBot={start:startG,reply,clasificar,perfil,guard,_state:()=>S,_data:{ISAPRES,CONDS,INT}};
})(typeof window!=="undefined"?window:globalThis);
if(typeof module!=="undefined")module.exports=globalThis.NicoBot;
