/* InvestorBlueprint member portal. Requires Supabase configuration + SQL migration. */
(function(){
  'use strict';
  // Preserve recovery URL state before the auth client consumes URL hash tokens.
  // On a fast mobile browser, PASSWORD_RECOVERY can fire before DOMContentLoaded.
  const initialHash=new URLSearchParams(window.location.hash.slice(1));
  const initialQuery=new URLSearchParams(window.location.search);
  const recoveryLinkIntent=initialHash.get('type')==='recovery' ||
    (initialQuery.get('type')==='recovery' && initialQuery.has('code'));
  const recoveryRedirectError=initialHash.get('error_description') ||
    initialQuery.get('error_description') || '';
  const cfg=window.IB_AUTH_CONFIG||{};
  const valid=typeof cfg.supabaseUrl==='string'&&/^https:\/\//i.test(cfg.supabaseUrl)&&typeof cfg.supabaseAnonKey==='string'&&cfg.supabaseAnonKey.length>25;
  const client=valid&&window.supabase?.createClient?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
  const $=id=>document.getElementById(id);
  const lang=()=>document.documentElement.lang==='en'?'en':'es';
  const t=(es,en)=>lang()==='en'?en:es;
  const say=(id,msg,type='info')=>{const el=$(id);if(!el)return;el.textContent=msg;el.dataset.state=type;el.hidden=false;};
  const setBusy=(form,busy)=>form?.querySelectorAll('button[type="submit"]').forEach(x=>{x.disabled=busy;x.setAttribute('aria-busy',String(busy));});
  const readProfile=async()=>{
    if(!client)throw Error(t('El backend todavía no está conectado.','Backend is not connected yet.'));
    const {data:userData,error:userError}=await client.auth.getUser();
    if(userError||!userData?.user)return null;
    const {data:profile,error}=await client.from('member_profiles').select('id,email,full_name,role,access_status,requested_at,reviewed_at').eq('id',userData.user.id).single();
    if(error)throw error;
    return profile;
  };
  const statusLabel=status=>({pending:t('Pendiente de aprobación','Awaiting approval'),approved:t('Acceso aprobado','Access approved'),rejected:t('Solicitud rechazada','Request declined'),suspended:t('Acceso suspendido','Access suspended')}[status]||status);
  const requireBackend=()=>{
    if(client)return true;
    say('portal-message',t('No se pudo cargar el servicio de inicio de sesión. Actualiza la página o intenta de nuevo en Safari.','The sign-in service could not load. Refresh the page or try Safari.'),'error');
    return false;
  };
  window.IBMemberAuth={client,readProfile,statusLabel,t,say,configured:!!client};
  // Capture the one-time recovery event immediately: the SDK may emit it
  // before DOMContentLoaded on fast mobile browsers or embedded email views.
  let recoveryEventSeen=false;
  let recoveryEventCallback=null;
  if(client){
    client.auth.onAuthStateChange((event)=>{
      if(event==='PASSWORD_RECOVERY'){
        recoveryEventSeen=true;
        if(recoveryEventCallback)recoveryEventCallback();
      }
    });
  }
  document.addEventListener('DOMContentLoaded',async()=>{
    if(!$('member-login')&&!$('admin-root'))return;
    if($('member-login')) await initPortal();
    if($('admin-root')) await initAdmin();
  });

  async function initPortal(){
    const registration=$('registration-form'),login=$('login-form'),recovery=$('recover-form'),newPassword=$('new-password-form');
    if(!requireBackend()){
      [registration,login,recovery,newPassword].forEach(form=>{form?.querySelectorAll('button[type="submit"]').forEach(x=>x.disabled=true)});
      return;
    }
    $('tab-register')?.addEventListener('click',()=>showPanel('registration'));
    $('tab-login')?.addEventListener('click',()=>showPanel('login'));
    $('tab-recover')?.addEventListener('click',()=>showPanel('recover'));
    $('toggle-signin-password')?.addEventListener('click',()=>{
      const input=$('signin-password'),button=$('toggle-signin-password');
      if(!input||!button)return;
      const reveal=input.type==='password';
      input.type=reveal?'text':'password';
      button.setAttribute('aria-pressed',String(reveal));
      button.textContent=reveal?t('Ocultar contraseña','Hide password'):t('Mostrar contraseña','Show password');
    });
    let canSetRecoveredPassword=false;
    function showPanel(name){
      for(const [panel,form] of [['registration',registration],['login',login],['recover',recovery]]){
        if(form)form.hidden=panel!==name;
        $('tab-'+(panel==='registration'?'register':panel))?.setAttribute('aria-pressed',String(panel===name));
      }
      if(newPassword && name!=='new-password')newPassword.hidden=true;
    }
    function showRecoveryPasswordForm(){
      if(recoveryRedirectError)return;
      canSetRecoveredPassword=true;
      showPanel('new-password');
      newPassword.hidden=false;
      say('portal-message',t('Enlace verificado. Puedes establecer tu nueva contraseña; la página comprobará y renovará tu sesión al guardar.','Recovery link verified. Your session will be checked and refreshed when saving the new password.'),'success');
    }
    recoveryEventCallback=showRecoveryPasswordForm;
    if(recoveryEventSeen)showRecoveryPasswordForm();
    const entryParams=new URLSearchParams(window.location.search);
    if(entryParams.get('recover')==='1') showPanel('recover');
    else if(entryParams.has('returnTo')||entryParams.get('reason')==='login') showPanel('login');
    if(recoveryRedirectError){
      showPanel('recover');
      say('portal-message',t('El enlace de recuperación es inválido o venció. Solicita otro correo y abre solo el enlace más reciente.','Your reset link is invalid or expired. Request another message and open only the newest link.'),'error');
    }
    async function updateAccount(){
      try{
        const profile=await readProfile();
        if(!profile){$('account-summary').hidden=true;return null}
        $('account-summary').hidden=false;
        $('member-email').textContent=profile.email;
        $('member-status').textContent=statusLabel(profile.access_status);
        $('member-status').dataset.state=profile.access_status;
        $('member-detail').textContent=profile.access_status==='approved'
          ?t('Tu acceso está aprobado. Las herramientas pasarán al área protegida cuando se complete el despliegue seguro.','Your access is approved. Tools will move into the protected area after secure deployment is completed.')
          :profile.access_status==='pending'
          ?t('Solicitud recibida. El administrador revisará tu cuenta antes de autorizar las herramientas.','Request received. The administrator must approve your account before you can use the tools.')
          :t('Para obtener más información, contacta al administrador.','Contact the administrator for more information.');
        $('admin-link').hidden=!(profile.role==='admin'&&profile.access_status==='approved');
        $('signout-button').hidden=false;
        return profile;
      }catch(e){say('portal-message',e.message,'error');return null}
    }
    // If the SDK finished parsing the recovery URL before the portal loaded,
    // validate the resulting session before offering the password form.
    if(recoveryLinkIntent&&!recoveryRedirectError){
      const {data,error}=await client.auth.getSession();
      if(!error&&data?.session?.user)showRecoveryPasswordForm();
      else {
        showPanel('recover');
        say('portal-message',t('No se pudo validar el enlace de recuperación. Solicita uno nuevo.','Could not validate the recovery link. Request another one.'),'error');
      }
    }
    registration?.addEventListener('submit',async e=>{
      e.preventDefault();setBusy(registration,true);
      const email=$('signup-email').value.trim().toLowerCase(),password=$('signup-password').value;
      const name=$('signup-name').value.trim();
      try{
        if(password.length<12)throw Error(t('Usa una contraseña de al menos 12 caracteres.','Use a password of at least 12 characters.'));
        const {error}=await client.auth.signUp({email,password,options:{data:{full_name:name},emailRedirectTo:new URL('login.html',location.href).href}});
        if(error)throw error;
        say('portal-message',t('Solicitud creada. Confirma tu correo y espera la aprobación del administrador.','Request created. Confirm your email and wait for administrator approval.'),'success');
        registration.reset();await updateAccount();
      }catch(err){say('portal-message',err.message,'error')}
      finally{setBusy(registration,false)}
    });
    login?.addEventListener('submit',async e=>{
      e.preventDefault();setBusy(login,true);
      try{
        const {error}=await client.auth.signInWithPassword({email:$('signin-email').value.trim().toLowerCase(),password:$('signin-password').value});
        if(error)throw error;
        say('portal-message',t('Sesión iniciada. Consulta el estado de tu solicitud.','Signed in. Your request status is shown below.'),'success');
        login.reset();
        const profile=await updateAccount();
        if(profile?.access_status==='approved'){
          const raw=new URLSearchParams(window.location.search).get('returnTo')||'';
          const ok=raw.startsWith('/InvestorBlueprint/tools/')||raw.startsWith('/InvestorBlueprint/calculadora-venta/');
          if(ok && !raw.startsWith('//') && !raw.includes('\\')) {
            const target=new URL(raw,window.location.origin);
            if(target.origin===window.location.origin){window.location.assign(target.href);return}
          }
          if(profile.role==='admin'){
            window.location.assign(window.location.pathname.endsWith('/preview-login.html')?'preview-admin.html':'admin.html');
          }else{
            window.location.assign('index.html#tools');
          }
        }
      }catch(err){
        const invalid=err?.code==='invalid_credentials'||/invalid login credentials/i.test(err?.message||'');
        say('portal-message',invalid
          ?t('Correo o contraseña incorrectos. Comprueba la contraseña creada en Supabase. Si no la recuerdas, selecciona «Recuperar contraseña».','Incorrect email or password. Check the password you created in Supabase, or select “Reset password”.')
          :t('No fue posible iniciar sesión: ','Could not sign in: ')+(err?.message||t('Error desconocido.','Unknown error.')),'error');
      }
      finally{setBusy(login,false)}
    });
    recovery?.addEventListener('submit',async e=>{
      e.preventDefault();setBusy(recovery,true);
      try{
        const {error}=await client.auth.resetPasswordForEmail($('recover-email').value.trim().toLowerCase(),{redirectTo:new URL('login.html',location.href).href});
        if(error)throw error;
        say('portal-message',t('Solicitud recibida. Revisa tu correo y la carpeta de spam. Si el enlace te envía a localhost, será necesario configurar la URL de redirección en Supabase.','Request received. Check your email and spam. If the link leads to localhost, configure the redirect URL in Supabase.'),'success');
      }catch(err){
        const rateLimited=err?.status===429||err?.code==='over_email_send_rate_limit'||err?.code==='over_email_send_limit';
        say('portal-message',rateLimited
          ?t('Se solicitaron correos de recuperación demasiado rápido. Espera al menos un minuto antes de volver a intentarlo.','Too many recovery emails were requested. Wait at least one minute before retrying.')
          :t('No se pudo solicitar la recuperación: ','Could not request recovery: ')+(err?.message||''),'error');
      }
      finally{setBusy(recovery,false)}
    });
    newPassword?.addEventListener('submit',async e=>{
      e.preventDefault();setBusy(newPassword,true);
      try{
        if(!canSetRecoveredPassword)throw Error(t('Abre primero el enlace de recuperación recibido por correo.','Open the password recovery link from your email first.'));
        const pw=$('new-password').value;
        if(pw.length<12)throw Error(t('La contraseña debe tener 12 caracteres como mínimo.','Password must have at least 12 characters.'));
        // The email token has already been redeemed. At this point what matters
        // is a valid Supabase session, not the remaining lifetime of the email link.
        const {data:sessionData,error:sessionError}=await client.auth.getSession();
        if(sessionError||!sessionData?.session)throw Error(t('La sesión de recuperación ya no está disponible. Solicita un enlace nuevo y ábrelo en Safari.','Your recovery session is no longer available. Request a new link and open it in Safari.'));
        const current=sessionData.session;
        const now=Math.floor(Date.now()/1000);
        if(current.expires_at&&current.expires_at-now<180){
          const {data:refreshed,error:refreshError}=await client.auth.refreshSession();
          if(refreshError||!refreshed?.session)throw Error(t('La sesión no pudo renovarse. Solicita un enlace de recuperación nuevo.','The session could not be refreshed. Request another password recovery link.'));
        }
        const {data:verified,error:verifyError}=await client.auth.getUser();
        if(verifyError||!verified?.user)throw Error(t('No pudimos verificar tu sesión. Solicita otro enlace y ábrelo en el mismo navegador donde cambiarás la contraseña.','We could not verify the session. Request another link and open it in the same browser where you will change the password.'));
        let result=await client.auth.updateUser({password:pw});
        if(result.error&&(/jwt.*expir|token.*expir|session.*expir/i.test(result.error.message||'')||result.error.status===401)){
          const {error:refreshError}=await client.auth.refreshSession();
          if(!refreshError)result=await client.auth.updateUser({password:pw});
        }
        if(result.error)throw result.error;
        canSetRecoveredPassword=false;
        newPassword.reset();
        await client.auth.signOut();
        showPanel('login');
        say('portal-message',t('Contraseña actualizada. Ahora inicia sesión con tu nueva contraseña de InvestorBlueprint.','Password updated. Now sign in with your new InvestorBlueprint password.'),'success');
      }catch(err){
        const expired=err?.code==='otp_expired'||err?.code==='session_not_found'||/expired|expirado|caducado/i.test(err?.message||'');
        if(expired) {
          canSetRecoveredPassword=false;
          showPanel('recover');
          say('portal-message',t('El enlace o la sesión ya no son válidos. Solicita un nuevo correo y ábrelo en Safari. El enlace se utiliza una sola vez.','The link or session is no longer valid. Request a new email and open it in Safari. Recovery links can only be used once.'),'error');
        }else{
          say('portal-message',t('No se pudo actualizar la contraseña: ','Could not update your password: ')+(err?.message||t('Inténtalo otra vez.','Please try again.')),'error');
        }
      }
      finally{setBusy(newPassword,false)}
    });
    $('signout-button')?.addEventListener('click',async()=>{
      await client.auth.signOut();$('account-summary').hidden=true;
      say('portal-message',t('Sesión cerrada.','Signed out.'),'success');
    });
    await updateAccount();
  }
  async function initAdmin(){
    if(!client){say('admin-message',t('El backend no está configurado.','Backend not configured.'),'warning');return}
    const profile=await readProfile().catch(()=>null);
    if(!profile||profile.role!=='admin'||profile.access_status!=='approved'){
      $('admin-root').hidden=true;
      $('admin-denied').hidden=false;
      return;
    }
    $('admin-root').hidden=false;
    $('admin-denied').hidden=true;
    $('admin-identity').textContent=profile.email;
    $('admin-logout')?.addEventListener('click',async()=>{await client.auth.signOut();location.href=(document.body.dataset.memberLoginPath||'login.html')});
    const list=$('member-list'),filter=$('member-filter'),reload=$('members-refresh');
    const allowed=['approved','rejected','suspended','pending'];
    async function loadMembers(){
      say('admin-message',t('Cargando solicitudes…','Loading requests…'),'info');
      const {data,error}=await client.from('member_profiles')
        .select('id,email,full_name,role,access_status,requested_at,reviewed_at').order('requested_at',{ascending:false});
      if(error){say('admin-message',error.message,'error');return}
      list.replaceChildren();
      const rows=(data||[]).filter(x=>filter.value==='all'||x.access_status===filter.value);
      $('member-total').textContent=String(rows.length);
      for(const member of rows){
        const row=document.createElement('article');row.className='member-row';
        const top=document.createElement('div');top.className='member-info';
        const name=document.createElement('strong');name.textContent=member.full_name||member.email;
        const email=document.createElement('small');email.textContent=member.email;
        const status=document.createElement('span');status.className='member-status';status.dataset.state=member.access_status;status.textContent=statusLabel(member.access_status);
        const date=document.createElement('small');date.textContent=new Date(member.requested_at).toLocaleDateString(lang()==='en'?'en-US':'es-US');
        top.append(name,email,status,date);row.append(top);
        if(member.id!==profile.id){
          const select=document.createElement('select');select.setAttribute('aria-label',t('Estado de acceso','Access status'));
          for(const state of allowed){const o=document.createElement('option');o.value=state;o.textContent=statusLabel(state);select.append(o)}
          select.value=member.access_status;
          const button=document.createElement('button');button.type='button';button.className='btn btn-primary';
          button.textContent=t('Guardar','Save');
          button.addEventListener('click',async()=>{
            if(select.value===member.access_status)return;
            if(!confirm(t('¿Confirmas el cambio de acceso para ','Confirm access change for ')+member.email+'?'))return;
            button.disabled=true;
            const {error}=await client.from('member_profiles').update({access_status:select.value}).eq('id',member.id);
            button.disabled=false;
            if(error){say('admin-message',error.message,'error');return}
            say('admin-message',t('Acceso actualizado y auditado.','Access updated and audited.'),'success');
            await loadMembers();
          });
          const actions=document.createElement('div');actions.className='member-actions';actions.append(select,button);row.append(actions);
        } else {
          const self=document.createElement('small');self.textContent=t('Cuenta administradora','Administrator account');row.append(self);
        }
        list.append(row);
      }
      say('admin-message',rows.length?t('Solicitudes actualizadas.','Requests loaded.'):t('No hay solicitudes con ese estado.','No requests with that status.'),'success');
    }
    filter.addEventListener('change',loadMembers);
    reload.addEventListener('click',loadMembers);
    await loadMembers();
  }
})();