import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE='http://127.0.0.1:4173/InvestorBlueprint/';
const pages=[
  {name:'inicio',path:'index.html'},
  {name:'perfil',path:'account.html'},
  {name:'admin',path:'admin.html'},
  {name:'login',path:'login.html'},
  {name:'precios',path:'pricing.html'}
];
const widths=[320,375,390,430,768,1024,1440];
const mock=String.raw\`
try {localStorage.setItem('seller-net-ui-theme','light');localStorage.setItem('preferredLanguage','es')}catch(e){}
(function(){
 const user={id:'d64791d8-603a-4e42-be3c-f612711ad7c4',email:'sample-admin@example.test'};
 const own={id:user.id,email:user.email,full_name:'Cuenta de prueba',role:'admin',access_status:'approved',requested_at:'2026-10-01T00:00:00Z'};
 const prefs={display_name:'Usuario de prueba',company_name:'N&J Example LLC',interface_language:'es',document_language:'es',report_detail:'detailed',notes_detail:'detailed'};
 const client={
  auth:{async getSession(){return{data:{session:{user,access_token:'VISUAL_TEST_NO_REAL_TOKEN'}},error:null}},
  async getUser(){return{data:{user},error:null}},onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}}},async signOut(){return{error:null}}},
  from(table){const q={select(){return q},eq(){return q},order(){return q},
   async single(){return{data:table==='member_profiles'?own:prefs,error:null}},
   async maybeSingle(){return{data:table==='member_profiles'?own:prefs,error:null}},
   then(resolve){resolve({data:table==='member_profiles'?[own]:[],error:null});}};
   return q}
 };
 window.supabase={createClient:()=>client};
})();
\`;
mkdirSync('visual-audit-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const report=[];
for(const spec of pages){
 for(const width of widths){
  const height=width<500?844:width<1100?900:950;
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<500,hasTouch:width<500,locale:'es-ES'});
  await context.addInitScript({content:mock});
  await context.route('**/*',r=>{
    const url=r.request().url();
    if(!url.startsWith('http://127.0.0.1:4173/'))return r.abort();
    return r.continue();
  });
  const page=await context.newPage();
  const errors=[],responses=[];
  page.on('pageerror',e=>errors.push(String(e).slice(0,140)));
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(BASE))responses.push({status:r.status(),path:r.url().replace(BASE,'')})});
  try{
   await page.goto(BASE+spec.path,{waitUntil:'domcontentloaded',timeout:30000});
   if(spec.name==='perfil')await page.locator('#account-content').waitFor({state:'visible',timeout:7000}).catch(()=>{});
   if(spec.name==='admin')await page.locator('#admin-root').waitFor({state:'visible',timeout:7000}).catch(()=>{});
   await page.waitForTimeout(450);
   const measured=await page.evaluate(()=>{
    const box=(e)=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),end:Math.round(r.right)}};
    const header=document.querySelector('.navbar'),main=document.querySelector('main'),hero=document.querySelector('.hero,.access-hero'),nav=document.querySelector('#primary-nav'),brand=document.querySelector('.brand-menu'),language=document.querySelector('.lang-switcher'),theme=document.querySelector('#siteThemeToggle');
    const navRect=box(nav),headerRect=box(header),brandRect=box(brand),langRect=box(language),themeRect=box(theme),mainRect=box(main);
    const visible=(a)=>a&&a.getClientRects().length>0&&getComputedStyle(a).visibility!=='hidden'&&getComputedStyle(a).display!=='none';
    const interactive=[...document.querySelectorAll('a,button,input,select')].filter(visible);
    const clipped=interactive.map(e=>({tag:e.tagName,text:(e.textContent||e.getAttribute('aria-label')||e.id||'').trim().slice(0,34),...box(e)})).filter(x=>x.w>0&&x.h>0&&(x.x< -3||x.end>innerWidth+3)).slice(0,20);
    const tooSmall=interactive.filter(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0&&r.height<34}).map(x=>({label:(x.textContent||x.id||'').trim().slice(0,28),h:Math.round(x.getBoundingClientRect().height)})).slice(0,12);
    const boxes=[['brand',brandRect],['nav',navRect],['lang',langRect],['theme',themeRect]].filter(x=>x[1]&&x[1].w&&x[1].h);
    const overlaps=[];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
      const a=boxes[i][1],b=boxes[j][1],interX=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)),interY=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
      if(interX*interY>80)overlaps.push([boxes[i][0],boxes[j][0],Math.round(interX*interY)]);
    }
    return {
      viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth,
      h1:(document.querySelector('h1')?.textContent||'').trim().slice(0,70),
      navLinks:[...nav?.querySelectorAll('a')||[]].filter(visible).length,
      header:headerRect,brand:brandRect,nav:navRect,lang:langRect,theme:themeRect,main:mainRect,hero:box(hero),
      profileCard:box(document.querySelector('#account-content > section')),
      fields:box(document.querySelector('#account-settings-form')),
      clickTargetsSmall:tooSmall,clipped,overlaps,
      hasHorizontalOverflow:document.documentElement.scrollWidth>innerWidth+3,
      navHidden:nav?(!visible(nav)||nav.getBoundingClientRect().height<5):null,
      hasMenuToggle:!!document.querySelector('#menu-toggle'),
      ariaCurrent:!!document.querySelector('[aria-current="page"]')
    }
   });
   if(spec.name==='inicio'&&width===390){
     try{await page.locator('#menu-toggle').click({timeout:2500});const expanded=await page.locator('#primary-nav').evaluate(el=>({visible:el.getBoundingClientRect().height,expanded:document.getElementById('menu-toggle')?.getAttribute('aria-expanded')}));measured.openMenu=expanded}catch(err){measured.openMenuError=String(err).slice(0,150)}
   }
   report.push({page:spec.name,width,...measured,jsErrors:errors.slice(0,6),httpErrors:responses.slice(0,6)});
   const shot=(spec.name==='perfil'&&[390,1440].includes(width))||(spec.name==='inicio'&&[390,1440].includes(width))||(spec.name==='admin'&&width===390)||(spec.name==='login'&&width===390);
   if(shot){
     const name=spec.name+'-'+width;
     await page.screenshot({path:'visual-audit-artifacts/'+name+'.jpg',type:'jpeg',quality:46,fullPage:false});
     const bytes=await page.screenshot({type:'jpeg',quality:42,fullPage:false});
     console.log('VISUAL_IMAGE:'+name+':'+bytes.toString('base64'));
   }
  }catch(error){report.push({page:spec.name,width,error:String(error).slice(0,500),jsErrors:errors})}
  await context.close();
 }
}
writeFileSync('visual-audit-artifacts/layout-report.json',JSON.stringify(report,null,2));
console.log('VISUAL_REPORT_START');
for(const v of report)console.log('LAYOUT:'+JSON.stringify(v));
console.log('VISUAL_REPORT_END');
await browser.close();
if(report.some(x=>x.error))process.exitCode=1;
