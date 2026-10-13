# IAsapre · Asistente conversacional "NicoBot" — contexto para Claude Code

> Lee este archivo completo antes de tocar código. Después: `docs/PENDIENTES.md` (qué hacer) y `docs/PROMPT_INICIAL_CLAUDE_CODE.md` (primer prompt sugerido).

## 1. Qué es y para qué sirve
**IAsapre** (iasapre.cl) es un servicio chileno de **asesoría gratuita para comparar planes de isapre** (ganan comisión de las isapres por afiliación; no cobran al usuario). Dueño: **Nico Larraín** (abogado). Este repo es un **chatbot/orientador** que:
1. Recibe el formulario del usuario (isapre actual, renta, cargas, clínica, preexistencias, qué busca).
2. **Clasifica** al lead: `no_afiliable` (preexistencias que ninguna otra isapre acepta) · `restringible` (18 meses de restricción) · `evaluar` · `protegido` (salud mental) · `sin_impacto`.
3. Conversa de forma natural (texto y voz) respondiendo cualquier duda de salud previsional **sin API key** (motor offline).
4. **Objetivo de negocio = convertir leads**:
   - **Afiliables** (sin preexistencias o con restricción): personalizar y empujar, siempre con honestidad, a **comparar con otras isapres** (mejor cobertura/red o menor precio) y a pedir la comparación → ejecutivo.
   - **No afiliables**: **resolverlos con el bot** (~90 % sin derivar a Nico) explicando por qué cambiarse no aplica y qué sí pueden hacer (optimizar dentro de su isapre, Fonasa + complementario, GES/CAEC, reclamar alzas). Solo derivar si insisten; ofrecer comparar para un **familiar** que cotice por su cuenta. Así se cuida el tiempo de los ejecutivos.

## 2. Estado actual (13-oct-2026) — v6.5
- Motor offline `public/nico_bot.js` (~115 KB) + base `public/kb_offline.js` (55 temas) + landing `public/orientador.html`.
- **Batería: 24/24 en verde** (`npm test`). Simulación de 10.000 conversaciones ≈ 100 % comprensión. `npm run smoke` prueba producción (motor publicado) con los mismos barridos.
- **Sitio público https://iasapre.netlify.app/orientador sigue con v3** hasta que se haga `git push origin main` (los commits v6/v6.1 están en `main` local; esta máquina no tiene credenciales de GitHub). Verificar después con `npm run smoke`.
- Pruebas manuales: artifact de Claude https://claude.ai/artifact/64UmdfC6HVw5dBhj32Fr8w (misma landing, todo inline).
- Repo GitHub: `IAsapredevoluciones/iasapre-chat` (público) → Netlify sitio `iasapre` (deploy automático desde `main`).

## 3. Mapa del repo
```
public/                    ← lo que sirve Netlify (publish = "public")
  orientador.html          landing + formulario + chat + voz + traspaso de leads (carga /kb_offline.js y /nico_bot.js)
  nico_bot.js              motor conversacional (UMD: window.NicoBot / module.exports)
  kb_offline.js            KB_OFF: 55 temas con scoring (UMD: exporta KB_OFF)
netlify/functions/
  chat.js                  fallback opcional a Claude API (necesita ANTHROPIC_API_KEY); usa lib/prompt.js
  contact.js               recibe leads (stage form|comparacion|escalar|wa_click) → LEADS_WEBHOOK / ZAPIER_WEBHOOK / DISCORD_WEBHOOK
  lib/prompt.js            exporta {WEB, KB}: KB = base de conocimiento (18 secciones) AUDITADA (docs/FUENTES_VERIFICADAS.md); WEB = KB + instrucciones del chat web
  whatsapp.js              webhook de WhatsApp Business Cloud API (Meta) del asistente +56 9 5373 0030 → lib/wsp_agent.js
  lib/prompt_whatsapp.js   canal WhatsApp (docs/CANAL_WHATSAPP.md): rol + KB, parseAsignacion() (solo desde +56 9 8883 0767), formatDerivacion() (a +56 9 8538 0357)
  lib/wsp_agent.js         núcleo del agente (asignación → apertura; conversación → Claude claude-opus-5-5 + herramienta `derivar` + guard(); avisos). Testeable sin red
  lib/wsp_api.js           envío/plantillas/firma/parseo de la Cloud API · lib/store.js estado por teléfono (Netlify Blobs; memoria en tests)
modules/orientador/        módulo SEPARADO, NO desplegado: orientar.js (POST /api/orientar) para integrar el formulario de iasapre.cl
tests/                     batería (ver §6) · remote_smoke.js = humo contra producción (npm run smoke)
docs/                      ARQUITECTURA, FUENTES_VERIFICADAS, DECISIONES_Y_REGLAS, PENDIENTES, GUIA_DEPLOY, CHANGELOG, PROMPT_INICIAL, ESTILO_WSP_NICO (voz del bot), CANAL_WHATSAPP (rol del asistente en WhatsApp)
netlify.toml               publish=public; functions; redirect catch‑all a un sitio estático antiguo (force=false → los archivos locales ganan)
```

