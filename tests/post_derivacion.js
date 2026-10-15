// Después de derivar: no se vuelve a derivar ni a notificar, no se repite el aviso fijo, los datos nuevos se pasan al especialista
// con nota_especialista, y el rol pide no repetir el nombre en cada mensaje.
const A = require("../netlify/functions/lib/wsp_agent.js"), W = require("../netlify/functions/lib/prompt_whatsapp.js");
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
(async () => {
  const mem = new Map(), enviados = [], avisos = [], cuerpos = []; let cola = [];
  const deps = { store: { get: async (k) => mem.get(k) || null, set: async (k, v) => { mem.set(k, JSON.parse(JSON.stringify(v))); } },
    enviarTexto: async (to, body) => { enviados.push(body); return { ok: true }; }, enviarPlantilla: async () => ({ ok: true }),
    claude: async (c) => { cuerpos.push(c); return cola.shift(); }, notificarEspecialista: async (res, meta) => { avisos.push({ res, meta }); return [{ ok: true }]; }, plantillaInicio: "" };
  const tool = (name, input, text) => ({ stop_reason: "tool_use", content: [...(text ? [{ type: "text", text }] : []), { type: "tool_use", id: "t", name, input }] });
  const derivarIn = { prevision: "Cruz Blanca", edadCargas: "52 / sin cargas", renta: "$2.000.000", regionClinica: "RM", preexistencias: "TEC sin secuelas; cáncer en remisión hace más de 5 años", busca: "opciones de planes", conversado: "x", motivo: "pide opciones de planes", urgencia: "Media" };
  // 1) primera derivación: sin texto del modelo → aviso fijo una vez y una notificación
  cola = [tool("derivar", derivarIn)];
  await A.manejarEntrante({ from: "56996991542", nombre: "Rosa", texto: "Que opciones de planes tienes?", messageId: "m1" }, deps);
  ok(enviados[0] === A.MSG_DERIVACION && avisos.length === 1 && mem.get("56996991542").derivado, "primera derivación: aviso y notificación");
  ok(cuerpos[0].tools.some((t) => t.name === "derivar"), "antes de derivar el modelo tiene la herramienta derivar");
  // 2) ya derivada: el modelo no recibe 'derivar', solo nota_especialista
  cola = [tool("nota_especialista", { nota: "Prefiere que la contacten a partir de las 15:00." }, "Perfecto, le aviso al especialista que te escriba después de las 15:00.")];
  await A.manejarEntrante({ from: "56996991542", nombre: "Rosa", texto: "Ok. me puede contactar a partir de las 15:00", messageId: "m2" }, deps);
  ok(cuerpos[1].tools.length === 1 && cuerpos[1].tools[0].name === "nota_especialista", "tras derivar solo existe nota_especialista");
  ok(enviados[1] === "Perfecto, le aviso al especialista que te escriba después de las 15:00." && enviados[1] !== A.MSG_DERIVACION, "respuesta adaptada, no el aviso fijo");
  ok(avisos.length === 2 && /📝 Actualización IAsapre/.test(avisos[1].res) && /15:00/.test(avisos[1].res) && /Rosa/.test(avisos[1].res), "la nota llega al especialista");
  // 3) "ok" sin texto ni nota → mensaje corto distinto del aviso de derivación, sin notificar
  cola = [{ stop_reason: "end_turn", content: [] }];
  await A.manejarEntrante({ from: "56996991542", nombre: "Rosa", texto: "ok", messageId: "m3" }, deps);
  ok(enviados[2] === A.MSG_POST_DERIVACION && enviados[2] !== A.MSG_DERIVACION && avisos.length === 2, "ok → mensaje corto, sin reenviar derivación");
  // 4) aunque el modelo intentara derivar otra vez, no se re-notifica
  cola = [tool("derivar", derivarIn, "Claro, ya está con el especialista.")];
  await A.manejarEntrante({ from: "56996991542", nombre: "Rosa", texto: "gracias", messageId: "m4" }, deps);
  ok(avisos.length === 2 && enviados[3] === "Claro, ya está con el especialista.", "no se deriva dos veces");
  // 5) rol: nombre y no repetir
  ok(/no lo repitas en cada mensaje/.test(W.ROL) && /Nunca repitas el aviso de derivación/.test(W.ROL) && /nota_especialista/.test(W.ROL) && /No vuelvas a derivar/.test(W.ROL), "rol: no repetir nombre ni aviso; usar nota_especialista");
  ok(/🔔 Derivación IAsapre/.test(mem.get("56996991542").resumenDerivacion || ""), "el resumen de la derivación queda guardado en la conversación");
  // reenviar aviso
  const av = []; const rr = await A.reenviarAviso("56996991542", { ...deps, notificarEspecialista: async (res, meta) => { av.push({ res, meta }); return [{ ok: true }]; } });
  ok(rr.tipo === "aviso_reenviado" && rr.enviado && av.length === 1 && /🔔 Derivación IAsapre/.test(av[0].res) && av[0].meta.urgencia === "Media", "reenviar aviso usa el resumen guardado");
  mem.set("56911112222", { telefono: "56911112222", nombrePerfil: "Juan", derivado: true, historial: [] });
  const r2 = await A.reenviarAviso("56911112222", { ...deps, notificarEspecialista: async (res, meta) => { av.push({ res, meta }); return [{ ok: true }]; } });
  ok(r2.tipo === "aviso_reenviado" && /Juan/.test(av[1].res), "derivada antigua sin resumen: aviso básico");
  const r3 = await A.reenviarAviso("56900000000", deps); ok(r3.tipo === "sin_conversacion", "inexistente");
  // falla de un aviso al especialista no marca su conversación
  const memE = new Map([["56985380357", { telefono: "56985380357", historial: [{ role: "assistant", content: "hola Nico", t: 1, enviado: true }] }]]);
  const marcado = await A.marcarFalla({ para: "56985380357", id: "wamid.aviso", code: 131047 }, { get: async (k) => memE.get(k), set: async (k, v) => memE.set(k, v) });
  ok(marcado === false && memE.get("56985380357").historial[0].enviado === true, "falla de un aviso al especialista no ensucia su conversación");
  if (fails.length) { console.log("✘ Post-derivación: " + fails.length + " fallas\n - " + fails.join("\n - ")); process.exit(1); }
  console.log("Post-derivación OK: una sola derivación y notificación, respuestas adaptadas, notas al especialista, sin repetir nombre ni aviso");
})();
