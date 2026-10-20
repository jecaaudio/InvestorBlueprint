// Build an immutable authenticated review copy, without changing root site files.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
export const REVIEW_SHA='189b85ec5fce00dc4a72f4654ea16a99df54a5cf';
export const REVIEW_DIRECTORY='review-'+REVIEW_SHA.slice(0,7);
const rootFiles=['index.html','login.html','admin.html','account.html','pricing.html','privacy.html','style.css','lang.js','script.js','manifest.webmanifest'];
const toolFiles=['flip-calculator.html','rental-cash-flow.html','rent-calculator.html','arv-estimator.html','hard-money-analyzer.html','roi-search.html'];
export function buildReview(source,publicRoot,sourceSha){
 if(sourceSha!==REVIEW_SHA)throw Error('Review source must match the pinned, CI-verified commit');
 const output=path.join(publicRoot,REVIEW_DIRECTORY);
 if(fs.existsSync(output))throw Error('Review output already exists');
 const loaderPath=path.join(source,'assets/js/secure-tool-loader.js');
 const originalLoader=fs.readFileSync(loaderPath,'utf8');
 const old='/functions/v1/ib-protected-tools?tool=';
 if(originalLoader.split(old).length!==2)throw Error('Protected tool endpoint contract changed');
 for(const rel of [...toolFiles.map(file=>'tools/'+file),'tools/arv/index.html','calculadora-venta/index.html']){
  const html=fs.readFileSync(path.join(source,rel),'utf8');
  if(html.length>6000||!html.includes('secure-tool-loader.js')||/function calculateFlip|const STATE_JURISDICTIONS/.test(html))throw Error('Review entry must remain an authenticated wrapper: '+rel);
 }
 fs.mkdirSync(output,{recursive:true});
 const copy=(rel)=>fs.cpSync(path.join(source,rel),path.join(output,rel),{recursive:true});
 for(const rel of rootFiles)copy(rel);
 copy('assets');
 fs.mkdirSync(path.join(output,'tools/arv'),{recursive:true});
 fs.mkdirSync(path.join(output,'calculadora-venta'),{recursive:true});
 for(const file of fs.readdirSync(path.join(source,'tools'))){
  if(/\.(html|css)$/.test(file)||['tool-script.js','tool-access-feedback.js','finance-report.js'].includes(file))copy('tools/'+file);
 }
 for(const rel of ['tools/arv/index.html','tools/arv/arv.css','tools/arv/arv.js','tools/arv/fixtures',
   'calculadora-venta/index.html','calculadora-venta/print-report.css','calculadora-venta/print-report.js'])copy(rel);
 fs.writeFileSync(path.join(output,'assets/js/secure-tool-loader.js'),originalLoader.replace(old,'/functions/v1/ib-review-tools?tool='));
 for(const name of ['login.js','tool-access-guard.js']){
  const file=path.join(output,'assets/js',name);if(fs.existsSync(file))fs.unlinkSync(file);
 }
 const manifest=JSON.parse(fs.readFileSync(path.join(output,'manifest.webmanifest'),'utf8'));
 manifest.start_url='./';manifest.scope='./';manifest.id='./';
 fs.writeFileSync(path.join(output,'manifest.webmanifest'),JSON.stringify(manifest,null,2)+'\n');
 const visit=directory=>{for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
  const file=path.join(directory,entry.name);if(entry.isDirectory())visit(file);
  else if(entry.name.endsWith('.html')){
   const html=fs.readFileSync(file,'utf8');fs.writeFileSync(file,html.replace(/<head([^>]*)>/i,'<head$1><meta name="robots" content="noindex,nofollow">'));
  }
 }};visit(output);
 fs.writeFileSync(path.join(output,'review-build-info.json'),JSON.stringify({commit:sourceSha,backend:'ib-review-tools',preview:true}));
 return output;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [source,publicRoot]=process.argv.slice(2);if(!source||!publicRoot)throw Error('Usage: build-review-preview.mjs SOURCE PUBLIC_ROOT');
 const sha=execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
 console.log(buildReview(source,publicRoot,sha));
}
