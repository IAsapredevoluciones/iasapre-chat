// Avisos de derivación en cola: fuera de la ventana de 24 h del especialista el resumen no llega como texto y la plantilla puede
// ser frenada por Meta (131049). El resumen queda en cola y se entrega apenas el especialista le escribe al asistente.
// También: el vigía no insiste con aperturas a números que no reciben WhatsApp (máx. 3 intentos cada 3 h).
const A = require("../netlify/functions/lib/wsp_agent.js"), V = require("../netlify/functions/lib/vigia_core.js"), P = require("../netlify/functions/lib/panel_core.js");
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
(async () => {
  const ESP = "56985380357";
  // 1) notificador: fuera de la ventana, una nota (soloTexto) no gasta plantilla y queda en cola; una derivación manda la plantilla (via plantilla)
  const tx = [], pl = []; const wspM = { enviarTexto: async (...a) => { tx.push(a); return { ok: true }; }, enviarPlantilla: async (...a) => { pl.push(a); return { ok: true }; } };
  const fuera = A.crearNotificador(wspM, { WSP_TEMPLATE_DERIVACION: "derivacion_iasapre" }, { ultimoEsp: async () => Date.now() - 30 * 3600000 });
  const rn = await fuera("📝 nota", { nombre: "Ana", telefono: "56990000000", soloTexto: true });
  ok(rn[0].via === "cola" && !rn[0].ok && tx.length === 0 && pl.length === 0, "nota fuera de 24 h → en cola, sin texto ni plantilla");
  const rd = await fuera("🔔 Derivación", { nombre: "Ana", telefono: "56990000000" });
  ok(rd[0].via === "plantilla" && pl.length === 1 && tx.length === 0, "derivación fuera de 24 h → plantilla (alerta), resumen en cola");
  const rt = await A.crearNotificador(wspM, {}, { ultimoEsp: async () => Date.now() - 3600000 })("🔔 Derivación", { nombre: "Ana", telefono: "56990000000" });
  ok(rt[0].via === "texto" && rt[0].ok, "dentro de 24 h → texto");

  // 2) derivar con el aviso solo por plantilla → la conversación queda con aviso en cola
  const mem = new Map(), enviados = [], cuerpos = []; let cola = [], viaAviso = "plantilla"; const estado = {};
  const deps = { store: { get: async (k) => (mem.has(k) ? JSON.parse(JSON.stringify(mem.get(k))) : null), set: async (k, v) => { mem.set(k, JSON.parse(JSON.stringify(v))); } },
    listarConvs: async () => [...mem.values()], setEstado: async (k, v) => { estado[k] = v; },
    enviarTexto: async (to, body) => { enviados.push({ to, body }); return { ok: true }; }, enviarPlantilla: async () => ({ ok: true }),
    claude: async (c) => { cuerpos.push(c); return cola.shift() || { stop_reason: "end_turn", content: [{ type: "text", text: "Hola!" }] }; },
    notificarEspecialista: async () => [{ ok: viaAviso !== "cola", via: viaAviso }], plantillaInicio: "" };
  const derivarIn = { prevision: "Banmédica", edadCargas: "45", renta: "$1.800.000", regionClinica: "RM", preexistencias: "diabetes tipo 2", busca: "cambio de plan", conversado: "x", motivo: "pide cotizar", urgencia: "Alta" };
  cola = [{ stop_reason: "tool_use", content: [{ type: "tool_use", id: "t", name: "derivar", input: derivarIn }] }];
  await A.manejarEntrante({ from: "56979582272", nombre: "Adriana", texto: "quiero cotizar", messageId: "a1" }, deps);
  let c = mem.get("56979582272");
  ok(c.derivado && c.avisoEntregado === false && c.derivadoT && A.avisoPendiente(c), "derivada con aviso solo por plantilla → en cola");
  // nota posterior que tampoco llega → se suma al resumen
  viaAviso = "cola"; cola = [{ stop_reason: "tool_use", content: [{ type: "text", text: "Le aviso." }, { type: "tool_use", id: "n", name: "nota_especialista", input: { nota: "Prefiere llamada después de las 18:00" } }] }];
  await A.manejarEntrante({ from: "56979582272", nombre: "Adriana", texto: "llámenme después de las 18", messageId: "a2" }, deps);
  c = mem.get("56979582272"); ok(/18:00/.test(c.resumenDerivacion) && /Derivación IAsapre/.test(c.resumenDerivacion), "la nota queda en el resumen guardado");
  // derivada antigua (sin derivadoT, solo derivadoEn) de hace 2 días → también en cola; una de hace 10 días no
  const hace = (d) => new Date(Date.now() - d * 86400000).toLocaleString("es-CL", { timeZone: "America/Santiago" });
  mem.set("56996198021", { telefono: "56996198021", lead: { nombre: "Juan Quiroga" }, derivado: true, derivadoEn: hace(2), historial: [{ role: "user", content: "x", t: 1 }] });
  mem.set("56900000010", { telefono: "56900000010", lead: { nombre: "Vieja" }, derivado: true, derivadoEn: hace(10), historial: [] });
  ok(A.avisoPendiente(mem.get("56996198021")) && !A.avisoPendiente(mem.get("56900000010")), "derivadas antiguas: en cola si son de los últimos 3 días");
  // panel: banner y marca
  const lista = P.vistaLista([...mem.values()], "", null).body || P.vistaLista([...mem.values()], "", null);
  ok(/2 aviso\(s\) de derivación sin llegar/.test(lista) && /aviso en cola/.test(lista), "el panel muestra los avisos en cola");

  // 3) el especialista escribe cualquier cosa → recibe los resúmenes en cola, sin pasar por Claude
  enviados.length = 0; const nC = cuerpos.length;
  const r = await A.manejarEntrante({ from: ESP, nombre: "Nico", texto: "hola", messageId: "e1" }, deps);
  const alEsp = enviados.filter((e) => e.to === ESP);
  ok(r.tipo === "avisos_entregados" && r.n === 2 && alEsp.length === 3, "especialista escribe → 2 resúmenes + confirmación: " + JSON.stringify(r));
  ok(/Juan Quiroga/.test(alEsp[0].body) && /Adriana/.test(alEsp[1].body) && /diabetes/.test(alEsp[1].body) && /18:00/.test(alEsp[1].body) && /panel\?tel=56979582272/.test(alEsp[1].body), "en orden, con resumen completo, notas y link");
  ok(/📬 Te envié 2/.test(alEsp[2].body) && cuerpos.length === nC && estado.especialista && estado.especialista.ultimo, "confirmación, sin Claude, y se anota la ventana abierta");
  ok(!A.avisoPendiente(mem.get("56979582272")) && !A.avisoPendiente(mem.get("56996198021")), "entregados: salen de la cola");
  // sin cola: conversación normal; #avisos responde que no hay
  enviados.length = 0; await A.manejarEntrante({ from: ESP, nombre: "Nico", texto: "hola de nuevo", messageId: "e2" }, deps);
  ok(cuerpos.length === nC + 1, "sin avisos pendientes el especialista conversa normal (pruebas)");
  enviados.length = 0; const r3 = await A.manejarEntrante({ from: ESP, nombre: "Nico", texto: "#avisos", messageId: "e3" }, deps);
  ok(r3.tipo === "avisos_entregados" && r3.n === 0 && /No hay avisos/.test(enviados[0].body), "#avisos sin cola → lo dice");

  // 4) reenviarAviso desde el panel: si sale solo la plantilla vuelve a la cola
  mem.get("56979582272").avisoEntregado = true; viaAviso = "plantilla";
  const ra = await A.reenviarAviso("56979582272", deps);
  ok(ra.enviado && ra.texto === false && A.avisoPendiente(mem.get("56979582272")), "reenviar aviso sin ventana → vuelve a la cola");

  // 5) vigía: aperturas fallidas máx. 3 intentos, separados por 3 h
  const ahora = Date.parse("2026-10-16T15:00:00Z"), h = 3600000;
  const fall = (n, ult) => ({ telefono: "569" + n + ult, derivado: false, historial: Array.from({ length: n }, (_, i) => ({ role: "assistant", content: "[Plantilla] Hola", t: ahora - ult * h - (n - 1 - i) * 4 * h, enviado: false, falla: "131026 el número no tiene WhatsApp" })) });
  const convs = [fall(1, 4), fall(2, 1), fall(3, 5)]; const ret = [];
  await V.ejecutar({ getEstado: async () => null, setEstado: async () => {}, registrarEvento: async () => {}, listarConvs: async () => convs, verificarConexion: async () => ({ ok: true }), retomar: async (t) => { ret.push(t); return { tipo: "reabierta" }; } }, ahora);
  ok(ret.join(",") === "56914", "vigía: reintenta solo la apertura con < 3 fallas y > 3 h desde la última: " + ret);

  // 6) resúmenes antiguos en cola: el vigía los rehace con el formato completo y conserva las notas
  const memR = new Map([["56996198021", { telefono: "56996198021", lead: { nombre: "Juan Quiroga", leadId: "L-9", edad: "38", isapre: "Colmena" }, derivado: true, derivadoT: Date.now() - 3600000, avisoEntregado: false,
    resumenDerivacion: "🔔 Derivación IAsapre\nLead: Juan Quiroga\nUrgencia: Media\n📝 16-10-2026, 10:00: Llamar en la tarde", historial: [{ role: "user", content: "quiero cambiarme", t: Date.now() - 4000000 }] }]]);
  const bodies = [];
  const depsR = { store: { get: async (k) => memR.get(k), set: async (k, v) => memR.set(k, v) }, claude: async (b) => { bodies.push(b); return { stop_reason: "tool_use", content: [{ type: "tool_use", id: "d", name: "derivar", input: { ...derivarIn, afiliabilidad: "Muy afiliable", motivoAfiliabilidad: "Sin preexistencias y quiere cambiarse", contacto: "tarde", siguientePaso: "cotizar", preexistencias: "No" } }] }; } };
  ok(A.resumenAntiguo(memR.get("56996198021")), "detecta resumen antiguo en cola");
  const hechos = [];
  await V.ejecutar({ getEstado: async () => null, setEstado: async () => {}, registrarEvento: async () => {}, listarConvs: async () => [...memR.values()], verificarConexion: async () => ({ ok: true }), retomar: async () => ({}),
    resumenAntiguo: A.resumenAntiguo, rehacerResumen: async (t) => { hechos.push(t); return A.rehacerResumen(t, depsR); } }, Date.now());
  const cr = memR.get("56996198021");
  ok(hechos.length === 1 && bodies[0].tool_choice.name === "derivar" && /formato antiguo/.test(JSON.stringify(bodies[0].messages)), "vigía pide el resumen completo forzando derivar");
  ok(/^⭐⭐ ALERTA: MUY AFILIABLE/.test(cr.resumenDerivacion) && /📝 16-10-2026, 10:00: Llamar en la tarde/.test(cr.resumenDerivacion) && /Edad: 34|Edad: 38/.test(cr.resumenDerivacion) && cr.afiliabilidad === "Muy afiliable" && !A.resumenAntiguo(cr) && A.avisoPendiente(cr), "resumen rehecho: alerta, notas, formulario y sigue en cola");

  if (fails.length) { console.log("✘ Avisos en cola: " + fails.length + " fallas\n - " + fails.join("\n - ")); process.exit(1); }
  console.log("Avisos en cola OK: plantilla/cola/texto, notas en el resumen, entrega al escribir el especialista, #avisos, panel, vigía sin insistir");
})().catch((e) => { console.log("✘ excepción: " + (e && e.stack)); process.exit(1); });
