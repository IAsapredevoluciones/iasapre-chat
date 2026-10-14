// Vigía: detecta desconexión (aviso + evento una sola vez), retoma pendientes dentro de 24 h, no toca lo ya respondido ni lo viejo,
// detecta silencio de Meta, y el panel muestra el aviso.
const V = require("../netlify/functions/lib/vigia_core.js"), P = require("../netlify/functions/lib/panel_core.js"), A = require("../netlify/functions/lib/wsp_agent.js");
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
(async () => {
  const ahora = Date.parse("2026-10-14T22:00:00Z"), min = 60000, h = 3600000;
  const convs = [
    { telefono: "56961255493", lead: { nombre: "Yolanda Ulloa" }, derivado: false, historial: [{ role: "assistant", content: "[Plantilla] Hola", t: ahora - 5 * h }, { role: "user", content: "sí, quiero ver mi caso", t: ahora - 4 * h }] },
    { telefono: "56996991542", lead: { nombre: "Rosa" }, derivado: true, historial: [{ role: "assistant", content: "Te paso con el especialista", t: ahora - 3 * h }, { role: "user", content: "pueden llamarme a las 15?", t: ahora - 2 * h }] },
    { telefono: "56900000001", derivado: false, historial: [{ role: "user", content: "hola", t: ahora - 30 * h }] },
    { telefono: "56900000002", derivado: false, historial: [{ role: "user", content: "hola", t: ahora - 2 * h }, { role: "assistant", content: "Hola!", t: ahora - 2 * h + 5000 }] },
    { telefono: "56900000003", derivado: false, historial: [{ role: "user", content: "recién", t: ahora - 30 * 1000 }] },
  ];
  let estado = {}, eventos = [], retomados = [], conexion = { ok: true, numero: "+56 9 5373 0030" };
  const deps = { getEstado: async (k) => estado[k] || null, setEstado: async (k, v) => { estado[k] = v; }, registrarEvento: async (e) => { eventos.push(e); }, listarConvs: async () => convs,
    verificarConexion: async () => conexion, retomar: async (tel) => { retomados.push(tel); return { tipo: "retomada", enviado: true }; } };
  let s = await V.ejecutar(deps, ahora);
  ok(s.conexion.ok && retomados.join(",") === "56961255493,56996991542" && s.retomadas === 2, "retoma pendientes de < 24 h (incluida la derivada con mensaje nuevo): " + retomados);
  ok(!retomados.includes("56900000001") && !retomados.includes("56900000002") && !retomados.includes("56900000003"), "no toca > 24 h, ya respondidas ni mensajes de hace segundos");
  ok(eventos.filter((e) => e.tipo === "retomada_auto").length === 2, "evento por cada retomada automática");
  // desconexión: aviso y evento solo la primera vez
  conexion = { ok: false, error: "401 Error validating access token" }; retomados = []; eventos = [];
  s = await V.ejecutar(deps, ahora + 10 * min); await V.ejecutar(deps, ahora + 20 * min);
  ok(!s.conexion.ok && retomados.length === 0 && eventos.filter((e) => e.tipo === "alerta").length === 1 && estado.salud.caidaDesde === new Date(ahora + 10 * min).toISOString(), "desconexión: no retoma, una sola alerta, guarda desde cuándo");
  const banner = P.bannerSalud(estado.salud); ok(/WhatsApp desconectado/.test(banner) && /401 Error validating access token/.test(banner), "panel muestra el aviso rojo");
  conexion = { ok: true }; eventos = []; await V.ejecutar(deps, ahora + 30 * min);
  ok(eventos.some((e) => e.tipo === "reconectado") && /Conexión con WhatsApp OK/.test(P.bannerSalud(estado.salud)), "reconexión registrada y aviso verde");
  // silencio de Meta: el bot respondió hace poco pero ninguna persona escribe hace > 6 h
  const silencio = [{ telefono: "1", historial: [{ role: "user", content: "x", t: ahora - 8 * h }, { role: "assistant", content: "y", t: ahora - 1 * h }] }];
  s = await V.ejecutar({ ...deps, listarConvs: async () => silencio }, ahora); ok(!!s.sinWebhookDesde, "detecta que Meta dejó de enviar mensajes");
  // retomar real: conversación derivada con mensaje nuevo → responde sin re-derivar
  const mem = new Map([["56996991542", JSON.parse(JSON.stringify(convs[1]))]]); mem.get("56996991542").historial[1].t = Date.now() - 60000;
  const enviados = [], avisos = [];
  const r = await A.retomar("56996991542", { store: { get: async (k) => mem.get(k), set: async (k, v) => mem.set(k, v) }, enviarTexto: async (to, b) => { enviados.push(b); return { ok: true }; }, enviarPlantilla: async () => ({ ok: true }),
    claude: async (c) => ({ stop_reason: "tool_use", content: [{ type: "text", text: "Claro, le aviso que te llame a las 15:00." }, { type: "tool_use", id: "x", name: "nota_especialista", input: { nota: "Llamar a las 15:00" } }] }), notificarEspecialista: async (res) => { avisos.push(res); return [{ ok: true }]; }, plantillaInicio: "asesoria_inicio" });
  ok(r.tipo === "retomada" && enviados[0] === "Claro, le aviso que te llame a las 15:00." && avisos.length === 1 && /15:00/.test(avisos[0]), "retomar una derivada responde adaptado y pasa la nota");
  ok(P.pendiente(convs[1]) && !P.pendiente(convs[3]), "panel: derivada con mensaje sin responder aparece como pendiente");
  if (fails.length) { console.log("✘ Vigía: " + fails.length + " fallas\n - " + fails.join("\n - ")); process.exit(1); }
  console.log("Vigía OK: conexión, retomadas automáticas < 24 h, alerta única, reconexión, silencio de Meta, aviso en el panel");
})();
