# Pendientes priorizados (con criterio de aceptación)

## P0 — esta semana (bloquean conversión)
1. **Desplegar v6** (`docs/GUIA_DEPLOY.md`). *Aceptación:* `https://iasapre.netlify.app/nico_bot.js` contiene `handoff` y `urgencia_ley`; `npm test` verde contra producción (agregar test de humo remoto).
2. **Destino de leads:** crear `DISCORD_WEBHOOK` (alertas) y `LEADS_WEBHOOK` (Make/Zapier → planilla/CRM) en Netlify. *Aceptación:* un lead de prueba aparece en Discord y en la planilla; el detalle de salud **no** está en Discord.
3. **Responsable de respuesta < 5 min** a leads `caliente` (humano, definir con Nico) y ajustar el texto "normalmente el mismo día hábil".
4. **Ocultar el panel de depuración** en producción (mostrar solo con `?debug=1`).

## P1 — próximas 2 semanas
5. **Conectar el formulario de iasapre.cl** al flujo (opciones: iframe/enlace a `/orientador`, o `modules/orientador/netlify/functions/orientar.js`). Cuidar nombres de lib (hay `lib/prompt.js` en dos lugares → renombrar el del módulo).
6. **app.iasapre.cl** (Rafa): nuevo estado "Lead de orientación", botón "Abrir WhatsApp", guardar `resumen` y `nota_interna`.
7. **ANTHROPIC_API_KEY** + prueba de `chat.js` con guard server‑side (hoy el guard se aplica en el cliente; moverlo también al servidor) y límites de costo/rate limit.
8. **Centro de ayuda de la raíz (`/`)**: sigue diciendo que salud mental es cobertura restringida (es un sitio estático separado, proxy a tangerine‑khapse‑1f7965.netlify.app). Corregir y alinear con la KB.
9. **UF dinámica**: hoy `UF=41000` constante. Usar `https://mindicador.cl/api/uf` con caché y fallback; actualizar tramos Fonasa/tope imponible por año.
10. **Verificar lo "NO verificado"** de `FUENTES_VERIFICADAS.md` (cobertura mínima legal, convenios, Ley 21.656, seguros).
11. **Cargar fichas v2** de Vida Tres, Nueva Masvida, Esencial en `ISAPRES/PROS` y `planes.json` (extractor pdfplumber de carátulas).
12. **CNAME `chat.iasapre.cl` → iasapre.netlify.app** (Rafa, Nebox).

## P2 — mejora continua
13. **Voz real:** probar en iPhone/Android/Chrome con micrófono; fallback con **Whisper** (o API de transcripción) para navegadores sin Web Speech (Instagram in‑app). Medir tasa de error en es‑CL.
14. **Analítica de producto:** eventos anónimos (`form`, `primer_mensaje`, `comparar_oferta`, `comparacion_pedida`, `wa_click`, `no_entendi`) + tablero; medir *chat→lead calificado*, *handoff rate*, *tiempo a primera respuesta*, *no_entendi por frase*.
15. **Aprender de conversaciones reales** (con consentimiento): exportar frases `no_entendi` → set a ciegas nuevo → mejorar intents. Meta: ≥ 90 % de comprensión real.
16. **Seguimiento por WhatsApp** (plantillas aprobadas / Click‑to‑WhatsApp) para quienes piden comparación y no responden; secuencia de 2 recordatorios.
17. **A/B de textos** de apertura y CTA (afiliables): medir `comparacion_pedida / formularios`.
18. **Refactor**: partir `nico_bot.js` en módulos (datos / clasificación / respuestas / motor) con build simple a un solo archivo; tipado con JSDoc; tests con `node:test`.
19. **Accesibilidad y móvil:** contraste, tamaño táctil, `aria-live` en el chat, probar teclado virtual iOS.
20. **Cumplimiento de datos (Ley 19.628 / 21.719):** política de privacidad enlazada, casilla de consentimiento explícita antes de enviar datos de salud, retención y borrado.

## Ideas de optimización investigadas (fuente: guías de lead‑qualification 2026)
- Responder en **< 5 min** (ventaja grande en conversión; cifras de proveedores, variables).
- **Traspaso con contexto completo** (el ejecutivo no repite preguntas) ✔ implementado.
- **Valor antes de pedir datos**, 2‑4 preguntas de calificación máximo ✔ (calificación una a una).
- **Ramificar por señales de intención**, no solo por palabras clave ✔ (tiers/score).
- **No abandonar tras un mensaje sin respuesta** ✔ re‑enganche (extender a WhatsApp).
- Medir por **lead calificado**, no por clics.
