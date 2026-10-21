import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
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

test('simulated, demo-only and circular tools are not offered in the catalog',async()=>{
  const hidden=tools.filter(tool=>tool.listed===false).map(tool=>tool.id).sort();
  assert.deepEqual(hidden,['automated_arv','rent','roi_search']);
  for(const tool of tools)assert.ok(tool.name_es&&tool.name_en,'Missing localized name: '+tool.id);
  const dom=await render('<main><div class="tool-grid"></div><span id="free-feature-count"></span></main>');
  const cards=[...dom.window.document.querySelectorAll('.tool-grid [data-tool-id]')].map(card=>card.dataset.toolId);
  assert.deepEqual(cards,['flip','rental_cash_flow','arv_estimator','hard_money','seller_net']);
  assert.match(dom.window.document.getElementById('free-feature-count').textContent,/^5 /);
  assert.match(dom.window.document.querySelector('[data-tool-id="flip"] h3').textContent,/Calculadora de Flip/);
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
