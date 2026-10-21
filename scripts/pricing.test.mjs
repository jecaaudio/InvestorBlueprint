import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const page=fs.readFileSync('pricing.html','utf8').replace(/<script\b[\s\S]*?<\/script>/gi,'');
const source=fs.readFileSync('assets/js/pricing.js','utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
async function open({billing,session=null,lang='es'}){
  const dom=new JSDOM(page,{url:'https://jecaaudio.github.io/InvestorBlueprint/pricing.html',runScripts:'outside-only'});
  const w=dom.window;w.document.documentElement.lang=lang;
  w.IB_BILLING=billing;
  w.IB_AUTH_CONFIG={supabaseUrl:'https://example.supabase.co',supabaseAnonKey:'sb_publishable_fixture'};
  w.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session},error:null})}})};
  w.eval(source);await tick();
  return dom;
}
const live={enabled:true,trialDays:7,prices:{proMonthly:19,proYearly:190},
  links:{proMonthly:'https://buy.stripe.com/test_month',proYearly:'https://buy.stripe.com/test_year'},customerPortal:''};

test('during the beta the page explains free access and requests it',async()=>{
  const dom=await open({billing:{enabled:false,prices:{proMonthly:19,proYearly:190},links:{}}});
  const d=dom.window.document,cta=d.getElementById('pro-cta');
  assert.equal(d.getElementById('pricing-beta-note').hidden,false);
  assert.equal(cta.getAttribute('href'),'login.html');assert.equal(cta.textContent,'Solicitar acceso gratis');
  assert.equal(d.getElementById('pro-price').textContent,'$19');
  d.getElementById('billing-yearly').click();
  assert.equal(d.getElementById('pro-price').textContent,'$190');assert.equal(d.getElementById('pro-save').hidden,false);
  assert.equal(d.getElementById('pro-period').dataset.en,'/ year');
  dom.window.close();
});

test('with billing on, a signed-in member goes to Stripe with their id and email',async()=>{
  const dom=await open({billing:live,session:{user:{id:'30000000-0000-4000-8000-000000000001',email:'ana+test@example.com'}}});
  const d=dom.window.document,cta=d.getElementById('pro-cta');
  assert.equal(d.getElementById('pricing-beta-note').hidden,true);
  assert.equal(cta.textContent,'Probar 7 días gratis');
  let url=new URL(cta.href);
  assert.equal(url.origin+url.pathname,'https://buy.stripe.com/test_month');
  assert.equal(url.searchParams.get('client_reference_id'),'30000000-0000-4000-8000-000000000001');
  assert.equal(url.searchParams.get('prefilled_email'),'ana+test@example.com');
  d.getElementById('billing-yearly').click();
  url=new URL(cta.href);assert.equal(url.pathname,'/test_year');
  dom.window.close();
});

test('with billing on, visitors sign in first and come back to pricing',async()=>{
  const dom=await open({billing:live,lang:'en'});
  const cta=dom.window.document.getElementById('pro-cta');
  assert.equal(cta.getAttribute('href'),'login.html?returnTo=%2FInvestorBlueprint%2Fpricing.html');
  assert.equal(cta.textContent,'Start 7-day free trial');
  dom.window.close();
});

test('links outside Stripe are never used as checkout',async()=>{
  const dom=await open({billing:{...live,links:{proMonthly:'https://evil.example/pay',proYearly:'javascript:alert(1)'}},session:{user:{id:'x',email:'a@b.c'}}});
  const d=dom.window.document,cta=d.getElementById('pro-cta');
  assert.equal(cta.getAttribute('href'),'login.html');assert.equal(d.getElementById('pricing-beta-note').hidden,false);
  dom.window.close();
});

test('billing config ships disabled and without secrets',()=>{
  const config=fs.readFileSync('assets/js/billing-config.js','utf8');
  assert.match(config,/enabled:false/);
  assert.doesNotMatch(config,/sk_(live|test)_|whsec_|rk_(live|test)_/);
});

async function account({billing,state}){
  const html=fs.readFileSync('account.html','utf8').replace(/<script\b[\s\S]*?<\/script>/gi,'');
  const dom=new JSDOM(html,{url:'https://jecaaudio.github.io/InvestorBlueprint/account.html',runScripts:'outside-only'});
  const w=dom.window;w.IB_BILLING=billing;
  w.IB_AUTH_CONFIG={supabaseUrl:'https://example.supabase.co',supabaseAnonKey:'sb_publishable_fixture'};
  w.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'member'}}}})},
    from(table){assert.equal(table,'member_subscription_state');const q={select(){return q},eq(column,value){assert.equal(value,'member');return q},maybeSingle:async()=>({data:state,error:null})};return q}})};
  w.eval(fs.readFileSync('assets/js/account-billing.js','utf8'));await tick();
  return dom;
}
test('account subscription card stays hidden during the beta',async()=>{
  const dom=await account({billing:{enabled:false},state:null});
  assert.equal(dom.window.document.getElementById('account-billing').hidden,true);
  dom.window.close();
});
test('account subscription card shows the plan and the Stripe portal link',async()=>{
  const dom=await account({billing:{...live,customerPortal:'https://billing.stripe.com/p/login/test'},state:{plan_code:'pro',billing_status:'active',valid_until:'2026-11-21T12:00:00Z'}});
  const d=dom.window.document;
  assert.equal(d.getElementById('account-billing').hidden,false);
  assert.match(d.getElementById('account-plan').textContent,/Plan Pro · activa · renueva el 21 de noviembre de 2026/);
  assert.equal(d.getElementById('account-manage-billing').hidden,false);
  assert.equal(d.getElementById('account-manage-billing').href,'https://billing.stripe.com/p/login/test');
  assert.equal(d.getElementById('account-upgrade').hidden,true);
  dom.window.close();
  const none=await account({billing:{...live,customerPortal:'https://evil.example/portal'},state:null});
  const n=none.window.document;
  assert.match(n.getElementById('account-plan').textContent,/Todavía no tienes un plan/);
  assert.equal(n.getElementById('account-manage-billing').hidden,true);assert.equal(n.getElementById('account-upgrade').hidden,false);
  none.window.close();
});
