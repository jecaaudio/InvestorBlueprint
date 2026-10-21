import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto,createHmac} from 'node:crypto';
import {createBillingWebhookHandler,verifyStripeSignature,readSubscription} from '../supabase/functions/ib-billing-webhook/handler.mjs';

const secret='whsec_test_secret';
const member='30000000-0000-4000-8000-000000000001';
const plans={price_pro_month:'pro',price_pro_year:'pro',price_team:'team'};
const env={BILLING_ENABLED:'true',STRIPE_WEBHOOK_SECRET:secret,STRIPE_SECRET_KEY:'sk_test_secret',
  SUPABASE_SERVICE_ROLE_KEY:'service-test-secret',SUPABASE_URL:'https://fixture.supabase.co',STRIPE_PRICE_PLANS:JSON.stringify(plans)};
const nowSeconds=1792600000;
const subscription=(status='active',price='price_pro_month')=>({id:'sub_A',customer:'cus_A',status,
  items:{data:[{price:{id:price},current_period_end:nowSeconds+2592000}]}});
const sign=(body,t=nowSeconds)=>'t='+t+',v1='+createHmac('sha256',secret).update(t+'.'+body).digest('hex');

async function deliver(event,{signature,overrides={},stripe=subscription(),databaseStatus=200,method='POST'}={}){
  const calls=[];
  const handler=createBillingWebhookHandler({env:{...env,...overrides},cryptoImpl:webcrypto,now:()=>new Date(nowSeconds*1000),
    fetchImpl:async(url,opts={})=>{
      calls.push({url,opts});
      if(url.startsWith('https://api.stripe.com/v1/subscriptions/')){assert.equal(opts.headers.Authorization,'Bearer sk_test_secret');return Response.json(stripe)}
      if(url==='https://fixture.supabase.co/rest/v1/rpc/ib_apply_billing_event'){
        assert.equal(opts.headers.apikey,'service-test-secret');
        return databaseStatus===200?Response.json('applied'):new Response('db error with service-test-secret',{status:databaseStatus});
      }
      throw Error('unexpected url '+url);
    }});
  const body=typeof event==='string'?event:JSON.stringify(event);
  const response=await handler(new Request('https://fixture.supabase.co/functions/v1/ib-billing-webhook',{method,
    headers:{'Stripe-Signature':signature??sign(body)},body:method==='POST'?body:undefined}));
  const text=await response.text();
  return {status:response.status,text,json:JSON.parse(text),calls,rpc:calls.filter(c=>c.url.includes('/rpc/')).map(c=>JSON.parse(c.opts.body))};
}
const checkout=(extra={})=>({id:'evt_checkout',created:nowSeconds-5,type:'checkout.session.completed',
  data:{object:{mode:'subscription',subscription:'sub_A',client_reference_id:member,...extra}}});

test('checkout links the member, reads the subscription and applies the plan once',async()=>{
  const r=await deliver(checkout());
  assert.equal(r.status,200);assert.equal(r.json.result,'applied');
  assert.deepEqual(r.rpc,[{p_event_id:'evt_checkout',p_event_at:new Date((nowSeconds-5)*1000).toISOString(),p_user_id:member,
    p_customer:'cus_A',p_subscription:'sub_A',p_plan:'pro',p_status:'active',p_valid_until:new Date((nowSeconds+2592000)*1000).toISOString()}]);
});

test('subscription updates and cancellations map Stripe status and price to the plan',async()=>{
  const updated=await deliver({id:'evt_u',created:nowSeconds,type:'customer.subscription.updated',data:{object:subscription('past_due','price_team')}});
  assert.equal(updated.rpc[0].p_plan,'team');assert.equal(updated.rpc[0].p_status,'past_due');assert.equal(updated.rpc[0].p_user_id,null);
  const deleted=await deliver({id:'evt_d',created:nowSeconds,type:'customer.subscription.deleted',data:{object:{...subscription('canceled'),ended_at:nowSeconds}}});
  assert.equal(deleted.rpc[0].p_status,'cancelled');assert.equal(deleted.rpc[0].p_valid_until,new Date(nowSeconds*1000).toISOString());
  assert.equal(readSubscription(subscription('unpaid'),plans).status,'past_due');
  assert.equal(readSubscription(subscription('incomplete'),plans),null,'incomplete first payments grant nothing');
  assert.equal(readSubscription(subscription('active','price_unknown'),plans),null);
});

test('forged, stale, replayed-with-new-body or unsigned deliveries are rejected before any write',async()=>{
  const body=JSON.stringify(checkout());
  for(const signature of ['','t='+nowSeconds+',v1=deadbeef',sign(body,nowSeconds-301),sign(body+' '),'v1='+createHmac('sha256',secret).update(body).digest('hex'),
    't='+nowSeconds+',v1='+createHmac('sha256','whsec_other').update(nowSeconds+'.'+body).digest('hex')]){
    const r=await deliver(body,{signature});
    assert.equal(r.status,400,signature);assert.equal(r.calls.length,0);
  }
  assert.equal(await verifyStripeSignature(body,'t='+nowSeconds+',v1=x,v1='+createHmac('sha256',secret).update(nowSeconds+'.'+body).digest('hex'),secret,nowSeconds,webcrypto),true,'any listed v1 may match during secret rotation');
});

test('billing stays off until every secret and price mapping is configured',async()=>{
  for(const overrides of [{BILLING_ENABLED:'false'},{STRIPE_WEBHOOK_SECRET:''},{STRIPE_SECRET_KEY:''},{SUPABASE_URL:'http://evil.example'},
    {STRIPE_PRICE_PLANS:'{}'},{STRIPE_PRICE_PLANS:'{"price_x":"gold"}'},{STRIPE_PRICE_PLANS:'not json'}]){
    const r=await deliver(checkout(),{overrides});
    assert.equal(r.status,503,JSON.stringify(overrides));assert.equal(r.calls.length,0);
  }
  assert.equal((await deliver(checkout(),{method:'GET'})).status,405);
});

test('events without a member reference or of other kinds are acknowledged without writes',async()=>{
  for(const event of [checkout({client_reference_id:'not-a-uuid'}),checkout({mode:'payment'}),
    {id:'evt_i',created:nowSeconds,type:'invoice.paid',data:{object:{}}}]){
    const r=await deliver(event);
    assert.equal(r.status,200);assert.equal(r.rpc.length,0);
  }
});

test('database or Stripe failures return 500 so Stripe retries, without leaking secrets',async()=>{
  const r=await deliver(checkout(),{databaseStatus:500});
  assert.equal(r.status,500);assert.doesNotMatch(r.text,/secret|sk_test|whsec/);
  const s=await deliver({id:'evt_bad',created:nowSeconds,type:'checkout.session.completed',data:{object:{mode:'subscription',subscription:'sub_A',client_reference_id:member}}},{stripe:{error:'x'}});
  assert.equal(s.status,200);assert.equal(s.json.result,'unknown_price_or_status');
});
