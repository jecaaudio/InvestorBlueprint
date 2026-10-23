/* Pricing page: monthly/yearly toggle and the Pro call to action.
 * With billing off (beta) the button requests free access. With billing on it opens the
 * Stripe Payment Link with the member id, so the webhook can attach the subscription. */
(function(){
 'use strict';
 const billing=window.IB_BILLING||{enabled:false};
 const $=id=>document.getElementById(id);
 let period='Monthly',session=null;
 // member-i18n.js re-applies data-es/data-en on language changes, so copy lives there.
 const setText=(node,es,en)=>{
   if(!node)return;
   node.dataset.es=es;node.dataset.en=en;
   node.textContent=document.documentElement.lang==='en'?en:es;
 };
 const linkFor=key=>{
   const raw=billing.links?.[key];
   if(typeof raw!=='string'||!/^https:\/\/(buy|checkout)\.stripe\.com\//.test(raw))return '';
   const url=new URL(raw);
   if(session?.user?.id)url.searchParams.set('client_reference_id',session.user.id);
   if(session?.user?.email)url.searchParams.set('prefilled_email',session.user.email);
   return url.href;
 };
 function render(){
   const yearly=period==='Yearly';
   $('billing-monthly')?.setAttribute('aria-pressed',String(!yearly));
   $('billing-yearly')?.setAttribute('aria-pressed',String(yearly));
   const price=yearly?billing.prices?.proYearly:billing.prices?.proMonthly;
   if($('pro-price'))$('pro-price').textContent='$'+(price??(yearly?190:19));
   setText($('pro-period'),yearly?'/ año':'/ mes',yearly?'/ year':'/ month');
   if($('pro-save'))$('pro-save').hidden=!yearly;
   const cta=$('pro-cta'),note=$('pricing-beta-note');
   const link=billing.enabled?linkFor('pro'+period):'';
   const available=Boolean(link);
   document.querySelector('.pr-toggle').hidden=!available;
   $('pro-price').hidden=!available;
   $('pro-period').hidden=!available;
   $('pro-save').hidden=!available||!yearly;
   document.querySelectorAll('[data-paid-only]').forEach(node=>{node.hidden=!available});
   if(!available){
     setText($('pro-heading'),'Acceso completo · beta','Full access · beta');
     setText($('pro-fine'),'Sin cobros durante la beta. El acceso requiere aprobación. Las herramientas experimentales requieren invitación.','No charges during beta. Access requires approval. Experimental tools require an invitation.');
   }else{
     setText($('pro-heading'),'Pro','Pro');
     setText($('pro-fine'),'El pago lo procesa Stripe. No guardamos los datos de tu tarjeta.','Payments are processed by Stripe. We never store your card details.');
   }
   if(!link){
     if(note)note.hidden=false;
     cta.href='login.html';
     setText(cta,'Solicitar acceso gratis','Request free access');
     document.dispatchEvent(new CustomEvent('ib:pricing-rendered'));
     return;
   }
   if(note)note.hidden=true;
   const days=Number(billing.trialDays)||0;
   setText(cta,days?'Probar '+days+' días gratis':'Suscribirme',days?'Start '+days+'-day free trial':'Subscribe');
   // A purchase must belong to a signed-in member; otherwise sign in first and come back.
   cta.href=session?.user?.id?link:'login.html?returnTo='+encodeURIComponent('/InvestorBlueprint/pricing.html');
 }
 async function init(){
   $('billing-monthly')?.addEventListener('click',()=>{period='Monthly';render()});
   $('billing-yearly')?.addEventListener('click',()=>{period='Yearly';render()});
   render();
   const cfg=window.IB_AUTH_CONFIG||{};
   if(!billing.enabled||!cfg.supabaseUrl||!window.supabase?.createClient)return;
   try{
     const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}});
     const {data,error}=await client.auth.getSession();
     if(!error)session=data?.session||null;
   }catch(error){session=null}
   render();
 }
 window.IBPricing={render};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
