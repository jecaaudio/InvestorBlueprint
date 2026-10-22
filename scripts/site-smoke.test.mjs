import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { posix as path } from 'node:path';

const read = file => readFileSync(file, 'utf8');
const tools = JSON.parse(read('assets/config/tools.json'));
const knownToolNames = new Set([
  'flip','rental','rent','arv-estimator','automated-arv',
  'hard-money','roi-search','seller-net'
]);
// Exact SDK build plus its Subresource Integrity hash. If the CDN ever serves
// different bytes, the browser refuses to run it. Update all three together.
const SUPABASE_SDK_SCRIPT='<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.0/dist/umd/supabase.js" integrity="sha384-xPW3QHswsICVC2mW6BFNwMbhpLkbZ133fKOhxNx3QGGgAOJfL3O9t8r2aWn1aez6" crossorigin="anonymous"></script>';
const SITE_PAGES=['index.html','login.html','account.html','admin.html','calculadora-venta/index.html'];
function publicPageRef(file) {
  const html=read(file);
  const match=html.match(/data-tool="([^"]+)"/);
  assert.ok(match, `Missing protected tool identifier: ${file}`);
  assert.ok(knownToolNames.has(match[1]), `Unexpected tool identifier: ${file}`);
  return {html,tool:match[1]};
}

test('all eight calculator routes are wrappers, not embedded calculators',()=>{
  assert.equal(tools.length,8);
  const seen=new Set();
  for(const tool of tools){
    const file=tool.url.endsWith('/')?tool.url+'index.html':tool.url;
    assert.ok(existsSync(file), `Missing tool route ${file}`);
    const {html,tool:serverName}=publicPageRef(file);
    assert.ok(html.includes('secure-tool-loader.js'), `Missing signed-in loader ${file}`);
    assert.ok(html.includes(SUPABASE_SDK_SCRIPT), `Missing pinned Supabase SDK ${file}`);
    assert.ok(html.length<6000,`Tool implementation accidentally embedded in ${file}`);
    assert.ok(!html.includes('function calculateFlip')&&!html.includes('STATE_JURISDICTIONS'));
    seen.add(serverName);
  }
  assert.equal(seen.size,8);
});

test('every page loads the same pinned, integrity-checked Supabase SDK',()=>{
  const pages=[...SITE_PAGES,...tools.map(t=>t.url.endsWith('/')?t.url+'index.html':t.url)];
  for(const file of pages){
    const html=read(file);
    const sdkTags=html.match(/<script[^>]*supabase-js[^>]*>/g)||[];
    assert.equal(sdkTags.length,1,`Expected one Supabase SDK tag in ${file}`);
    assert.ok(html.includes(SUPABASE_SDK_SCRIPT),`Supabase SDK must be pinned with integrity in ${file}`);
  }
});

test('password recovery and administrator pages contain required controls',()=>{
  const login=read('login.html'),admin=read('admin.html'),code=read('assets/js/member-access.js');
  for(const id of ['registration-form','login-form','recover-form','new-password-form','signin-password','toggle-signin-password']){
    assert.ok(login.includes('id="'+id+'"'),`Missing login control ${id}`);
  }
  assert.ok(admin.includes('id="admin-root"'));
  assert.ok(code.includes('PASSWORD_RECOVERY'));
  assert.ok(code.includes("resetPasswordForEmail"));
  assert.ok(code.includes('signInWithPassword'));
  assert.ok(code.includes('updateUser({password:pw})'));
});

test('mobile manifest and icon paths are valid',()=>{
  const m=JSON.parse(read('manifest.webmanifest'));
  assert.equal(m.start_url,'/InvestorBlueprint/');
  assert.ok(m.icons.length>=2);
  for(const icon of m.icons) assert.ok(existsSync(icon.src), `Missing app icon ${icon.src}`);
  const deploy=read('.github/workflows/deploy-pages.yml');
  assert.ok(deploy.includes('manifest.webmanifest public-site/'), 'Pages build must publish manifest');
  assert.ok(deploy.includes('test -f public-site/manifest.webmanifest'));
});

