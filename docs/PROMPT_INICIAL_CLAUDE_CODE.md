# Prompt para Claude Code (pegar tal cual como primer mensaje)

Estás en la carpeta del asistente conversacional de IAsapre (chatbot de salud previsional en Chile; repo `IAsapredevoluciones/iasapre-chat`, desplegado en Netlify). Antes de tocar nada, lee `CLAUDE.md` y luego `docs/PENDIENTES.md`, `docs/DECISIONES_Y_REGLAS.md` y `docs/FUENTES_VERIFICADAS.md`.

**Objetivo de negocio:** subir la tasa de conversión de IAsapre. Afiliables → comparar con otras isapres; no afiliables → resolverlos con el bot y no gastar tiempo de ejecutivos; ningún lead se pierde.

**Trabaja en este orden y avísame al terminar cada paso:**

1. **Baseline.** Corre `npm install`, `npm run test:quick` y después `npm test`. Debe quedar todo en verde (15 pruebas). Si algo falla, arréglalo antes de seguir.
2. **Desplegar la v6 (P0).** Compara este árbol con `origin/main` (hoy producción tiene la v3), muéstrame el resumen de diferencias, haz commit y push, y verifica en producción con los `curl` de `docs/GUIA_DEPLOY.md`. Si no tienes permisos de push, dime el comando exacto que debo correr yo.
3. **Prueba de humo remota.** Crea `tests/remote_smoke.js` que descargue `https://iasapre.netlify.app/nico_bot.js` y `kb_offline.js` y corra las aserciones clave (cortafuegos de salud mental + auditoría de cifras) contra producción. Agrégalo a `package.json` como `npm run smoke`.
4. **Panel de depuración** de la landing: que solo se vea con `?debug=1` (hoy se ve siempre). Con test.
5. **UF dinámica:** hoy `UF=41000` es una constante. Usa `https://mindicador.cl/api/uf` con caché en `localStorage` y fallback a la constante; deja el motor offline (la UF se inyecta desde la página). Con tests.
6. **Cortafuegos en el servidor:** aplica `guard()` también en `netlify/functions/chat.js` a lo que devuelve el modelo. Con test.
7. **Set a ciegas nuevo:** escribe `tests/blind5.js` con 25 frases realistas (typos, jerga chilena, transcripciones de audio) sobre cambio de plan, alzas, urgencia, licencias, seguros, Fonasa vs isapre y cargas. **Mídelo antes de modificar el motor**, mejora las reglas, y luego muévelo a regresión.

**Reglas que no puedes romper:**
- La salud mental nunca se presenta como preexistencia ni restricción.
- Cero cifras o normas sin fuente: si corriges un dato, actualiza `docs/FUENTES_VERIFICADAS.md` y agrega el valor antiguo a `tests/audit_sweep.js`.
- Sin datos de salud en URLs, Discord ni logs. El detalle de salud solo viaja al CRM cuando la persona pide comparación o contacto.
- El bot se identifica como "asistente de IAsapre"; si le preguntan, reconoce que es un bot.
- El motor sigue siendo offline y de un solo archivo cargable por `<script>` y `require`.

**Cómo trabajar:** itera con `npm run test:quick` (~5 s) y corre `npm test` completo antes de cada push (~6 min). Commits pequeños y con mensaje claro. **Pregunta antes de** borrar archivos, cambiar los redirects de `netlify.toml` o tocar el sitio raíz (`/`). **No me pidas pegar secretos en el chat:** las variables de entorno (`DISCORD_WEBHOOK`, `LEADS_WEBHOOK`, `ANTHROPIC_API_KEY`) las cargo yo directamente en Netlify; dime qué variables faltan y para qué.

**Al final, entrégame:** qué hiciste, resultados de las pruebas, qué quedó pendiente y qué decisiones necesitas de mí.
