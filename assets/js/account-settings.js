/* InvestorBlueprint self-service preferences. User-owned data protected by Supabase RLS. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const t=(es,en)=>document.documentElement.lang==='en'?en:es;
 const message=(value,type='info')=>{const e=$('account-settings-message');if(e){e.hidden=false;e.dataset.state=type;e.textContent=value}};
 const cfg=window.IB_AUTH_CONFIG||{};
 const isLang=value=>value==='en'?'en':'es';
 const isDetail=value=>value==='summary'?'summary':'detailed';
 const values={
   display:'setting-display-name',company:'setting-company-name',
   interface:'setting-interface-language',document:'setting-document-language',
   report:'setting-report-detail',notes:'setting-notes-detail'
 };
 const setCache=p=>{
   try{
     localStorage.setItem('preferredLanguage',isLang(p.interface_language));
     localStorage.setItem('ib_document_language',isLang(p.document_language));
     localStorage.setItem('ib_report_detail',isDetail(p.report_detail));
     localStorage.setItem('ib_notes_detail',isDetail(p.notes_detail));
     localStorage.setItem('ib_display_name',(p.display_name||'').slice(0,120));
     localStorage.setItem('ib_company_name',(p.company_name||'').slice(0,120));
   }catch(e){/* Storage may be disabled: Supabase remains source of truth. */}
 };
 function fill(data){
   $(values.display).value=data?.display_name||'';
   $(values.company).value=data?.company_name||'';
   $(values.interface).value=isLang(data?.interface_language||localStorage.getItem('preferredLanguage'));
   $(values.document).value=isLang(data?.document_language||localStorage.getItem('ib_document_language'));
   $(values.report).value=isDetail(data?.report_detail);
   $(values.notes).value=isDetail(data?.notes_detail);
 }
 function readForm(userId){
   return {
     user_id:userId,
     display_name:$(values.display).value.trim().slice(0,120),
     company_name:$(values.company).value.trim().slice(0,120),
     interface_language:isLang($(values.interface).value),
     document_language:isLang($(values.document).value),
     report_detail:isDetail($(values.report).value),
     notes_detail:isDetail($(values.notes).value),
     updated_at:new Date().toISOString()
   };
 }
 function showLogin(){
   $('account-loading').hidden=true;
   $('account-content').hidden=true;
   $('account-login-needed').hidden=false;
 }
 async function init(){
   if(!$('account-content'))return;
   if(!cfg.supabaseUrl||!cfg.supabaseAnonKey||!window.supabase?.createClient){
     showLogin();return;
   }
   const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{
     auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
   });
   try{
     const {data:{user},error:authError}=await client.auth.getUser();
     if(authError||!user){showLogin();return}
     const {data:profile,error:profileError}=await client.from('member_profiles')
       .select('id,email,full_name,role,access_status').eq('id',user.id).single();
     if(profileError||!profile){showLogin();return}
     const {data:settings,error:settingsError}=await client.from('member_preferences')
       .select('display_name,company_name,interface_language,document_language,report_detail,notes_detail')
       .eq('user_id',user.id).maybeSingle();
     if(settingsError)throw settingsError;
     const effective=settings||{
       display_name:'',company_name:'',interface_language:'es',
       document_language:'es',report_detail:'detailed',notes_detail:'detailed'
     };
     fill(effective);
     setCache(effective);
     $('account-email').textContent=user.email||profile.email||'';
     $('account-role').textContent=profile.role==='admin'?t('Rol: administrador','Role: administrator'):t('Rol: miembro','Role: member');
     const status={approved:t('Cuenta aprobada','Account approved'),pending:t('Pendiente de aprobación','Awaiting approval'),rejected:t('Solicitud rechazada','Request declined'),suspended:t('Cuenta suspendida','Account suspended')};
     $('account-status').textContent=status[profile.access_status]||profile.access_status;
     const isAdmin=profile.role==='admin'&&profile.access_status==='approved';
     $('account-admin-link').hidden=!isAdmin;
     $('account-admin-button').hidden=!isAdmin;
     $('account-loading').hidden=true;
     $('account-content').hidden=false;
     $('account-login-needed').hidden=true;
     // Apply saved display language only when it exists in the user's account.
     if(settings?.interface_language){
       try{await window.IBI18n?.applyLanguage(settings.interface_language)}catch(err){/* Keep the form usable if translation fails. */}
     }
     $('account-settings-form').addEventListener('submit',async event=>{
       event.preventDefault();
       const button=$('account-save');button.disabled=true;button.setAttribute('aria-busy','true');
       try{
         const {data:now,error:sessionError}=await client.auth.getUser();
         if(sessionError||now?.user?.id!==user.id)throw Error(t('La sesión cambió o venció. Vuelve a iniciar sesión.','Session changed or expired. Please sign in again.'));
         const next=readForm(user.id);
         const {data:saved,error}=await client.from('member_preferences')
           .upsert(next,{onConflict:'user_id'}).select('display_name,company_name,interface_language,document_language,report_detail,notes_detail').single();
         if(error)throw error;
         setCache(saved);
         message(t('Preferencias guardadas en tu cuenta.','Preferences saved to your account.'),'success');
         try{await window.IBI18n?.applyLanguage(saved.interface_language)}catch(err){/* Still saved securely. */}
       }catch(error){message(t('No se pudo guardar: ','Could not save: ')+(error?.message||'Error'),'error')}
       finally{button.disabled=false;button.setAttribute('aria-busy','false')}
     });
     $('account-signout').addEventListener('click',async()=>{
       await client.auth.signOut();
       for(const key of ['ib_document_language','ib_report_detail','ib_notes_detail','ib_display_name','ib_company_name']){
         try{localStorage.removeItem(key)}catch(error){}
       }
       window.location.assign('login.html?reason=login');
     });
   }catch(error){
     $('account-loading').hidden=true;
     $('account-login-needed').hidden=false;
     message(t('No se pudo cargar tu configuración: ','Could not load your settings: ')+(error?.message||'Error'),'error');
   }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
 else init();
})();
