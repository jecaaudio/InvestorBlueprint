// Public mobile layouts, accessible navigation and working quick calculations.
import { chromium, webkit } from 'playwright';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base=process.env.HEADER_BASE_URL||'http://127.0.0.1:4173';
const engine=process.env.MOBILE_ENGINE==='webkit'?'webkit':'chromium';
const browser=await ({chromium,webkit}[engine]).launch({headless:true});
async function setTheme(page,theme){
  if(await page.locator('html').getAttribute('data-theme')===theme)return;
  const toggle=page.locator('#siteThemeToggle');
  const hidden=!(await toggle.isVisible());
  if(hidden)await page.locator('.menu-toggle').click();
  await toggle.click();
  if(hidden)await page.keyboard.press('Escape');
}
await mkdir('tmp/mobile-polish-qa',{recursive:true});
try {
  for (const width of [320,360,393,430,768,1280,1440]) {
    for (const lang of ['es','en']) {
      const context=await browser.newContext({viewport:{width,height:800},isMobile:width<600,hasTouch:width<600,reducedMotion:'reduce'});
      await context.addInitScript(value=>{try{localStorage.setItem('preferredLanguage',value)}catch{}},lang);
      const page=await context.newPage();
      // The SDK is not needed for layout; skip the network call.
      await page.route(/^https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@/,route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
      await page.goto(base+'/InvestorBlueprint/index.html',{waitUntil:'load'});
      await page.locator('#cookie-reject-all').click();
      await page.locator('#siteThemeToggle').waitFor({state:'attached'});
      const before=await page.locator('.hero').boundingBox();
      if(width<=840){
        assert.ok((await page.locator('.navbar').boundingBox()).height<=66,'Mobile header must remain one compact row');
        assert.equal(await page.locator('#siteThemeToggle').isVisible(),false,'Preferences belong inside the closed menu');
        await page.locator('.menu-toggle').click();
        assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'true');
        assert.ok(await page.locator('#primary-nav a').first().isVisible(),'Menu links visible after opening');
        assert.equal((await page.locator('.hero').boundingBox()).y,before.y,'Opening navigation must not move the page');
        const panel=await page.locator('#primary-nav').boundingBox();
        assert.ok(panel.y+panel.height<=800,'Menu fits the viewport');
      }
      for(const selector of ['.lang-option','#siteThemeToggle',...(width<=840?['.menu-toggle','#primary-nav>a']:[])]){
        assert.ok(await page.locator(selector).evaluateAll(nodes=>nodes.every(node=>{
          const box=node.getBoundingClientRect();return box.width>=44&&box.height>=44;
        })),`Touch target ${selector} at ${width}px`);
      }
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Horizontal overflow at ${width}px`);
      if(width===393&&lang==='es')await page.screenshot({path:`tmp/mobile-polish-qa/${engine}-${width}-menu.png`,animations:'disabled'});
      if(width<=840){
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
      assert.equal(await page.locator('#primary-nav a').first().isVisible(),false);}
      if(width<600){
        const toolsTop=await page.locator('#tools').evaluate(node=>node.getBoundingClientRect().top);
        assert.ok(toolsTop<550,'Free tools must be discoverable in the first mobile viewport');
        assert.ok(await page.locator('.hero-actions .btn').evaluateAll(nodes=>nodes.every(node=>node.scrollWidth<=node.clientWidth)),'Hero CTA labels must fit');
      }
      if([393,1440].includes(width)&&lang==='es'){
        for(const theme of ['light','dark']){
          await setTheme(page,theme);
          await page.screenshot({path:`tmp/mobile-polish-qa/${engine}-${width}-home-${theme}.png`,fullPage:true,animations:'disabled'});
          await page.screenshot({path:`tmp/mobile-polish-qa/${engine}-${width}-home-viewport-${theme}.png`,animations:'disabled'});
        }
      }
      for(const path of ['calculadoras/venta.html','calculadoras/flip.html','calculadoras/rentas.html','calculadoras/arv.html','calculadoras/hard-money.html','pricing.html','login.html','privacy.html','terms.html','404.html']){
        await page.goto(base+'/InvestorBlueprint/'+path,{waitUntil:'load'});
        await page.locator('#site-footer').waitFor();
        if(width<=840){
          assert.ok((await page.locator('.navbar').boundingBox()).height<=66,`Compact header on ${path} at ${width}px`);
          assert.ok(await page.locator('.ib-membership-page button').evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length).every(node=>node.getBoundingClientRect().height>=44)),`Membership touch targets on ${path}`);
          await page.locator('.menu-toggle').click();
          assert.ok(await page.locator('#siteThemeToggle').isVisible(),`Menu preferences on ${path}`);
          await page.keyboard.press('Escape');
        }
        assert.equal(new URL(await page.locator('#cookie-banner a').getAttribute('href'),page.url()).pathname,'/InvestorBlueprint/privacy.html','Cookie policy link must resolve from nested pages');
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow ${path} ${width}`);
        assert.ok(await page.locator('.site-footer a[href$="privacy.html"]').isVisible(),'Mobile footer privacy link');
        assert.ok(await page.locator('.site-footer-cookies').isVisible(),'Mobile cookie settings');
        if(path.startsWith('calculadoras/')){
          await page.locator('.lp-quick>.ib-viz-host figure').waitFor({state:'visible'});
          assert.ok(await page.locator('.ib-viz-bar').evaluateAll(nodes=>nodes.every(node=>Number.isFinite(parseFloat(node.style.width))&&parseFloat(node.style.width)>=0&&parseFloat(node.style.width)<=100)),'Finite, bounded chart bars');
          assert.equal(await page.locator('.ib-viz-bar').first().evaluate(node=>getComputedStyle(node).transitionDuration),'0s','Reduced motion disables chart transitions');
          const input=page.locator('.lp-fields input').first();
          const initial=await input.inputValue();
          assert.ok(await input.evaluate(node=>parseFloat(getComputedStyle(node).fontSize)>=16));
          await input.fill('400.000');await input.press('Tab');assert.equal(await input.inputValue(),'400,000');
          await page.locator('.lp-scenario-actions button').first().click();
          await page.locator('.lp-comparison article').first().waitFor({state:'visible',timeout:5000});
          assert.equal(await page.locator('.lp-comparison article').count(),1);
          await input.fill('');assert.equal(await input.getAttribute('aria-invalid'),'true');
          assert.equal(await page.locator('.lp-quick>.ib-viz-host figure').count(),0,'Invalid values remove the old graph');
          assert.equal(await page.locator('.lp-scenario-actions button').first().isDisabled(),true);
          await page.locator('.lp-scenario-actions button').nth(1).click();
          assert.equal(await input.inputValue(),initial,'Reset must restore the original input on the first tap');
          assert.equal(await input.getAttribute('aria-invalid'),null);
          if(path==='calculadoras/venta.html'){
            await input.fill('100000');
            assert.match(await page.locator('.lp-quick>.ib-viz-host .is-negative').textContent(),/-\$58,000/);
            await input.fill('9007199254740991');
            assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Large financial values must wrap without horizontal overflow');
            await page.locator('.lp-scenario-actions button').nth(1).click();
          }
        }else if(path==='pricing.html'){
          assert.equal(await page.locator('#pro-price').isVisible(),false);
          await page.locator('.site-footer-cookies').click();
          await page.locator('#cookie-banner').waitFor({state:'visible'});
          await page.locator('#cookie-reject-all').click();
        }
        for(const theme of ['dark','light']){
          await setTheme(page,theme);
          assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow in ${theme}: ${path} ${width}`);
        }
        if([393,1440].includes(width)&&lang==='es'){
          await page.evaluate(()=>window.scrollTo(0,0));
          await setTheme(page,'light');
          await page.screenshot({path:`tmp/mobile-polish-qa/${engine}-${width}-${path.replaceAll('/','-')}-light.png`,fullPage:true,animations:'disabled'});
          if(path.startsWith('calculadoras/'))await page.locator('.lp-quick').screenshot({path:`tmp/mobile-polish-qa/${engine}-${width}-${path.replaceAll('/','-')}-calculator-light.png`,animations:'disabled'});
          await setTheme(page,'dark');
          await page.evaluate(()=>window.scrollTo(0,0));
          await page.screenshot({path:`tmp/mobile-polish-qa/${engine}-${width}-${path.replaceAll('/','-')}-dark.png`,fullPage:true,animations:'disabled'});
          if(path.startsWith('calculadoras/'))await page.locator('.lp-quick').screenshot({path:`tmp/mobile-polish-qa/${engine}-${width}-${path.replaceAll('/','-')}-calculator-dark.png`,animations:'disabled'});
          if(path.startsWith('calculadoras/')){
            await page.emulateMedia({reducedMotion:'no-preference'});
            assert.notEqual(await page.locator('.ib-viz-bar').first().evaluate(node=>getComputedStyle(node).transitionDuration),'0s','Normal motion keeps subtle transitions');
            await page.locator('.lp-fields input').first().fill('450000');
            assert.ok((await page.locator('#quick-result strong').textContent()).includes('$'),'Exact currency remains visible during animation');
            assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No overflow during an animated update');
            await page.emulateMedia({reducedMotion:'reduce'});
          }
        }
      }
      // Layout-only account/admin shells; this does not stand in for real-session E2E.
      for(const path of ['account.html','admin.html']){
        await page.goto(base+'/InvestorBlueprint/'+path,{waitUntil:'load'});
        await page.locator('#siteThemeToggle').waitFor({state:'attached'});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Membership shell overflow ${path} ${width}`);
        if(width<=840){
          assert.ok((await page.locator('.navbar').boundingBox()).height<=66,`Membership header ${path} ${width}`);
          assert.ok(await page.locator('.ib-membership-page button').evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length).every(node=>node.getBoundingClientRect().height>=44)),`Membership touch targets on ${path}`);
          await page.locator('.menu-toggle').click();
          assert.ok(await page.locator('#siteThemeToggle').isVisible());
          await page.keyboard.press('Escape');
        }
        if([393,1440].includes(width)&&lang==='es')for(const theme of ['light','dark']){
          await setTheme(page,theme);
          await page.screenshot({path:`tmp/mobile-polish-qa/${engine}-${width}-${path}-shell-${theme}.png`,animations:'disabled'});
        }
      }
      await page.goto(base+'/InvestorBlueprint/index.html#tools');
      await page.waitForFunction(expected=>document.documentElement.lang===expected&&Boolean(window.translations?.[expected]?.heroTitle),lang);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const anchor=await page.locator('#tools').evaluate(node=>({top:node.getBoundingClientRect().top,header:document.querySelector('.navbar').getBoundingClientRect().bottom}));
      assert.ok(anchor.top>=anchor.header-2,`Header covers tools at ${width}px: ${JSON.stringify(anchor)}`);
      console.log(`[mobile/${engine}] ${width}px ${lang}: public calculators, comparison, footer and anchors`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
