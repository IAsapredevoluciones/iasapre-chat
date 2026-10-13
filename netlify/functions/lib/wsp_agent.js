// Núcleo del asistente de WhatsApp: recibe un mensaje entrante (asignación de lead o conversación), decide y actúa.
// Puro respecto de la infraestructura: todo lo externo entra por `deps` (store, envío por WhatsApp, Claude, avisos al equipo),
// así se prueba sin red (tests/wsp_agent.js). El handler real se arma con crearHandler() (netlify/functions/whatsapp.js).
// Reglas: docs/CANAL_WHATSAPP.md · prompt: lib/prompt_whatsapp.js · cortafuegos: guard() de public/nico_bot.js.
const { SYSTEM, NUMEROS, parseAsignacion, formatDerivacion, fmtCL } = require("./prompt_whatsapp.js");
const { guard } = require("../../../public/nico_bot.js");

const MODEL = process.env.MODEL_WSP || "claude-opus-5-5";
const MAX_HIST = 40;           // turnos que se conservan por conversación
const MAX_TEXTO = 1500;        // caracteres por mensaje entrante que se pasan al modelo
const digitos = (s) => String(s || "").replace(/\D/g, "");

// Herramienta que el modelo llama cuando corresponde derivar (sección 3 del rol). strict → argumentos siempre válidos.
const TOOLS = [{
  name: "derivar", strict: true,
  description: "Deriva la conversación a un especialista humano de IAsapre. Úsala SOLO en los casos de la sección 3.1 (dato no verificable, pide humano/cotización/avanzar con el cambio, reclamo o tema legal, urgencia o angustia, persona molesta o conversación estancada). Al llamarla, en el mismo turno escribe a la persona el mensaje de la sección 3.2. El resumen se envía automáticamente al especialista.",
  input_schema: { type: "object", additionalProperties: false,
    required: ["prevision", "edadCargas", "renta", "regionClinica", "preexistencias", "busca", "conversado", "motivo", "urgencia"],
    properties: {
      prevision: { type: "string", description: "Isapre y plan actual, o Fonasa; 'No informado' si no se sabe" },
      edadCargas: { type: "string", description: "Edad del cotizante y cargas (edades)" },
      renta: { type: "string", description: "Renta imponible o rango" },
      regionClinica: { type: "string", description: "Región/comuna y clínica de preferencia" },
      preexistencias: { type: "string", description: "Sí/No y detalle breve. NUNCA incluir salud mental (no es preexistencia)" },
      busca: { type: "string", description: "Qué busca la persona, 1–2 frases" },
      conversado: { type: "string", description: "3–5 líneas con lo ya explicado y respondido" },
      motivo: { type: "string", description: "Por qué no se pudo resolver" },
      urgencia: { type: "string", enum: ["Alta", "Media", "Baja"] } } } }];

const MSG_DERIVACION = `Esta consulta la va a ver mejor un especialista de nuestro equipo. Le paso tu caso con lo que conversamos para que no tengas que repetirlo, y te escribirá desde el número ${NUMEROS.especialista}. 🙌`;
const MSG_RECHAZO = `Eso no lo puedo ver por acá. Te paso con un especialista del equipo, que te escribirá desde el número ${NUMEROS.especialista}.`;
const MSG_ERROR = "Se me cayó la conexión un segundo. ¿Me lo repites? Si sigue fallando, escríbenos al " + NUMEROS.especialista + ".";
const MSG_AUDIO = "Por acá no alcanzo a escuchar bien los audios. ¿Me lo escribes en un mensaje? Así te respondo altiro.";
const MSG_NO_TEXTO = "Por acá solo puedo leer mensajes de texto (o audios). ¿Me lo cuentas por escrito?";
const MSG_REINICIO = "Listo, conversación reiniciada. Escríbeme como si fueras una persona nueva.";

function nuevaConv(telefono, nombrePerfil) {
  return { telefono: digitos(telefono), nombrePerfil: nombrePerfil || "", lead: null, historial: [], derivado: false, derivadoEn: null, asignaciones: 0, creado: new Date().toISOString(), actualizado: null };
}

