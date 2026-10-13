# Integración app.iasapre.cl → asistente de WhatsApp (brief para Rafa)

**Qué hay que hacer:** cuando en la plataforma se asigne un lead al asesor "Asistente IAsapre" (el número +56 9 5373 0030), en vez de mandarle un WhatsApp hay que llamar a un endpoint HTTP. Motivo: el número del asistente y el de la plataforma (+56 9 8883 0767) están ambos en la Cloud API de Meta, y Meta **no entrega mensajes entre dos números de la Cloud API**; por eso las asignaciones por WhatsApp nunca llegan al bot.

## Endpoint
```
POST https://iasapre-chat.netlify.app/.netlify/functions/asignar
Authorization: Bearer <ASIGNAR_SECRET>      (Nico te lo pasa por un canal privado; nunca en el front ni en el repo)
Content-Type: application/json
```
Llamarlo **desde el servidor** de la plataforma (el secreto no debe viajar al navegador). Hay CORS abierto solo por comodidad para pruebas.

## Cuerpo (JSON)
Opción A, campos sueltos (recomendada):
```json
{
  "nombre": "Camila Rojas",
  "telefono": "+56 9 9015 6640",
  "leadId": "d9b4c2b6-5428-4de7-840d-3e41a6cec763",
  "renta": "$1.900.000",
  "region": "Metropolitana de Santiago",
  "clinica": "Clínica Alemana",
  "cargas": "No",
  "contacto": "WhatsApp"
}
```
Campos opcionales que el bot aprovecha para no repreguntar (mandar los que existan): `"edad"`, `"isapre"` (Isapre/previsión actual), `"comuna"`, `"preexistencias"` (detalle del formulario), `"tipo"` ("Orientación" / "Afiliable"), `"resumen"` (el "Resumen original del formulario" completo).

`nombre` y `telefono` son obligatorios; el resto, si no existe, mandar `"No informado"` o omitir. El teléfono acepta cualquier formato (se quedan solo los dígitos; debe incluir 56 9…).

Opción B, el mismo texto que hoy se manda por WhatsApp:
```json
{ "texto": "Hola Asesoría IAsapre, tienes un nuevo lead asignado para gestión.\n\nCamila Rojas\nRenta imponible: $1.900.000\nRegión: Metropolitana de Santiago\nClínica de preferencia: Clínica Alemana\nCargas familiares: No\nPreferencia de contacto: WhatsApp\n\n💬 Contacto rápido: https://wa.me/56990156640?text=Hola%20Camila\n📋 Gestión en la plataforma: https://app.iasapre.cl/?lead=d9b4c2b6-5428-4de7-840d-3e41a6cec763" }
```
Las líneas "Contacto rápido" (link wa.me con el teléfono) y "Gestión en la plataforma" (link con `?lead=`) son las que se usan para sacar teléfono e ID.

## Respuestas
| HTTP | Cuerpo | Significado |
|---|---|---|
| 200 | `{"ok":true,"tipo":"asignacion","accion":"abierta","enviado":true}` | lead nuevo: el bot le mandó la apertura por WhatsApp (plantilla aprobada `asesoria_inicio`) |
| 200 | `{"ok":true,"tipo":"asignacion","accion":"retomada"}` | la persona ya conversaba con el bot: se actualizaron sus datos, sin saludar de nuevo |
| 200 | `{"ok":true,"tipo":"asignacion","accion":"abierta","enviado":false}` | se registró, pero WhatsApp rechazó el envío (número inválido, sin WhatsApp, etc.); reintentar más tarde o avisar |
| 400 | `{"error":"Falta el teléfono del lead…"}` / `JSON inválido` | corregir el cuerpo |
| 401 | `{"error":"No autorizado"}` | secreto incorrecto |
| 422 | `{"ok":false,"tipo":"asignacion_invalida"}` | el texto no tiene el formato esperado |
| 500 | `{"error":…}` | error interno; reintentar con backoff (es idempotente: repetir no duplica saludos) |

## Comportamiento posterior (no requiere nada de la plataforma)
- El bot conversa con la persona, valida datos y asesora. Cuando corresponde, deriva al especialista (+56 9 8538 0357) con un resumen por WhatsApp. Si la plataforma quiere recibir también esa derivación, Nico puede configurar `LEADS_WEBHOOK` en Netlify: el bot hará `POST` con `{stage:"derivacion_wsp", source:"whatsapp", name, phone, lead_id, urgencia, resumen, timestamp}` a la URL que indiquen.
- Para pruebas: `{"reiniciar":"+56 9 XXXX XXXX"}` con el mismo secreto borra la conversación guardada de ese número y permite repetir el flujo desde cero.
- Todo lo que llega queda visible en el panel https://iasapre-chat.netlify.app/.netlify/functions/panel (pestaña Eventos: tipo `asignacion` abierta/retomada, origen `app.iasapre.cl`).

## Prueba rápida desde una terminal
```bash
curl -s -X POST https://iasapre-chat.netlify.app/.netlify/functions/asignar \
  -H "Authorization: Bearer $ASIGNAR_SECRET" -H "Content-Type: application/json" \
  -d '{"nombre":"Prueba Rafa","telefono":"+56 9 XXXX XXXX","leadId":"test-1","renta":"$1.500.000","region":"RM","clinica":"Clínica Alemana","cargas":"No","contacto":"WhatsApp"}'
```
Debe responder `{"ok":true,"tipo":"asignacion","accion":"abierta","enviado":true}` y el número de prueba recibe el mensaje de apertura.
