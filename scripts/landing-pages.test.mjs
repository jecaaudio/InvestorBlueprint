import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const slugs=['venta','flip','rentas','arv','hard-money'];
const engine=fs.readFileSync('tools/tool-script.js','utf8');
const landing=fs.readFileSync('assets/js/landing.js','utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function open(slug,lang='es'){
  const html=fs.readFileSync(`calculadoras/${slug}.html`,'utf8').replace(/<script\b[\s\S]*?<\/script>/gi,'');
  const dom=new JSDOM(html,{url:`https://jecaaudio.github.io/InvestorBlueprint/calculadoras/${slug}.html`,runScripts:'outside-only'});
  dom.window.document.documentElement.lang=lang;
  dom.window.eval(fs.readFileSync('assets/js/finance-visuals.js','utf8'));dom.window.eval(engine);dom.window.eval(landing);await tick();
  return dom;
}
const result=dom=>dom.window.document.getElementById('quick-result').textContent.replace(/\s+/g,' ');

// Expected values worked by hand from each page's prefilled example.
const expected={
  venta:['$204,200','$30,800'],            // 385,000 − 150,000 − 8% fees (30,800)
  flip:['$37,600','14.5%','$279,569.89','$174,000'], // break-even: $260,000 / (1 − 7%)
  rentas:['$370','$4,440','$18,840'],      // 2,400×95% − 710 − 1,200
  arv:['$314,000','$305,000 – $322,000','$181,800'],
  'hard-money':['$22,312.50','$18,112.50','$4,200','$2,012.50']
};
for(const slug of slugs){
  test(`${slug} landing shows a correct worked example without an account`,async()=>{
    const dom=await open(slug);
    const text=result(dom);
    for(const value of expected[slug])assert.ok(text.includes(value),`${slug}: missing ${value} in "${text}"`);
    const d=dom.window.document;
    assert.equal(d.querySelectorAll('figure.ib-viz').length,1);
    assert.ok(d.querySelector('.ib-viz-value').textContent.includes('$'));
    assert.match(d.title,/InvestorBlueprint$/);
    assert.ok(d.querySelector('meta[name="description"]').content.length>80);
    assert.equal(d.querySelector('link[rel="canonical"]').href,`https://jecaaudio.github.io/InvestorBlueprint/calculadoras/${slug}.html`);
    for(const node of d.querySelectorAll('[data-es]'))assert.ok(node.dataset.en,'missing English copy');
    dom.window.close();
  });
}

test('quick calculators read Spanish notation, rates and invalid input safely',async()=>{
  let dom=await open('venta');
  const d=dom.window.document,price=d.getElementById('q-price');
  price.value='400.000';price.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  assert.match(price.parentElement.querySelector('small').textContent,/Se lee como 400,000/);
  assert.ok(result(dom).includes('$218,000'));   // 400,000 − 150,000 − 32,000
  price.value='4.0.0';price.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  assert.equal(price.getAttribute('aria-invalid'),'true');assert.match(result(dom),/Revisa los números/);
  assert.equal(d.querySelectorAll('figure.ib-viz').length,0,'Invalid inputs must remove stale charts');
  dom.window.close();
  dom=await open('hard-money','en');
  const rate=dom.window.document.getElementById('q-interestRate');
  rate.value='7.125';rate.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  assert.equal(rate.parentElement.querySelector('small').textContent,'','a US rate needs no "read as" note');
  assert.match(result(dom),/Total financing cost/);
  dom.window.close();
});

