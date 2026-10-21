/* Tell the tool catalog whether this member may see beta tools.
 * Administration is never linked from page menus; the approved owner reaches it from My profile. */
(function(){
 'use strict';
 // The approved owner always has beta access; other approved members need the
 // owner-set beta_tester flag. Missing column (migration not applied) means no access.
 async function readBetaAccess(client,userId,profile){
   if(profile?.access_status!=='approved')return false;
   if(profile.role==='admin')return true;
   try{
     const {data,error}=await client.from('member_profiles').select('beta_tester').eq('id',userId).maybeSingle();
     return !error&&data?.beta_tester===true;
   }catch(error){return false}
 }
 function publishBetaAccess(allowed){
   window.IB_BETA_ACCESS=allowed;
   if(typeof document.dispatchEvent==='function'&&typeof CustomEvent==='function'){
     document.dispatchEvent(new CustomEvent('ib:beta-access',{detail:{allowed}}));
   }
 }
 async function init(){
   const hasCatalog=Boolean(document.querySelector?.('.tool-grid'));
   if(!hasCatalog)return;
   const cfg=window.IB_AUTH_CONFIG||{};
   if(!cfg.supabaseUrl||!cfg.supabaseAnonKey||!window.supabase?.createClient)return;
   try{
     const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{
       auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
     });
     const {data:{session},error}=await client.auth.getSession();
     if(error||!session?.user)return;
     const {data:profile,error:profileError}=await client.from('member_profiles')
       .select('role,access_status').eq('id',session.user.id).maybeSingle();
     if(profileError)return;
     publishBetaAccess(await readBetaAccess(client,session.user.id,profile));
   }catch(error){/* Beta tools stay hidden. Protected pages check again. */}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
 else init();
})();
