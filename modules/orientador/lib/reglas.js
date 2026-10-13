/**
 * Reglas de afiliabilidad (criterio práctico de mercado, oct-2026).
 * Nivel: "no_afiliable" | "restringible" | "evaluar" | "sin_impacto"
 * Las isapres no publican listas; esto refleja la práctica habitual de sus áreas de suscripción
 * y los criterios que IAsapre usa para no hacer perder tiempo a la persona.
 */
const REGLAS = [
  { id: "diabetes", corto: "diabetes", nivel: "no_afiliable", nombre: "diabetes (tipo 1 o 2)",
    patrones: /diabet|insulin|glicemia alta|hba1c|metformin|dm2|dm1/i },
  { id: "cancer_reciente", corto: "un cáncer reciente", nivel: "no_afiliable", nombre: "cáncer con menos de 5 años desde el alta",
    patrones: /c[aá]ncer|tumor maligno|neoplasia|quimio|radioterapia|leucemia|linfoma|melanoma|carcinoma|oncol/i,
    excepcion: /hace (m[aá]s de )?(5|6|7|8|9|1\d|2\d) a[nñ]os|m[aá]s de (cinco|5) a[nñ]os|olvido oncol/i,
    nota: "Si ya pasaron 5 años desde el fin del tratamiento sin recaída, aplica la Ley de Olvido Oncológico y no se declara." },
  { id: "obesidad", corto: "obesidad o cirugía bariátrica", nivel: "no_afiliable", nombre: "obesidad (IMC sobre ~35) o cirugía bariátrica",
    patrones: /obesidad|obeso|imc\s*(3[5-9]|4\d|5\d)|bari[aá]tric|bypass g[aá]strico|manga g[aá]strica|bal[oó]n g[aá]strico/i },
  { id: "renal", corto: "insuficiencia renal", nivel: "no_afiliable", nombre: "insuficiencia renal crónica / diálisis",
    patrones: /insuficiencia renal|di[aá]lisis|enfermedad renal cr[oó]nica/i },
  { id: "trasplante", corto: "un trasplante", nivel: "no_afiliable", nombre: "trasplante de órgano", patrones: /trasplant/i },
  { id: "vih", corto: "VIH", nivel: "no_afiliable", nombre: "VIH", patrones: /\bvih\b|\bhiv\b|\bsida\b/i },
  { id: "cardio_grave", corto: "un problema cardíaco importante", nivel: "no_afiliable", nombre: "cardiopatía grave (infarto, bypass, stent, insuficiencia cardíaca)",
    patrones: /infarto|bypass coronario|stent|insuficiencia card[ií]aca|marcapasos|fibrilaci[oó]n/i },
  { id: "hepatica", corto: "una enfermedad hepática crónica", nivel: "no_afiliable", nombre: "cirrosis / hepatitis crónica", patrones: /cirrosis|hepatitis (b|c)\b|hepatitis cr[oó]nica/i },
  { id: "neuro_grave", corto: "una enfermedad neurológica", nivel: "no_afiliable", nombre: "enfermedad neurológica grave (esclerosis múltiple, Parkinson, ACV)",
    patrones: /esclerosis|parkinson|\bacv\b|accidente cerebro ?vascular|epilepsia refractaria|\bela\b/i },
  { id: "autoinmune_activa", corto: "una enfermedad autoinmune en tratamiento", nivel: "no_afiliable", nombre: "enfermedad autoinmune activa con tratamiento biológico",
    patrones: /lupus|artritis reumatoide|crohn|colitis ulcerosa|biol[oó]gico|espondilitis/i },

  { id: "hta", nivel: "restringible", nombre: "hipertensión controlada", patrones: /hipertensi[oó]n|presi[oó]n alta|\bhta\b|losart|enalapril/i },
  { id: "tiroides", nivel: "restringible", nombre: "hipotiroidismo / hipertiroidismo", patrones: /tiroid|levotiroxina|eutirox|hashimoto/i },
  { id: "asma", nivel: "restringible", nombre: "asma", patrones: /\basma|salbutamol|inhalador/i },
  { id: "colesterol", nivel: "restringible", nombre: "dislipidemia", patrones: /colesterol|dislipid|atorvastatina|triglic/i },
  { id: "embarazo", nivel: "restringible", nombre: "embarazo en curso", patrones: /embaraz|gestaci[oó]n|semanas de embarazo/i,
    nota: "El parto se cubre, pero puede quedar con restricción si el embarazo era previo al contrato." },
  { id: "osteo", nivel: "restringible", nombre: "patología osteoarticular (hernia discal, artrosis, rodilla, hombro)", patrones: /hernia (discal|lumbar|cervical)|artrosis|menisco|ligamento|hombro|columna|escoliosis/i },
  { id: "apnea", nivel: "restringible", nombre: "apnea del sueño", patrones: /apnea|cpap/i },
  { id: "sobrepeso", nivel: "restringible", nombre: "sobrepeso (IMC 30–35)", patrones: /sobrepeso|imc\s*3[0-4]/i },
  { id: "cirugia_pasada", nivel: "evaluar", nombre: "cirugía previa", patrones: /operad|cirug[ií]a|intervenci[oó]n|ap[eé]ndice|ves[ií]cula|hernia inguinal/i },
];

function clasificar(detalle = "", extras = {}) {
  const texto = String(detalle || "").trim();
  const imc = extras.imc ? Number(extras.imc) : null;
  const hallazgos = [];
  if (!texto && !imc) return { nivel: "sin_impacto", hallazgos: [], resumen: "Sin preexistencias declaradas." };
  if (imc && imc >= 35) hallazgos.push({ id: "obesidad", corto: "obesidad o cirugía bariátrica", nivel: "no_afiliable", nombre: `IMC ${imc} (obesidad)` });
  else if (imc && imc >= 30) hallazgos.push({ id: "sobrepeso", nivel: "restringible", nombre: `IMC ${imc} (sobrepeso)` });

  for (const r of REGLAS) {
    if (r.patrones.test(texto)) {
      if (r.excepcion && r.excepcion.test(texto)) { hallazgos.push({ id: r.id + "_superado", nivel: "evaluar", nombre: r.nombre + " (posible olvido oncológico)", nota: r.nota }); continue; }
      if (!hallazgos.some(h => h.id === r.id)) hallazgos.push({ id: r.id, nivel: r.nivel, nombre: r.nombre, corto: r.corto, nota: r.nota });
    }
  }
  if (!hallazgos.length && texto) hallazgos.push({ id: "otro", nivel: "evaluar", nombre: "condición declarada: " + texto.slice(0, 80) });

  const orden = { no_afiliable: 3, restringible: 2, evaluar: 1, sin_impacto: 0 };
  const nivel = hallazgos.reduce((m, h) => (orden[h.nivel] > orden[m] ? h.nivel : m), "sin_impacto");
  const resumen = {
    no_afiliable: "Con lo declarado, en la práctica ninguna otra isapre aceptará la afiliación: la estrategia es optimizar dentro de la isapre actual o evaluar Fonasa + seguro complementario.",
    restringible: "Lo declarado suele aceptarse con restricción de hasta 18 meses para esa patología (con cobertura reducida, con piso en la cobertura mínima legal). Un cambio es posible, pero hay que medir si conviene asumir la restricción.",
    evaluar: "Lo declarado requiere revisión caso a caso (fecha, tratamiento, alta). Puede ser afiliable sin restricción.",
    sin_impacto: "Sin preexistencias relevantes.",
  }[nivel];
  return { nivel, hallazgos, resumen };
}
module.exports = { clasificar, REGLAS };
