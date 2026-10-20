// Browser-only rendering regression. Mock data, never production member sessions.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true});
const paths=[
  {path:'/InvestorBlueprint/tools/flip-calculator.html',selector:'.ib-tool-brand-mark',tool:'flip'},
  {path:'/InvestorBlueprint/tools/arv/',selector:'.ib-tool-brand-mark',tool:'automated-arv'},
  {path:'/InvestorBlueprint/calculadora-venta/',selector:'.ib-seller-brand img',tool:'seller-net'}
];
const base=process.env.BRAND_BASE_URL||'http://127.0.0.1:4173';
try {
  for (const item of paths) {
    const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
    await page.addInitScript(()=>{
      window.supabase={createClient:()=>({
        auth:{
          getSession:async()=>({data:{session:{user:{id:'fixture-user'},access_token:'fixture-only'}},error:null}),
          signOut:async()=>({error:null})
        },
        from:()=>({
          select(){return this},
          eq(){return this},
          maybeSingle:async()=>({data:{display_name:'Fixture',company_name:'Fixture LLC',document_language:'es',report_detail:'detailed',notes_detail:'detailed'},error:null})
        })
      })};
    });
    await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
      route=>route.fulfill({status:200,contentType:'application/javascript',body:'/* SDK mocked in CI */'}));
    await page.route('**/functions/v1/ib-protected-tools?tool=*',route=>{
      const html='<!doctype html><html lang="es"><head><title>Mock protected tool</title></head>'+
        '<body><a class="tool-logo" href="../index.html">InvestorBlueprint</a>'+
        '<header class="top"><div><p>Seller Net</p></div></header>'+
        '<main>'+('Private fixture content only. '.repeat(80))+'</main></body></html>';
      return route.fulfill({status:200,contentType:'text/html',headers:{'access-control-allow-origin':'*'},body:html});
    });
    await page.goto(base+item.path,{waitUntil:'networkidle'});
    const mark=page.locator(item.selector);
    await mark.waitFor({state:'visible',timeout:10000});
    const naturalWidth=await mark.evaluate(node=>node.naturalWidth);
    assert.ok(naturalWidth>0,item.tool+': branded SVG failed to load');
    const favicon=await page.locator('link[rel="icon"][type="image/svg+xml"]').getAttribute('href');
    assert.ok(favicon.includes('/InvestorBlueprint/assets/brand/favicon.svg'),item.tool+': favicon missing');
    const homeIcon=await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    assert.ok(homeIcon.includes('apple-touch-icon.png'),item.tool+': iOS icon missing');
    const manifest=await page.locator('link[rel="manifest"]').getAttribute('href');
    assert.ok(manifest.includes('manifest.webmanifest'),item.tool+': manifest missing');
    console.log('[brand/mobile] '+item.tool+' rendered with SVG logo and icon metadata');
    await page.close();
  }
} finally {
  await browser.close();
}
