// Panel de revisión del canal WhatsApp (solo lectura): conversaciones guardadas, cada respuesta del asistente y el registro
// de eventos (qué llegó, de quién, qué se hizo). Protegido con autenticación básica del navegador: usuario PANEL_USUARIO
// (por defecto "iasapre") y contraseña PANEL_SECRET (obligatoria). Sin PANEL_SECRET el panel responde 503.
// URL: https://iasapre-chat.netlify.app/.netlify/functions/panel  (?tel=569…  detalle · ?eventos=1  registro)
// Contiene datos de salud: nunca se indexa, no se cachea y no se envía a terceros.
const crypto = require("crypto");
const { fmtCL } = require("./prompt_whatsapp.js");
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hora = (t) => { try { const d = typeof t === "number" ? new Date(t) : new Date(String(t)); return isNaN(d) ? String(t || "") : d.toLocaleString("es-CL", { timeZone: "America/Santiago", hour12: false }); } catch (e) { return String(t || ""); } };
const igual = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const HEAD = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };
const CSS = "body{font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;margin:0;background:#f4f8ff;color:#0d1421;font-size:16px}header{background:#2f5fd8;color:#fff;padding:12px 16px;display:flex;gap:16px;align-items:center;flex-wrap:wrap}header a{color:#fff;text-decoration:none;font-weight:600}main{padding:12px 16px;max-width:980px;margin:0 auto}table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid #e6edf8;vertical-align:top}th{background:#eef3ff;font-size:14px}tr:hover td{background:#fafcff}.b{display:inline-block;padding:2px 8px;border-radius:999px;font-size:13px;background:#e6edf8}.b.der{background:#e96f9a;color:#fff}.b.ok{background:#69cbc1;color:#0d1421}.b.no{background:#ffd9d9}.chat{display:flex;flex-direction:column;gap:8px}.m{max-width:80%;padding:10px 12px;border-radius:14px;white-space:pre-wrap;line-height:1.35}.u{align-self:flex-end;background:#d9fdd3;border-bottom-right-radius:4px}.a{align-self:flex-start;background:#fff;border-bottom-left-radius:4px;border:1px solid #e6edf8}.t{font-size:12px;color:#667;margin-top:4px}.box{background:#fff;border-radius:12px;padding:12px 14px;margin-bottom:12px;border:1px solid #e6edf8}small{color:#667}@media(max-width:600px){th:nth-child(4),td:nth-child(4){display:none}}";
const pagina = (titulo, cuerpo) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(titulo)} · IAsapre</title><style>${CSS}</style></head><body><header><a href="?">Conversaciones</a><a href="?eventos=1">Eventos</a><small style="color:#dfe8ff">Asistente WhatsApp +56 9 5373 0030 · solo lectura</small></header><main>${cuerpo}</main></body></html>`;

function noAutorizado() { return { statusCode: 401, headers: { ...HEAD, "WWW-Authenticate": 'Basic realm="Panel IAsapre", charset="UTF-8"' }, body: pagina("Acceso", "<div class=box>Necesitas usuario y contraseña del panel.</div>") }; }

function autorizado(event, env) {
  const h = (event.headers && (event.headers.authorization || event.headers.Authorization)) || "";
  const m = /^Basic (.+)$/.exec(h); if (!m) return false;
  let dec = ""; try { dec = Buffer.from(m[1], "base64").toString("utf8"); } catch (e) { return false; }
  const i = dec.indexOf(":"); if (i < 0) return false;
  return igual(dec.slice(0, i), env.PANEL_USUARIO || "iasapre") && igual(dec.slice(i + 1), env.PANEL_SECRET);
}

function vistaLista(convs) {
  const filas = convs.map((c) => { const L = c.lead || {}; const ult = c.historial && c.historial.length ? c.historial[c.historial.length - 1] : null;
    return `<tr><td><a href="?tel=${esc(c.telefono)}"><b>${esc(L.nombre || c.nombrePerfil || "Sin nombre")}</b></a><br><small>${esc(fmtCL(c.telefono) || c.telefono)}</small></td><td>${c.derivado ? '<span class="b der">derivada</span>' : '<span class="b">en asesoría</span>'}${L.leadId ? ' <span class="b">lead</span>' : ""}${c.asignaciones ? ` <small>${c.asignaciones} asig.</small>` : ""}</td><td>${(c.historial || []).length} turnos<br><small>${esc(hora(c.actualizado || c.creado))}</small></td><td><small>${esc(ult ? (ult.role === "assistant" ? "Bot: " : "Persona: ") + String(ult.content || "").slice(0, 90) : "")}</small></td></tr>`; }).join("");
  const der = convs.filter((c) => c.derivado).length;
  return pagina("Conversaciones", `<div class=box><b>${convs.length}</b> conversaciones · <b>${der}</b> derivadas · ${convs.filter((c) => c.lead && c.lead.leadId).length} con lead de la plataforma. <small>Se guardan los últimos 80 turnos por persona. Para repetir una prueba, el especialista escribe <code>#reiniciar</code> al asistente.</small></div><table><tr><th>Persona</th><th>Estado</th><th>Actividad</th><th>Último mensaje</th></tr>${filas || '<tr><td colspan=4>Aún no hay conversaciones.</td></tr>'}</table>`);
}

