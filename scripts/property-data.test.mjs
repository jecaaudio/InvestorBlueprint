import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createPropertyDataHandler,normalizeRentCast} from '../supabase/functions/ib-property-data/handler.mjs';
const id='10000000-0000-4000-8000-000000000001';
const sample={price:250000,priceRangeLow:220000,priceRangeHigh:280000,
  subjectProperty:{formattedAddress:'Synthetic subject',owner:{name:'PRIVATE OWNER'}},
  comparables:[{id:'fixture',formattedAddress:'Synthetic comp',price:260000,status:'Inactive'}]};
async function run({enabled=true,auth=true,confirmed=true,status='approved',claim='reserved',failure='',body={address:'123 Synthetic St'},origin='https://jecaaudio.github.io',method='POST'}={}){
  let upstream=0;const calls=[];
  const env={PROPERTY_DATA_ENABLED:enabled?'true':'false',RENTCAST_API_KEY:'provider-test-secret',
    SUPABASE_SERVICE_ROLE_KEY:'service-test-secret',SUPABASE_ANON_KEY:'public-test-key',SUPABASE_URL:'https://fixture.supabase.co'};
  const handler=createPropertyDataHandler({env,cryptoImpl:webcrypto,now:()=>new Date('2026-10-20T12:00:00Z'),fetchImpl:async(url,opts)=>{
    calls.push({url,opts});
    if(url.endsWith('/auth/v1/user'))return Response.json({id,email_confirmed_at:confirmed?'2026-10-01':null});
    if(url.includes('/member_profiles?')){assert.equal(opts.headers.Authorization,'Bearer user-test-token');return Response.json([{access_status:status}])}
    if(url.endsWith('/ib_claim_property_request')){
      assert.equal(opts.headers.apikey,'service-test-secret');
      if(failure==='quota')throw Error('DO NOT LEAK SECRET');
      return Response.json({status:claim,payload:normalizeRentCast(sample,'2026-10-19T12:00:00Z')});
    }
    if(url.startsWith('https://api.rentcast.io/')){
      upstream++;assert.equal(opts.redirect,'error');assert.equal(opts.headers['X-Api-Key'],'provider-test-secret');
      if(failure==='provider')return Response.json({error:'provider-test-secret'},{status:429});
      return Response.json(sample);
    }
    if(url.endsWith('/ib_cache_property_response'))return new Response(null,{status:204});
    throw Error('Unexpected request: '+url);
  }});
  const response=await handler(new Request('https://fixture.supabase.co/functions/v1/ib-property-data',{
    method,headers:{Origin:origin,...(auth?{Authorization:'Bearer user-test-token'}:{}),'Content-Type':'application/json'},
    ...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})}));
  const output=response.status===204?null:await response.json();
  assert.doesNotMatch(JSON.stringify(output),/provider-test-secret|service-test-secret|PRIVATE OWNER|DO NOT LEAK/);
  return {status:response.status,output,upstream,calls,headers:response.headers};
}
test('integration disabled by default: no provider or auth calls',async()=>{const r=await run({enabled:false});assert.equal(r.status,503);assert.equal(r.calls.length,0)});
test('anonymous request denied before cost or user-data access',async()=>{const r=await run({auth:false});assert.equal(r.status,401);assert.equal(r.calls.length,0)});
test('origin and method allowlists reject unsupported requests',async()=>{assert.equal((await run({origin:'https://evil.invalid'})).status,403);assert.equal((await run({method:'GET'})).status,405)});
test('unconfirmed email and nonapproved states cannot consume budget',async()=>{
  assert.equal((await run({confirmed:false})).status,401);
  for(const status of ['pending','rejected','suspended']){const r=await run({status});assert.equal(r.status,403);assert.equal(r.upstream,0);assert.equal(r.calls.length,2)}
});
test('invalid, incomplete and oversized input never consumes quota',async()=>{
  for(const body of [{},{address:4},{address:''},'invalid JSON',{address:'x'.repeat(9000)}]){
    const r=await run({body});assert.ok([400,413].includes(r.status));assert.equal(r.upstream,0);assert.equal(r.calls.length,2);
  }
});
test('durable exhausted/disabled/unknown budgets fail closed',async()=>{
  for(const claim of ['exhausted','disabled','unknown']){const r=await run({claim});assert.equal(r.upstream,0);assert.equal(r.status,claim==='exhausted'?429:503)}
});
test('quota database failure never sends an upstream request',async()=>{const r=await run({failure:'quota'});assert.equal(r.status,503);assert.equal(r.upstream,0)});
test('cached normalized result returns without provider charge',async()=>{const r=await run({claim:'cached'});assert.equal(r.status,200);assert.equal(r.output.cacheHit,true);assert.equal(r.upstream,0)});
test('one successful request reserves before exactly one provider attempt',async()=>{
  const r=await run();assert.equal(r.status,200);assert.equal(r.upstream,1);
  assert.match(r.calls[2].url,/ib_claim_property_request$/);assert.match(r.calls[3].url,/api.rentcast.io/);
  assert.match(r.headers.get('Cache-Control'),/no-store/);
  assert.equal(r.output.valuation.postRehab,false);assert.equal(r.output.valuation.confidence,null);
  assert.deepEqual(r.output.verifiedSoldComparables,[]);assert.equal(r.output.listingComparables[0].listedPrice,260000);
  assert.equal(r.output.listingComparables[0].status,'Inactive');assert.equal(r.output.subject.sqft,null);
});
test('provider failure is redacted with no automatic retries or refund',async()=>{const r=await run({failure:'provider'});assert.equal(r.status,502);assert.equal(r.upstream,1);assert.equal(r.calls.length,4)});
test('missing estimate is rejected rather than inventing a zero valuation',()=>{assert.throws(()=>normalizeRentCast({},new Date().toISOString()));assert.throws(()=>normalizeRentCast({price:'250000'},''))});
