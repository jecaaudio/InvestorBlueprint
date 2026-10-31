// Generate the public, no-JavaScript catalog from the same source as the live catalog.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function homeCatalog(tools){
 const publicTools=tools.filter(tool=>tool.access!=='beta'&&tool.landing);
 const cards=publicTools.map(tool=>`<article class="card" data-tool-id="${esc(tool.id)}"><span class="badge free" data-tool-plan-badge data-es="BETA (GRATIS)" data-en="BETA (FREE)">BETA (GRATIS)</span><h3 data-es="${esc(tool.name_es)}" data-en="${esc(tool.name_en)}">${esc(tool.name_es)}</h3><p data-es="${esc(tool.description_es)}" data-en="${esc(tool.description_en)}">${esc(tool.description_es)}</p><a class="card-btn" href="${esc(tool.landing)}" data-es="Abrir Herramienta" data-en="Open Tool" data-cta-click="Open Tool">Abrir Herramienta</a></article>`).join('\n');
 // Escape script delimiters even though the source is maintained in this repository.
 return cards+'\n<script type="application/json" id="home-tools-fallback">'+JSON.stringify(publicTools).replace(/</g,'\\u003c')+'</script>';
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const file='index.html',html=fs.readFileSync(file,'utf8');
 const generated=homeCatalog(JSON.parse(fs.readFileSync('assets/config/tools.json','utf8')));
 const pattern=/<!-- home-catalog:start -->[\s\S]*?<!-- home-catalog:end -->/;
 if(!pattern.test(html))throw Error('Home catalog markers missing');
 fs.writeFileSync(file,html.replace(pattern,()=>`<!-- home-catalog:start -->\n${generated}\n<!-- home-catalog:end -->`));
}
