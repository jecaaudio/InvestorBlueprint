import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const source=fs.readFileSync('assets/js/disclaimers.js','utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));

// Runs disclaimers.js as the secure loader injects it: a script tag with data-tool.
function page(body,{tool='flip',lang='es'}={}){
  const dom=new JSDOM(`<!doctype html><html lang="${lang}"><head></head><body>${body}</body></html>`,
    {url:'https://jecaaudio.github.io/InvestorBlueprint/tools/x.html',runScripts:'outside-only'});
  const d=dom.window.document;
  const tag=d.createElement('script');tag.dataset.tool=tool;
  Object.defineProperty(d,'currentScript',{configurable:true,value:tag});
  dom.window.eval(source);
  Object.defineProperty(d,'currentScript',{configurable:true,value:null});
  d.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  return {dom,d,w:dom.window};
}
const api=()=>{const {dom}=page('',{tool:''});const value=dom.window.IBDisclaimer;return {value,dom}};

test('every calculator id maps to its own notice in both languages',()=>{
  const {value:D,dom}=api();
  const expected={
    'hard-money':/no es una oferta ni una aprobación de préstamo/,hard_money:/oferta ni una aprobación/,
    arv:/No es una tasación/,'arv-estimator':/No es una tasación/,'automated-arv':/No es una tasación/,
    'seller-net':/compañía de título/,flip:/no una promesa de resultados/,
    rental:/garantía de ingresos/,rent:/garantía de ingresos/,roi_search:/garantía de ingresos/,'roi-search':/garantía de ingresos/
  };
  for(const [tool,pattern] of Object.entries(expected)){
    assert.match(D.forTool(tool,'es').tool,pattern,tool);
    assert.ok(D.forTool(tool,'en').tool.length>20,tool+' en');
    assert.match(D.text(tool,'es'),/No son asesoría financiera, legal ni fiscal/,tool);
  }
  assert.match(D.forTool('hard-money','en').tool,/not a loan offer or approval/);
  assert.match(D.forTool('arv','en').tool,/not an appraisal/);
  assert.equal(D.forTool('unknown','es').tool,'');
  assert.match(D.text('unknown','en'),/^Informational results/);
  dom.window.close();
});

test('the notice sits right under the results and follows the language',async()=>{
  const {dom,d}=page('<main><form id="tool-form"></form><div id="result-cards"></div><div id="result-detail"></div><footer>f</footer></main>',{tool:'hard-money'});
  const note=d.getElementById('ib-disclaimer');
  assert.ok(note);
  assert.equal(d.getElementById('result-detail').nextElementSibling,note);
  assert.equal(note.getAttribute('role'),'note');
  assert.match(note.textContent,/^Importante/);
  assert.match(note.textContent,/no es una oferta ni una aprobación de préstamo/);
  d.documentElement.lang='en';await tick();
  assert.match(note.textContent,/^Important/);
  assert.match(note.textContent,/not a loan offer or approval/);
  assert.equal(d.querySelectorAll('.ib-disclaimer').length,1);
  dom.window.close();
});

test('the Flip notice survives the calculator rebuilding its result area',async()=>{
  const {dom,d}=page('<main><section id="fcReportArea"><div id="result-cards"></div><div id="result-detail"></div></section></main>',{tool:'flip'});
  const area=d.getElementById('fcReportArea');
  assert.equal(area.nextElementSibling?.id,'ib-disclaimer');
  area.replaceChildren(d.createElement('div'));await tick();
  assert.equal(area.nextElementSibling?.id,'ib-disclaimer');
  assert.match(d.getElementById('ib-disclaimer').textContent,/no una promesa de resultados/);
  dom.window.close();
});

test('seller net and automated ARV pages also get their notice',async()=>{
  let {dom,d}=page('<main><section class="card"><p>Neto</p><strong id="netValue">$0</strong></section><section id="other"></section></main>',{tool:'seller-net'});
  assert.equal(d.querySelector('section.card').nextElementSibling?.id,'ib-disclaimer');
  assert.match(d.getElementById('ib-disclaimer').textContent,/compañía de título/);
  dom.window.close();
  ({dom,d}=page('<main><div id="results"></div></main>',{tool:'automated-arv'}));
  assert.equal(d.getElementById('results').nextElementSibling?.id,'ib-disclaimer');
  dom.window.close();
  ({dom,d}=page('<main><p>No result area</p></main>',{tool:'rental'}));
  assert.equal(d.querySelector('main').lastElementChild?.id,'ib-disclaimer');
  dom.window.close();
});

test('the quick calculators show the same wording as the full calculators',()=>{
  const {value:D,dom}=api();
  const map={venta:'seller-net',flip:'flip',rentas:'rental',arv:'arv','hard-money':'hard-money'};
  for(const [slug,tool] of Object.entries(map)){
    const html=fs.readFileSync('calculadoras/'+slug+'.html','utf8');
    const landing=new JSDOM(html).window.document;
    const note=landing.querySelector('.lp-quick .ib-disclaimer span[data-es]');
    assert.ok(note,slug+' has a notice in the quick calculator');
    assert.equal(note.dataset.es,D.text(tool,'es'),slug+' es');
    assert.equal(note.dataset.en,D.text(tool,'en'),slug+' en');
  }
  dom.window.close();
});

test('PDF reports and the loader carry the notice',async()=>{
  const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://jecaaudio.github.io/InvestorBlueprint/tools/hard-money-analyzer.html',runScripts:'outside-only'});
  dom.window.eval(source);dom.window.eval(fs.readFileSync('tools/finance-report.js','utf8'));
  const snapshot={tool:'hard-money',logo:'https://jecaaudio.github.io/InvestorBlueprint/assets/brand/favicon.svg',title:'Hard money',date:'2026-10-21',metrics:[],inputs:[],details:''};
  const es=dom.window.IBRenderFinanceReport(snapshot,{ib_document_language:'es'},{});
  const en=dom.window.IBRenderFinanceReport(snapshot,{ib_document_language:'en'},{});
  assert.match(es,/Importante:<\/strong> Este cálculo no es una oferta ni una aprobación de préstamo/);
  assert.match(en,/Important:<\/strong> This calculation is not a loan offer or approval/);
  dom.window.close();
  assert.match(fs.readFileSync('calculadora-venta/print-report.js','utf8'),/IBDisclaimer\?\.text\('seller-net'/);
  assert.match(fs.readFileSync('tools/arv/arv.js','utf8'),/IBDisclaimer\?\.text\('automated-arv'/);
  assert.match(fs.readFileSync('assets/js/secure-tool-loader.js','utf8'),/assets\/js\/disclaimers\.js\?v=[^"]+" data-tool="'\+tool\+'"/);
});

async function openSignup({checked}){
  const html=fs.readFileSync('login.html','utf8').replace(/<script\b[\s\S]*?<\/script>/gi,'');
  const dom=new JSDOM(html,{url:'https://jecaaudio.github.io/InvestorBlueprint/login.html',runScripts:'outside-only'});
  const w=dom.window,calls=[];
  w.IB_AUTH_CONFIG={supabaseUrl:'https://example.supabase.co',supabaseAnonKey:'sb_publishable_fixture_key_long_enough'};
  const client={auth:{
    getUser:async()=>({data:{user:null},error:null}),getSession:async()=>({data:{session:null},error:null}),
    onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},
    signUp:async args=>{calls.push(args);return {error:null}}
  },from(){const q={select(){return q},eq(){return q},single:async()=>({data:null,error:null}),maybeSingle:async()=>({data:null,error:null})};return q}};
  w.supabase={createClient:()=>client};
  w.eval(fs.readFileSync('assets/js/member-access.js','utf8'));
  // jsdom fires DOMContentLoaded on its own after parsing; firing it again would bind the form twice.
  await tick();
  const d=w.document;
  d.getElementById('signup-name').value='Ana';
  d.getElementById('signup-email').value='ana@example.invalid';
  d.getElementById('signup-password').value='a-long-password-123';
  d.getElementById('signup-terms').checked=checked;
  d.getElementById('registration-form').dispatchEvent(new w.Event('submit',{cancelable:true}));
  await tick();
  return {dom,d,calls};
}

test('an account cannot be created without accepting the notice and terms',async()=>{
  const {dom,d,calls}=await openSignup({checked:false});
  assert.equal(calls.length,0);
  assert.match(d.getElementById('portal-message').textContent,/acepta el aviso y los Términos de uso/);
  const box=d.getElementById('signup-terms');
  assert.ok(box.required);
  assert.match(box.closest('label').textContent,/no una oferta de préstamo, una tasación ni un precio garantizado/);
  assert.ok(box.closest('label').querySelector('a[href="terms.html"]'));
  dom.window.close();
});

test('accepting stores when and which terms version was accepted',async()=>{
  const {dom,calls}=await openSignup({checked:true});
  assert.equal(calls.length,1);
  const data=calls[0].options.data;
  assert.equal(data.full_name,'Ana');
  assert.equal(data.terms_version,'2026-10-21');
  assert.ok(!Number.isNaN(Date.parse(data.terms_accepted_at)));
  dom.window.close();
});