## 4. Reglas inquebrantables (cumplimiento)
1. **Salud mental NUNCA es preexistencia ni restricción.** Ley 21.331 + Circular IF 396 (8‑nov‑2021): desde 3‑ene‑2022 la Declaración de Salud no pregunta por salud mental; desde 1‑mar‑2022 no se pueden vender planes que la restrinjan. Hay un **cortafuegos** `guard()` que elimina cualquier frase que la ligue a restricción/preexistencia/rechazo. Test: `mh_sweep.js`. No registrar salud mental en el CRM.
2. **Honestidad de identidad:** se presenta como "asistente de IAsapre"; si preguntan "¿eres un bot?", lo reconoce. No firmar como persona. Nico es quien atiende por WhatsApp.
3. **Cero cifras sin fuente.** Toda cifra/plazo/norma debe estar en `docs/FUENTES_VERIFICADAS.md`. Lo no verificado se marca así (convenios clínica‑isapre, "25 % cobertura mínima", valor UF). `tests/audit_sweep.js` prohíbe cifras ya corregidas: **agrega ahí cada error corregido**.
4. **Privacidad:** nada de datos de salud en URLs (WhatsApp prellenado), en Discord ni en logs. El detalle de salud solo viaja al CRM (`LEADS_WEBHOOK`) cuando la persona **pide** comparación/persona (consentimiento explícito en el mensaje del bot). Formulario inicial: aviso mínimo sin salud.
5. **No dar diagnósticos ni consejos médicos**; no prometer resultados ("te ahorras X") sin la comparación real. No inventar tiempos de respuesta del equipo (hoy dice "normalmente el mismo día hábil": **confirmar con Nico**).
6. **Afiliables:** empujar a comparar sin presionar y siendo objetivo ("si tu plan es el mejor, te lo digo"). **No afiliables:** no empujar al cambio.
7. **Estilo "poco IA" = el estilo de Nico en WhatsApp** (`docs/ESTILO_WSP_NICO.md`, test `estilo.js`): apertura "Hola! ¿Cómo estás?", nunca `¡`, tuteo chileno cercano ("te tinca", "nomás", "con calma", "buenísimo"), frases cortas, **una pregunta a la vez**, calificar con plan actual + cuánto pagas + clínica, ofrecer un "primer barrido" honesto ("tu plan puede ser tu mejor opción"), Meet para la letra chica, cerrar con "cualquier duda me avisas / quedo atento". **Usted desde los 60 años** del formulario (`ustedear()`/`tono()`, test `usted.js`; toda forma de tú nueva va a `U_MAP`/`U_IMP`). Tolera errores de tipeo/jerga/audio.

## 5. Cómo funciona el motor (resumen; detalle en `docs/ARQUITECTURA.md`)
`NicoBot.start(lead)` → perfil + clasificación + mensajes iniciales (burbujas). `NicoBot.reply(texto)` → pipeline:
normalización (`norm`, TYPO, muletillas de audio `FILL`, números hablados `hablado()`) → `capturar()` (datos de pasada: isapre, clínica, montos) → atajos conversacionales (¿bot?, insulto, vago, emoción, fuera de tema) → respuestas contextuales sí/no según `S.pending`/`S.need` → **scoring de intenciones** `INT` (palabras clave difusas + Levenshtein + `concept()` con reglas de contexto) → desambiguación / multi‑pregunta → fallback `KB_OFF` → `no_entendi` (2 intentos y deriva) → `guard()` + `humanizar()`.
Respuestas: `D.*` (dinámicas con datos del perfil), `EXT` (textos largos verificados), `KB_OFF` (offline). Exporta además `lead()`, `handoff()`, `waTexto()`, `guard()`, `hablado()`, `setUF()`/`uf()` (UF del día inyectada por la página; respaldo 41.000), `tono()`/`ustedear()` (usted desde `USTED_DESDE`=60), `_dbg()` (puntajes de intención), `_state()`.

