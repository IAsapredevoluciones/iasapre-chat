# IAsapre · Orientador automático de preexistencias

Módulo que recibe cada lead del formulario de iasapre.cl, detecta si declara preexistencias que **ninguna otra isapre aceptará**, y en ese caso genera en segundos una asesoría escrita que parece de una persona (firma Nico), explica la verdad con cuidado, propone qué sí se puede hacer dentro de su isapre actual (o Fonasa + complementario) y deriva a un ejecutivo humano por WhatsApp **+56 9 8538 0357**. Los demás leads siguen el flujo normal de asignación.

## Qué hay

```
orientador/
├── lib/reglas.js                 # clasificación: no_afiliable / restringible / evaluar / sin_impacto
├── lib/prompt.js                 # instrucciones a Claude (tono Nico, qué decir y qué no) + contexto del lead
├── lib/plantilla.js              # mensaje humanizado SIN IA (respaldo si Claude falla o no hay API key)
├── netlify/functions/orientar.js # endpoint POST /api/orientar
├── data/planes.json              # catálogo opcional de planes por isapre (si está vacío, no inventa planes)
├── test/leads_prueba.json        # 6 casos reales de prueba
├── test/run.js                   # node test/run.js → muestra clasificación y mensaje de cada caso
├── netlify.toml · package.json
```

## Flujo

```
Formulario iasapre.cl ──POST──▶ /api/orientar
                                   │
                        clasificar(detalle_preexistencias, imc)
                                   │
         ┌──── no_afiliable ───────┴──────── restringible / evaluar / sin_impacto ────┐
         ▼                                                                           ▼
  Claude redacta la asesoría                                               accion: "flujo_normal"
  (si falla → plantilla humanizada)                                        → asignar ejecutivo como siempre
         ▼                                                                   (con nota si hay restricción 18 m)
  Respuesta JSON: mensaje, link WhatsApp, nota interna
         ▼
  Enviar al lead por WhatsApp/email (API de WhatsApp o ejecutivo con 1 clic) + registrar en app.iasapre.cl
```

### Criterio de "no afiliable" (práctica de mercado, oct-2026)
Diabetes (1 y 2), cáncer con menos de 5 años desde el alta, obesidad (IMC ≥ 35) o cirugía bariátrica, insuficiencia renal/diálisis, trasplante, VIH, cardiopatía grave (infarto, stent, bypass, insuficiencia cardíaca), cirrosis/hepatitis crónica, enfermedad neurológica grave (EM, Parkinson, ACV), autoinmune activa con biológicos, psiquiátrico mayor (bipolar, esquizofrenia, hospitalización).
"Restringible" (18 meses, 25 % del plan): hipertensión controlada, tiroides, asma, depresión/ansiedad, dislipidemia, embarazo, osteoarticular, apnea, sobrepeso (IMC 30–35).
Detecta la Ley de Olvido Oncológico ("alta hace 7 años") y la baja a "evaluar". Las reglas son regex en `lib/reglas.js`; se ajustan sin tocar el resto.

## Qué dice el mensaje (y qué no)
- Saluda por el nombre, cita 1–2 datos del formulario (comuna, cargas, clínica, renta) → se nota personalizado.
- Dice la verdad sin crudeza: "con lo que declaras, hoy las isapres no te van a aceptar como nueva afiliación; no es personal, es cómo funciona su suscripción" y por qué **no** conviene omitirlo en la Declaración de Salud.
- Propone lo que sí se puede hacer **dentro de su isapre** (cambio de plan en la misma isapre no exige nueva Declaración de Salud y mantiene la cobertura de la preexistencia): ajustar al 7 %, plan preferente en la clínica que usa, revisar cargas y excedentes; recuerda GES/CAEC si aplica. Si está en Fonasa o la renta es baja: Fonasa + seguro complementario, sin forzar isapre.
- Cierra con el ejecutivo humano por WhatsApp +56 9 8538 0357, gratis, con una pregunta corta para que responda.
- Prohibido (en el prompt): "cacho", "rechazada", "riesgo", inventar planes/precios/porcentajes, consejos médicos, tono corporativo.
- Si `data/planes.json` tiene planes reales de su isapre, Claude puede nombrarlos; si no, habla de tipos de alternativa y deja el detalle para la llamada.

## Respuesta del endpoint

