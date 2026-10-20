/* Reveal the administrative shortcut only when Supabase confirms an approved admin. */
(function(){
 'use strict';
 async function init(){
   const adminLinks=['index-admin-link','primary-admin-link']
     .map(id=>document.getElementById(id)).filter(Boolean);
   if(!adminLinks.length)return;
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
     if(!profileError && profile?.role==='admin'&&profile.access_status==='approved'){
       adminLinks.forEach(link=>{link.hidden=false});
     }
   }catch(error){/* Admin shortcut remains hidden. Protected admin page checks again. */}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
 else init();
})();
