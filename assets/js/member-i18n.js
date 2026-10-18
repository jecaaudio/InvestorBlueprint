/* Localized static copy for the new secure membership UI. */
(function(){
 'use strict';
 function translate(){
  const en=document.documentElement.lang==='en';
  document.querySelectorAll('[data-es][data-en]').forEach(node=>{node.textContent=en?node.dataset.en:node.dataset.es});
  document.querySelectorAll('[data-placeholder-es][data-placeholder-en]').forEach(node=>{node.placeholder=en?node.dataset.placeholderEn:node.dataset.placeholderEs});
 }
 document.addEventListener('DOMContentLoaded',()=>{translate();document.addEventListener('ib:language-changed',translate)});
})();
