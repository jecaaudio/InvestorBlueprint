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
  await page.exposeFunction('__readMemberPrefs',async()=>remotePreferences);
  await page.exposeFunction('__saveMemberPrefs',async value=>{remotePreferences=value;return value;});
  await page.addInitScript(()=>{
    const user={id:'browser-fixture-member',email:'browser-fixture@example.invalid'};
    window.supabase={createClient:()=>({
      auth:{getUser:async()=>({data:{user},error:null}),signOut:async()=>({error:null})},
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
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    route=>route.fulfill({status:200,contentType:'application/javascript',body:'/* SDK mocked for WebKit CI */'}));
  await page.goto(base+'/InvestorBlueprint/account.html',{waitUntil:'domcontentloaded'});
  await page.locator('#account-content').waitFor({state:'visible',timeout:12000});
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
  console.log('[webkit/mobile] member profile saved and restored mocked preferences');
}finally{await browser.close();}
