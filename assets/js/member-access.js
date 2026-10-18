/* InvestorBlueprint member portal. Requires Supabase configuration + SQL migration. */
(function(){
  'use strict';
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
    say('portal-message',t('La autenticación segura aún no está activada. Se necesita conectar y configurar Supabase.','Secure authentication is not live yet. Connect and configure Supabase.'),'warning');
    return false;
  };
  window.IBMemberAuth={client,readProfile,statusLabel,t,say,configured:!!client};
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
    function showPanel(name){
      for(const [panel,form] of [['registration',registration],['login',login],['recover',recovery]]){
        if(form)form.hidden=panel!==name;
        $('tab-'+(panel==='registration'?'register':panel))?.setAttribute('aria-selected',String(panel===name));
      }
    }
    async function updateAccount(){
      try{
        const profile=await readProfile();
        if(!profile){$('account-summary').hidden=true;return}
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
      }catch(e){say('portal-message',e.message,'error')}
    }
    client.auth.onAuthStateChange((ev)=>{
      if(ev==='PASSWORD_RECOVERY'){$('new-password-form').hidden=false;showPanel('login')}
    });
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
        login.reset();await updateAccount();
      }catch(err){say('portal-message',err.message,'error')}
      finally{setBusy(login,false)}
    });
    recovery?.addEventListener('submit',async e=>{
      e.preventDefault();setBusy(recovery,true);
      try{
        const {error}=await client.auth.resetPasswordForEmail($('recover-email').value.trim().toLowerCase(),{redirectTo:new URL('login.html',location.href).href});
        if(error)throw error;
        say('portal-message',t('Si existe una cuenta, recibirás instrucciones por correo.','If an account exists, recovery instructions will be sent.'),'success');
      }catch(err){say('portal-message',err.message,'error')}
      finally{setBusy(recovery,false)}
    });
    newPassword?.addEventListener('submit',async e=>{
      e.preventDefault();setBusy(newPassword,true);
      try{
        const pw=$('new-password').value;
        if(pw.length<12)throw Error(t('La contraseña debe tener 12 caracteres como mínimo.','Password must have at least 12 characters.'));
        const {error}=await client.auth.updateUser({password:pw});if(error)throw error;
        say('portal-message',t('Contraseña actualizada.','Password updated.'),'success');
        newPassword.hidden=true;
      }catch(err){say('portal-message',err.message,'error')}
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
    $('admin-logout')?.addEventListener('click',async()=>{await client.auth.signOut();location.href='login.html'});
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