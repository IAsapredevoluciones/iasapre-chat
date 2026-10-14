// Netlify Scheduled Function: vigía del asistente de WhatsApp, cada 10 minutos (ver lib/vigia_core.js).
import core from "./lib/vigia_core.js";
export default async () => {
  const r = await core.ejecutar(core.depsReales());
  console.log("vigia", JSON.stringify({ conexion: r.conexion && r.conexion.ok, retomadas: r.retomadas, sinWebhook: !!r.sinWebhookDesde })); // sin datos personales
  return new Response("ok");
};
export const config = { schedule: "*/10 * * * *" };