test('landing pages are linked from the catalog, deployed and listed in the sitemap',()=>{
  const tools=JSON.parse(fs.readFileSync('assets/config/tools.json','utf8'));
  const deploy=fs.readFileSync('.github/workflows/deploy-pages.yml','utf8');
  const sitemap=fs.readFileSync('sitemap.xml','utf8');
  assert.match(deploy,/cp calculadoras\/\*\.html public-site\/calculadoras\//);
  for(const slug of slugs){
    assert.ok(tools.some(tool=>tool.landing===`calculadoras/${slug}.html`),`catalog does not link ${slug}`);
    assert.ok(sitemap.includes(`/calculadoras/${slug}.html`),`sitemap lacks ${slug}`);
    const html=fs.readFileSync(`calculadoras/${slug}.html`,'utf8');
    for(const [,href] of html.matchAll(/(?:href|src)="(\.\.\/[^"?#]+|[a-z-]+\.html)/g)){
      const file=href.startsWith('../')?href.slice(3):'calculadoras/'+href;
      const target=file.endsWith('/')?file+'index.html':file;
      assert.ok(fs.existsSync(target),`${slug}: broken link ${href}`);
    }
  }
  for(const tool of tools.filter(tool=>tool.access==='beta'))assert.equal(tool.landing,undefined,'beta tools have no public landing page');
});

test('scenario comparison snapshots inputs, restores them, removes entries and resets the example',async()=>{
 const dom=await open('venta'),w=dom.window,d=w.document,price=d.getElementById('q-price');
 const compare=d.querySelector('.lp-scenario-actions button');
 assert.equal(price.value,'385,000');
 compare.click();
 price.value='400.000';price.dispatchEvent(new w.Event('input',{bubbles:true}));
 compare.click();
 const cards=()=>[...d.querySelectorAll('.lp-comparison article')];
 assert.match(cards()[0].textContent,/204,200/);assert.match(cards()[1].textContent,/218,000/);
 cards()[0].querySelector('button').click();assert.equal(price.value,'385,000');assert.match(result(dom),/204,200/);
 cards()[1].querySelectorAll('button')[1].click();assert.equal(cards().length,1);
  price.value='';price.dispatchEvent(new w.Event('input',{bubbles:true}));
  price.dispatchEvent(new w.Event('focusout',{bubbles:true}));assert.equal(price.value,'','Blur must preserve missing input');
 assert.equal(price.getAttribute('aria-invalid'),'true');assert.equal(compare.disabled,true);assert.doesNotMatch(result(dom),/204,200/);
 d.querySelectorAll('.lp-scenario-actions button')[1].click();assert.equal(price.value,'385,000');assert.match(result(dom),/204,200/);
 compare.click();compare.click();assert.equal(cards().length,3);assert.equal(compare.disabled,true);
 assert.equal(w.localStorage.length,0,'public scenarios are memory-only');
 d.documentElement.lang='en';d.dispatchEvent(new w.Event('ib:language-changed'));
 assert.match(d.querySelector('.lp-comparison').textContent,/Scenario 1/);
 dom.window.close();
});

test('quick inputs reject out-of-range vacancy and preserve cents on blur',async()=>{
 const dom=await open('rentas'),w=dom.window,d=w.document,rate=d.getElementById('q-vacancyRate');
 rate.value='101';rate.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(rate.getAttribute('aria-invalid'),'true');assert.doesNotMatch(result(dom),/370/);
  rate.value='5';const rent=d.getElementById('q-rent');rent.value='2.450,75';rent.dispatchEvent(new w.Event('input',{bubbles:true}));rent.dispatchEvent(new w.Event('focusout',{bubbles:true}));
 assert.equal(rent.value,'2,450.75');assert.equal(rate.value,'5');assert.match(result(dom),/418/);
 dom.window.close();
});

test('charts use a common signed zero baseline and exact values, including zero and huge amounts',async()=>{
 const dom=await open('venta'),w=dom.window,d=w.document,host=d.createElement('div');
 w.IBFinanceVisuals.chart(host,{title:'Fixture <script>',rows:[{label:'Profit',value:100},{label:'Loss',value:-50},{label:'Zero',value:0}]});
 const bars=host.querySelectorAll('.ib-viz-bar');
 assert.ok(Math.abs(parseFloat(bars[0].style.width)-66.6666667)<.0001);
 assert.ok(Math.abs(parseFloat(bars[1].style.width)-33.3333333)<.0001);
 assert.equal(bars[1].style.left,'0%');assert.equal(bars[2].style.width,'0%');
 assert.match(host.querySelector('.is-negative').textContent,/-\$50/);
 assert.equal(host.querySelector('script'),null);
 const figure=host.firstElementChild;
 w.IBFinanceVisuals.chart(host,{title:'Huge',rows:[{label:'A',value:Number.MAX_VALUE},{label:'B',value:-Number.MAX_VALUE}]});
 assert.equal(host.firstElementChild,figure,'Updates keep the chart node stable');
 assert.equal(host.querySelector('.ib-viz-bar').style.width,'50%');
 w.IBFinanceVisuals.chart(host,{title:'Invalid',rows:[{label:'A',value:Infinity}]});assert.equal(host.children.length,0);
 dom.window.close();
});

test('losses stay negative in both result and chart; scenario graph compares the same metric',async()=>{
 const dom=await open('venta'),w=dom.window,d=w.document,price=d.getElementById('q-price');
 const compare=d.querySelector('.lp-scenario-actions button');compare.click();
 price.value='100000';price.dispatchEvent(new w.Event('input',{bubbles:true}));compare.click();
 assert.match(result(dom),/-\$58,000/);
 assert.match(d.querySelector('.lp-quick>.ib-viz-host .is-negative').textContent,/-\$58,000/);
 assert.equal(d.querySelectorAll('.lp-comparison .ib-viz-list li').length,2);
 d.documentElement.lang='en';d.dispatchEvent(new w.Event('ib:language-changed'));
 assert.match(d.querySelector('.lp-quick>.ib-viz-host').textContent,/Your sale at a glance/);
 assert.match(d.querySelector('.lp-comparison figure').textContent,/Scenario 2/);
 dom.window.close();
});

test('seller chart labels partial results honestly and erases invalid numbers',async()=>{
 const dom=new JSDOM('<html lang="es"><body data-seller-valid="true"><section class="result-card"><b id="netValue">$204,200</b><span id="netLabel">Neto parcial</span><p id="netDetail">Falta impuesto</p><span id="rPrice">$385,000</span><span id="rDebt">$150,000</span><span id="rFees">$30,800 + pendiente</span><span id="rTax">PENDIENTE</span></section></body></html>',{runScripts:'outside-only'});
 const w=dom.window,d=w.document;w.eval(fs.readFileSync('assets/js/finance-visuals.js','utf8'));await tick();
 assert.match(d.getElementById('ib-seller-chart').textContent,/Neto parcial: falta confirmar/);
 assert.match(d.getElementById('ib-seller-chart').textContent,/\$30,800/);
 d.body.dataset.sellerValid='false';d.dispatchEvent(new w.Event('ib:seller-validity'));await tick();
 assert.equal(d.getElementById('ib-seller-chart').children.length,0);
 dom.window.close();
});