/** Contexto dinámico (después del bloque cacheado): datos del lead y estado. */
function contexto(conv) {
  const L = conv.lead || {};
  const li = [
    `Teléfono de la persona: ${fmtCL(conv.telefono) || conv.telefono}`,
    `Nombre: ${L.nombre || conv.nombrePerfil || "No informado"}`,
    L.leadId ? `ID de lead: ${L.leadId} (plataforma: https://app.iasapre.cl/?lead=${L.leadId})` : "ID de lead: sin asignación de la plataforma (la persona escribió por su cuenta)",
    `Renta imponible (formulario): ${L.renta || "No informado"}`, `Región (formulario): ${L.region || "No informado"}`,
    `Clínica de preferencia (formulario): ${L.clinica || "No informado"}`, `Cargas familiares (formulario): ${L.cargas || "No informado"}`,
    `Preferencia de contacto (formulario): ${L.contacto || "Sin definir"}`,
    `Estado: ${conv.derivado ? "YA DERIVADA a un especialista el " + conv.derivadoEn + " (sección 3.4: recuérdale que le escribirán desde " + NUMEROS.especialista + " y responde solo dudas simples)" : "en asesoría (no derivada)"}`,
    `Fecha y hora (Chile): ${new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" })}`,
  ];
  return "# CONTEXTO DE ESTA CONVERSACIÓN\n" + li.join("\n");
}

/** Historial → messages de la API (alternando roles, sin turnos vacíos). */
function mensajes(conv) {
  const out = [];
  for (const h of conv.historial.slice(-MAX_HIST)) {
    const role = h.role === "assistant" ? "assistant" : "user", content = String(h.content || "").trim(); if (!content) continue;
    if (out.length && out[out.length - 1].role === role) out[out.length - 1].content += "\n" + content; else out.push({ role, content });
  }
  if (!out.length || out[0].role !== "user") out.unshift({ role: "user", content: "(inicio de la conversación)" });
  if (out[out.length - 1].role !== "user") out.push({ role: "user", content: "(continúa)" });
  return out;
}

function cuerpoClaude(conv, instruccion) {
  const msgs = mensajes(conv);
  if (instruccion) msgs.push({ role: "user", content: instruccion });
  return { model: MODEL, max_tokens: 1024, output_config: { effort: process.env.MODEL_WSP_EFFORT || "low" }, fallbacks: "default",
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }, { type: "text", text: contexto(conv) }],
    tools: TOOLS, tool_choice: { type: "auto" }, messages: msgs };
}

/** Llamada real a la API de Claude (fetch nativo, como chat.js). Devuelve el JSON de la respuesta o lanza. */
async function claudeHTTP(body) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Falta ANTHROPIC_API_KEY");
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "anthropic-beta": "server-side-fallback-2026-07-01" },
    body: JSON.stringify(body) });
  if (!r.ok) { const e = await r.text(); console.error("anthropic", r.status, e.slice(0, 300)); throw new Error("API " + r.status); }
  return r.json();
}

/** Interpreta la respuesta del modelo: texto para la persona + llamada a derivar (si la hubo). */
function leerRespuesta(resp) {
  if (!resp || resp.stop_reason === "refusal") return { texto: "", derivar: null, rechazo: true };
  let texto = "", derivar = null;
  for (const b of resp.content || []) { if (b.type === "text") texto += (texto ? "\n" : "") + b.text; else if (b.type === "tool_use" && b.name === "derivar") derivar = b.input || {}; }
  return { texto: texto.trim(), derivar, rechazo: false };
}

/** Deriva: resumen al especialista (WhatsApp + webhooks) y marca la conversación. */
async function derivar(conv, input, deps, motivoExtra) {
  const L = conv.lead || {};
  const d = formatDerivacion({ ...input, nombre: L.nombre || conv.nombrePerfil, telefono: conv.telefono, leadId: L.leadId, motivo: input.motivo || motivoExtra });
  conv.derivado = true; conv.derivadoEn = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });
  try { await deps.notificarEspecialista(d, { nombre: L.nombre || conv.nombrePerfil, telefono: conv.telefono, leadId: L.leadId, urgencia: (input.urgencia || "Media") }); } catch (e) { console.error("derivación", e && e.message); }
  return d;
}

