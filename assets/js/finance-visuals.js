/* Small, dependency-free financial charts. Exact amounts stay visible without
 * hover, color perception or animation; all bars share a genuine zero baseline. */
(function(){
 'use strict';
 const english=()=>document.documentElement.lang==='en';
 const L=(es,en)=>english()?en:es;
 const usd=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value);
 function chart(host,{title,rows,note=''}){
  if(!host)return;
  if(!Array.isArray(rows)||!rows.length||rows.some(row=>!Number.isFinite(row.value))){host.replaceChildren();return;}
  const magnitude=Math.max(...rows.map(row=>Math.abs(row.value)),1);
  const positive=Math.max(0,...rows.map(row=>row.value/magnitude));
  const negative=Math.max(0,...rows.map(row=>-row.value/magnitude));
  const span=positive+negative||1,origin=negative/span*100;
  let figure=host.querySelector(':scope > .ib-viz');
  if(!figure){
   figure=document.createElement('figure');figure.className='ib-viz';
   const caption=document.createElement('figcaption'),unit=document.createElement('span'),list=document.createElement('ul'),foot=document.createElement('p');
   caption.className='ib-viz-title';unit.className='ib-viz-unit';unit.textContent='USD';
   list.className='ib-viz-list';foot.className='ib-viz-note';figure.append(caption,unit,list,foot);host.replaceChildren(figure);
  }
  figure.querySelector('figcaption').textContent=title;
  figure.querySelector('.ib-viz-note').textContent=note||L('Misma escala y base cero. Importes según tus datos.','Shared scale and zero baseline. Amounts based on your inputs.');
  const list=figure.querySelector('ul');
  while(list.children.length>rows.length)list.lastElementChild.remove();
  rows.forEach((row,index)=>{
   let item=list.children[index];
   if(!item){
    item=document.createElement('li');
    const label=document.createElement('span'),value=document.createElement('strong'),track=document.createElement('div'),bar=document.createElement('span'),zero=document.createElement('span');
    label.className='ib-viz-label';value.className='ib-viz-value';track.className='ib-viz-track';track.setAttribute('aria-hidden','true');
    bar.className='ib-viz-bar';zero.className='ib-viz-zero';track.append(bar,zero);item.append(label,value,track);list.append(item);
   }
   item.querySelector('.ib-viz-label').textContent=row.label;
   item.querySelector('.ib-viz-value').textContent=usd(row.value);
   item.classList.toggle('is-negative',row.value<0);
   const width=Math.abs(row.value/magnitude)/span*100;
   const bar=item.querySelector('.ib-viz-bar');
   bar.style.width=width+'%';bar.style.left=(row.value<0?origin-width:origin)+'%';
   item.querySelector('.ib-viz-zero').style.left=origin+'%';
  });
 }
 window.IBFinanceVisuals={chart};
 function seller(){
  const value=document.getElementById('netValue');if(!value)return;
  const host=document.createElement('div');host.id='ib-seller-chart';host.className='ib-viz-host';
  value.closest('.result-card')?.append(host);
  const amount=id=>{const raw=document.getElementById(id)?.textContent||'';if(!raw.trim()||/PENDIENTE|PENDING|—/.test(raw))return NaN;return Number(raw.replace(/[^\d.+-]/g,'').replace(/\+.*/,''));};
  const update=()=>{
   if(document.body.dataset.sellerValid==='false'){host.replaceChildren();return;}
   const partial=/PENDIENTE|PENDING/i.test(document.getElementById('rTax')?.textContent||'');
   chart(host,{title:L('Tu venta, de un vistazo','Your sale at a glance'),rows:[
    {label:L('Precio de venta','Sale price'),value:amount('rPrice')},
    {label:L('Pago de deudas','Debt payoffs'),value:amount('rDebt')},
    {label:L('Gastos de venta','Selling costs'),value:amount('rFees')},
    {label:document.getElementById('netLabel')?.textContent||L('Neto estimado','Estimated net'),value:amount('netValue')}
   ],note:(partial?L('Neto parcial: falta confirmar el impuesto. ','Partial net: tax confirmation is missing. '):'')+(document.getElementById('netDetail')?.textContent||'')});
  };
  // Seller validity fires before its own render; read the completed DOM afterwards.
  document.addEventListener('ib:seller-validity',()=>queueMicrotask(update));
  document.addEventListener('input',()=>queueMicrotask(update));document.addEventListener('change',()=>queueMicrotask(update));
  update();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',seller,{once:true});else seller();
})();