function vistaDetalle(c) {
  const L = c.lead || {};
  const datos = [["Nombre", L.nombre || c.nombrePerfil], ["Teléfono", fmtCL(c.telefono) || c.telefono], ["Lead", L.leadId ? `<a href="https://app.iasapre.cl/?lead=${esc(L.leadId)}">${esc(L.leadId)}</a>` : "sin asignación (escribió por su cuenta)"], ["Renta (form.)", L.renta], ["Región (form.)", L.region], ["Clínica (form.)", L.clinica], ["Cargas (form.)", L.cargas], ["Estado", c.derivado ? `DERIVADA el ${esc(c.derivadoEn || "")}` : "en asesoría"], ["Creada", hora(c.creado)], ["Última actividad", hora(c.actualizado)]]
    .filter(([, v]) => v).map(([k, v]) => `<div><small>${esc(k)}:</small> ${k === "Lead" ? v : esc(v)}</div>`).join("");
  const msgs = (c.historial || []).map((h) => `<div class="m ${h.role === "assistant" ? "a" : "u"}">${esc(h.content)}<div class=t>${h.role === "assistant" ? "Asistente" : "Persona"}${h.audio ? " · 🎙️ audio transcrito" : ""}${h.enviado === false ? " · <b>NO ENVIADO</b>" : ""} · ${esc(hora(h.t))}</div></div>`).join("");
  return pagina(L.nombre || c.nombrePerfil || c.telefono, `<div class=box>${datos}</div><div class=chat>${msgs || "<div class=box>Sin mensajes.</div>"}</div>`);
}

function vistaEventos(evs) {
  const filas = evs.map((e) => `<tr><td><small>${esc(hora(e.t))}</small></td><td>${esc(e.canal || "")}<br><small>${esc(e.de ? (fmtCL(e.de) || e.de) : "")}${e.nombre ? " · " + esc(e.nombre) : ""}</small></td><td><span class="b ${e.tipo === "error" || e.tipo === "asignacion_invalida" ? "no" : e.enviado ? "ok" : ""}">${esc(e.tipo || "")}</span>${e.accion ? " " + esc(e.accion) : ""}${e.motivo ? "<br><small>" + esc(e.motivo) + "</small>" : ""}${e.derivado ? ' <span class="b der">derivó</span>' : ""}${e.lead ? `<br><small>lead → <a href="?tel=${esc(e.lead)}">${esc(fmtCL(e.lead) || e.lead)}</a></small>` : ""}${e.error ? "<br><small>" + esc(e.error) + "</small>" : ""}</td><td><small>${esc(e.clase || "")}</small></td></tr>`).join("");
  return pagina("Eventos", `<div class=box>Últimos ${evs.length} eventos del webhook y del endpoint de asignaciones (más recientes primero). Tipos: <code>conversacion</code>, <code>asignacion</code> (abierta/retomada), <code>asignacion_invalida</code>, <code>ignorado</code> (otro número, sin texto, duplicado), <code>audio_*</code>, <code>reinicio</code>, <code>error</code>.</div><table><tr><th>Cuándo</th><th>Origen</th><th>Qué pasó</th><th>Tipo msg</th></tr>${filas || '<tr><td colspan=4>Sin eventos todavía.</td></tr>'}</table>`);
}

function crearHandler(depsOverride) {
  return async function handler(event) {
    const env = (depsOverride && depsOverride.env) || process.env;
    if (event.httpMethod !== "GET") return { statusCode: 405, headers: HEAD, body: "Método no permitido" };
    if (!env.PANEL_SECRET) return { statusCode: 503, headers: HEAD, body: pagina("Panel", "<div class=box>Falta configurar <code>PANEL_SECRET</code> (y opcionalmente <code>PANEL_USUARIO</code>) en Netlify → Environment variables, y redeployar.</div>") };
    if (!autorizado(event, env)) return noAutorizado();
    let store = depsOverride && depsOverride.store;
    if (!store) { const st = require("./store.js"); st.conectar(event); store = { listar: st.listarConvs, obtener: st.getConv, eventos: st.listarEventos }; }
    const q = event.queryStringParameters || {};
    try {
      if (q.tel) { const c = await store.obtener(q.tel); return { statusCode: c ? 200 : 404, headers: HEAD, body: c ? vistaDetalle(c) : pagina("No encontrada", "<div class=box>No hay conversación con ese número. <a href='?'>Volver</a></div>") }; }
      if (q.eventos) return { statusCode: 200, headers: HEAD, body: vistaEventos(await store.eventos(Math.min(Number(q.n) || 150, 500))) };
      return { statusCode: 200, headers: HEAD, body: vistaLista(await store.listar()) };
    } catch (e) { console.error("panel", e && e.message); return { statusCode: 500, headers: HEAD, body: pagina("Error", "<div class=box>Error al leer el almacén.</div>") }; }
  };
}

module.exports = { crearHandler, autorizado, vistaLista, vistaDetalle, vistaEventos, esc };
