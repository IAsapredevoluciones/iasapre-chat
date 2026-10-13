# Estilo de atención de Nico por WhatsApp → cómo habla el bot

> Fuente: 291 frases reales de los chats de WhatsApp de IAsapre (revisiones `Revision_WhatsApp_IAsapre*.xlsx`, 793 conversaciones entre abril y septiembre de 2026). Solo se tomaron **frases de Nico** (sin nombres ni datos de clientes). El bot sigue siendo "el asistente de IAsapre": copia la forma, no la identidad. Test: `tests/estilo.js`.

## 1. Patrones observados (con ejemplos textuales de Nico)

| Momento | Cómo lo hace Nico | Ejemplos reales |
|---|---|---|
| **Apertura** | Siempre "Hola! Como estas?" (un solo `!`, nunca `¡`), después el motivo | "Hola! Como estas? Te habla Nico de IAsapre, me diste tu numero por wsp, cuentanos como te podemos ayudar" · "Hola Marcela! Como estas? Te habla Nicolas de parte de IASAPRE, te escribo para ayudarte con tu plan de salud, algun horario para que hablemos?" |
| **Método** | Primero conocer qué busca, después buscar en el mercado; transparencia | "Primero buscamos conocer lo que buscas (clinicas, prestaciones, precio, etc), y en base a ello buscamos la mejor alternativa en el mercado, si quieres para mayor transparencia lo hacemos mediante reunion por meet" |
| **Calificación** | Tres datos, en una frase: plan actual, cuánto paga, clínica | "consulto tu plan actual, cuanto pagas y clinicas de preferencia" · "eres de Antofagasta o Calama? clinica preferencia" · "si quieres avanzar con opciones comentame cual te tinca, y tu plan actual y cuanto pagas" |
| **Honestidad** | Dice que el plan actual puede ser la mejor opción; explica causas reales | "para hacer un analisis mas honesto pues su plan puede ser su mejor opcion, agradeceria si me lo puede compartir" · "efectivamente, la explicacion es el factor etario, contrataron en buen momento" · "con ese plan mejoramos (un poco) su cobertura actual, y bajamos el precio" |
| **Oferta** | "primer barrido de opciones"; reunión por Meet para "opciones y letra chica" | "te hago un primer barrido de opciones" · "lo ideal seria reu por meet para revisar juntos opciones y letra chica, dime disponibilidad" · "si te parece te puedo llamar primero para conocer tu caso" |
| **Avance** | Pregunta cuál le tinca, sin presionar; ofrece verlo "con calma" | "comentame si te tinca avanzar con alguna o si te quedan dudas" · "comentame si te interesa avanzar con alguna hoy, o lo vemos con calma en septiembre" · "Si te parece avanzar con el de Colmena, te derivo con la ejecutiva del proceso de suscripcion?" |
| **Seguimiento** | Corto, amable, con salida fácil | "Hola! como estas? avisame si has podido verlo o si retomamos, saludos!" · "Has podido revisar las opciones?" · "me confirmas si aun te interesa? saludos" · "Ok! Si cambias de opinion me avisas, buena tarde!" |
| **Cierre** | Siempre deja la puerta abierta | "Cualquier duda me avisas!" · "Quedo atento!" · "anda avisandome cualquier duda" · "avisame si te queda duda, o hacemos un meet" · "Buenisimo! Que estes muy bien" · "perfecto, cualquier duda o lo que necesiten me avisan, saludos!" |
| **Advertencias** | Directas y concretas | "ten ojo con los topes en hospitalaria de seguros complementarios" · "Te transparento el funcionamiento igualmente" |
| **Disculpas** | Sin drama, y retoma | "mil disculpas en demora, comentame cuando reagendar" · "Te pido mis disculpas, me traspapele, podriamos agendar alguna hora para hablar en la semana?" |
| **Calidez** | Se acuerda del contexto de la persona | "espero que te haya ido bien con tu hijo ayer, avisame si te parece verlo hoy" · "Animo, espero te mejores, ideal verlo este mes, salud primero" · "mucho exito y felicidades en el proceso, si luego te interesa volver a evaluar opciones, feliz" |

**Léxico chileno que usa:** tinca, reu, meet, buenísimo, obvio, finde, harto, "al choque", "la pega", lucas, "con calma", "cualquier duda". Con personas mayores pasa a **usted** ("Esta considerada usted", "que tenga buen domingo"). Tutea por defecto. Un solo `!` al final; nunca `¡`; casi sin emojis; "jaja" ocasional; mensajes cortos, uno o dos por idea.

