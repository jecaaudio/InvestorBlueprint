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
    let markup=await response.text();
    if(!/^<!doctype html>/i.test(markup.trim())||markup.length<1200)throw Error('Unexpected protected page');
    if(assetBase){
      const url=new URL(assetBase,window.location.href);
      markup=markup.replace(/<head(\s[^>]*)?>/i,(match)=>match+'<base href="'+url.href+'">');
    }
    // Keep a persistent profile route in every protected calculator, including
    // the seller's print-first tool. No administrative link is shown here.
    const profileShortcut='<a id="ib-account-shortcut" href="/InvestorBlueprint/account.html" aria-label="Mi perfil / My account" '+
      'style="position:fixed;bottom:14px;right:14px;z-index:9999;background:#146d82;color:#fff;'+
      'text-decoration:none;border-radius:999px;padding:12px 16px;font:600 14px system-ui;'+
      'box-shadow:0 5px 16px #0004">Mi perfil / My profile</a>';
    markup=markup.replace(/<\/head>/i,
      '<style>@media print{#ib-account-shortcut{display:none!important}}</style></head>');
    markup=markup.replace(/<\/body>/i,profileShortcut+'</body>');
    // This navigation delivers the HTML only AFTER the server authorizes the user.
    document.open();document.write(markup);document.close();
  }catch(err){
    console.error('Unable to load protected calculator',err);
    fail('No se pudo cargar la calculadora. Comprueba tu conexión e inténtalo de nuevo.');
  }
})();