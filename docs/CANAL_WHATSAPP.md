# Canal WhatsApp — asistente de asesoría en el número +56 9 5373 0030

> Rol definido por Nico el 13‑oct‑2026 (texto íntegro en `netlify/functions/lib/prompt_whatsapp.js` → `ROL`). Implementado el mismo día como webhook propio sobre **WhatsApp Business Cloud API (Meta)** con número nuevo. Aquí: cómo funciona, cómo ponerlo en marcha y qué se ajustó respecto del texto original.

## Identificadores (configurado el 13‑oct‑2026)
| Qué | Valor |
|---|---|
| App de Meta | IAsapre Orientacion · ID 1445220930900358 · negocio iasapre.cl (675720971680484) |
| Cuenta de WhatsApp Business (WABA) del asistente | IAsapre Orientacion · ID 3415473525288937 (separada de la cuenta "iasapre cl" donde vive el +56 9 8883 0767, que NO está suscrita a esta app) |
| Número / Phone number ID | +56 9 5373 0030 · 1318618498009778 (`WSP_PHONE_NUMBER_ID`) |
| Webhook | https://iasapre-chat.netlify.app/.netlify/functions/whatsapp · verificado y suscrito a `messages` solo para la WABA del asistente |
| Endpoint de asignaciones HTTP | https://iasapre-chat.netlify.app/.netlify/functions/asignar · `Authorization: Bearer <ASIGNAR_SECRET>` · body `{texto}` o `{nombre, telefono, leadId, renta, region, clinica, cargas, contacto}` · `{reiniciar: "<teléfono>"}` borra la conversación guardada de ese número (para repetir una prueba desde cero) |

## Números
| Quién | Número | Rol |
|---|---|---|
| Asistente (este canal) | **+56 9 5373 0030** | número nuevo registrado en la Cloud API; recibe asignaciones y conversa con las personas |
| Plataforma (app.iasapre.cl) | +56 9 8883 0767 | **único** origen válido de asignaciones de leads |
| Especialista (Nico) | +56 9 8538 0357 | recibe las derivaciones ("🔔 Derivación IAsapre") |

## Cómo funciona (código)
```
Meta Cloud API ──POST──▶ netlify/functions/whatsapp.js  (GET = verificación; POST = firma HMAC con WSP_APP_SECRET)
                               │  lib/wsp_api.js  parsearWebhook() → mensajes de texto (ignora estados, imágenes, audios)
                               ▼
                    lib/wsp_agent.js  manejarEntrante(msg, deps)
      ┌──────────────────────────┴───────────────────────────┐
  ¿viene de +56 9 8883 0767 con formato de asignación?    conversación con una persona
  parseAsignacion() → lead {nombre, teléfono, id, …}      store.get(teléfono) → historial + datos del lead
  · ya existía conversación → actualiza datos, no saluda  Claude (claude-opus-5-5, effort low, prompt cacheado,
  · nueva → apertura: plantilla aprobada (WSP_TEMPLATE_INICIO)   contexto del lead, herramienta `derivar` estricta,
    o texto generado por el modelo (solo dentro de 24 h)         fallbacks "default") → texto → guard() → WhatsApp
                                                             si llama a `derivar`: formatDerivacion() → especialista
                                                             (WhatsApp) + LEADS_WEBHOOK/ZAPIER (resumen completo)
                                                             + DISCORD (sin datos de salud) · estado = derivada
```
- **Estado por teléfono** en Netlify Blobs (`lib/store.js`, store `conversaciones`): lead, historial (últimos 40 turnos), derivado. En tests y local sin Blobs usa memoria.
- **Cortafuegos**: cada salida pasa por `guard()` de `public/nico_bot.js` (salud mental nunca como preexistencia). En la derivación, `formatDerivacion()` elimina diagnósticos de salud mental de "Preexistencias".
- **Rechazo del modelo** (`stop_reason: refusal`): se deriva y se responde con un mensaje seguro. **Error de API**: mensaje de reintento; el historial se guarda igual.
- **Notas de voz**: se descargan de la Cloud API (`descargarMedia`), se transcriben con `lib/stt.js` (OpenAI `gpt-4o-mini-transcribe` con `OPENAI_API_KEY`, o Deepgram `nova-3` con `DEEPGRAM_API_KEY`; `STT_PROVIDER`/`STT_MODEL` opcionales) y la transcripción entra como texto de la persona (marcada `audio: true` en el historial). Sin STT configurado o si falla, el bot pide el mensaje por escrito. El audio no se guarda ni se registra.
- **Imágenes, documentos y stickers**: aviso de que solo lee texto o audios. Reacciones y mensajes propios: silencio.
- **`#reiniciar`** enviado desde el número del especialista (+56 9 8538 0357) borra su propia conversación guardada, para repetir pruebas desde cero (también `{reiniciar}` en el endpoint `asignar`).
- **Logs**: solo tipo de evento, acción y si se envió; nunca teléfonos ni textos.
- Tests: `tests/whatsapp.js` (prompt y helpers) y `tests/wsp_agent.js` (agente completo con Claude, WhatsApp y almacén simulados; firma del webhook; avisos). `npm run test:quick` los corre.

