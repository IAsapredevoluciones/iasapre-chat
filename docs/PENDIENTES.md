# Pendientes priorizados (con criterio de aceptación)

## P0 — esta semana (bloquean conversión)
1. **Desplegar v6** (`docs/GUIA_DEPLOY.md`). *Estado 13‑oct:* sitio nuevo `iasapre-chat` creado en Netlify (equipo IAsapredevoluciones) conectado a GitHub; despliega lo que haya en `main`. **Falta `git push origin main`** desde la máquina de Nico. *Aceptación:* `npm run smoke` en verde contra https://iasapre-chat.netlify.app. Después: apuntar iasapre.cl / chat.iasapre.cl al sitio nuevo (Rafa) y retirar el antiguo.
2. **Destino de leads:** crear `DISCORD_WEBHOOK` (alertas) y `LEADS_WEBHOOK` (Make/Zapier → planilla/CRM) en Netlify. *Aceptación:* un lead de prueba aparece en Discord y en la planilla; el detalle de salud **no** está en Discord.
3. **Responsable de respuesta < 5 min** a leads `caliente` (humano, definir con Nico) y ajustar el texto "normalmente el mismo día hábil".
4. ✅ **Ocultar el panel de depuración** en producción (solo con `?debug=1`; test `ui_debug.js`).

**Decisiones de estilo resueltas por Nico (13‑oct‑2026):** usted desde los 60 años ✅ implementado (`usted.js`); ortografía con tildes se mantiene ✅; Calendly `calendly.com/nico-iasapre/30min` vigente ✅.

## P0b — Canal WhatsApp (rol definido 13‑oct‑2026, `docs/CANAL_WHATSAPP.md`)
- ✅ Agente implementado como webhook propio (`whatsapp.js`, Cloud API de Meta, número +56 9 5373 0030). **Falta la puesta en marcha** (Nico/Rafa, pasos en `docs/CANAL_WHATSAPP.md`): app en Meta for Developers, registrar el número, token permanente, `WSP_*` en Netlify, webhook, plantillas `asesoria_inicio` y `derivacion_iasapre` aprobadas, y que app.iasapre.cl envíe las asignaciones desde +56 9 8883 0767 al +56 9 5373 0030. Probar con un lead de prueba y `npm run smoke`.

## P1 — próximas 2 semanas
5. **Conectar el formulario de iasapre.cl** al flujo (opciones: iframe/enlace a `/orientador`, o `modules/orientador/netlify/functions/orientar.js`). Cuidar nombres de lib (hay `lib/prompt.js` en dos lugares → renombrar el del módulo).
6. **app.iasapre.cl** (Rafa): nuevo estado "Lead de orientación", botón "Abrir WhatsApp", guardar `resumen` y `nota_interna`.
7. **ANTHROPIC_API_KEY** + prueba real de `chat.js` (✅ guard server‑side aplicado, test `chat_guard.js`; falta la API key y límites de costo/rate limit).
8. **Centro de ayuda de la raíz (`/`)**: sigue diciendo que salud mental es cobertura restringida (es un sitio estático separado, proxy a tangerine‑khapse‑1f7965.netlify.app). Corregir y alinear con la KB.
9. ✅ **UF dinámica** (mindicador.cl, caché diaria, fallback 41.000; tests `uf.js` y `ui_uf.js`). Pendiente: actualizar tramos Fonasa/tope imponible por año.
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

## Canal WhatsApp (13‑oct‑2026, tras la puesta en marcha)
- [ ] Rod Burgos o Rafael Leyton aprueban la solicitud de token (Meta Business Suite → Configuración → Solicitudes); luego generar el token del usuario de sistema "IAsapre Orientacion" (Usuarios del sistema → Generar token, app IAsapre Orientacion, permisos `whatsapp_business_messaging` + `whatsapp_business_management`, sin caducidad) y reemplazar `WSP_TOKEN` en Netlify (el actual es un token de usuario que vence el 12‑12‑2026) + Trigger deploy.
- [ ] Rotar `ANTHROPIC_API_KEY` (la primera clave se pegó por error en la terminal) y borrar la vieja en Claude Platform → API keys.
- [ ] Rafa: app.iasapre.cl llama a `POST https://iasapre-chat.netlify.app/.netlify/functions/asignar` con `Authorization: Bearer <ASIGNAR_SECRET>` al asignar un lead (campos o `texto`).
- [ ] Plantillas `asesoria_inicio` y `derivacion_iasapre` en revisión en Meta; verificación del negocio para mensajes iniciados por la empresa; nombre visible "IAsapre Orientacion" en revisión.
- [ ] Probar derivación real ("quiero hablar con una persona") y revisar el aviso en +56 9 8538 0357 (llega por plantilla cuando esté aprobada; mientras, por LEADS_WEBHOOK/Discord si se configuran).
- [ ] Créditos de Claude Platform: reclamar los USD 200 del plan Max cada mes (Billing) o agregar tarjeta; límite de gasto mensual USD 500.
- [ ] Audios: crear clave en https://platform.openai.com/api-keys (o Deepgram) y cargar `OPENAI_API_KEY` en Netlify + Trigger deploy; sin eso el bot pide el mensaje por escrito.
- [ ] Panel: cargar `PANEL_SECRET` (contraseña que tú elijas) en Netlify + Trigger deploy; luego entrar a https://iasapre-chat.netlify.app/.netlify/functions/panel con usuario `iasapre`.
- [ ] Rafa: las asignaciones por WhatsApp entre los dos números de la Cloud API no se entregan; usar el endpoint `asignar`.
- [ ] **Netlify sin créditos (13-oct, 15:30)**: el plan Free da 300 créditos/mes y cada deploy de producción cuesta 15; los 20 deploys de hoy los agotaron. El sitio publicado (v6.9) sigue en línea con 30 créditos operativos, pero **no se publica nada nuevo hasta el 11-nov o hasta pasar a un plan pagado** (Team → Usage & billing → Upgrade). v6.10 (panel + registro de eventos) quedó en `main` sin desplegar. Regla desde ahora: agrupar cambios y desplegar pocas veces.
