/* "Subscription" card on the account page. Hidden until billing is enabled. */
(function(){
 'use strict';
 const billing=window.IB_BILLING||{enabled:false};
 const $=id=>document.getElementById(id);
 const english=()=>document.documentElement.lang==='en';
 const L=(es,en)=>english()?en:es;
 let state=null;
 function render(){
   const card=$('account-billing');if(!card)return;
   if(!billing.enabled){card.hidden=true;return}
   card.hidden=false;
   const active=state&&['active','trialing'].includes(state.billing_status)&&state.plan_code!=='none';
   const plan={pro:'Pro',team:L('Equipo','Team'),trial:L('Prueba','Trial')}[state?.plan_code]||'';
   const status={active:L('activa','active'),trialing:L('en prueba','in trial'),past_due:L('pago pendiente','payment due'),cancelled:L('cancelada','cancelled')}[state?.billing_status]||'';
   const until=state?.valid_until?new Date(state.valid_until).toLocaleDateString(english()?'en-US':'es-US',{year:'numeric',month:'long',day:'numeric'}):'';
   $('account-plan').textContent=plan&&status
     ?L('Plan ','Plan ')+plan+' · '+status+(until?' · '+(state.billing_status==='cancelled'?L('hasta ','until '):L('renueva el ','renews '))+until:'')
     :L('Todavía no tienes un plan de pago.','You do not have a paid plan yet.');
   const portal=typeof billing.customerPortal==='string'&&/^https:\/\/billing\.stripe\.com\//.test(billing.customerPortal)?billing.customerPortal:'';
   const manage=$('account-manage-billing');
   manage.hidden=!(portal&&state?.plan_code&&state.plan_code!=='none');
   if(portal)manage.href=portal;
   $('account-upgrade').hidden=Boolean(active);
 }
 async function init(){
   render();
   const cfg=window.IB_AUTH_CONFIG||{};
   if(!billing.enabled||!cfg.supabaseUrl||!window.supabase?.createClient)return;
   try{
     const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}});
     const {data:{session}}=await client.auth.getSession();
     if(!session?.user)return;
     const {data,error}=await client.from('member_subscription_state').select('plan_code,billing_status,valid_until').eq('user_id',session.user.id).maybeSingle();
     if(!error)state=data;
   }catch(error){state=null}
   render();
 }
 document.addEventListener('ib:language-changed',render);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
