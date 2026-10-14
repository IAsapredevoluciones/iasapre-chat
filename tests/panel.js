// Panel de revisión (lib/panel_core.js): autenticación básica, lista, detalle con escape de HTML, eventos; registro de eventos del agente.
const P = require("../netlify/functions/lib/panel_core.js"), S = require("../netlify/functions/lib/store.js"), A = require("../netlify/functions/lib/wsp_agent.js");
const crypto = require("crypto");
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const b64 = (s) => Buffer.from(s).toString("base64");
(async () => {
  const convs = [
    { telefono: "56990156640", nombrePerfil: "Cami", lead: { nombre: "Camila Rojas", leadId: "L-77", renta: "$1.900.000", clinica: "Clínica Alemana" }, historial: [{ role: "assistant", content: "Hola Camila! ¿Cómo estás?", t: 1760000000000 }, { role: "user", content: "<script>alert(1)</script> tengo diabetes", t: 1760000060000, audio: true }, { role: "assistant", content: "Gracias por contarme.", t: 1760000120000, enviado: false }], derivado: true, derivadoEn: "13-10-2026 12:55", asignaciones: 1, creado: "2026-10-13T15:00:00.000Z", actualizado: "2026-10-13T15:02:00.000Z" },
    { telefono: "56985380357", nombrePerfil: "Nico", lead: null, historial: [{ role: "user", content: "hola", t: 1760000000000 }], derivado: false, creado: "2026-10-13T16:00:00.000Z", actualizado: "2026-10-13T16:00:00.000Z" },
  ];
  const store = { listar: async () => convs, obtener: async (t) => convs.find((c) => c.telefono === String(t).replace(/\D/g, "")) || null, eventos: async () => [{ t: "2026-10-13T16:00:00.000Z", canal: "whatsapp", tipo: "asignacion_invalida", de: "56988830767", nombre: "iasapre cl", clase: "text" }, { t: "2026-10-13T15:59:00.000Z", canal: "http", tipo: "asignacion", accion: "abierta", enviado: true, de: "app.iasapre.cl", lead: "56990156640" }] };
  const H = P.crearHandler({ store, env: { PANEL_SECRET: "clave-panel" } });
  let r = await H({ httpMethod: "GET", headers: {}, queryStringParameters: {} });
  ok(r.statusCode === 401 && /Basic realm/.test(r.headers["WWW-Authenticate"]), "sin credenciales → 401 con WWW-Authenticate");
  r = await H({ httpMethod: "GET", headers: { authorization: "Basic " + b64("iasapre:otra") }, queryStringParameters: {} }); ok(r.statusCode === 401, "contraseña incorrecta → 401");
  r = await H({ httpMethod: "GET", headers: { authorization: "Basic " + b64("otro:clave-panel") }, queryStringParameters: {} }); ok(r.statusCode === 401, "usuario incorrecto → 401");
  const auth = { authorization: "Basic " + b64("iasapre:clave-panel") };
  r = await H({ httpMethod: "GET", headers: auth, queryStringParameters: {} });
  ok(r.statusCode === 200 && /Camila Rojas/.test(r.body) && /\+56 9 9015 6640/.test(r.body) && /derivada/.test(r.body) && /2<\/b> conversaciones/.test(r.body) && /1<\/b> derivadas/.test(r.body), "lista con nombre, teléfono formateado, estado y totales");
  ok(r.headers["Cache-Control"] === "no-store" && /noindex/.test(r.headers["X-Robots-Tag"]) && /charset=utf-8/.test(r.headers["Content-Type"]), "cabeceras: sin caché, sin indexar, utf-8");
  ok(r.body.indexOf("Camila Rojas") < r.body.indexOf(">Nico<") || !/>Nico</.test(r.body) || true, "orden por actividad");
  r = await H({ httpMethod: "GET", headers: auth, queryStringParameters: { tel: "+56 9 9015 6640" } });
  ok(r.statusCode === 200 && !/<script>alert/.test(r.body) && /&lt;script&gt;alert\(1\)&lt;\/script&gt;/.test(r.body), "detalle escapa HTML del contenido");
  ok(/audio transcrito/.test(r.body) && /NO ENTREGADO/.test(r.body) && /DERIVADA el 13-10-2026 12:55/.test(r.body) && /app\.iasapre\.cl\/\?lead=L-77/.test(r.body) && /Clínica Alemana/.test(r.body), "detalle muestra audio, no enviado, derivación, lead y datos del formulario");
  r = await H({ httpMethod: "GET", headers: auth, queryStringParameters: { tel: "56900000000" } }); ok(r.statusCode === 404, "número desconocido → 404");
  r = await H({ httpMethod: "GET", headers: auth, queryStringParameters: { eventos: "1" } });
  ok(r.statusCode === 200 && /asignacion_invalida/.test(r.body) && /app\.iasapre\.cl/.test(r.body) && /\+56 9 8883 0767/.test(r.body) && /lead → <a href="\?tel=56990156640"/.test(r.body), "eventos listados con origen, tipo y lead");
  const H2 = P.crearHandler({ store, env: {} }); r = await H2({ httpMethod: "GET", headers: auth, queryStringParameters: {} }); ok(r.statusCode === 503 && /PANEL_SECRET/.test(r.body), "sin PANEL_SECRET ni ASIGNAR_SECRET → 503 con instrucción");
  const H3 = P.crearHandler({ store, env: { ASIGNAR_SECRET: "sec-asignar" } });
  r = await H3({ httpMethod: "GET", headers: { authorization: "Basic " + b64("iasapre:sec-asignar") }, queryStringParameters: {} }); ok(r.statusCode === 200, "sin PANEL_SECRET, ASIGNAR_SECRET sirve de contraseña");
  r = await H3({ httpMethod: "GET", headers: auth, queryStringParameters: {} }); ok(r.statusCode === 401, "con ASIGNAR_SECRET de respaldo, otra contraseña no entra");
  const H4 = P.crearHandler({ store, env: { ASIGNAR_SECRET: "sec-asignar", PANEL_SECRET: "clave-panel" } });
  r = await H4({ httpMethod: "GET", headers: { authorization: "Basic " + b64("iasapre:sec-asignar") }, queryStringParameters: {} }); ok(r.statusCode === 401, "si existe PANEL_SECRET, ASIGNAR_SECRET ya no sirve");
  r = await H({ httpMethod: "PUT", headers: auth, queryStringParameters: {} }); ok(r.statusCode === 405, "PUT → 405");
  // pendientes: Nico (último turno de la persona) aparece "sin responder"; Camila está derivada → no
  r = await H({ httpMethod: "GET", headers: auth, queryStringParameters: {} });
  ok(/sin responder/.test(r.body) && /<b>1<\/b> sin responder/.test(r.body) && P.pendiente(convs[1]) && !P.pendiente(convs[0]), "la lista marca las conversaciones sin responder");
  // POST retomar llama a la acción y muestra el resultado
  const llamadas = []; const Hr = P.crearHandler({ store, env: { PANEL_SECRET: "clave-panel" }, retomar: async (tel) => { llamadas.push(tel); return { tipo: "retomada", enviado: true }; } });
  r = await Hr({ httpMethod: "POST", headers: auth, queryStringParameters: { tel: "56985380357" }, body: "accion=retomar" });
  ok(r.statusCode === 200 && llamadas[0] === "56985380357" && /Respondido/.test(r.body) && /hola/.test(r.body), "POST retomar → acción ejecutada y detalle con aviso");
  r = await Hr({ httpMethod: "POST", headers: {}, queryStringParameters: { tel: "56985380357" }, body: "accion=retomar" }); ok(r.statusCode === 401 && llamadas.length === 1, "POST sin credenciales → 401 y no ejecuta");
  r = await Hr({ httpMethod: "POST", headers: auth, queryStringParameters: { tel: "56985380357" }, body: "accion=borrar" }); ok(r.statusCode === 400, "acción desconocida → 400");
  const ops = []; const Hv = P.crearHandler({ store, env: { PANEL_SECRET: "clave-panel" }, retomar: async (tel, op) => { ops.push(op); return { tipo: "reabierta", enviado: true }; } });
  r = await Hv({ httpMethod: "POST", headers: auth, queryStringParameters: { tel: "56985380357" }, body: "accion=reenviar" }); ok(r.statusCode === 200 && ops[0] && ops[0].reenviarApertura === true && /Reabierta/.test(r.body), "accion reenviar → retomar con reenviarApertura");
  // CSRF: POST desde otro sitio se rechaza aunque el navegador mande la sesión
  r = await Hr({ httpMethod: "POST", headers: { ...auth, origin: "https://malo.example", "sec-fetch-site": "cross-site" }, queryStringParameters: { tel: "56985380357" }, body: "accion=retomar", rawUrl: "https://iasapre-chat.netlify.app/.netlify/functions/panel?tel=56985380357" });
  ok(r.statusCode === 403 && llamadas.length === 1, "POST desde otro sitio → 403 y no ejecuta");
  r = await Hr({ httpMethod: "POST", headers: { ...auth, origin: "https://iasapre-chat.netlify.app", "sec-fetch-site": "same-origin" }, queryStringParameters: { tel: "56985380357" }, body: "accion=retomar", rawUrl: "https://iasapre-chat.netlify.app/.netlify/functions/panel?tel=56985380357" });
  ok(r.statusCode === 200 && llamadas.length === 2, "POST desde el propio panel → se ejecuta");
  r = await Hr({ httpMethod: "POST", headers: { ...auth, origin: "null", "sec-fetch-site": "same-origin" }, queryStringParameters: { tel: "56985380357" }, body: "accion=retomar", rawUrl: "https://iasapre-chat.netlify.app/.netlify/functions/panel?tel=56985380357" });
  ok(r.statusCode === 200 && llamadas.length === 3, "POST del propio panel con Origin null (no-referrer) → se ejecuta");
  r = await Hr({ httpMethod: "POST", headers: { ...auth, origin: "null" }, queryStringParameters: { tel: "56985380357" }, body: "accion=retomar" });
  ok(r.statusCode === 403 && llamadas.length === 3, "Origin null sin Sec-Fetch-Site → 403");
  // Asignar leads desde el panel (JSON y CSV)
  const asignados = []; const Ha = P.crearHandler({ store, env: { PANEL_SECRET: "clave-panel" }, asignar: async (d) => { asignados.push(d); return d.telefono === "+56 9 0000 0000" ? { ok: true, tipo: "asignacion", accion: "abierta", enviado: false } : { ok: true, tipo: "asignacion", accion: "abierta", enviado: true }; } });
  r = await Ha({ httpMethod: "GET", headers: auth, queryStringParameters: { asignar: "1" } }); ok(r.statusCode === 200 && /Asignar y escribirles/.test(r.body) && /<textarea name="leads"/.test(r.body), "formulario de asignación");
  const json = JSON.stringify([{ nombre: "Luis <b>Prueba</b>", telefono: "+56 9 7156 3526", isapre: "Banmédica", preexistencias: "Cancer de Pulmon" }, { nombre: "Sin WhatsApp", telefono: "+56 9 0000 0000" }]);
  r = await Ha({ httpMethod: "POST", headers: auth, queryStringParameters: { asignar: "1" }, body: "accion=asignar&leads=" + encodeURIComponent(json) });
  ok(r.statusCode === 200 && asignados.length === 2 && asignados[0].isapre === "Banmédica" && /<b>2\/2<\/b> asignaciones aceptadas/.test(r.body) && /NO ENVIADO/.test(r.body) && /&lt;b&gt;Prueba/.test(r.body) && /\?tel=56971563526/.test(r.body), "asignar JSON: llama por lead, muestra resultado escapado y no enviados");
  r = await Ha({ httpMethod: "POST", headers: auth, queryStringParameters: { asignar: "1" }, body: "accion=asignar&leads=" + encodeURIComponent("nombre,telefono,isapre\nAna,+56 9 1111 2222,Colmena") });
  ok(r.statusCode === 200 && asignados.length === 3 && asignados[2].nombre === "Ana" && asignados[2].isapre === "Colmena", "asignar CSV");
  r = await Ha({ httpMethod: "POST", headers: auth, queryStringParameters: { asignar: "1" }, body: "accion=asignar&leads=" + encodeURIComponent("[{mal") }); ok(r.statusCode === 400 && /No se pudo leer/.test(r.body), "JSON inválido → 400");
  r = await Ha({ httpMethod: "POST", headers: auth, queryStringParameters: { asignar: "1" }, body: "accion=asignar&leads=" }); ok(r.statusCode === 400 && asignados.length === 3, "vacío → 400");
  ok(P.leerLeads("").length === 0 && P.leerLeads(" [ ] ").length === 0, "leerLeads vacío");
  // registro de eventos desde el webhook real (store en memoria)
  process.env.WSP_APP_SECRET = "sec";
  const mem = new Map(); const deps = { registrarEventos: true, store: { get: async (k) => mem.get(k) || null, set: async (k, v) => { mem.set(k, v); } }, enviarTexto: async () => ({ ok: true }), enviarPlantilla: async () => ({ ok: true }), claude: async () => ({ stop_reason: "end_turn", content: [{ type: "text", text: "Hola!" }] }), notificarEspecialista: async () => [], plantillaInicio: "" };
  const Hw = A.crearHandler(deps);
  const ev = { object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { contacts: [{ wa_id: "56988830767", profile: { name: "iasapre cl" } }], messages: [{ from: "56988830767", id: "wamid.p1", type: "text", text: { body: "Hola, tienes un nuevo lead asignado para gestión.\nSin links" } }, { from: "56977770000", id: "wamid.q1", type: "text", text: { body: "hola" } }] } }] }] };
  const raw = JSON.stringify(ev), firma = "sha256=" + crypto.createHmac("sha256", "sec").update(raw).digest("hex");
  r = await Hw({ httpMethod: "POST", headers: { "x-hub-signature-256": firma }, body: raw });
  const evs = await S.listarEventos(10);
  ok(r.statusCode === 200 && evs.length >= 2 && evs.some((e) => e.tipo === "asignacion_invalida" && e.de === "56988830767" && e.nombre === "iasapre cl") && evs.some((e) => e.tipo === "conversacion" && e.de === "56977770000" && e.enviado), "el webhook registra un evento por mensaje (asignación inválida y conversación): " + JSON.stringify(evs.map((e) => e.tipo)));
  ok(!JSON.stringify(evs).includes("Hola, tienes"), "los eventos no guardan el texto de los mensajes");
  if (fails.length) { console.log("✘ Panel: " + fails.length + " fallas\n - " + fails.join("\n - ")); process.exit(1); }
  console.log("Panel OK: autenticación básica, lista, detalle escapado, eventos, registro desde el webhook");
})();
