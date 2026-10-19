/* Server-delivered InvestorBlueprint calculator loader.
 * This page contains NO calculator HTML. Supabase verifies the login and
 * approved status before the protected HTML is returned.
 */
(async function(){
  'use strict';
  const script=document.currentScript;
  const tool=script?.dataset.tool||'';
  const assetBase=script?.dataset.assetBase||'';
  const rootPath=script?.dataset.root||'../';
  const status=document.getElementById('secure-loading-message');
  const loginURL=new URL(rootPath+'login.html',window.location.href);
  const here=window.location.pathname+window.location.search;
  loginURL.searchParams.set('returnTo',here);
  const say=(message)=>{
    if(status)status.textContent=message;
    document.documentElement.classList.remove('ib-loading');
  };
  const fail=(message)=>{
    say(message);
    const link=document.getElementById('secure-login-link');
    if(link){link.href=loginURL.href;link.hidden=false;}
  };
  const cfg=window.IB_AUTH_CONFIG||{};
  if(!/^[a-z0-9-]+$/.test(tool) || !cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase?.createClient){
    fail('El servicio de autenticación no está disponible. Prueba actualizar la página.');return;
  }
  try{
    const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data:{session},error}=await client.auth.getSession();
    if(error||!session?.access_token){window.location.replace(loginURL.href);return;}
    const endpoint=cfg.supabaseUrl+'/functions/v1/ib-protected-tools?tool='+encodeURIComponent(tool);
    const response=await fetch(endpoint,{method:'GET',cache:'no-store',
      headers:{Authorization:'Bearer '+session.access_token,apikey:cfg.supabaseAnonKey,Accept:'text/html'}});
    if(response.status===401){await client.auth.signOut();window.location.replace(loginURL.href);return;}
    if(response.status===403){fail('Tu cuenta necesita aprobación antes de abrir esta calculadora.');return;}
    if(!response.ok)throw Error('Server returned '+response.status);
    // Reset the previous member's report metadata *before* fetching settings.
    // A failed RLS/network lookup must not leak a former user's name/company.
    const safeDefaults={
      ib_display_name:'',ib_company_name:'',ib_document_language:'es',
      ib_report_detail:'detailed',ib_notes_detail:'detailed'
    };
    try{
      for(const [key,value] of Object.entries(safeDefaults))localStorage.setItem(key,value);
    }catch(error){console.warn('Local report preferences are unavailable')}
    // Refresh document preferences under the currently authenticated member.
    // Never reuse a previous account's exported author name or language.
    try{
      const {data:prefs,error:prefsError}=await client.from('member_preferences')
        .select('display_name,company_name,interface_language,document_language,report_detail,notes_detail')
        .eq('user_id',session.user.id).maybeSingle();
      if(!prefsError){
        const p=prefs||{display_name:'',company_name:'',interface_language:'es',
          document_language:'es',report_detail:'detailed',notes_detail:'detailed'};
        const settings={
          ib_display_name:p.display_name||'',ib_company_name:p.company_name||'',
          ib_document_language:p.document_language==='en'?'en':'es',
          ib_report_detail:p.report_detail==='summary'?'summary':'detailed',
          ib_notes_detail:p.notes_detail==='summary'?'summary':'detailed'
        };
        for(const [key,value] of Object.entries(settings))localStorage.setItem(key,value);
      }
    }catch(error){console.warn('Member report preferences could not be synced',error)}
    let markup=await response.text();
    if(!/^<!doctype html>/i.test(markup.trim())||markup.length<1200)throw Error('Unexpected protected page');
    if(assetBase){
      const url=new URL(assetBase,window.location.href);
      markup=markup.replace(/<head(\s[^>]*)?>/i,(match)=>match+'<base href="'+url.href+'">');
    }
    // This navigation delivers the HTML only AFTER the server authorizes the user.
    document.open();document.write(markup);document.close();
  }catch(err){
    console.error('Unable to load protected calculator',err);
    fail('No se pudo cargar la calculadora. Comprueba tu conexión e inténtalo de nuevo.');
  }
})();