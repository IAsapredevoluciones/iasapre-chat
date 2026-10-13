// Estado de conversaciones por teléfono: Netlify Blobs en producción (store "conversaciones"), memoria como respaldo
// (tests y desarrollo local sin contexto de Blobs). Clave = teléfono en dígitos (56912345678). Sin datos en logs.
const mem = new Map();
let blobs = null;
try { blobs = require("@netlify/blobs"); } catch (e) { blobs = null; }

/** Llamar al inicio del handler clásico (event, context) para que Blobs reciba el contexto de Netlify. */
function conectar(event) { try { if (blobs && blobs.connectLambda) blobs.connectLambda(event); } catch (e) {} }

function tienda() { try { return blobs ? blobs.getStore({ name: "conversaciones", consistency: "strong" }) : null; } catch (e) { return null; } }

async function getConv(telefono) {
  const k = String(telefono || "").replace(/\D/g, ""); if (!k) return null;
  const s = tienda();
  if (s) { try { const v = await s.get(k, { type: "json" }); if (v) return v; } catch (e) { console.error("blobs get", e && e.message); } }
  return mem.get(k) || null;
}

async function setConv(telefono, conv) {
  const k = String(telefono || "").replace(/\D/g, ""); if (!k) return false;
  const s = tienda();
  if (s) { try { await s.setJSON(k, conv); return true; } catch (e) { console.error("blobs set", e && e.message); } }
  mem.set(k, conv); return true;
}

const memoria = { get: (k) => mem.get(String(k).replace(/\D/g, "")) || null, set: (k, v) => { mem.set(String(k).replace(/\D/g, ""), v); }, clear: () => mem.clear() };

module.exports = { conectar, getConv, setConv, memoria };
