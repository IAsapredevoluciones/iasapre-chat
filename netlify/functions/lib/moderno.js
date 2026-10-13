// Adaptador para Netlify Functions modernas (Request/Response): convierte la Request en el evento clásico que usan
// lib/wsp_agent.js y lib/asignar_core.js, y la respuesta clásica {statusCode, headers, body} en Response.
// Motivo: en el formato moderno Netlify Blobs recibe su contexto completo y permite consistencia fuerte (en el clásico,
// vía connectLambda, no existe y las lecturas devolvían estados viejos → el bot repetía preguntas ya respondidas).
async function aEvento(req) {
  const u = new URL(req.url);
  const headers = {}; req.headers.forEach((v, k) => { headers[String(k).toLowerCase()] = v; });
  const queryStringParameters = {}; u.searchParams.forEach((v, k) => { queryStringParameters[k] = v; });
  const body = req.method === "GET" || req.method === "HEAD" ? "" : await req.text(); // texto crudo: la firma HMAC se calcula sobre esto
  return { httpMethod: req.method, headers, queryStringParameters, body, isBase64Encoded: false, moderno: true, rawUrl: req.url };
}

function aResponse(r) {
  r = r || {}; return new Response(r.body == null ? "" : String(r.body), { status: r.statusCode || 200, headers: r.headers || {} });
}

module.exports = { aEvento, aResponse };