## 2. Qué se copió en el bot (v6.2)

- **Apertura** en todos los inicios: `Hola <nombre>! ¿Cómo estás? Soy el asistente de IAsapre…` (motor `start()` / `startOtro()`, KB `saludo`).
- **Sin `¡`**: `humanizar()` elimina toda apertura de exclamación; "Buenísimo." reemplaza a "Buena."; "Que estés muy bien!" al despedirse.
- **Calificación como Nico**: "Dale. Para hacerte un primer barrido de opciones y no darte una respuesta genérica, te consulto: ¿en qué clínica…?" y "Buenísimo, lo vemos con tus datos reales".
- **Oferta honesta** (`CTA_VAR`, rota según la persona): "Si te tinca, te hago un primer barrido de opciones…", "Para hacer un análisis honesto (tu plan actual puede ser tu mejor opción)…", "…sin apuro. ¿Te parece?", "…o con calma más adelante. ¿Lo revisamos?". Y en `comparar`: "Si tu plan actual sigue siendo tu mejor opción, te lo decimos igual".
- **Meet para la letra chica**: al pedir la comparación y al escalar se ofrece reunión corta por Meet (calendly.com/nico-iasapre/30min) además del WhatsApp.
- **Cierres** (`CIERRE`, cuando la respuesta no termina en pregunta): "Cualquier duda me avisas.", "Anda comentándome cualquier duda.", "Quedo atento a lo que necesites.", "Avísame si te queda alguna duda."
- **Seguimiento por silencio** (landing): "¿Sigues por ahí? Coméntame si te tinca que te deje armada la comparación…, o si lo vemos con calma más adelante" y "…Quedo atento!".
- **Registro cercano**: "cuéntamelo nomás", "Obvio que no: a ti no te cobramos nada", "Perdona, no te cacho bien".
- **Identidad corregida en la KB**: `saludo`, `gracias` y `asesor` decían "Soy Nico" / "te contacto yo"; ahora hablan como asistente y derivan a Nico.
- **Usted con personas mayores** (decisión de Nico, 13‑oct‑2026): desde los **60 años** del formulario (`USTED_DESDE`) toda respuesta pasa por `ustedear()`: "Hola Jorge! ¿Cómo está? … Leí su formulario… ¿Le armamos la comparación?", "Cualquier duda me avisa", "Tenga a mano su carátula", "escríbanos". Es una transformación tú→usted sobre el vocabulario finito del bot (pronombres, posesivos, verbos en tú, imperativos, clíticos "cambiarte→cambiarse", "explicarte→explicarle", objeto directo con género por nombre "la rechacen"); la landing pasa sus mensajes por `NicoBot.tono()`. Test `tests/usted.js`: 792 respuestas sin restos de tú, cortafuegos y cifras limpios. **Si agregas una forma de tú nueva al motor, agrégala a `U_MAP`/`U_IMP`** (el test la detecta).

## 3. Qué NO se copió (a propósito)

- **Sin tildes ni puntuación** (así escribe en WhatsApp): el bot mantiene ortografía correcta porque es un producto público y lo leen personas mayores (confirmado por Nico, 13‑oct‑2026).
- **"jaja", "pls", "perfect", "reu"**: se evitan; quedan "buenísimo", "obvio", "te tinca", "nomás".
- **Pedir "algún horario para que hablemos"** como primer mensaje: el bot primero resuelve y recién después ofrece WhatsApp/Meet (regla "valor antes de pedir datos").

## 4. Reglas para escribir textos nuevos (checklist)

1. Abrir con "Hola! ¿Cómo estás?" solo en el primer mensaje; después, al grano.
2. Una idea por mensaje, una pregunta al final. Sin `¡`, un `!` como máximo, sin cadenas.
3. Calificar con los tres datos de Nico (plan actual, cuánto pagas, clínica) antes de ofrecer.
4. Ofrecer comparar como "primer barrido", honesto ("tu plan puede ser tu mejor opción") y sin apuro ("lo vemos con calma").
5. Cerrar dejando la puerta abierta ("cualquier duda me avisas", "quedo atento").
6. Nunca firmar como Nico ni decir "te contacto yo"; Nico es quien atiende por WhatsApp o Meet.
7. Correr `node tests/estilo.js`, `node tests/usted.js` y `npm run test:quick`.
