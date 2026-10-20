import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync('tools/arv/arv.js','utf8');
const render=code.slice(code.indexOf('function render(payload'),code.indexOf('\nfunction pref('));
function run(meta,isDemo=false){
  const ctx={latestReport:null,latestReportIsDemo:false,subjectFields:{},arvFields:{},
    resultsEl:{hidden:true},compsWrap:{hidden:true},actionRow:{hidden:true},
    renderKeyValueRows(){},renderComps(){},number:String,money:String,setStatus(v){ctx.status=v}};
  vm.createContext(ctx);vm.runInContext(render,ctx);
  ctx.payload={subject:{},comps:[],arv:{},meta};ctx.isDemo=isDemo;
  vm.runInContext('render(payload,isDemo)',ctx);return ctx;
}
test('DUMMY backend response is always visibly a demo even through normal Calculate',()=>{
  const r=run({provider:'DUMMY'});assert.equal(r.latestReportIsDemo,true);assert.match(r.status,/DEMO/);
});
test('explicit backend demo flag and local demo button are honored',()=>{
  assert.equal(run({demo:true}).latestReportIsDemo,true);assert.equal(run({},true).latestReportIsDemo,true);
});
test('non-demo provider is never relabeled as a verified valuation',()=>{
  const r=run({provider:'Licensed provider'});assert.equal(r.latestReportIsDemo,false);
});
