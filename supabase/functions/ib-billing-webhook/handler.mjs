// Stripe webhook for InvestorBlueprint subscriptions. No SDK: the signature is checked
// with Web Crypto and state changes go through one database function (service role).
// Deploy with JWT verification off (Stripe does not send a Supabase token); the Stripe
// signature is the authentication.
const STATUS={trialing:'trialing',active:'active',past_due:'past_due',unpaid:'past_due',paused:'past_due',
  canceled:'cancelled',incomplete_expired:'cancelled'};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SUBSCRIPTION_EVENTS=new Set(['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted']);

const hex=buffer=>[...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,'0')).join('');
function sameText(a,b){
  if(a.length!==b.length)return false;
  let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}

export async function verifyStripeSignature(payload,header,secret,nowSeconds,cryptoImpl,toleranceSeconds=300){
  if(typeof header!=='string'||!secret)return false;
  const parts=header.split(',').map(part=>part.trim().split('='));
  const timestamp=Number(parts.find(([key])=>key==='t')?.[1]);
  const signatures=parts.filter(([key])=>key==='v1').map(([,value])=>value||'');
  if(!Number.isInteger(timestamp)||!signatures.length)return false;
  if(Math.abs(nowSeconds-timestamp)>toleranceSeconds)return false;
  const key=await cryptoImpl.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const expected=hex(await cryptoImpl.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+'.'+payload)));
  return signatures.some(signature=>sameText(signature,expected));
}

// Plan from the subscription's price ids; billing period end from the subscription or its items.
export function readSubscription(subscription,pricePlans){
  const items=Array.isArray(subscription?.items?.data)?subscription.items.data:[];
  const plans=items.map(item=>pricePlans[item?.price?.id]).filter(Boolean);
  const status=STATUS[subscription?.status];
  if(!plans.length||!status)return null;
  const plan=plans.includes('team')?'team':plans[0];
  const end=subscription.ended_at||subscription.current_period_end||items[0]?.current_period_end||null;
  return {plan,status,validUntil:Number.isFinite(end)?new Date(end*1000).toISOString():null,
    customer:typeof subscription.customer==='string'?subscription.customer:subscription.customer?.id||null,
    subscription:typeof subscription.id==='string'?subscription.id:null};
}

export function createBillingWebhookHandler({env,fetchImpl=fetch,now=()=>new Date(),cryptoImpl=crypto}){
  return async request=>{
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
    const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
    if(request.method!=='POST')return reply(405,{error:'method_not_allowed'});
    let pricePlans={};
    try{pricePlans=JSON.parse(env.STRIPE_PRICE_PLANS||'{}')}catch(error){pricePlans={}}
    const configured=env.BILLING_ENABLED==='true'&&env.STRIPE_WEBHOOK_SECRET&&env.STRIPE_SECRET_KEY&&
      env.SUPABASE_SERVICE_ROLE_KEY&&/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(env.SUPABASE_URL||'')&&
      Object.values(pricePlans).length&&Object.values(pricePlans).every(plan=>plan==='pro'||plan==='team');
    if(!configured)return reply(503,{error:'billing_disabled'});
    const payload=await request.text();
    if(payload.length>256000)return reply(413,{error:'payload_too_large'});
    const valid=await verifyStripeSignature(payload,request.headers.get('Stripe-Signature'),env.STRIPE_WEBHOOK_SECRET,
      Math.floor(now().getTime()/1000),cryptoImpl);
    if(!valid)return reply(400,{error:'invalid_signature'});
    let event;
    try{event=JSON.parse(payload)}catch(error){return reply(400,{error:'invalid_json'})}
    if(typeof event?.id!=='string'||!Number.isFinite(event?.created))return reply(400,{error:'invalid_event'});

    const stripeGet=async path=>{
      const response=await fetchImpl('https://api.stripe.com/v1/'+path,{redirect:'error',
        headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY}});
      if(!response.ok)throw Error('stripe_'+response.status);
      return response.json();
    };
    const apply=async(userId,details)=>{
      const response=await fetchImpl(env.SUPABASE_URL+'/rest/v1/rpc/ib_apply_billing_event',{method:'POST',redirect:'error',
        headers:{'Content-Type':'application/json',apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY},
        body:JSON.stringify({p_event_id:event.id,p_event_at:new Date(event.created*1000).toISOString(),p_user_id:userId,
          p_customer:details.customer,p_subscription:details.subscription,p_plan:details.plan,p_status:details.status,p_valid_until:details.validUntil})});
      if(!response.ok)throw Error('database_'+response.status);
      return response.json();
    };

    try{
      const object=event.data?.object;
      if(event.type==='checkout.session.completed'){
        if(object?.mode!=='subscription'||typeof object.subscription!=='string')return reply(200,{received:true,result:'ignored'});
        if(!UUID.test(object.client_reference_id||''))return reply(200,{received:true,result:'no_member_reference'});
        // Read the subscription itself: it carries the price and the current status.
        const details=readSubscription(await stripeGet('subscriptions/'+encodeURIComponent(object.subscription)),pricePlans);
        if(!details)return reply(200,{received:true,result:'unknown_price_or_status'});
        return reply(200,{received:true,result:await apply(object.client_reference_id,details)});
      }
      if(SUBSCRIPTION_EVENTS.has(event.type)){
        const details=readSubscription(object,pricePlans);
        if(!details)return reply(200,{received:true,result:'unknown_price_or_status'});
        return reply(200,{received:true,result:await apply(null,details)});
      }
      return reply(200,{received:true,result:'ignored'});
    }catch(error){
      // Stripe retries on 5xx; never echo secrets or upstream bodies.
      return reply(500,{error:'processing_failed'});
    }
  };
}