## Puesta en marcha (una vez; Nico/Rafa)
1. **Meta for Developers** → crear app tipo *Business* → agregar producto **WhatsApp** → en *API Setup* registrar el número **+56 9 5373 0030** (debe ser un número sin WhatsApp activo; se verifica por SMS/llamada). Anotar **Phone number ID** y **WhatsApp Business Account ID**.
2. **Token permanente**: en Meta Business Settings → *System users* → crear usuario de sistema con rol admin → *Generate token* con permisos `whatsapp_business_messaging` y `whatsapp_business_management` → `WSP_TOKEN`.
3. **App secret**: Meta app → *App settings → Basic → App secret* → `WSP_APP_SECRET`.
4. **Variables en Netlify** (Project configuration → Environment variables): `WSP_TOKEN`, `WSP_PHONE_NUMBER_ID`, `WSP_APP_SECRET`, `WSP_VERIFY_TOKEN` (un texto largo que tú inventas), `ANTHROPIC_API_KEY`; opcionales `WSP_TEMPLATE_INICIO`, `WSP_TEMPLATE_DERIVACION`, `WSP_TEMPLATE_LANG` (es_CL por defecto), `WSP_ESPECIALISTA` (por defecto +56 9 8538 0357), `MODEL_WSP` (por defecto `claude-opus-5-5`), `MODEL_WSP_EFFORT` (low). Netlify Blobs se activa solo (sitio en Netlify con functions). Redeploy.
5. **Webhook**: Meta app → WhatsApp → *Configuration* → Callback URL `https://iasapre-chat.netlify.app/.netlify/functions/whatsapp`, Verify token = `WSP_VERIFY_TOKEN` → *Verify and save* → suscribir el campo **messages**. (No requiere tocar `netlify.toml`; si se quiere la ruta `/api/whatsapp`, agregar un redirect igual que `/api/chat`.)
6. **Plantillas** (Meta → WhatsApp Manager → Message templates, categoría *Utility*, idioma español Chile). Necesarias porque la Cloud API solo permite escribirle a alguien fuera de la ventana de 24 h con una plantilla aprobada:
   - `asesoria_inicio`, cuerpo sugerido: *"Hola {{1}}! Te escribe el asistente de IAsapre porque pediste asesoría sobre tu plan de salud. Es gratis y sin compromiso. ¿Te acomoda que lo veamos por acá?"* → `WSP_TEMPLATE_INICIO=asesoria_inicio`.
   - `derivacion_iasapre`, cuerpo sugerido: *"🔔 Derivación IAsapre · {{1}} · {{2}} · urgencia {{3}} · {{4}}. El resumen completo está en el CRM."* → `WSP_TEMPLATE_DERIVACION=derivacion_iasapre`. Alternativa sin plantilla: que el número del especialista le escriba "ok" al asistente una vez al día (abre ventana de 24 h) o leer las derivaciones en el CRM/Discord.
7. **Plataforma** (Rafa): dos números de la API de WhatsApp **no pueden escribirse entre sí**, así que la asignación por mensaje desde +56 9 8883 0767 probablemente no llegue. Usar el endpoint HTTP `POST /.netlify/functions/asignar` (secreto `ASIGNAR_SECRET`, mismo formato o campos JSON; ver tabla arriba). La ruta por WhatsApp sigue aceptándose si algún día el emisor es un número normal.
8. **Prueba**: mandar una asignación de prueba con tu propio número como lead → debes recibir la apertura; responder → el asistente conversa; escribir "quiero hablar con una persona" → derivación en el WhatsApp del especialista, CRM y Discord. Revisar *Functions → whatsapp* en Netlify para ver los logs (sin datos personales).

## Cómo revisar lo que responde el asistente
Panel de solo lectura: **https://iasapre-chat.netlify.app/.netlify/functions/panel** (usuario `iasapre`, contraseña = `PANEL_SECRET` en Netlify; el navegador la pide una vez). Muestra:
- **Conversaciones**: cada persona (nombre, teléfono, lead de la plataforma si lo hay, estado en asesoría/derivada, turnos, última actividad). Al abrir una, el chat completo con cada respuesta del asistente, hora de Chile, si venía de audio y si el envío falló.
- **Eventos** (`?eventos=1`): registro propio de todo lo que llega al webhook y al endpoint `asignar`: tipo (`conversacion`, `asignacion` abierta/retomada, `asignacion_invalida`, `ignorado` por otro número/sin texto/duplicado, `audio_*`, `reinicio`, `error`), de quién, si se envió respuesta y si derivó. Sirve para saber si una asignación de la plataforma llegó y qué pasó con ella, sin depender de los logs de Netlify (que solo guardan 24 h y no muestran teléfonos).
- Nunca se guardan audios ni texto en el registro de eventos (solo en la conversación). El panel no se cachea ni se indexa.