/** Punto de entrada por mensaje entrante. msg = {from, nombre, texto, messageId}. Devuelve un resumen de lo hecho (sin textos sensibles en logs). */
async function manejarEntrante(msg, deps) {
  const from = digitos(msg.from), texto = String(msg.texto || "").slice(0, MAX_TEXTO);
  if (!from || !texto.trim()) return { tipo: "ignorado" };
  if (from === digitos(NUMEROS.asistente)) return { tipo: "ignorado", motivo: "mensaje propio" };

  // 1) Asignación de lead desde la plataforma (solo desde el número válido; parseAsignacion valida el origen)
  const asig = parseAsignacion(texto, from);
  if (asig) {
    if (!asig.telefono) return { tipo: "asignacion_invalida" };
    const tel = digitos(asig.telefono);
    const conv = (await deps.store.get(tel)) || nuevaConv(tel, asig.nombre);
    const yaAbierta = !!(conv.lead || conv.historial.length);
    conv.lead = { ...(conv.lead || {}), ...asig }; conv.asignaciones = (conv.asignaciones || 0) + 1; conv.actualizado = new Date().toISOString();
    if (yaAbierta) { await deps.store.set(tel, conv); return { tipo: "asignacion", telefono: tel, accion: "retomada" }; } // 1.3b: no reiniciar
    // 1.3c: apertura. Fuera de la ventana de 24 h solo sirve una plantilla aprobada; sin plantilla, texto libre (puede rebotar).
    let r, apertura;
    if (deps.plantillaInicio) {
      r = await deps.enviarPlantilla(tel, deps.plantillaInicio, [asig.nombre.split(" ")[0] || "hola"]);
      apertura = `[Plantilla ${deps.plantillaInicio}] Hola ${asig.nombre.split(" ")[0]}! Te escribe el asistente de IAsapre porque pediste asesoría sobre tu plan de salud. Es gratis. ¿Lo vemos por acá?`;
    } else {
      let resp = null; try { resp = await deps.claude(cuerpoClaude(conv, "Nueva asignación recibida desde la plataforma. Escribe SOLO el primer mensaje a la persona (sección 1.3c): saludo breve con su nombre, por qué le escribes, que es gratis, y una primera pregunta de validación (1.3d). No llames a ninguna herramienta.")); } catch (e) {}
      const le = leerRespuesta(resp); apertura = guard(le.texto) || `Hola ${asig.nombre.split(" ")[0] || ""}! ¿Cómo estás? Te escribe el asistente de IAsapre porque pediste asesoría sobre tu plan de salud. Es gratis y sin compromiso. ¿Te acomoda que lo veamos por acá?`;
      r = await deps.enviarTexto(tel, apertura);
    }
    conv.historial.push({ role: "assistant", content: apertura, t: Date.now(), enviado: !!(r && r.ok) });
    await deps.store.set(tel, conv);
    return { tipo: "asignacion", telefono: tel, accion: "abierta", enviado: !!(r && r.ok) };
  }

  // 2) Conversación con una persona
  if (from === digitos(process.env.WSP_ESPECIALISTA || NUMEROS.especialista) && /^#\s*reinici(ar|o)$/i.test(texto.trim())) { // solo el especialista: borra su propia conversación para volver a probar
    if (deps.store.del) await deps.store.del(from);
    const rr = await deps.enviarTexto(from, MSG_REINICIO); return { tipo: "reinicio", enviado: !!(rr && rr.ok) };
  }
  const conv = (await deps.store.get(from)) || nuevaConv(from, msg.nombre);
  if (!conv.nombrePerfil && msg.nombre) conv.nombrePerfil = msg.nombre;
  if (msg.messageId && conv.historial.some((h) => h.id === msg.messageId)) return { tipo: "ignorado", motivo: "duplicado" }; // reintento de Meta
  conv.historial.push({ role: "user", content: texto, t: Date.now(), id: msg.messageId || undefined, audio: msg.viaAudio ? true : undefined });
  let resp = null, error = null;
  try { resp = await deps.claude(cuerpoClaude(conv)); } catch (e) { error = e; }
  let { texto: salida, derivar: pedido, rechazo } = leerRespuesta(resp);
  let derivacion = null;
  if (error) salida = MSG_ERROR;
  else if (rechazo) { derivacion = await derivar(conv, { urgencia: "Media", conversado: "(respuesta rechazada por políticas del modelo)" }, deps, "el modelo rechazó responder"); salida = MSG_RECHAZO; }
  else if (pedido) { derivacion = await derivar(conv, pedido, deps); if (!salida) salida = MSG_DERIVACION; }
  salida = guard(salida) || MSG_ERROR;
  const r = await deps.enviarTexto(from, salida);
  conv.historial.push({ role: "assistant", content: salida, t: Date.now(), enviado: !!(r && r.ok) });
  if (conv.historial.length > MAX_HIST * 2) conv.historial = conv.historial.slice(-MAX_HIST * 2);
  conv.actualizado = new Date().toISOString();
  await deps.store.set(from, conv);
  return { tipo: "conversacion", telefono: from, derivado: !!derivacion, enviado: !!(r && r.ok), error: error ? String(error.message) : null };
}

