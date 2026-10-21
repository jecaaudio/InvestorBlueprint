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
  dom.window.eval(engine);dom.window.eval(landing);await tick();
  return dom;
}
const result=dom=>dom.window.document.getElementById('quick-result').textContent.replace(/\s+/g,' ');

// Expected values worked by hand from each page's prefilled example.
const expected={
  venta:['$204,200','$30,800'],            // 385,000 − 150,000 − 8% fees (30,800)
  flip:['$37,600','14.5%','$279,570','$174,000'], // cash flip, 2% buy closing, 7% selling
  rentas:['$370','$4,440','$18,840'],      // 2,400×95% − 710 − 1,200
  arv:['$314,000','$305,000 – $322,000','$181,800'],
  'hard-money':['$22,313','$18,113','$4,200','$2,013']
};
for(const slug of slugs){
  test(`${slug} landing shows a correct worked example without an account`,async()=>{
    const dom=await open(slug);
    const text=result(dom);
    for(const value of expected[slug])assert.ok(text.includes(value),`${slug}: missing ${value} in "${text}"`);
    const d=dom.window.document;
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
