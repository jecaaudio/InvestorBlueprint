/* Shared site appearance preference. Mirrors Seller Net's stored theme. */
(function(){
 'use strict';
 const KEY='seller-net-ui-theme';
 const root=document.documentElement;
 let saved='system';
 try{saved=localStorage.getItem(KEY)||'system';}catch(e){}
 const media=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;
 const effective=pref=>pref==='dark'||(pref!=='light'&&media&&media.matches)?'dark':'light';
 function apply(pref,persist){
   root.dataset.theme=effective(pref);
   root.style.colorScheme=root.dataset.theme;
   if(persist)try{localStorage.setItem(KEY,pref)}catch(e){}
   const button=document.getElementById('siteThemeToggle');
   if(button){
     const dark=root.dataset.theme==='dark',english=root.lang==='en';
     button.textContent=dark?'☀':'☾';
     const name=dark?(english?'Switch to light mode':'Activar modo claro'):(english?'Switch to dark mode':'Activar modo oscuro');
     button.title=name;button.setAttribute('aria-label',name);
   }
 }
 apply(saved,false);
 function init(){
   const header=document.querySelector('.navbar,.tool-navbar');
   if(!header)return;
   if(!document.getElementById('siteThemeToggle')){
     const button=document.createElement('button');
     button.type='button';button.id='siteThemeToggle';button.className='site-theme-button';
     button.setAttribute('aria-label','Cambiar apariencia');
     header.appendChild(button);
     button.addEventListener('click',()=>apply(root.dataset.theme==='dark'?'light':'dark',true));
   }
   document.addEventListener('ib:language-changed',()=>apply(root.dataset.theme,false));
   apply(saved,false);
   header.dispatchEvent(new CustomEvent('ib:theme-ready'));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
 else init();
 if(media){
   const cb=()=>{let current='system';try{current=localStorage.getItem(KEY)||'system'}catch(e){}if(current==='system')apply('system',false)};
   if(media.addEventListener)media.addEventListener('change',cb);
   else if(media.addListener)media.addListener(cb);
 }
})();
