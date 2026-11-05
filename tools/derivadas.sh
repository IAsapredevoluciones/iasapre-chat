#!/bin/zsh
# Lista de conversaciones derivadas del asistente (JSON sin resúmenes ni datos de salud), para la revisión programada
# que reasigna esos leads en app.iasapre.cl. Lee el token de solo lectura del Llavero de macOS (servicio "iasapre-revision"),
# que Nico guarda una vez con:  security add-generic-password -a iasapre -s iasapre-revision -w
# (pide el valor; es el mismo que REVISION_TOKEN en Netlify). El token nunca se imprime.
# Uso: tools/derivadas.sh [desde-ISO]   p. ej. tools/derivadas.sh 2026-11-05T00:00:00-03:00
set -eu
TOKEN=$(security find-generic-password -a iasapre -s iasapre-revision -w 2>/dev/null) || { echo '{"error":"falta el token en el Llavero (servicio iasapre-revision)"}'; exit 2; }
DESDE=${1:-}
URL="https://iasapre-chat.netlify.app/.netlify/functions/panel?derivadas=1"
[ -n "$DESDE" ] && URL="$URL&desde=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$DESDE")"
curl -sS --max-time 30 -H "Authorization: Bearer $TOKEN" "$URL"
echo
