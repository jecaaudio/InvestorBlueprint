// Public mobile layouts, accessible navigation and working quick calculations.
import { chromium, webkit } from 'playwright';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base=process.env.HEADER_BASE_URL||'http://127.0.0.1:4173';
const engine=process.env.MOBILE_ENGINE==='webkit'?'webkit':'chromium';
const browser=await ({chromium,webkit}[engine]).launch({headless:true});
await mkdir('tmp/mobile-polish-qa',{recursive:true});
try {
  for (const width of [320,360,393,430,1280]) {
    for (const lang of ['es','en']) {
      const context=await browser.newContext({viewport:{width,height:800},isMobile:true,hasTouch:true});
      await context.addInitScript(value=>{try{localStorage.setItem('preferredLanguage',value)}catch{}},lang);
      const page=await context.newPage();
      // The SDK is not needed for layout; skip the network call.
      await page.route(/^https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@/,route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
      await page.goto(base+'/InvestorBlueprint/index.html',{waitUntil:'load'});
      await page.locator('#cookie-reject-all').click();
      await page.locator('#siteThemeToggle').waitFor({state:'visible'});
      for(const selector of ['.lang-option','#siteThemeToggle',...(width<600?['.menu-toggle']:[])]){
        assert.ok(await page.locator(selector).evaluateAll(nodes=>nodes.every(node=>{
          const box=node.getBoundingClientRect();return box.width>=44&&box.height>=44;
        })),`Touch target ${selector} at ${width}px`);
      }
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Horizontal overflow at ${width}px`);
      if(width<600){await page.locator('.menu-toggle').click();
      assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'true');
      assert.ok(await page.locator('#primary-nav a').first().isVisible(),'Menu links visible after opening');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
      assert.equal(await page.locator('#primary-nav a').first().isVisible(),false);}
      for(const path of ['calculadoras/venta.html','calculadoras/flip.html','calculadoras/rentas.html','calculadoras/arv.html','calculadoras/hard-money.html','pricing.html']){
        await page.goto(base+'/InvestorBlueprint/'+path,{waitUntil:'load'});
        await page.locator('#site-footer').waitFor();
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow ${path} ${width}`);
        assert.ok(await page.locator('.site-footer a[href$="privacy.html"]').isVisible(),'Mobile footer privacy link');
        assert.ok(await page.locator('.site-footer-cookies').isVisible(),'Mobile cookie settings');
        if(path.startsWith('calculadoras/')){
          const input=page.locator('.lp-fields input').first();
          assert.ok(await input.evaluate(node=>parseFloat(getComputedStyle(node).fontSize)>=16));
          await input.fill('400.000');await input.press('Tab');assert.equal(await input.inputValue(),'400,000');
          await page.locator('.lp-scenario-actions button').first().click();
          assert.equal(await page.locator('.lp-comparison article').count(),1);
          await input.fill('');assert.equal(await input.getAttribute('aria-invalid'),'true');
          assert.equal(await page.locator('.lp-scenario-actions button').first().isDisabled(),true);
          await page.locator('.lp-scenario-actions button').nth(1).click();
        }else{assert.equal(await page.locator('#pro-price').isVisible(),false)}
        if(width===393&&lang==='es'){
          await page.screenshot({path:`tmp/mobile-polish-qa/${engine}-${path.replaceAll('/','-')}-light.png`,fullPage:true});
          await page.locator('#siteThemeToggle').click();
          await page.screenshot({path:`tmp/mobile-polish-qa/${engine}-${path.replaceAll('/','-')}-dark.png`,fullPage:true});
        }
      }
      await page.goto(base+'/InvestorBlueprint/index.html#tools');
      const anchor=await page.locator('#tools').evaluate(node=>({top:node.getBoundingClientRect().top,header:document.querySelector('.navbar').getBoundingClientRect().bottom}));
      assert.ok(anchor.top>=anchor.header-2,`Header covers tools at ${width}px: ${JSON.stringify(anchor)}`);
      console.log(`[mobile/${engine}] ${width}px ${lang}: public calculators, comparison, footer and anchors`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