/** Avisos al especialista: WhatsApp + webhooks ya existentes. Por WhatsApp primero va el resumen completo como texto
 *  (funciona si el especialista le escribió al asistente en las últimas 24 h); si rebota (ventana cerrada), la plantilla
 *  aprobada WSP_TEMPLATE_DERIVACION (nombre, teléfono, urgencia, link). Cada fallo se registra sin datos personales.
 *  Discord NUNCA recibe el detalle (datos de salud): solo nombre, teléfono, urgencia y link. */
function crearNotificador(wsp, env) {
  env = env || process.env;
  async function porWhatsApp(esp, resumen, meta) {
    let r = await wsp.enviarTexto(esp, resumen);
    if (r && r.ok) return r;
    console.error("derivación: texto al especialista rebotó", r && r.status, r && r.error);
    if (!env.WSP_TEMPLATE_DERIVACION) return r || { ok: false };
    r = await wsp.enviarPlantilla(esp, env.WSP_TEMPLATE_DERIVACION, [meta.nombre || "Sin nombre", fmtCL(meta.telefono) || meta.telefono || "", meta.urgencia || "Media", meta.leadId ? "https://app.iasapre.cl/?lead=" + meta.leadId : "sin ID"]);
    if (!(r && r.ok)) console.error("derivación: plantilla al especialista rebotó", r && r.status, r && r.error);
    return r || { ok: false };
  }
  return async function notificarEspecialista(resumen, meta) {
    const posts = [];
    const esp = digitos(env.WSP_ESPECIALISTA || NUMEROS.especialista);
    posts.push(porWhatsApp(esp, resumen, meta));
    for (const k of ["LEADS_WEBHOOK", "ZAPIER_WEBHOOK"]) if (env[k]) posts.push(fetch(env[k], { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "derivacion_wsp", source: "whatsapp", name: meta.nombre || "", phone: meta.telefono || "", lead_id: meta.leadId || "", urgencia: meta.urgencia || "Media", resumen, timestamp: new Date().toISOString() }) }).catch(() => {}));
    if (env.DISCORD_WEBHOOK) posts.push(fetch(env.DISCORD_WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: `🔔 **Derivación WhatsApp** · urgencia ${meta.urgencia || "Media"}\n**${meta.nombre || "Sin nombre"}** · ${fmtCL(meta.telefono) || meta.telefono || ""}${meta.leadId ? "\nhttps://app.iasapre.cl/?lead=" + meta.leadId : ""}\n(El resumen completo llegó por WhatsApp al especialista y al CRM)` }) }).catch(() => {}));
    const rs = await Promise.allSettled(posts);
    return rs.map((x) => (x.status === "fulfilled" ? x.value : { ok: false }));
  };
}

