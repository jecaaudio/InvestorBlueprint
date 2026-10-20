// No SDK needed. Secrets stay in Edge Function environment, never in frontend configuration.
const ORIGIN='https://jecaaudio.github.io';
const VALUE_ENDPOINT='https://api.rentcast.io/v1/avm/value';
const SOURCE='https://developers.rentcast.io/reference/property-valuation';
const finite=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
const text=value=>typeof value==='string'?value.slice(0,240):null;
export function normalizeRentCast(raw,retrievedAt){
  if(!raw||typeof raw!=='object'||!(finite(raw.price)>0))throw Error('invalid_provider_data');
  const p=raw.subjectProperty||{};
  return {
    provider:'RentCast',dataType:'provider_estimate',retrievedAt,source:SOURCE,
    subject:{address:text(p.formattedAddress),sqft:finite(p.squareFootage),beds:finite(p.bedrooms),
      baths:finite(p.bathrooms),yearBuilt:finite(p.yearBuilt)},
    valuation:{estimate:raw.price,low:finite(raw.priceRangeLow),high:finite(raw.priceRangeHigh),
      confidence:null,method:'RentCast listing-based AVM',postRehab:false},
    verifiedSoldComparables:[],
    listingComparables:(Array.isArray(raw.comparables)?raw.comparables:[]).slice(0,25).map(c=>({
      id:text(c.id),address:text(c.formattedAddress),listedPrice:finite(c.price),status:text(c.status),
      listedDate:text(c.listedDate),lastSeenDate:text(c.lastSeenDate),distanceMiles:finite(c.distance),
      sqft:finite(c.squareFootage),beds:finite(c.bedrooms),baths:finite(c.bathrooms),
      correlation:finite(c.correlation),source:SOURCE,dataType:'listing',condition:null,adjustments:[]
    })),
    warnings:['Comparable prices are asking prices, not verified closed-sale prices.',
      'This is a current-value provider estimate, not a verified post-rehab ARV.',
      'Condition and comparability adjustments have not been verified.']
  };
}
export function createPropertyDataHandler({env,fetchImpl=fetch,now=()=>new Date(),cryptoImpl=crypto}){
  return async request=>{
    const headers={'Content-Type':'application/json','Cache-Control':'private, no-store',
      'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'authorization, apikey, content-type',
      'Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','X-Content-Type-Options':'nosniff'};
    const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
    if(request.headers.get('Origin')!==ORIGIN)return reply(403,{error:'origin_not_allowed'});
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST')return reply(405,{error:'method_not_allowed'});
    const auth=request.headers.get('Authorization')||'';
    if(!/^Bearer \S+$/.test(auth))return reply(401,{error:'authentication_required'});
    if(env.PROPERTY_DATA_ENABLED!=='true'||!env.RENTCAST_API_KEY||!env.SUPABASE_SERVICE_ROLE_KEY||
      !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(env.SUPABASE_URL||'')||!env.SUPABASE_ANON_KEY)
      return reply(503,{error:'provider_not_configured'});
    const sb=env.SUPABASE_URL;
    // All URLs are fixed server-side; client-supplied provider URLs are never accepted.
    const get=async(url,options={})=>fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.timeout(10000)});
    const userHeaders={apikey:env.SUPABASE_ANON_KEY,Authorization:auth};
    const serviceHeaders={apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'};
    const rpc=async(name,body)=>{
      const r=await get(sb+'/rest/v1/rpc/'+name,{method:'POST',headers:serviceHeaders,body:JSON.stringify(body)});
      if(!r.ok)throw Error('quota_unavailable');
      return r.status===204?null:r.json();
    };
    try{
      const userResponse=await get(sb+'/auth/v1/user',{headers:userHeaders});
      if(!userResponse.ok)return reply(401,{error:'authentication_required'});
      const user=await userResponse.json();
      if(!/^[a-f0-9-]{36}$/i.test(user.id||'')||!user.email_confirmed_at)return reply(401,{error:'email_confirmation_required'});
      const profile=await get(sb+'/rest/v1/member_profiles?select=access_status&id=eq.'+user.id,{headers:userHeaders});
      if(!profile.ok)return reply(403,{error:'approval_required'});
      const profiles=await profile.json();
      if(profiles.length!==1||profiles[0].access_status!=='approved')return reply(403,{error:'approval_required'});
      if(Number(request.headers.get('Content-Length'))>8192)return reply(413,{error:'payload_too_large'});
      const raw=await request.text();
      if(new TextEncoder().encode(raw).length>8192)return reply(413,{error:'payload_too_large'});
      let body;try{body=JSON.parse(raw)}catch{return reply(400,{error:'invalid_json'})}
      if(typeof body?.address!=='string')return reply(400,{error:'invalid_address'});
      const address=body.address.trim().replace(/\s+/g,' ');
      if(address.length<5||address.length>200||/[\x00-\x1f\x7f]/.test(address))return reply(400,{error:'invalid_address'});
      const hash=await cryptoImpl.subtle.digest('SHA-256',new TextEncoder().encode('rentcast-value-v1:'+address.toLowerCase()));
      const cacheKey=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
      const claim=await rpc('ib_claim_property_request',{p_cache_key:cacheKey});
      if(claim?.status==='cached')return reply(200,{...claim.payload,cacheHit:true});
      if(claim?.status==='exhausted')return reply(429,{error:'provider_budget_exhausted'});
      if(claim?.status!=='reserved')return reply(503,{error:'provider_budget_disabled'});
      // Exactly one provider attempt per durable reservation, including failed requests. No retries.
      const url=new URL(VALUE_ENDPOINT);url.searchParams.set('address',address);
      url.searchParams.set('lookupSubjectAttributes','true');url.searchParams.set('compCount','10');
      const upstream=await get(url.href,{headers:{'X-Api-Key':env.RENTCAST_API_KEY,Accept:'application/json'}});
      if(!upstream.ok)return reply(502,{error:'provider_request_failed'});
      const report=normalizeRentCast(await upstream.json(),now().toISOString());
      // Cache stores only whitelisted fields; no owner contact, raw provider payload or auth tokens.
      try{await rpc('ib_cache_property_response',{p_cache_key:cacheKey,p_payload:report})}catch{/* Fresh result remains usable. */}
      return reply(200,{...report,cacheHit:false});
    }catch{return reply(503,{error:'property_data_unavailable'})}
  };
}
