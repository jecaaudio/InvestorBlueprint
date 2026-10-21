// Phone header layout: logo, language, theme and menu stay on one row.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.HEADER_BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
try {
  for (const width of [393,375,360]) {
    for (const lang of ['es','en']) {
      const context=await browser.newContext({viewport:{width,height:800},isMobile:true,hasTouch:true});
      await context.addInitScript(value=>{try{localStorage.setItem('preferredLanguage',value)}catch{}},lang);
      const page=await context.newPage();
      // The SDK is not needed for layout; skip the network call.
      await page.route(/^https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@/,route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
      await page.goto(base+'/InvestorBlueprint/index.html',{waitUntil:'load'});
      await page.locator('#siteThemeToggle').waitFor({state:'visible'});
      const rows=await page.evaluate(()=>['.brand-menu','.lang-switcher','#siteThemeToggle','.menu-toggle']
        .map(selector=>{const box=document.querySelector(selector).getBoundingClientRect();return Math.round(box.top+box.height/2);}));
      assert.ok(Math.max(...rows)-Math.min(...rows)<=4,`Header wraps at ${width}px (${lang}): ${rows.join(', ')}`);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Horizontal overflow at ${width}px`);
      await page.locator('.menu-toggle').click();
      assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'true');
      assert.ok(await page.locator('#primary-nav a').first().isVisible(),'Menu links visible after opening');
      console.log(`[header/mobile] ${width}px ${lang}: one row, menu opens`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