test('public pages reference files present in the repository',()=>{
  const pages=['index.html','login.html','admin.html','pricing.html','privacy.html','terms.html','404.html',
    ...tools.map(x=>x.url.endsWith('/')?x.url+'index.html':x.url)];
  for(const page of pages){
    for(const match of read(page).matchAll(/(?:src|href)\s*=\s*["']([^"'#]+)["']/gi)){
      let target=match[1].split(/[?#]/)[0];
      if(!target||/^(https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(target))continue;
      // Site-absolute paths ("/InvestorBlueprint/x") map to the repository root.
      const siteRoot=target.startsWith('/InvestorBlueprint/');
      if(siteRoot)target=target.slice('/InvestorBlueprint/'.length)||'index.html';
      const resolved=path.normalize(siteRoot?target:path.join(path.dirname(page),target));
      const valid=existsSync(resolved)||(existsSync(path.join(resolved,'index.html')));
      assert.ok(valid, `Broken local reference ${page}: ${target}`);
    }
  }
});

test('navigation and publication do not expose fake legacy authentication',()=>{
  const deploy=read('.github/workflows/deploy-pages.yml');
  assert.ok(!read('index.html').includes('src="auth.js"'));
  assert.ok(!read('login.html').includes('src="auth.js"'));
  assert.ok(deploy.includes('test ! -e public-site/auth.js'));
  assert.ok(deploy.includes('test ! -e public-site/workers'));
  const config=read('assets/js/member-auth-config.js');
  assert.ok(config.includes('sb_publishable_'));
  assert.ok(!/sb_secret_|eyJ[A-Za-z0-9_]+\./.test(config));
});

test('public sitemap does not advertise protected calculators',()=>{
  const sitemap=read('sitemap.xml'),robots=read('robots.txt');
  assert.ok(!sitemap.includes('/tools/'));
  assert.ok(!sitemap.includes('/calculadora-venta/'));
  assert.ok(robots.includes('Disallow: /InvestorBlueprint/tools/'));
});

test('every scripts/*.test.mjs runs in npm test or a named special CI step',async()=>{
  const {readdirSync}=await import('node:fs');
  const testScript=JSON.parse(read('package.json')).scripts.test;
  const workflow=read('.github/workflows/quality.yml');
  // These need a browser engine, the live endpoint or private exports, so CI runs them separately.
  const special=['live-tool-denial','member-webkit','protected-brand-browser','mobile-header-browser','private-page-dom'];
  for(const file of readdirSync('scripts').filter(name=>name.endsWith('.test.mjs'))){
    const name=file.replace('.test.mjs','');
    if(special.includes(name)){
      if(name!=='private-page-dom')assert.ok(workflow.includes('scripts/'+file),`Special test not run in CI: ${file}`);
      continue;
    }
    assert.ok(testScript.includes('scripts/'+file),`Test file missing from npm test: ${file}`);
  }
});

test('every tools/ script that protected pages load is copied by the Pages deploy',()=>{
  const deploy=read('.github/workflows/deploy-pages.yml');
  const loaders=read('assets/js/secure-tool-loader.js')+read('assets/js/flip-calculator.js');
  const scripts=new Set([...loaders.matchAll(/tools\/([a-z0-9-]+\.js)/g)].map(match=>match[1]));
  assert.ok(scripts.has('finance-report.js')&&scripts.has('tool-script.js'),'expected loader script references');
  for(const file of scripts){
    assert.ok(new RegExp('cp [^\\n]*tools/'+file.replace('.','\\.')).test(deploy),`Deploy does not publish tools/${file}`);
  }
});

test('every page with the footer can reopen cookie settings',()=>{
  const pages=['index.html','login.html','account.html','pricing.html','privacy.html','terms.html','404.html',
    ...readdirSync('calculadoras').filter(f=>f.endsWith('.html')).map(f=>'calculadoras/'+f)];
  for(const page of pages){
    const html=read(page);
    if(!html.includes('site-footer.js'))continue;
    assert.match(html,/cookie-banner-component\.js/,page+' must load the cookie banner');
    assert.match(html,/consent\.js/,page+' must load consent controls');
  }
});

test('cookie privacy link resolves to the legal page from every nesting depth',async()=>{
 const {JSDOM}=await import('jsdom');
 const source=read('assets/js/cookie-banner-component.js');
 for(const path of ['index.html','calculadoras/venta.html','calculadora-venta/','tools/flip-calculator.html','tools/arv/','review/fake/calculadoras/venta.html']){
  const root=path.startsWith('review/')?'/InvestorBlueprint/review/fake/':'/InvestorBlueprint/';
  const dom=new JSDOM('<!doctype html><body></body>',{url:'https://example.invalid/InvestorBlueprint/'+path,runScripts:'outside-only'});
  dom.window.eval(source);dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  assert.equal(new URL(dom.window.document.querySelector('#cookie-banner a').href).pathname,root+'privacy.html',path);
  dom.window.close();
 }
});