```json
{
  "lead_id": 1759..., "nivel": "no_afiliable",
  "hallazgos": [{ "id": "diabetes", "nivel": "no_afiliable", "nombre": "diabetes (tipo 1 o 2)" }],
  "resumen": "Con lo declarado, en la práctica ninguna otra isapre aceptará la afiliación…",
  "accion": "orientacion_automatica",          // o "flujo_normal"
  "derivar_ejecutivo": true,
  "mensaje": "Hola María, te escribe Nico, de IAsapre…",   // listo para WhatsApp
  "generado_por": "claude" | "plantilla",
  "canal_sugerido": "whatsapp" | "email",
  "link_whatsapp_lead": "https://wa.me/56985380357?text=…",       // para botón "Hablar con un ejecutivo"
  "link_whatsapp_ejecutivo": "https://wa.me/569XXXXXXXX?text=…",  // Nico abre y el mensaje ya está escrito
  "nota_interna": "LEAD DE ORIENTACIÓN · diabetes · Isapre actual: Consalud … No asignar a ejecutivo de otra isapre."
}
```

## Conectar con el formulario de iasapre.cl (3 opciones)

**A. Desde el backend del formulario (recomendado).** Donde hoy se procesa el envío del formulario y se genera el "Nuevo Lead Recibido", agregar una llamada:
```js
const r = await fetch("https://chat.iasapre.cl/api/orientar", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Api-Secret": process.env.ORIENTADOR_SECRET },
  body: JSON.stringify({ nombre, edad, email, telefono, isapre, renta, region, comuna, cargas, edad_cargas,
                         preexistencias, detalle_preexistencias, contacto_pref, que_busca, clinica_interes, origen })
});
const o = await r.json();
if (o.accion === "orientacion_automatica") {
  // 1) enviar o.mensaje al lead (WhatsApp API / email) o dejarlo listo para Nico (o.link_whatsapp_ejecutivo)
  // 2) marcar el lead en la plataforma como "lead de orientación", asignado a Nico, con o.nota_interna
} else {
  // flujo normal de asignación; si o.nivel === "restringible", adjuntar o.nota_interna al ejecutivo
}
```
Los nombres de campo son los mismos del "Nuevo Lead Recibido"; cualquier campo extra se ignora.

**B. Sin tocar código del formulario: webhook.** Si el formulario ya dispara un webhook (Zapier/Make/n8n), agregar un paso HTTP POST a `/api/orientar` con el JSON del lead y luego un paso que envíe `mensaje` por WhatsApp (p. ej. 360dialog/Twilio/Meta Cloud API) y cree la fila en app.iasapre.cl.

**C. Automático desde la función.** Definir en Netlify `LEADS_WEBHOOK` (endpoint de app.iasapre.cl que recibe leads) y/o `WHATSAPP_WEBHOOK` (endpoint que envía WhatsApp). La función hace el POST sola con `{ ...respuesta, lead }` cada vez que orienta.

### Dentro de app.iasapre.cl
- Nuevo estado/etiqueta de lead: **"Lead de orientación"** (nunca "cacho" en pantalla ni en mensajes).
- Asignación forzada a Nico (ejecutivo humano del módulo), sin pasar por el ranking por isapre.
- Guardar `mensaje` enviado y `nota_interna` en el historial del lead; botón "Abrir WhatsApp" con `link_whatsapp_ejecutivo`.
- Estos leads van a la bolsa Base como los "+5 leads de orientación", y alimentan la red de referidos.

## Deploy
Mismo patrón que el chatbot: carpeta en el repo `IAsapredevoluciones/iasapre-chat` (copiar `lib/`, `data/`, `netlify/functions/orientar.js` y agregar el redirect de `netlify.toml`), o repo propio conectado a Netlify. Variables de entorno:
- `ANTHROPIC_API_KEY` (obligatoria para la versión con IA; sin ella usa la plantilla humanizada)
- `API_SECRET` (recomendada: el formulario la envía en `X-Api-Secret`)
- `MODEL` (opcional, por defecto `claude-sonnet-4-6`), `LEADS_WEBHOOK`, `WHATSAPP_WEBHOOK` (opcionales)

Probar local: `node test/run.js` (con `ANTHROPIC_API_KEY=… node test/run.js` para ver la versión IA).

## Controles de calidad sugeridos
- Primeras 2 semanas: Nico revisa cada mensaje antes de enviar (la función no envía nada por sí sola salvo que se configuren webhooks).
- Medir: % de leads de orientación que responden "sí", % que llegan a llamada, % que terminan en cambio de plan dentro de su isapre o en Fonasa + complementario.
- Revisar mensualmente `lib/reglas.js` con lo que las isapres estén aceptando o rechazando en la práctica.
