import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const source=fs.readFileSync('assets/js/auth-nav.js','utf8');
const siteConfig=fs.readFileSync('assets/js/site-config.js','utf8');
const key='sb-ppeyoovykxomxinumibk-auth-token';

function open(page,{saved=null,lang='es',storageKey=key}={}){
  const html=fs.readFileSync(page,'utf8').replace(/<script\b[\s\S]*?<\/script>/gi,'').replace('<html lang="es">',`<html lang="${lang}">`);
  const dom=new JSDOM(html,{url:'https://jecaaudio.github.io/InvestorBlueprint/'+page,runScripts:'outside-only'});
  if(saved!==null)dom.window.localStorage.setItem(storageKey,typeof saved==='string'?saved:JSON.stringify(saved));
  dom.window.eval(siteConfig);
  dom.window.eval(source);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  const links=[...dom.window.document.querySelectorAll('.navbar #primary-nav a')].filter(a=>/login\.html|account\.html/.test(a.getAttribute('href')));
  return {dom,links};
}
const session={access_token:'x',refresh_token:'r',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:'member-id'}};

test('without a saved session the header keeps "Ingresar"',()=>{
  for(const page of ['index.html','pricing.html','terms.html','calculadoras/flip.html']){
    const {dom,links}=open(page);
    assert.ok(links.length>=1,page);
    for(const link of links){assert.match(link.getAttribute('href'),/login\.html\?reason=login$/);assert.equal(link.textContent.trim(),'Ingresar')}
    dom.window.close();
  }
});

test('with a saved session the header shows "Mi perfil", so a signed-in person can tell',()=>{
  for(const page of ['index.html','pricing.html','privacy.html','calculadoras/venta.html']){
    const {dom,links}=open(page,{saved:session});
    for(const link of links){
      assert.match(link.getAttribute('href'),/account\.html$/,page);
      assert.equal(link.textContent,'Mi perfil');
      assert.equal(link.dataset.i18n,'navAccount','language switches keep the new label');
    }
    dom.window.close();
  }
  const {dom,links}=open('index.html',{saved:session,lang:'en'});
  assert.equal(links[0].textContent,'My profile');
  dom.window.close();
});

test('an expired or unreadable saved session does not count as signed in',()=>{
  for(const saved of ['not json',{...session,refresh_token:'',expires_at:1},{access_token:'x'}]){
    const {dom,links}=open('index.html',{saved});
    assert.match(links[0].getAttribute('href'),/login\.html\?reason=login$/);
    dom.window.close();
  }
});

test('every public page with "Ingresar" in the header loads the session check',()=>{
  const pages=['index.html','pricing.html','privacy.html','terms.html','404.html',
    ...fs.readdirSync('calculadoras').filter(f=>f.endsWith('.html')).map(f=>'calculadoras/'+f)];
  for(const page of pages)assert.match(fs.readFileSync(page,'utf8'),/auth-nav\.js/,page);
});

test('a session from another Supabase project on the same github.io origin is ignored',()=>{
  const {dom,links}=open('index.html',{saved:session,storageKey:'sb-someotherproject-auth-token'});
  assert.match(links[0].getAttribute('href'),/login\.html\?reason=login$/);
  dom.window.close();
});

test('the project in site-config matches the login configuration',()=>{
  const ref=/IB_SITE[\s\S]*supabaseProjectRef:'([a-z0-9]+)'/.exec(siteConfig)?.[1];
  const auth=/https:\/\/([a-z0-9]+)\.supabase\.co/.exec(fs.readFileSync('assets/js/member-auth-config.js','utf8'))?.[1];
  assert.ok(ref);assert.equal(ref,auth);
});

test('a menu that already has My profile hides "Ingresar" instead of repeating it',()=>{
  const {dom}=open('index.html',{saved:session});
  const menu=dom.window.document.querySelector('.brand-menu');
  const visible=[...menu.querySelectorAll('a')].filter(a=>!a.hidden).map(a=>a.textContent.trim());
  assert.equal(visible.filter(text=>text==='Mi perfil').length,1);
  assert.ok(!visible.includes('Ingresar'));
  dom.window.close();
});

test('remembered sessions change public signup CTAs, never permissions, in both languages',()=>{
  for(const lang of ['es','en'])for(const page of ['index.html','calculadoras/venta.html']){
    const {dom}=open(page,{saved:session,lang});
    const links=[...dom.window.document.querySelectorAll('main a[data-auth-nav="cta"]')];
    assert.ok(links.length>=2,page);
    for(const link of links){
      assert.match(link.getAttribute('href'),/account\.html$/);
      assert.equal(link.textContent,lang==='en'?'My profile':'Mi perfil');
      assert.equal(link.hasAttribute('data-track'),false);
      assert.equal(link.hasAttribute('data-cta-click'),false);
    }
    assert.equal(dom.window.IB_BETA_ACCESS,undefined,'Saved session cannot grant access');
    dom.window.close();
  }
});

test('logout restores signup labels, tracking and previously hidden header links',()=>{
  const {dom}=open('index.html',{saved:session});
  const doc=dom.window.document;
  dom.window.localStorage.removeItem(key);
  dom.window.dispatchEvent(new dom.window.Event('storage'));
  assert.equal(doc.querySelectorAll('main [data-auth-nav="cta"]').length,0);
  assert.equal(doc.querySelectorAll('main a[data-track="request_access"]').length,2);
  for(const link of doc.querySelectorAll('.navbar a[data-i18n="navLogin"]')){
    assert.equal(link.hidden,false);assert.equal(link.textContent,'Ingresar');
    assert.match(link.getAttribute('href'),/login\.html\?reason=login$/);
  }
  const cta=doc.querySelector('.hero-actions a');
  assert.equal(cta.dataset.ctaClick,'Request Access');
  assert.equal(cta.dataset.i18n,'heroStart');
  dom.window.localStorage.setItem(key,JSON.stringify(session));
  dom.window.dispatchEvent(new dom.window.Event('pageshow'));
  doc.documentElement.lang='en';
  doc.dispatchEvent(new dom.window.Event('ib:language-changed'));
  assert.equal(cta.textContent,'My profile');
  dom.window.close();
});

test('beta pricing keeps the member CTA after a pricing render, without rewriting checkout',()=>{
  const {dom}=open('pricing.html',{saved:session});
  const w=dom.window,d=w.document,cta=d.getElementById('pro-cta');
  w.IB_BILLING={enabled:false};
  w.eval(fs.readFileSync('assets/js/pricing.js','utf8'));
  d.dispatchEvent(new w.Event('DOMContentLoaded'));
  w.IBPricing.render();
  assert.match(cta.getAttribute('href'),/account\.html$/);
  assert.equal(cta.textContent,'Mi perfil');
  w.IB_BILLING.enabled=true;
  cta.href='https://buy.stripe.com/test_fixture';cta.textContent='Subscribe';
  d.dispatchEvent(new w.Event('ib:pricing-rendered'));
  assert.equal(cta.href,'https://buy.stripe.com/test_fixture');
  assert.equal(cta.textContent,'Subscribe');
  w.close();
});