/** Handler de Netlify (clásico). deps opcionales para tests. */
function crearHandler(depsOverride) {
  const wsp = require("./wsp_api.js"), store = require("./store.js");
  return async function handler(event) {
    const env = process.env;
    if (event.httpMethod === "GET") return wsp.verificarWebhook(event.queryStringParameters, env.WSP_VERIFY_TOKEN);
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Método no permitido" };
    const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : (event.body || "");
    const h = event.headers || {}; const firma = h["x-hub-signature-256"] || h["X-Hub-Signature-256"];
    if (!(depsOverride && depsOverride.omitirFirma)) {
      if (!env.WSP_APP_SECRET) { console.error("whatsapp: falta WSP_APP_SECRET"); return { statusCode: 500, body: "Falta WSP_APP_SECRET" }; }
      if (!wsp.verificarFirma(raw, firma, env.WSP_APP_SECRET)) return { statusCode: 401, body: "Firma inválida" };
    }
    let body = {}; try { body = JSON.parse(raw || "{}"); } catch (e) { return { statusCode: 400, body: "JSON inválido" }; }
    store.conectar(event);
    for (const f of wsp.estadosFallidos(body)) console.error("whatsapp estado failed", f.code, f.title); // sin teléfonos
    const stt = require("./stt.js");
    const deps = Object.assign({ store: { get: store.getConv, set: store.setConv, del: store.delConv }, enviarTexto: wsp.enviarTexto, enviarPlantilla: wsp.enviarPlantilla, claude: claudeHTTP,
      notificarEspecialista: crearNotificador(wsp, env), plantillaInicio: env.WSP_TEMPLATE_INICIO || "",
      transcribir: stt.configurado(env) ? async (mediaId) => { const m = await wsp.descargarMedia(mediaId); return stt.transcribir(m.buffer, m.mime, env); } : null }, depsOverride || {});
    const resultados = [];
    for (const m of wsp.parsearWebhook(body)) {
      // Solo el número del asistente: si el evento viene para otro número de la misma cuenta (p. ej. el WhatsApp de devoluciones), se ignora sin responder.
      if (env.WSP_PHONE_NUMBER_ID && m.phoneNumberId && m.phoneNumberId !== env.WSP_PHONE_NUMBER_ID) { resultados.push({ tipo: "ignorado", motivo: "otro número" }); continue; }
      try { if (m.messageId && !depsOverride) wsp.marcarLeido(m.messageId).catch(() => {}); } catch (e) {}
      if (!m.texto && m.mediaId) { // nota de voz → transcripción (sin guardar el audio ni registrar su contenido)
        if (!deps.transcribir) { const rr = await deps.enviarTexto(m.from, MSG_AUDIO); resultados.push({ tipo: "audio_sin_stt", enviado: !!(rr && rr.ok) }); continue; }
        try { m.texto = String(await deps.transcribir(m.mediaId) || "").trim(); m.viaAudio = true; } catch (e) { console.error("audio transcripción", e && e.message); }
        if (!m.texto) { const rr = await deps.enviarTexto(m.from, MSG_AUDIO); resultados.push({ tipo: "audio_fallido", enviado: !!(rr && rr.ok) }); continue; }
      }
      if (!m.texto) {
        if (m.from && !["reaction", "unsupported"].includes(m.tipo)) { const rr = await deps.enviarTexto(m.from, MSG_NO_TEXTO); resultados.push({ tipo: "ignorado", motivo: "sin texto (" + m.tipo + ")", enviado: !!(rr && rr.ok) }); }
        else resultados.push({ tipo: "ignorado", motivo: "sin texto (" + m.tipo + ")" });
        continue;
      }
      try { resultados.push(await manejarEntrante(m, deps)); } catch (e) { console.error("whatsapp handler", e && e.message); resultados.push({ tipo: "error" }); }
    }
    console.log("whatsapp", JSON.stringify(resultados.map((r) => ({ tipo: r.tipo, accion: r.accion, derivado: r.derivado, enviado: r.enviado, error: r.error, motivo: r.motivo })))); // sin teléfonos ni textos
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, n: resultados.length }) };
  };
}

module.exports = { manejarEntrante, crearHandler, crearNotificador, cuerpoClaude, leerRespuesta, mensajes, contexto, nuevaConv, TOOLS, MODEL, MSG_DERIVACION, MSG_AUDIO, MSG_NO_TEXTO, MSG_REINICIO, claudeHTTP };