**Asignaciones por WhatsApp desde +56 9 8883 0767**: como ambos números están en la Cloud API de Meta, los mensajes entre ellos **no se entregan** (limitación de Meta, no del bot): el webhook no recibe nada y por eso el asistente no responde. La vía correcta es el endpoint HTTP `asignar` (tabla de arriba); si alguna vez llega por WhatsApp, el parser ya acepta el formato real de la plataforma (probado con un mensaje real: nombre, lead, renta, región, clínica, cargas).

**Asignar leads en lote** (por ejemplo, los que la plataforma intentó asignar por WhatsApp y nunca llegaron): `ASIGNAR_SECRET=xxx node tools/asignar_lote.js leads.json` (JSON o CSV con nombre, telefono, leadId, renta, region, clinica, cargas, contacto). Cada lead recibe la apertura con la plantilla aprobada `asesoria_inicio`; si ya conversaba, solo se actualizan sus datos.

**Lecciones de la puesta en marcha (13‑oct‑2026)**
- La app de Meta debe estar **publicada** (Publicar → modo activo). Sin publicar, Meta solo entrega webhooks de prueba del panel; los mensajes reales nunca llegan a la función (se perdieron todos los "hola" enviados antes de publicar).
- El token temporal del panel de Meta caduca o se invalida al cambiar la contraseña: la API responde `401 Authentication Error`. Usar siempre el token del **usuario de sistema** "IAsapre Orientacion" (Business Settings → Usuarios del sistema → Generar token). Generarlo requiere que **otro administrador del negocio apruebe la solicitud** (Configuración → Solicitudes).
- Netlify Blobs: `consistency: "strong"` no está disponible en funciones clásicas (`uncachedEdgeURL`); el store usa consistencia eventual.
- Las variables nuevas en Netlify solo se aplican tras un **redeploy** (Deploys → Trigger deploy → Deploy project).
- Suscripción de la WABA a la app: `GET /{WABA_ID}/subscribed_apps` con el Explorador de la API Graph debe listar la app.

- **Funciones en formato moderno** (`export default async (req)` + `lib/moderno.js`): es lo que da a Netlify Blobs consistencia fuerte. En formato clásico las lecturas eran eventuales y, con mensajes seguidos, el bot perdía turnos y repreguntaba (isapre, cargas). Además `store.setConv` fusiona historiales (dos invocaciones en paralelo no se pisan) y el agente ignora reintentos de Meta con el mismo `messageId`.
- **Aviso al especialista**: primero el resumen completo como texto (llega si +56 9 8538 0357 le escribió al asistente en las últimas 24 h; mientras la plantilla no esté aprobada, basta con que Nico le mande "ok" al asistente una vez al día); si rebota, la plantilla `derivacion_iasapre`. Los estados "failed" de Meta quedan en el log (código y título).

**Límites a tener presentes**: tiempo máximo de una función Netlify (10 s por defecto; el agente responde en pocos segundos con effort `low`, pero si hay timeouts subir el plan o mover a función background); el número de pruebas de Meta tiene cuota de 250 conversaciones/día hasta verificar el negocio; Blobs está disponible con functions en cualquier plan.

## Ajustes respecto del texto original de Nico (pequeños, ninguno cambia el flujo)
1. **Usted desde los 60 años**: el rol decía "de tú"; se agregó "con personas de 60 años o más, trátalas de usted", coherente con la decisión del mismo día para el chat web.
2. **Apertura y cierres de Nico** ("Hola <nombre>! ¿Cómo estás?", "cualquier duda me avisas", nunca "¡"): ver `docs/ESTILO_WSP_NICO.md`.
3. **Honestidad explícita** al orientar a comparar: "si su plan actual puede ser su mejor opción, dilo".
4. **Cero cifras sin fuente**: toda cifra/plazo/norma debe estar en la base de conocimiento adjunta; lo que depende de la carátula se dice así.
5. **Identidad**: además de reconocer que es un sistema, "nunca te presentes como Nico ni como una persona".
6. **Privacidad en la derivación**: la salud mental no viaja en el resumen al especialista (Ley 21.331 + regla 4 de `CLAUDE.md`); Discord solo recibe nombre, teléfono, urgencia y link.
7. La palabra **"cacho"** se eliminó también del motor web (`nico_bot.js`), para que la voz sea una sola.
8. La derivación la ejecuta el código (herramienta `derivar`), no el modelo escribiendo a otro número: así el resumen solo puede ir a +56 9 8538 0357 y a los webhooks configurados.

## Reglas que este canal comparte con el resto del proyecto
Salud mental nunca es preexistencia ni restricción · cero cifras sin fuente (`docs/FUENTES_VERIFICADAS.md`) · nada de datos de salud fuera del CRM/especialista · identidad "asistente de IAsapre" · sin "cacho" ni "no rentable" · afiliables → comparar; no afiliables → resolver sin empujar al cambio.
