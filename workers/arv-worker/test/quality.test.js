import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePropertyType,normalizeOptions,normalizeComp} from '../src/core/normalize.js';
import {selectComparableSales} from '../src/core/comps.js';
import {calculateArv} from '../src/core/arv.js';
import {qualityFromComps} from '../src/core/scoring.js';
const subject={address:'QA subject',sqft:2000,beds:3,baths:2,propertyType:'single_family'};
const asOf=new Date('2026-10-20T12:00:00Z');
const sale=(address,ppsf,propertyType='Single Family')=>({address,soldPrice:ppsf*2000,sqft:2000,beds:3,baths:2,soldDate:'2026-10-01',distanceMiles:0,propertyType});

test('different or unknown property types never qualify as residential comparables',()=>{
 assert.equal(normalizePropertyType('Single Family'),'single_family');assert.equal(normalizePropertyType('unknown'),null);
 const selected=selectComparableSales(subject,[sale('house',200),sale('shop',200,'Commercial'),sale('missing',200,'')],normalizeOptions(),asOf);
 assert.deepEqual(selected.comps.map(c=>c.address),['house']);
 assert.equal(selectComparableSales({...subject,propertyType:null},[sale('house',200)],normalizeOptions(),asOf).comps.length,0);
 assert.equal(normalizeComp(sale('overflow',Number.MAX_VALUE)).soldPrice,0);
});
test('outlier screen runs before result cap and reports every excluded sale',()=>{
 const selected=selectComparableSales(subject,[sale('a',200),sale('b',205),sale('c',210),sale('outlier',2000)],normalizeOptions({maxComps:3}),asOf);
 assert.equal(selected.excludedOutliers,1);assert.equal(selected.comps.length,3);assert.ok(!selected.comps.some(c=>c.address==='outlier'));
 const result=calculateArv(subject,selected.comps);assert.equal(result.low,400000);assert.equal(result.high,420000);assert.equal(result.rangeType,'observed_comparable_ppsf');
});
test('two wildly different prices cannot produce high quality or a narrow interval',()=>{
 const comps=[{score:1,pricePerSqft:100},{score:1,pricePerSqft:1000}];
 const result=calculateArv(subject,comps);
 assert.equal(result.quality.status,'insufficient_comps');assert.ok(result.quality.qualityScore<20);assert.equal(result.quality.statisticalConfidence,false);
 assert.equal(result.low,200000);assert.equal(result.high,2000000);
 const one=qualityFromComps([{score:1,pricePerSqft:200}]),five=qualityFromComps(Array.from({length:5},()=>({score:1,pricePerSqft:200})));
 assert.ok(five.qualityScore>one.qualityScore);assert.ok(five.qualityScore<=98);
 assert.throws(()=>calculateArv(subject,[{score:1,pricePerSqft:Infinity}]),RangeError);
});
