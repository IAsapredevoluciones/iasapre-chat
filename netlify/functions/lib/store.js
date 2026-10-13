// Estado de conversaciones por teléfono: Netlify Blobs en producción (store "conversaciones"), memoria como respaldo
// (tests y desarrollo local sin contexto de Blobs). Clave = teléfono en dígitos (56912345678). Sin datos en logs.
// - Modo moderno (Request/Response, ver lib/moderno.js): consistencia FUERTE, así cada mensaje ve el historial del anterior.
// - Modo clásico (connectLambda): solo hay consistencia eventual (no existe `uncachedEdgeURL`), se usa como respaldo.
// - Escritura con FUSIÓN: dos mensajes seguidos pueden procesarse en paralelo (cada invocación lee, llama a Claude ~5 s y
//   escribe); sin fusión el último pisaba al otro y se perdían turnos. fusionar() une historiales sin duplicar.
const mem = new Map();
let blobs = null;
try { blobs = require("@netlify/blobs"); } catch (e) { blobs = null; }
let modoClasico = false;
const MAX_TURNOS = 80; // = MAX_HIST * 2 de wsp_agent.js

/** Llamar al inicio del handler. Evento moderno (lib/moderno.js, `moderno: true`): nada que conectar. Clásico: connectLambda. */
function conectar(event) {
  if (event && event.moderno) { modoClasico = false; return; }
  modoClasico = true; try { if (blobs && blobs.connectLambda) blobs.connectLambda(event); } catch (e) {}
}

function tienda() {
  try { return blobs ? blobs.getStore(modoClasico ? { name: "conversaciones" } : { name: "conversaciones", consistency: "strong" }) : null; } catch (e) { return null; }
}

const claveTurno = (h) => (h && h.id ? "id:" + h.id : (h.role || "") + "|" + (h.t || 0) + "|" + String((h && h.content) || "").slice(0, 200));

/** Une el estado guardado (a) con el nuevo (b): historial sin duplicados ordenado por tiempo, derivación "pegajosa", lead fusionado. */
function fusionar(a, b) {
  if (!a) return b; if (!b) return a;
  const vistos = new Set(), hist = [];
  for (const h of [...(a.historial || []), ...(b.historial || [])]) { const k = claveTurno(h); if (vistos.has(k)) continue; vistos.add(k); hist.push(h); }
  hist.sort((x, y) => (x.t || 0) - (y.t || 0));
  const lead = a.lead || b.lead ? { ...(a.lead || {}), ...(b.lead || {}) } : null;
  return { ...a, ...b, lead, historial: hist.slice(-MAX_TURNOS), derivado: !!(a.derivado || b.derivado), derivadoEn: b.derivadoEn || a.derivadoEn || null,
    asignaciones: Math.max(a.asignaciones || 0, b.asignaciones || 0), nombrePerfil: b.nombrePerfil || a.nombrePerfil || "", creado: a.creado || b.creado };
}

async function getConv(telefono) {
  const k = String(telefono || "").replace(/\D/g, ""); if (!k) return null;
  const s = tienda();
  if (s) { try { const v = await s.get(k, { type: "json" }); if (v) return v; } catch (e) { console.error("blobs get", e && e.message); } }
  return mem.get(k) || null;
}

async function setConv(telefono, conv) {
  const k = String(telefono || "").replace(/\D/g, ""); if (!k) return false;
  const s = tienda();
  if (s) { try { const actual = await s.get(k, { type: "json" }).catch(() => null); await s.setJSON(k, fusionar(actual, conv)); return true; } catch (e) { console.error("blobs set", e && e.message); } }
  mem.set(k, fusionar(mem.get(k), conv)); return true;
}

/** Borra la conversación (pruebas / reinicio de un caso). */
async function delConv(telefono) {
  const k = String(telefono || "").replace(/\D/g, ""); if (!k) return false;
  const s = tienda();
  if (s) { try { await s.delete(k); } catch (e) { console.error("blobs delete", e && e.message); } }
  mem.delete(k); return true;
}

const memoria = { get: (k) => mem.get(String(k).replace(/\D/g, "")) || null, set: (k, v) => { mem.set(String(k).replace(/\D/g, ""), v); }, clear: () => mem.clear() };

module.exports = { conectar, getConv, setConv, delConv, fusionar, memoria };