## 6. Pruebas (`npm install && npm test`)
`npm run test:quick` ≈ 10 s (sin simulaciones ni jsdom) para iterar; `npm run test:fast` ≈ 3 min (con simulaciones); `npm test` ≈ 6 min (todo). Ejecutar siempre completo antes de cada push. `npm run smoke` (red) valida el sitio publicado.
| Test | Qué mide | Umbral |
|---|---|---|
| holdout*.js, holdout_conv.js | casos escritos aparte, regresión | 100 % |
| blind*.js (1–5) | sets "a ciegas" escritos antes de ajustar (mide generalización) | ≥ 95 % |
| uf.js, chat_guard.js | UF inyectable sin red en el motor; guard() en el servidor | pasan |
| estilo.js | 155 respuestas: apertura, sin `¡`, cierres, registro chileno, CTA rotado, Meet, nunca "soy Nico" | pasa |
| usted.js | 792 respuestas a mayores de 60 sin restos de tú; salud mental y cifras limpias; tuteo bajo 60 | pasa |
| whatsapp.js | prompt del canal WhatsApp (reglas clave, sin cifras prohibidas), asignaciones solo del número válido, inyección ignorada, derivación | pasa |
| wsp_agent.js | agente completo con Claude/WhatsApp/almacén simulados: apertura, reasignación, guard, derivar sin salud mental, refusal, errores, firma del webhook, avisos | pasa |
| mh_sweep.js | 352 respuestas × perfiles de salud mental: 0 inconsistencias | 0 |
| audit_sweep.js | ninguna respuesta contiene cifras/frases ya corregidas | 0 |
| sim3.js / sim.js | miles de conversaciones sintéticas con typos, mayúsculas, muletillas, 1/3 "por voz" | ≥ 99 % / ≥ 98 % |
| ui_smoke, e2e_flow, e2e_voz, ui_debug, ui_uf (jsdom) | página real: burbujas, avisos al backend, WhatsApp sin salud, re‑enganche, dictado, panel solo con ?debug=1, UF con caché/fallback | pasan |
| remote_smoke.js (`npm run smoke`, fuera de `npm test`) | motor publicado en producción: marcadores v6, guard, barridos MH y cifras | 0 fallas |
**Método para mejorar:** (1) escribir un set NUEVO a ciegas con frases realistas, medir; (2) corregir reglas (`concept()`, keywords, texto); (3) mover los casos al set de regresión; (4) re‑correr todo. No ajustar contra el mismo set que se mide. Panel de depuración bajo el chat solo con `?debug=1`: muestra intención (`id`), puntaje, tier del lead, avisos enviados y UF usada.

## 7. Flujo de leads (landing → backend)
Submit del formulario → `notify("form")` (mínimo). Al pedir comparación (`D.comparar_si`) → `notify("comparacion")` con resumen completo (`NicoBot.handoff()`: tier, score, renta, 7 %, clínica, cargas, nota interna). Pedir persona → `escalar`. Clic en WhatsApp → `wa_click`. Cada etapa se envía **una sola vez**. Re‑enganche por silencio (40 s / 75 s, una vez). **Requiere env vars en Netlify** (`DISCORD_WEBHOOK` y/o `LEADS_WEBHOOK`); sin ellas `contact.js` solo deja un respaldo mínimo en logs.

## 8. Convenciones
Node ≥ 18, sin build, sin dependencias en runtime salvo `@netlify/blobs` (estado del canal WhatsApp; `jsdom` solo para tests). El motor debe seguir siendo un solo archivo cargable por `<script>` y por `require`. No introducir llamadas de red en el motor (es offline por diseño). Mensajes del bot: español de Chile. Commits pequeños; correr `npm test` antes de cada push.

## 9. Contexto de Nico (para decidir con criterio)
Abogado; IAsapre es su proyecto; WhatsApp comercial +56 9 8538 0357 (ejecutivo humano), Calendly calendly.com/nico-iasapre/30min. Quiere: máxima tasa de conversión, bot flexible con preguntas mal formuladas y audio, información **verificable**, y que las respuestas se sientan humanas. Pendiente de terceros: **Rafa** administra el DNS (chat.iasapre.cl) y el motor de asignación `app.iasapre.cl`.
