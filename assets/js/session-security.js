/* Browser session lifecycle. Server authorization remains independent of this UI lock. */
(function(){
 'use strict';
 if(window.IBSessionSecurity){window.IBSessionSecurity.mount();return;}
 const root=new URL('../../',document.currentScript.src);
 const IDLE=15*60*1000,MAX=8*60*60*1000;
 let client=null,locked=false,ending=null,timer=null,controller=null,warning=null;
 const watched=new WeakSet();
 const ref=()=>/^https:\/\/([a-z0-9]+)\.supabase\.co/i.exec(window.IB_AUTH_CONFIG?.supabaseUrl||'')?.[1]||window.IB_SITE?.supabaseProjectRef||'';
 const key=()=>ref()?'sb-'+ref()+'-auth-token':'';
 const policyKey=()=>key()+'-ib-lifetime';
 let memory=null;
 const read=(name)=>{try{return JSON.parse(localStorage.getItem(name)||'null')}catch{return null}};
 const record=()=>read(policyKey())||memory;
 function write(value){memory=value;try{if(value)localStorage.setItem(policyKey(),JSON.stringify(value));else localStorage.removeItem(policyKey())}catch{}}
 const saved=()=>{const value=key()?read(key()):null;return value?.currentSession||value};
 const privatePage=()=>/\/(?:account|admin)\.html$|\/(?:tools|calculadora-venta)\//.test(location.pathname);
 const expired=(value=record())=>Boolean(value&&(Date.now()-value.lastActive>=IDLE||Date.now()-value.started>=MAX||Date.now()<value.started-60000));
 function emit(){document.dispatchEvent(new CustomEvent('ib:session-changed'));}
 function clearCache(){
   for(const name of [key(),key()+'-code-verifier','ib_display_name','ib_company_name','ib_document_language','ib_report_detail','ib_notes_detail']){
     if(name)try{localStorage.removeItem(name)}catch{}
   }
   write(null);window.IB_REPORT_PREFERENCES=Object.freeze({});window.IB_BETA_ACCESS=false;
   document.dispatchEvent(new CustomEvent('ib:beta-access',{detail:{allowed:false}}));
 }
 function redact(){
   if(!privatePage()||!document.body)return;
   window.IB_REPORT_PREFERENCES=Object.freeze({});
   const main=document.createElement('main');main.setAttribute('role','status');
   main.textContent=document.documentElement.lang==='en'?'Session locked. Please sign in again.':'Sesión bloqueada. Vuelve a iniciar sesión.';
   document.body.replaceChildren(main);
 }
 function navigate(reason){
   const url=new URL('login.html',root);url.searchParams.set('reason',reason);
   (window.IBNavigate||(value=>location.replace(value)))(url.href);
 }
 async function signOut(activeClient=client,{reason='login',revoke=true}={}){
   if(ending)return ending;
   locked=true;redact();warning?.remove();warning=null;
   ending=(async()=>{
     let timeout;
     try{
       if(revoke&&activeClient?.auth?.signOut){
         const result=await Promise.race([
           activeClient.auth.signOut({scope:'local'}),
           new Promise(resolve=>{timeout=setTimeout(()=>resolve({error:true}),4000)})
         ]);
         if(result?.error)reason='local-signout';
       }
     }catch{reason='local-signout'}
     finally{
       clearTimeout(timeout);activeClient?.auth?.stopAutoRefresh?.();clearCache();emit();navigate(reason);
     }
   })();
   return ending;
 }
 function observe(session,{fresh=false}={}){
   if(!session?.user?.id||locked&&!fresh)return;
   const old=record();
   if(fresh){locked=false;ending=null;}
   if(fresh||!old||old.userId!==session.user.id)write({userId:session.user.id,started:Date.now(),lastActive:Date.now()});
   check();emit();
 }
 function touch(){
   if(locked)return;
   const value=record();if(!value)return;
   if(expired(value)){void signOut(client,{reason:'expired'});return;}
   if(Date.now()-value.lastActive>10000){value.lastActive=Date.now();write(value);}
   warning?.remove();warning=null;
 }
 function check(){
   if(locked)return false;
   const value=record();if(!value)return true;
   if(expired(value)){void signOut(client,{reason:'expired'});return false;}
   if(IDLE-(Date.now()-value.lastActive)<=60000&&document.body&&!warning&&document.visibilityState!=='hidden'){
     warning=document.createElement('aside');warning.setAttribute('role','alert');
     warning.style.cssText='position:fixed;bottom:20px;left:16px;right:16px;max-width:480px;margin:auto;padding:16px;background:#172738;color:#fff;border:2px solid #5bc3db;border-radius:12px;z-index:100000;font:16px/1.5 system-ui';
     const english=document.documentElement.lang==='en';
     const text=document.createElement('p');text.textContent=english?'Your session will close in less than a minute due to inactivity.':'Tu sesión se cerrará en menos de un minuto por inactividad.';
     const button=document.createElement('button');button.type='button';button.textContent=english?'Continue session':'Continuar sesión';
     button.style.cssText='min-height:44px;padding:8px 16px;border-radius:8px;border:0;background:#fff;color:#172738;font:inherit';
     button.addEventListener('click',touch);warning.append(text,button);document.body.append(warning);
   }
   return true;
 }
 function attach(value){
   client=value;
   if(watched.has(value))return;watched.add(value);
   value.auth.onAuthStateChange?.((event,session)=>{
     if(event==='SIGNED_OUT'){
       // Never await SDK auth methods inside their own state callback.
       setTimeout(()=>{if(!locked)void signOut(value,{revoke:false})},0);
     }else if(session?.user)observe(session);
   });
   value.auth.getSession?.().then(({data,error})=>{if(!error&&data?.session)observe(data.session)}).catch(()=>{});
 }
 function mount(){
   controller?.abort();controller=new AbortController();const options={signal:controller.signal};
   for(const name of ['pointerdown','keydown','touchstart'])document.addEventListener(name,event=>{if(event.isTrusted)touch()},options);
   document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()},options);
   window.addEventListener('storage',event=>{
     if(event.key===key()){
       const session=saved(),old=record();
       if(!session?.user?.id&&old){void signOut(client,{revoke:false});}
       else if(old&&session?.user?.id!==old.userId){redact();if(privatePage())navigate('login');}
       emit();
     }else if(event.key===policyKey())check();
   },options);
   window.addEventListener('pagehide',event=>{if(event.persisted)redact()},options);
   window.addEventListener('pageshow',event=>{
     if(!check())return;
     if(event.persisted&&privatePage()){
       redact();
       if(!saved()?.user?.id){void signOut(client,{revoke:false});return;}
       Promise.resolve(client?.auth?.getUser?.()).then(result=>{
         if(!result?.error&&result?.data?.user&&check()&&!locked)location.reload();
         else void signOut(client,{revoke:false});
       }).catch(()=>void signOut(client,{revoke:false}));
     }
   },options);
   clearInterval(timer);timer=setInterval(check,15000);
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',check,{once:true,...options});else check();
 }
 window.IBSessionSecurity={attach,observe,start:session=>observe(session,{fresh:true}),signOut,check,mount,
   isLocked:()=>locked||expired(),isExpired:()=>expired(),limits:Object.freeze({idleMs:IDLE,maxMs:MAX})};
 mount();
})();
