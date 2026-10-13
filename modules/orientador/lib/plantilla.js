/** Mensaje humanizado sin LLM (respaldo si Claude no responde). Varía frases con el nombre como semilla. */
const { WSP_HUMANO } = require("./prompt.js");
const pick = (arr, seed) => arr[seed % arr.length];
const seedOf = s => [...String(s || "x")].reduce((a, c) => a + c.charCodeAt(0), 0);

function nombrePila(n = "") { return String(n).trim().split(/\s+/)[0] || "hola"; }

function generar(lead, clasif, planes = []) {
  const s = seedOf(lead.nombre + (lead.comuna || ""));
  const n = nombrePila(lead.nombre);
  const isapre = lead.isapre && !/fonasa/i.test(lead.isapre) ? lead.isapre : null;
  const cond = clasif.hallazgos.filter(h => h.nivel === "no_afiliable").map(h => h.corto || h.nombre.split(" (")[0]);
  const condTxt = cond.length ? cond.join(" y ") : "lo que declaras";
  const clinica = lead.clinica_interes ? ` (${lead.clinica_interes}, por lo que nos cuentas)` : "";
  const lugar = lead.comuna || lead.region ? ` desde ${lead.comuna || lead.region}` : "";
  const cargas = lead.cargas && !/no|0/i.test(String(lead.cargas)) ? `, con ${lead.cargas} carga${/^1\b/.test(String(lead.cargas)) ? "" : "s"}` : "";

  const saludo = pick([
    `Hola ${n}, soy Nico de IAsapre. Leí tu formulario${lugar}${cargas} y te quiero contestar con la verdad, porque para eso nos escribiste.`,
    `${n}, hola. Nico de IAsapre por acá. Revisé lo que nos mandaste${lugar}${cargas} y prefiero ser directo contigo desde el primer mensaje.`,
    `Hola ${n}, te escribe Nico, de IAsapre. Vi tu formulario${lugar}${cargas} y hay algo importante que tienes que saber antes de seguir cotizando.`,
  ], s);

  const verdad = pick([
    `Con ${condTxt}, hoy las isapres no te van a aceptar como nueva afiliación. No es algo personal: así funciona su suscripción, y tampoco te conviene omitirlo en la Declaración de Salud, porque después pueden negarte cobertura y terminar el contrato.`,
    `Te lo digo sin vueltas: declarando ${condTxt}, ninguna isapre te va a abrir la puerta como nueva afiliación. Y ocultarlo sería peor, porque si lo descubren pueden dejarte sin cobertura y cerrar el contrato.`,
  ], s + 1);

  let opciones;
  if (isapre) {
    const lista = planes.length
      ? `En ${isapre} vi alternativas que podrían calzar mejor con tu 7%, por ejemplo ${planes.slice(0, 2).map(p => p.nombre).join(" o ")}; hay que mirar el detalle de % y topes.`
      : pick([
          `Lo bueno es que dentro de ${isapre} sí te puedes mover: cambiar de plan en tu misma isapre no exige nueva Declaración de Salud y tu cobertura actual se mantiene. Normalmente se puede ajustar el plan a tu 7%, buscar uno preferente en la clínica que más usas${clinica} y revisar si tus excedentes y cargas están bien aprovechados.`,
          `La jugada está dentro de ${isapre}: ahí no te piden Declaración de Salud nueva y no pierdes nada de lo que ya tienes cubierto. Se puede buscar un plan con mejor cobertura hospitalaria en la clínica que te interesa${clinica}, ajustar lo que pagas sobre el 7% y ordenar cargas y excedentes.`,
        ], s + 2);
    opciones = lista;
  } else {
    opciones = `Lo honesto es mirar Fonasa con calma: no tiene preexistencias ni exclusiones, la red pública es con copago cero y en libre elección puedes usar clínicas privadas con bonos. Si quieres más cobertura en privados, un seguro complementario sobre Fonasa suele rendir más que forzar una isapre.`;
  }
  const extra = clasif.hallazgos.some(h => /diabetes|cancer|renal|cardio|vih|autoinmune|neuro/.test(h.id))
    ? ` Además, revisa que tu patología esté activada en GES si corresponde: baja mucho el copago.`
    : "";

  const cierre = pick([
    `Si quieres, un ejecutivo revisa tu carátula contigo, gratis y sin compromiso, por WhatsApp al ${WSP_HUMANO}. Respóndeme con un "sí" y te escribo. ¿Qué clínica es la que más usas hoy?`,
    `Te propongo que lo veamos juntos: me mandas tu carátula por WhatsApp al ${WSP_HUMANO} y te digo qué plan de tu isapre te rinde más. Es gratis. ¿Te acomoda que te escriba hoy?`,
  ], s + 3);

  return [saludo, verdad, opciones + extra, cierre].join("\n\n");
}
module.exports = { generar };
