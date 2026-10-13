# Arquitectura de NicoBot

## Capas de `public/nico_bot.js`
1. **Utilidades**: `norm()` (minúsculas, sin tildes, TYPO: "keria", "q", "wena"…), `lev()` Levenshtein, `hablado()` (números dichos en palabras → cifras: "un millón trescientos", "doscientas mil lucas"), `num()/montos()` (renta, pago; "2 palos", "320 lucas").
2. **Datos**: `ISAPRES` (grupo, red, extra, dental), `PROS` (pros/"ojo" por isapre), `CLIN_ISA` (clínica → isapres con convenios; `*` = dueña verificada), `REGIONES`, `CONDS` (condiciones no afiliables), `REGLAS` de clasificación.
3. **Clasificación** `clasificar(texto)`: devuelve `{nivel, hallazgos[], resumen}`. Incluye Ley de Olvido Oncológico (≥5 años → baja a "evaluar") y salud mental → `protegido` (no se declara).
4. **Perfil y cálculos**: `perfil(lead)`, `siete()` (7 % con tope `TOPE_UF` × `UF`), `tramo()` Fonasa (ingreso mínimo $553.553; C = ×1,46; con ≥3 cargas baja un tramo), `gesCopago()`.
5. **Mensajes iniciales** `start()` → burbujas según tipo (`startAfiliable`, `startOtro`, no afiliable…). Una pregunta a la vez (`faltante()`: clínica → renta → cargas).
6. **Respuestas**: `D.*` (dinámicas), `EXT` (textos largos: urgencia, grupos, superintendencia, CAEC, GES, Ricarte Soto…), `KB_OFF` (offline, 55 temas; función `KBR(id)`).
7. **Intenciones** `INT[]`: `{id, k:[keywords], f:(p,q)=>respuesta, w:peso}`. Puntaje = `score(q,k)*w + concept(q,id)`. `concept()` aplica **reglas de contexto** (suma/resta puntos según palabras: p. ej. "de quien es" favorece `grupos` y penaliza `mejor_clinica`).
8. **`reply()`**: ver pipeline en `CLAUDE.md §5`. Estado de sesión `S`: `p` (perfil), `pending` (qué se ofreció), `need` (qué dato se pidió), `topics`, `comparacion`, `escalo`, `familia`, `turn`, `lastQ`.
9. **Salida**: `guard()` (cortafuegos salud mental) → `humanizar()` (variación de CTA, sin exclamaciones sobrantes, partir burbujas largas).
10. **Leads**: `lead()` (tier: `caliente`, `tibio_alto`, `tibio`, `familiar`, `orientacion_insiste`, `orientacion_resuelto`; score 0‑100), `handoff()` (resumen para el ejecutivo, sin salud mental), `waTexto()` (mensaje de WhatsApp sin datos de salud).

## Cómo agregar una intención (receta)
1. Escribir 5‑10 frases reales (con typos/audio) en un set NUEVO (`tests/blind5.js`) y medir **antes** de tocar nada.
2. Crear el texto (en `EXT` si es largo y verificado; en `D.*` si usa el perfil; en `kb_offline.js` si es conocimiento estático). **Cada cifra con fuente** → `docs/FUENTES_VERIFICADAS.md`.
3. Añadir `{id, k:[…], f, w}` en `INT` (antes de `{id:"saludo"}`; el orden desempata).
4. Si roba o pierde preguntas de otra intención, añadir regla en `concept()` (usar `_dbg("frase")` para ver puntajes).
5. Mover los casos al set de regresión, correr `npm test`, y si corrigió un dato, añadir el patrón antiguo a `audit_sweep.js` (PROHIBIDO).

## Landing `public/orientador.html`
Formulario (mismos campos que iasapre.cl) → `NicoBot.start()`; chat con autoscroll, chips, indicador "escribiendo", **voz** (Web Speech API `es-CL`; en navegadores sin soporte, p. ej. Instagram in‑app, sugiere dictado del teclado), panel de depuración (quitar para producción o esconder tras `?debug=1`), traspaso de leads (`notify`, `payload`, `idle`), `motorExterno()` (llama a `/.netlify/functions/chat` solo si el motor responde `no_entendi` y hay API key; la salida pasa por `NicoBot.guard`).
