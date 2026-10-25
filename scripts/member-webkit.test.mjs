// Safari-engine approximation: member settings on a mobile WebKit viewport.
// Uses a mocked Supabase client and keeps production member data untouched.
import {webkit} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.WEBKIT_BASE_URL||'http://127.0.0.1:4173';
let remotePreferences=null;
const browser=await webkit.launch({headless:true});
try {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  await context.exposeFunction('__readMemberPrefs',async()=>remotePreferences);
  await context.exposeFunction('__saveMemberPrefs',async value=>{remotePreferences=value;return value;});
  await context.addInitScript(()=>{
    const user={id:'browser-fixture-member',email:'browser-fixture@example.invalid'};
    const key='sb-ppeyoovykxomxinumibk-auth-token';
    if(!localStorage.getItem('qa-session-seeded')){
      localStorage.setItem('qa-session-seeded','yes');
      localStorage.setItem(key,JSON.stringify({user,access_token:'fixture-only',expires_at:Math.floor(Date.now()/1000)+3600}));
    }
    window.supabase={createClient:()=>({
      auth:{getUser:async()=>({data:{user:localStorage.getItem(key)?user:null},error:null}),
        getSession:async()=>({data:{session:JSON.parse(localStorage.getItem(key)||'null')},error:null}),
        onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},
        // Exercise the offline/error logout path; the real guard must clear local access.
        signOut:async()=>({error:{message:'Synthetic offline failure'}})},
      from(table){
        if(table==='member_profiles'){
          const q={select(){return q},eq(){return q},
            single:async()=>({data:{id:user.id,email:user.email,role:'admin',access_status:'approved'},error:null})};
          return q;
        }
        if(table==='member_preferences'){
          const q={select(){return q},eq(){return q},
            maybeSingle:async()=>({data:await window.__readMemberPrefs(),error:null}),
            upsert(data){this.pending=data;return q},
            single:async()=>({data:await window.__saveMemberPrefs(q.pending),error:null})};
          return q;
        }
        throw Error('unexpected table: '+table);
      }
    })};
  });
  // Match any pinned SDK version; the mock body fails the page's integrity check,
  // so the browser skips it and the window.supabase fixture above stays in place.
  await context.route(/^https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@/,
    route=>route.fulfill({status:200,contentType:'application/javascript',body:'/* SDK mocked for WebKit CI */'}));
  await page.goto(base+'/InvestorBlueprint/account.html',{waitUntil:'domcontentloaded'});
  await page.locator('#account-content').waitFor({state:'visible',timeout:12000});
  // A first visit shows the cookie banner over the form; answer it like a visitor would.
  await page.locator('#cookie-reject-all').click({timeout:12000});
  await page.locator('#cookie-banner').waitFor({state:'hidden',timeout:5000});
  assert.equal(await page.locator('#account-admin-button').isVisible(),true);
  await page.locator('#setting-display-name').fill('Safari QA');
  await page.locator('#setting-document-language').selectOption('en');
  await page.locator('#setting-report-detail').selectOption('summary');
  await page.locator('#account-save').click();
  await page.waitForFunction(()=>document.getElementById('account-settings-message')?.dataset.state==='success');
  assert.equal(remotePreferences?.display_name,'Safari QA');
  assert.equal(remotePreferences?.document_language,'en');
  assert.equal(remotePreferences?.report_detail,'summary');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#account-content').waitFor({state:'visible',timeout:12000});
  assert.equal(await page.locator('#setting-display-name').inputValue(),'Safari QA');
  assert.equal(await page.locator('#setting-document-language').inputValue(),'en');
  assert.equal(await page.locator('#setting-report-detail').inputValue(),'summary');
  await page.goto(base+'/InvestorBlueprint/index.html',{waitUntil:'domcontentloaded'});
  await page.goto(base+'/InvestorBlueprint/account.html',{waitUntil:'domcontentloaded'});
  await page.locator('#account-content').waitFor({state:'visible'});
  const other=await context.newPage();
  await other.goto(base+'/InvestorBlueprint/account.html',{waitUntil:'domcontentloaded'});
  await other.locator('#account-content').waitFor({state:'visible'});
  await page.locator('#account-signout').click();
  await page.waitForURL(/login\.html\?reason=local-signout/);
  await other.waitForURL(/login\.html\?reason=login/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('sb-ppeyoovykxomxinumibk-auth-token')),null);
  await page.goBack({waitUntil:'domcontentloaded'});
  await page.goBack({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#account-content').isVisible(),false,'Back must not reveal the previous member profile');
  console.log('[webkit/mobile] member profile saved and restored mocked preferences');
}finally{await browser.close();}
