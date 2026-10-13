# Despliegue (con Claude Code se simplifica: `git push`)
Repo público `IAsapredevoluciones/iasapre-chat`, rama `main`. Netlify (sitio **`iasapre-chat`**, https://iasapre-chat.netlify.app, equipo IAsapredevoluciones) despliega solo al hacer push; `publish = public`, funciones en `netlify/functions`. El sitio antiguo `iasapre` (iasapre.netlify.app, v3) está en otra cuenta Netlify sin acceso.

```bash
git clone https://github.com/IAsapredevoluciones/iasapre-chat.git && cd iasapre-chat
# copiar el contenido de este paquete sobre el repo (misma estructura: public/, netlify/, tests/, docs/, modules/, CLAUDE.md, package.json…)
npm install && npm test            # debe quedar 15/15 en verde
git add -A && git commit -m "v6: auditoría de datos, traspaso de leads, voz, tests" && git push origin main
```
**Verificación post‑deploy:**
```bash
npm run smoke   # descarga el motor publicado y corre contra él los barridos de salud mental y cifras + marcadores v6
curl -s https://iasapre-chat.netlify.app/nico_bot.js | grep -c "urgencia_ley"   # ≥1
curl -s https://iasapre-chat.netlify.app/orientador | grep -c "notify("          # ≥1
```
**Variables de entorno (Netlify → Project configuration → Environment variables):**
| Variable | Para qué | Estado |
|---|---|---|
| `DISCORD_WEBHOOK` | alertas instantáneas de leads (sin datos de salud) | **pendiente** |
| `LEADS_WEBHOOK` / `ZAPIER_WEBHOOK` | CRM/planilla con resumen completo | **pendiente** |
| `ANTHROPIC_API_KEY` | fallback `chat.js` (opcional) | **pendiente (la pega Nico)** |
| `MODEL`, `API_SECRET` | opcionales | — |
| `WSP_TOKEN`, `WSP_PHONE_NUMBER_ID`, `WSP_APP_SECRET`, `WSP_VERIFY_TOKEN` | webhook del asistente de WhatsApp (+56 9 5373 0030), ver `docs/CANAL_WHATSAPP.md` | **pendiente** |
| `WSP_TEMPLATE_INICIO`, `WSP_TEMPLATE_DERIVACION`, `WSP_TEMPLATE_LANG`, `WSP_ESPECIALISTA`, `MODEL_WSP`, `MODEL_WSP_EFFORT` | plantillas aprobadas y ajustes del agente (opcionales) | — |
| `OPENAI_API_KEY` (o `DEEPGRAM_API_KEY`), `STT_PROVIDER`, `STT_MODEL` | transcripción de notas de voz de WhatsApp (`lib/stt.js`); sin clave el bot pide el mensaje por escrito | **pendiente (la pega Nico)** |
| `ASIGNAR_SECRET` | secreto del endpoint HTTP de asignaciones (`/.netlify/functions/asignar`) que usa app.iasapre.cl | ✅ cargado 13‑oct |

Prueba manual del backend:
```bash
curl -s -X POST https://iasapre-chat.netlify.app/.netlify/functions/contact -H 'Content-Type: application/json' \
 -d '{"name":"Prueba","phone":"+56912345678","stage":"form","tier":"tibio"}'
```
**Cuidado:** `netlify.toml` tiene un redirect catch‑all (`/*`) a un sitio estático antiguo con `force=false`; los archivos de `public/` tienen prioridad. No agregar archivos que oculten `/` sin revisar el centro de ayuda.
