// retomar(): responde a mensajes pendientes (ventana de 24 h abierta), reabre con plantilla si la ventana cerró, no toca derivadas ni sin pendiente.
const A = require("../netlify/functions/lib/wsp_agent.js");
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
function mocks(claudeTxt) { const mem = new Map(), enviados = [], plantillas = [], llamadas = []; return { mem, enviados, plantillas, llamadas, deps: {
  store: { get: async (k) => mem.get(k) || null, set: async (k, v) => { mem.set(k, JSON.parse(JSON.stringify(v))); } },
  enviarTexto: async (to, body) => { enviados.push({ to, body }); return { ok: true }; }, enviarPlantilla: async (to, nombre, params) => { plantillas.push({ to, nombre, params }); return { ok: true }; },
  claude: async (c) => { llamadas.push(c); return { stop_reason: "end_turn", content: [{ type: "text", text: claudeTxt || "Perdona la demora. Te ayudo: ¿en qué Isapre estás?" }] }; },
  notificarEspecialista: async () => [], plantillaInicio: "asesoria_inicio" } }; }
(async () => {
  const ahora = Date.now();
  // 1) pendiente reciente → Claude responde con el historial
  let M = mocks(); M.mem.set("56911110001", { telefono: "56911110001", nombrePerfil: "Ana", lead: null, historial: [{ role: "user", content: "hola, quiero cambiarme de isapre", t: ahora - 60000 }], derivado: false });
  let r = await A.retomar("+56 9 1111 0001", M.deps);
  ok(r.tipo === "retomada" && r.enviado && M.enviados.length === 1 && /Isapre/.test(M.enviados[0].body) && M.llamadas.length === 1 && /cambiarme de isapre/.test(JSON.stringify(M.llamadas[0].messages)), "pendiente reciente → responde con Claude");
  const c1 = M.mem.get("56911110001"); ok(c1.historial.length === 2 && c1.historial[1].role === "assistant" && c1.historial[1].retomada === true, "respuesta guardada marcada como retomada");
  r = await A.retomar("56911110001", M.deps); ok(r.tipo === "sin_pendiente" && M.enviados.length === 1, "segunda vez: ya no hay pendiente");
  // 2) último envío del bot fallido → también se retoma
  M = mocks(); M.mem.set("56911110002", { telefono: "56911110002", nombrePerfil: "Luis", lead: null, historial: [{ role: "user", content: "hola", t: ahora - 120000 }, { role: "assistant", content: "Hola!", t: ahora - 110000, enviado: false }], derivado: false });
  r = await A.retomar("56911110002", M.deps); ok(r.tipo === "retomada" && M.enviados.length === 1, "envío fallido anterior → se vuelve a responder");
  // 3) ventana cerrada (> 24 h) → plantilla de apertura con el nombre
  M = mocks(); M.mem.set("56911110003", { telefono: "56911110003", nombrePerfil: "Rosa", lead: { nombre: "Rosa María Pérez" }, historial: [{ role: "user", content: "hola", t: ahora - 30 * 3600 * 1000 }], derivado: false });
  r = await A.retomar("56911110003", M.deps);
  ok(r.tipo === "reabierta" && r.enviado && M.plantillas.length === 1 && M.plantillas[0].nombre === "asesoria_inicio" && M.plantillas[0].params[0] === "Rosa" && M.enviados.length === 0 && M.llamadas.length === 0, "ventana cerrada → plantilla asesoria_inicio sin llamar a Claude");
  // 4) ventana cerrada sin plantilla
  M = mocks(); M.deps.plantillaInicio = ""; M.mem.set("56911110004", { telefono: "56911110004", historial: [{ role: "user", content: "hola", t: ahora - 30 * 3600 * 1000 }], derivado: false });
  r = await A.retomar("56911110004", M.deps); ok(r.tipo === "ventana_cerrada_sin_plantilla" && M.plantillas.length === 0, "sin plantilla → no envía nada");
  // 5) derivada → no se toca; inexistente
  M = mocks(); M.mem.set("56911110005", { telefono: "56911110005", historial: [{ role: "user", content: "x", t: ahora - 1000 }, { role: "assistant", content: "Te paso", t: ahora }], derivado: true });
  r = await A.retomar("56911110005", M.deps); ok(r.tipo === "ya_derivada" && M.enviados.length === 0, "derivada sin mensaje nuevo → no se retoma");
  M = mocks(); M.mem.set("56911110007", { telefono: "56911110007", historial: [{ role: "assistant", content: "Te paso", t: ahora - 5000 }, { role: "user", content: "gracias", t: ahora - 1000 }], derivado: true });
  r = await A.retomar("56911110007", M.deps); ok(r.tipo === "retomada" && M.enviados.length === 1, "derivada con mensaje nuevo → se responde");
  r = await A.retomar("56900000000", M.deps); ok(r.tipo === "sin_conversacion", "inexistente");
  // 6) si Claude pide derivar al retomar, se deriva
  M = mocks(); M.deps.claude = async () => ({ stop_reason: "tool_use", content: [{ type: "text", text: "Te paso con el equipo." }, { type: "tool_use", name: "derivar", input: { motivo: "pide persona", urgencia: "Alta", conversado: "x" } }] });
  const avisos = []; M.deps.notificarEspecialista = async (res, meta) => { avisos.push(meta); return [{ ok: true }]; };
  M.mem.set("56911110006", { telefono: "56911110006", nombrePerfil: "Eva", lead: null, historial: [{ role: "user", content: "quiero hablar con una persona", t: ahora - 1000 }], derivado: false });
  r = await A.retomar("56911110006", M.deps); ok(r.tipo === "retomada" && r.derivado && avisos.length === 1 && avisos[0].urgencia === "Alta" && M.mem.get("56911110006").derivado, "retomar con derivación");
  if (fails.length) { console.log("✘ Retomar: " + fails.length + " fallas\n - " + fails.join("\n - ")); process.exit(1); }
  console.log("Retomar OK: pendiente reciente, envío fallido, ventana cerrada con/sin plantilla, derivada, derivación al retomar");
})();
