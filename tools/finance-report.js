/* Six financial tools: printable bilingual reports from a successful calculation.
 * No browser-global account preferences or persisted financial data are read.
 */
(function(){
 'use strict';
 const reportRoot=new URL('../',document.currentScript?.src||new URL('/InvestorBlueprint/tools/finance-report.js',document.baseURI));
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function render(snapshot,prefs={},messages={}){
   const english=prefs.ib_document_language==='en',L=(es,en)=>english?en:es;
   const label=row=>messages[row.key]||row.label;
   const translateDetails=text=>{
     for(const [key,source] of Object.entries(snapshot.sourceMessages||{}).sort((a,b)=>String(b[1]).length-String(a[1]).length)){
       if(typeof source==='string'&&source.length>3&&messages[key])text=text.split(source).join(messages[key]);
     }
     return text;
   };
   const rows=list=>list.map(row=>'<tr><th scope="row">'+escape(label(row))+'</th><td>'+escape(messages[row.valueKey]||row.value)+'</td></tr>').join('');
   const detailed=prefs.ib_report_detail!=='summary';
   return '<header><img src="'+escape(snapshot.logo)+'" alt="" width="40" height="40"><h1>InvestorBlueprint</h1><h2>'+escape(messages[snapshot.titleKey]||snapshot.title)+'</h2><p>'+escape(snapshot.date)+'</p>'+
     '<p>'+escape(prefs.ib_display_name)+(prefs.ib_company_name?' · '+escape(prefs.ib_company_name):'')+'</p></header>'+
     '<h3>'+L('Resultados','Results')+'</h3><table>'+rows(snapshot.metrics)+'</table>'+
     (detailed?'<h3>'+L('Datos utilizados','Inputs used')+'</h3><table>'+rows(snapshot.inputs)+'</table><h3>'+L('Cálculos y supuestos','Calculations and assumptions')+'</h3><p class="detail">'+escape(translateDetails(snapshot.details))+'</p>':'')+
     '<h3>'+L('Origen de los datos','Data sources')+'</h3><p>'+L('Datos y supuestos introducidos por el usuario; no verificados contra registros públicos ni cotizaciones de prestamistas.','User-entered data and assumptions; not verified against public records or lender quotes.')+'</p>'+
     (snapshot.demo?'<p class="flag">'+L('DEMOSTRACIÓN: inventario simulado, no son oportunidades verificadas.','DEMONSTRATION: simulated inventory, not verified investment opportunities.')+'</p>':'')+
     (snapshot.notes?'<h3>'+L('Notas del análisis','Analysis notes')+'</h3><p class="detail">'+escape(snapshot.notes)+'</p>':'')+
     '<footer>'+L('Estimación informativa en USD. Comprueba contratos, impuestos, costos y datos comparables antes de tomar decisiones.','Informational estimate in USD. Verify contracts, taxes, costs and comparable data before making decisions.')+'</footer>';
 }
 window.IBRenderFinanceReport=render;
 const init=()=>{
   const form=document.getElementById('tool-form'),cards=document.getElementById('result-cards');
   if(!form||!cards||document.getElementById('ib-finance-print'))return;
   const type=document.body.dataset.tool;
   if(!['flip','rental','rent','arv','hard-money','roi_search'].includes(type))return;
   const english=()=>window.IB_REPORT_PREFERENCES?.preferredLanguage==='en';
   const panel=document.createElement('section');panel.className='ib-finance-report-controls';
   const label=document.createElement('label');label.htmlFor='ib-finance-notes';label.textContent=english()?'Report notes':'Notas del informe';
   const notes=document.createElement('textarea');notes.id='ib-finance-notes';notes.rows=3;notes.maxLength=3000;
   const button=document.createElement('button');button.type='button';button.id='ib-finance-print';button.disabled=true;
   button.textContent=english()?'Print / Save PDF':'Imprimir / Guardar PDF';
   const status=document.createElement('p');status.setAttribute('role','status');
   let snapshot=null;
   const invalidate=()=>{snapshot=null;document.getElementById('ib-finance-report')?.replaceChildren();button.disabled=true;status.textContent=english()?'Calculate again before exporting.':'Calcula de nuevo antes de exportar.';};
   invalidate();panel.append(label,notes,button,status);form.after(panel);
   const report=document.createElement('section');report.id='ib-finance-report';report.hidden=true;document.body.append(report);
   const style=document.createElement('style');style.textContent='.ib-finance-report-controls{margin:20px 0;display:grid;gap:12px}.ib-finance-report-controls textarea{width:100%;box-sizing:border-box}'+
     '@media print{body>:not(#ib-finance-report){display:none!important}#ib-finance-report{display:block!important;color:#172b3d;background:white;font:12px Arial;line-height:1.5}#ib-finance-report header{border-bottom:2px solid #146d82}#ib-finance-report table{width:100%;border-collapse:collapse;margin-bottom:20px}#ib-finance-report td,#ib-finance-report th{padding:7px;text-align:left;border-bottom:1px solid #ddd}#ib-finance-report tr{break-inside:avoid}#ib-finance-report .detail{white-space:pre-wrap;overflow-wrap:anywhere}#ib-finance-report footer{margin-top:24px}#ib-finance-report .flag{font-weight:bold}}';document.head.append(style);
   form.addEventListener('input',invalidate);form.addEventListener('change',invalidate);form.addEventListener('reset',invalidate);
   form.addEventListener('ib:calculation-complete',()=>{
     const validation=document.getElementById('tool-validation');
     if((validation&&!validation.hidden)||!cards.children.length||!form.checkValidity()){invalidate();return;}
     const messages=window.IBI18n?.getCurrentMessages?.()||{};
     const keyFor=text=>Object.keys(messages).find(key=>messages[key]===text)||'';
     const flipInputs={salePrice:'flipInputArv',purchasePrice:'reportFlipPurchase',rehabCost:'reportFlipRehab',holdingMonths:'reportFlipHold',miscMonthly:'reportFlipMonthly',buyerClosing:'reportFlipBuyClosing',stagingCost:'reportFlipSellClosing',realtorPct:'reportFlipCommission',loanAmount:'reportFlipLoan',interestRate:'reportFlipInterest',pointsPct:'reportFlipPoints'};
     const inputs=[...form.elements].filter(el=>el.name&&!el.disabled&&!el.hidden&&!['submit','button','reset','hidden','password'].includes(el.type)&&(!['radio','checkbox'].includes(el.type)||el.checked)).map(el=>{
       const label=el.labels?.[0],translated=label?.querySelector('[data-i18n]')||label;
       return {key:translated?.dataset.i18n||(type==='flip'?flipInputs[el.name]:'')||'',label:label?.textContent?.trim()||el.name,valueKey:el.tagName==='SELECT'?el.selectedOptions[0]?.dataset.i18n:'',value:el.tagName==='SELECT'?(el.selectedOptions[0]?.textContent||el.value):el.value};
     });
     snapshot={title:document.querySelector('h1')?.textContent?.trim()||type,
       titleKey:type==='flip'?'flipTitle':document.querySelector('h1 [data-i18n],h1[data-i18n]')?.dataset.i18n||'',sourceMessages:{...messages},
       date:new Date().toISOString(),logo:new URL('assets/brand/favicon.svg',reportRoot).href,inputs,
       metrics:[...cards.children].map((el,index)=>{const label=el.querySelector('strong')?.textContent||'';return {key:type==='flip'&&index===2?'cashCommittedLabel':keyFor(label),label,value:el.querySelector('span')?.textContent||''}}),
       details:(document.getElementById('result-detail')||document.getElementById('result'))?.innerText||'',demo:type==='roi_search'};
     button.disabled=false;status.textContent='';
   });
   button.addEventListener('click',async()=>{
     if(button.disabled||!snapshot)return;
     const prefs={...(window.IB_REPORT_PREFERENCES||{})};
     let messages={};
     try{
       const root=new URL(snapshot.logo).href.replace(/assets\/brand\/favicon\.svg$/,'');
       const response=await fetch(root+'assets/i18n/'+(prefs.ib_document_language==='en'?'en':'es')+'.json',{cache:'no-store'});
       if(!response.ok)throw Error('Translation unavailable');messages=await response.json();
     }catch(error){status.textContent=english()?'Report translation unavailable; please retry.':'No se pudo cargar el idioma del informe. Inténtalo otra vez.';return;}
     if(button.disabled||!document.body.contains(button))return;
     report.innerHTML=render({...snapshot,notes:notes.value},prefs,messages);
     report.lang=prefs.ib_document_language==='en'?'en':'es';window.print();
   });
 };
 window.IBInitFinanceReport=init;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
