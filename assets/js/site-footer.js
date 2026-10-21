/* Shared footer: calculators, pricing, legal pages, cookie settings and contact. */
(function(){
 'use strict';
 const script=document.currentScript;
 const root=script?new URL('../../',script.src).href:'';
 const site=window.IB_SITE||{};
 const L=(es,en)=>document.documentElement.lang==='en'?en:es;
 const links=[
   [[ 'Calculadoras','Calculators'],[
     ['calculadoras/venta.html','Venta','Seller net'],['calculadoras/flip.html','Flip','Flip'],
     ['calculadoras/rentas.html','Rentas','Rentals'],['calculadoras/arv.html','ARV','ARV'],['calculadoras/hard-money.html','Hard money','Hard money']]],
   [[ 'InvestorBlueprint','InvestorBlueprint'],[
     ['pricing.html','Precios','Pricing'],['login.html','Ingresar','Sign in'],['account.html','Mi perfil','My profile']]],
   [[ 'Legal','Legal'],[
     ['privacy.html','Privacidad','Privacy'],['terms.html','Términos','Terms']]]
 ];
 function render(){
   let footer=document.getElementById('site-footer');
   if(!footer){footer=document.createElement('footer');footer.id='site-footer';footer.className='site-footer';document.body.append(footer)}
   const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   const email=typeof site.contactEmail==='string'&&/^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i.test(site.contactEmail)?site.contactEmail:'';
   footer.innerHTML='<div class="site-footer-inner">'+
     '<div class="site-footer-brand"><strong>InvestorBlueprint</strong><p>'+esc(L('Calculadoras inmobiliarias en español e inglés.','Real estate calculators in Spanish and English.'))+'</p>'+
     (email?'<p><a href="mailto:'+esc(email)+'">'+esc(email)+'</a></p>':'')+'</div>'+
     links.map(([[es,en],items])=>'<nav aria-label="'+esc(L(es,en))+'"><h2>'+esc(L(es,en))+'</h2><ul>'+
       items.map(([href,es2,en2])=>'<li><a href="'+esc(root+href)+'">'+esc(L(es2,en2))+'</a></li>').join('')+
       (es==='Legal'?'<li><button type="button" class="site-footer-cookies">'+esc(L('Preferencias de cookies','Cookie preferences'))+'</button></li>':'')+
       '</ul></nav>').join('')+
     '</div><p class="site-footer-legal">© '+new Date().getFullYear()+' InvestorBlueprint · '+
     esc(L('Estimaciones informativas; no son asesoría financiera, legal ni fiscal.','Informational estimates; not financial, legal or tax advice.'))+'</p>';
   footer.querySelector('.site-footer-cookies')?.addEventListener('click',()=>window.IBOpenCookieSettings?.());
   // Legal pages name the contact channel: the configured inbox, else the in-app feedback form.
   document.querySelectorAll('[data-contact]').forEach(node=>{
     node.innerHTML=email?'<a href="mailto:'+esc(email)+'">'+esc(email)+'</a>'
       :esc(L('el botón «Enviar comentarios» dentro de las calculadoras','the “Send feedback” button inside the calculators'));
   });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
 document.addEventListener('ib:language-changed',render);
})();
