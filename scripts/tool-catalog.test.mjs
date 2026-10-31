import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {homeCatalog} from './build-home-catalog.mjs';
const tools=JSON.parse(fs.readFileSync('assets/config/tools.json','utf8'));
const source=fs.readFileSync('assets/js/tools-config.js','utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function render(html,lang='es'){
  const dom=new JSDOM(html,{url:'https://jecaaudio.github.io/InvestorBlueprint/',runScripts:'outside-only'});
  const w=dom.window;w.localStorage.setItem('preferredLanguage',lang);
  w.fetch=async()=>({ok:true,json:async()=>tools});
  w.IBI18n={getCurrentMessages:()=>({betaFreeLabel:'BETA (GRATIS)'})};
  w.eval(source);await tick();await tick();return dom;
}

test('beta tools are offered only after beta access is confirmed',async()=>{
  const beta=tools.filter(tool=>tool.access==='beta').map(tool=>tool.id).sort();
  assert.deepEqual(beta,['automated_arv','rent','roi_search']);
  for(const tool of tools)assert.ok(tool.name_es&&tool.name_en,'Missing localized name: '+tool.id);
  const dom=await render('<main><div class="tool-grid"></div></main>');
  const d=dom.window.document,ids=()=>[...d.querySelectorAll('.tool-grid [data-tool-id]')].map(card=>card.dataset.toolId);
  assert.deepEqual(ids(),['flip','rental_cash_flow','arv_estimator','hard_money','seller_net']);
  assert.match(d.querySelector('[data-tool-id="flip"] h3').textContent,/Calculadora de Flip/);
  // A forged event without the confirmed flag shows nothing extra.
  d.dispatchEvent(new dom.window.CustomEvent('ib:beta-access',{detail:{allowed:true}}));
  assert.equal(ids().length,5);
  dom.window.IB_BETA_ACCESS=true;d.dispatchEvent(new dom.window.CustomEvent('ib:beta-access',{detail:{allowed:true}}));
  assert.deepEqual(ids(),['flip','rental_cash_flow','arv_estimator','hard_money','seller_net','rent','automated_arv','roi_search'],'beta tools come last');
  const badge=d.querySelector('[data-tool-id="roi_search"] [data-tool-plan-badge]');
  assert.ok(badge.classList.contains('beta-tester'));
  assert.ok(d.querySelector('[data-tool-id="roi_search"]').classList.contains('is-beta-tool'));
  dom.window.close();
});

test('tool page title is the localized name without a repeated beta suffix',async()=>{
  const page='<body data-tool-id="rental_cash_flow"><span data-tool-plan-badge></span><h2 data-tool-title>Rental Cash Flow</h2><p data-tool-description></p></body>';
  let dom=await render(page);
  assert.equal(dom.window.document.querySelector('[data-tool-title]').textContent,'Flujo de caja de renta');
  assert.equal(dom.window.document.querySelector('[data-tool-plan-badge]').textContent,'BETA (GRATIS)');
  dom.window.close();
  dom=await render(page,'en');
  assert.equal(dom.window.document.querySelector('[data-tool-title]').textContent,'Rental Cash Flow');
  dom.window.close();
});

test('the public home catalog works without JavaScript and stays synchronized with its source',()=>{
 const html=fs.readFileSync('index.html','utf8');
 const block=html.match(/<!-- home-catalog:start -->\n([\s\S]*?)\n<!-- home-catalog:end -->/)[1];
 assert.equal(block,homeCatalog(tools),'Run node scripts/build-home-catalog.mjs after changing the catalog');
 const dom=new JSDOM(html),d=dom.window.document;
 const cards=[...d.querySelectorAll('.tool-grid article')];
 assert.equal(cards.length,5);
 assert.deepEqual(cards.map(card=>card.dataset.toolId),tools.filter(t=>t.access!=='beta').map(t=>t.id));
 for(const card of cards){
  assert.ok(fs.existsSync(card.querySelector('a').getAttribute('href')));
  assert.ok(card.querySelector('h3').textContent.length);
 }
 assert.equal(d.querySelector('.hero-actions a').getAttribute('href'),'#tools','Primary action opens usable tools without registration');
 assert.equal(d.querySelector('.home-example-link').getAttribute('href'),'calculadoras/flip.html');
 assert.match(d.querySelector('.home-example-assumptions').textContent,/2%.*6,000.*6.*7%/);
 dom.window.close();
});

test('blocked browser storage and unavailable config keep the catalog working and translating',async()=>{
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://jecaaudio.github.io/InvestorBlueprint/',runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 Object.defineProperty(w,'localStorage',{get(){throw new w.DOMException('Blocked','SecurityError')}});
 w.fetch=async()=>{throw new TypeError('Offline')};
 w.eval(source);await tick();await tick();
 assert.equal(d.querySelectorAll('.tool-grid article').length,5);
 assert.match(d.querySelector('[data-tool-id="flip"] h3').textContent,/Calculadora de Flip/);
 d.documentElement.lang='en';d.dispatchEvent(new w.CustomEvent('ib:language-changed'));
 assert.equal(d.querySelector('[data-tool-id="flip"] h3').textContent,'Flip Calculator');
 assert.equal(d.querySelector('[data-tool-id="flip"] a').getAttribute('aria-label'),'Open Tool: Flip Calculator');
 w.IB_BETA_ACCESS=true;d.dispatchEvent(new w.CustomEvent('ib:beta-access'));
 assert.equal(d.querySelectorAll('.tool-grid article').length,5,'Offline fallback never advertises beta tools');
 dom.window.close();
});

test('invalid JSON and a stalled config request never erase the static tools',async()=>{
 for(const mode of ['bad-json','stalled']){
  const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://jecaaudio.github.io/InvestorBlueprint/',runScripts:'outside-only'});
  const w=dom.window,d=w.document;
  w.fetch=mode==='bad-json'?async()=>({ok:true,json:async()=>{throw new SyntaxError('Bad JSON')}}):()=>new Promise(()=>{});
  w.eval(source);await tick();await tick();
  assert.equal(d.querySelectorAll('.tool-grid article').length,5,mode);
  d.documentElement.lang='en';d.dispatchEvent(new w.CustomEvent('ib:language-changed'));
  assert.equal(d.querySelector('[data-tool-id="seller_net"] h3').textContent,'Seller Net Calculator');
  dom.window.close();
 }
});
