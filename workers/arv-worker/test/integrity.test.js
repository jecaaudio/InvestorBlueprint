import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import {normalizeSubject,normalizeComp,normalizeOptions} from '../src/core/normalize.js';
import {rankAndFilterComps} from '../src/core/comps.js';
const asOf=new Date('2026-10-20T12:00:00Z');
const subject={address:'Synthetic subject',sqft:1600,beds:3,baths:2,propertyType:'single_family'};
const comp={address:'Synthetic comp',sqft:1600,beds:3,baths:2,soldPrice:320000,soldDate:'2026-09-20',distanceMiles:.5,propertyType:'single_family'};
const env={PROVIDER:'DUMMY',ALLOWED_ORIGIN:'https://jecaaudio.github.io'};
const request=body=>new Request('https://fixture.invalid/api/arv',{method:'POST',headers:{Origin:env.ALLOWED_ORIGIN},body:JSON.stringify(body)});
test('missing subject characteristics stay unknown instead of invented market facts',()=>{
  const s=normalizeSubject({},'User entered address');
  for(const key of ['beds','baths','sqft','yearBuilt','lotSqft','propertyType'])assert.equal(s[key],null,key);
});
test('missing comparable date and distance stay unknown',()=>{
  const c=normalizeComp({soldPrice:100000,sqft:1000});assert.equal(c.soldDate,null);assert.equal(c.distanceMiles,null);
});
test('selection excludes stale, future, distant, incomplete and mismatched comps',()=>{
  const options=normalizeOptions({radiusMiles:1,soldWithinMonths:6});
  const variants=[comp,{...comp,address:'old',soldDate:'2025-01-01'},{...comp,address:'future',soldDate:'2027-01-01'},
    {...comp,address:'far',distanceMiles:2},{...comp,address:'unknown',soldDate:null},{...comp,address:'unknown distance',distanceMiles:null},
    {...comp,address:'big',sqft:4000},{...comp,address:'other beds',beds:9},{...comp,address:'subject copy',address:subject.address}];
  const result=rankAndFilterComps(subject,variants,options,asOf);assert.equal(result.length,1);assert.equal(result[0].address,comp.address);
});
test('duplicate comparable cannot inflate confidence or sample size',()=>{
  assert.equal(rankAndFilterComps(subject,[comp,{...comp,address:'  SYNTHETIC COMP '}],normalizeOptions({}),asOf).length,1);
});
test('worker simulation explicitly reports demo provenance and warnings',async()=>{
  const r=await worker.fetch(request({address:'321 Synthetic St'}),env);assert.equal(r.status,200);
  const data=await r.json();assert.equal(data.meta.demo,true);assert.equal(data.meta.dataType,'demonstration');
  assert.ok(data.meta.warnings.some(w=>/DEMO/i.test(w)));assert.equal(data.meta.statisticalConfidence,false);
});
test('unknown provider fails closed rather than silently using demonstration data',async()=>{
  const r=await worker.fetch(request({address:'456 Synthetic St'}),{...env,PROVIDER:'UNKNOWN'});assert.equal(r.status,503);
});
test('nonstring address and nonobject options return structured input errors',async()=>{
  for(const body of [{address:123},{address:{}},{address:'fixture',options:[]},{address:'fixture',options:null}]){
    const r=await worker.fetch(request(body),env);assert.equal(r.status,400);assert.ok((await r.json()).error.code);
  }
});
