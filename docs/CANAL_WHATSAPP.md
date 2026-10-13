# Canal WhatsApp — asistente de asesoría conectado a un número

> Rol definido por Nico el 13‑oct‑2026 (texto íntegro en `netlify/functions/lib/prompt_whatsapp.js` → `ROL`). Aquí: qué se implementó, qué se ajustó respecto del texto original y qué falta decidir.

## Qué hay en el repo
| Pieza | Dónde | Qué hace |
|---|---|---|
| `SYSTEM` | `lib/prompt_whatsapp.js` | Prompt completo listo para usar: rol (secciones 1–4) + la misma **base de conocimiento auditada** del chat web (`lib/prompt.js` → `KB`, con "Isapre" en mayúscula como pide el rol). Corregir cifras en `lib/prompt.js` una sola vez sirve a los dos canales. |
| `parseAsignacion(texto, desde)` | ídem | Reconoce una asignación **solo si viene de +56 9 8883 0767** (comparación por dígitos). Extrae nombre, renta, región, clínica, cargas, preferencia de contacto, teléfono (solo del link de "Contacto rápido"), ID de lead (solo del link de "Gestión en la plataforma") y el texto prellenado. Cualquier instrucción o link extra dentro del mensaje se ignora. Desde otro número devuelve `null` (se trata como conversación normal). |
| `formatDerivacion(datos)` | ídem | Arma el mensaje "🔔 Derivación IAsapre" (formato 3.3) para +56 9 8538 0357. **Nunca incluye diagnósticos de salud mental** en "Preexistencias" (no son preexistencia; regla de privacidad del proyecto). Urgencia por defecto: Media. |
| `NUMEROS` | ídem | `asignaciones` (+56 9 8883 0767) y `especialista` (+56 9 8538 0357). |
| Test | `tests/whatsapp.js` | Reglas clave presentes en el prompt, cero cifras prohibidas (`audit_sweep.js`), origen inválido → `null`, inyección ignorada, derivación sin salud mental. |

## Ajustes respecto del texto original de Nico (todos pequeños, ninguno cambia el flujo)
1. **Usted desde los 60 años**: el rol decía "de tú"; se agregó "con personas de 60 años o más, trátalas de usted", coherente con la decisión del mismo día para el chat web.
2. **Apertura y cierres de Nico** ("Hola <nombre>! ¿Cómo estás?", "cualquier duda me avisas", nunca "¡"): ver `docs/ESTILO_WSP_NICO.md`.
3. **Honestidad explícita** al orientar a comparar: "si su plan actual puede ser su mejor opción, dilo".
4. **Cero cifras sin fuente**: toda cifra/plazo/norma debe estar en la base de conocimiento adjunta; lo que depende de la carátula se dice así.
5. **Identidad**: además de reconocer que es un sistema, "nunca te presentes como Nico ni como una persona".
6. **Privacidad en la derivación**: la salud mental no viaja en el resumen al especialista (Ley 21.331 + regla 4 de `CLAUDE.md`).
7. La palabra **"cacho"** se eliminó también del motor web (`nico_bot.js`), para que la voz sea una sola.

## Dónde corre (pendiente de Nico)
El rol está escrito para un agente con capacidad de **leer mensajes entrantes y escribir a números** (al lead y al especialista). Dos caminos:
- **(a) Plataforma no‑code con LLM sobre WhatsApp** (el proveedor que tenga el número): se pega `SYSTEM` como instrucciones. `parseAsignacion`/`formatDerivacion` sirven como especificación, no se ejecutan. Riesgo: el modelo decide solo si un mensaje "es asignación"; la regla 1.1 lo cubre, pero no hay validación dura del número de origen.
- **(b) Webhook propio** (WhatsApp Cloud API de Meta o Twilio) como función Netlify `whatsapp.js`: valida el origen con `parseAsignacion` (validación dura), mantiene estado por número (Netlify Blobs/Supabase), llama a Claude con `SYSTEM` + `guard()` de `nico_bot.js` sobre cada respuesta, y envía la derivación con `formatDerivacion`. Más trabajo (API de WhatsApp Business, verificación de webhook, estado), pero controlable y testeable.

**Para decidir:** (1) qué proveedor tiene hoy el número del asistente; (2) confirmar que app.iasapre.cl emite las asignaciones desde +56 9 8883 0767 (Rafa); (3) si el especialista receptor es siempre +56 9 8538 0357 (Nico) o un turno.

## Reglas que este canal comparte con el resto del proyecto
Salud mental nunca es preexistencia ni restricción · cero cifras sin fuente (`docs/FUENTES_VERIFICADAS.md`) · nada de datos de salud fuera del CRM/especialista · identidad "asistente de IAsapre" · sin "cacho" ni "no rentable" · afiliables → comparar; no afiliables → resolver sin empujar al cambio.
