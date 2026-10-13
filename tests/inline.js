// Construye una versión de public/orientador.html con los scripts en línea (para jsdom)
const fs=require("fs"),path=require("path");
module.exports=function buildInline(){const P=p=>fs.readFileSync(path.join(__dirname,"..","public",p),"utf8");
 return P("orientador.html").replace('<script src="/kb_offline.js"></script>',"<script>\n"+P("kb_offline.js")+"\n</script>").replace('<script src="/nico_bot.js"></script>',"<script>\n"+P("nico_bot.js")+"\n</script>");};
