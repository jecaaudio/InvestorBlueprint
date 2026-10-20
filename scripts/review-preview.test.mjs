import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {buildReview,REVIEW_SHA,REVIEW_DIRECTORY} from './build-review-preview.mjs';
function fixture(){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ib-review-')),source=path.join(temp,'source'),output=path.join(temp,'public');
 const put=(file,content='<!doctype html><html><head></head><body></body></html>')=>{const p=path.join(source,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,content)};
 for(const file of ['index.html','login.html','admin.html','account.html','pricing.html','privacy.html','style.css','lang.js','script.js'])put(file);
 put('manifest.webmanifest',JSON.stringify({start_url:'/InvestorBlueprint/',icons:[]}));
 put('assets/js/secure-tool-loader.js',"const endpoint='/functions/v1/ib-protected-tools?tool=';");put('assets/js/login.js','deprecated');
 for(const file of ['flip-calculator.html','rental-cash-flow.html','rent-calculator.html','arv-estimator.html','hard-money-analyzer.html','roi-search.html'])put('tools/'+file,'<!doctype html><html><head></head><body><script src="../assets/js/secure-tool-loader.js"></script></body></html>');
 for(const file of ['tools/arv/index.html','calculadora-venta/index.html'])put(file,'<!doctype html><html><head></head><body><script src="secure-tool-loader.js"></script></body></html>');
 for(const file of ['tools/tool-script.js','tools/finance-report.js','tools/tool-access-feedback.js','tools/arv/arv.js','tools/arv/arv.css','tools/arv/fixtures/demo-report.json','calculadora-venta/print-report.css','calculadora-venta/print-report.js'])put(file,'fixture');
 put('supabase/private-source.ts','never publish');put('docs/private-export.html','never publish');put('package.json','{}');
 fs.mkdirSync(output);fs.writeFileSync(path.join(output,'index.html'),'PRODUCTION SENTINEL');
 return {temp,source,output,put};
}
test('review copy preserves production bytes, authenticates tools and excludes server/project source',()=>{
 const f=fixture();try{
  const result=buildReview(f.source,f.output,REVIEW_SHA);
  assert.equal(fs.readFileSync(path.join(f.output,'index.html'),'utf8'),'PRODUCTION SENTINEL');
  assert.equal(result,path.join(f.output,REVIEW_DIRECTORY));
  assert.match(fs.readFileSync(path.join(result,'assets/js/secure-tool-loader.js'),'utf8'),/ib-review-tools/);
  assert.match(fs.readFileSync(path.join(result,'index.html'),'utf8'),/noindex,nofollow/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(result,'review-build-info.json'))).commit,REVIEW_SHA);
  for(const item of ['supabase','docs','package.json','assets/js/login.js'])assert.equal(fs.existsSync(path.join(result,item)),false,item);
  assert.equal(JSON.parse(fs.readFileSync(path.join(result,'manifest.webmanifest'))).scope,'./');
 }finally{fs.rmSync(f.temp,{recursive:true,force:true})}
});
test('unverified sources and accidentally public calculators are refused before writing output',()=>{
 const f=fixture();try{
  assert.throws(()=>buildReview(f.source,f.output,'a'.repeat(40)),/pinned/);
  f.put('tools/flip-calculator.html','<!doctype html><script>function calculateFlip(){}</script>');
  assert.throws(()=>buildReview(f.source,f.output,REVIEW_SHA),/authenticated wrapper/);
  assert.equal(fs.existsSync(path.join(f.output,REVIEW_DIRECTORY)),false);
 }finally{fs.rmSync(f.temp,{recursive:true,force:true})}
});
