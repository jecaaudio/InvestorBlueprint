/* Reveal the administrative shortcut only when Supabase confirms an approved admin,
 * and tell the tool catalog whether this member may see beta tools. */
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
   const adminLinks=['index-admin-link','primary-admin-link']
     .map(id=>document.getElementById(id)).filter(Boolean);
   const hasCatalog=Boolean(document.querySelector?.('.tool-grid'));
   if(!adminLinks.length&&!hasCatalog)return;
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
     if(profile?.role==='admin'&&profile.access_status==='approved'){
       adminLinks.forEach(link=>{link.hidden=false});
     }
     if(hasCatalog)publishBetaAccess(await readBetaAccess(client,session.user.id,profile));
   }catch(error){/* Admin shortcut and beta tools stay hidden. Protected pages check again. */}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
 else init();
})();
