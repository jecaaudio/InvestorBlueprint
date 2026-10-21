const DEFAULT_WORKER_URL = "https://YOUR-WORKER.workers.dev";
const WORKER_URL_STORAGE_KEY = "arvWorkerUrl";
const DEMO_DATA_PATH = "./fixtures/demo-report.json";

const form = document.getElementById("arv-form");
const statusEl = document.getElementById("status");
const errorEl = document.getElementById("error");
const resultsEl = document.getElementById("results");
const subjectFields = document.getElementById("subject-fields");
const arvFields = document.getElementById("arv-fields");
const compsWrap = document.getElementById("comps-wrap");
const compsBody = document.getElementById("comps-body");
const actionRow = document.getElementById("action-row");
const copyBtn = document.getElementById("copy-btn");
const exportBtn = document.getElementById("export-btn");
const workerUrlInput = document.getElementById("worker-url");
const saveWorkerBtn = document.getElementById("save-worker-url-btn");
const demoBtn = document.getElementById("run-demo-btn");
const calculateBtn = document.getElementById("calculate-btn");
const demoBanner = document.getElementById("demo-banner");
const currentOriginEl = document.getElementById("current-origin");

let latestReport = null;
let latestReportIsDemo = false;
let reportGeneration = 0;
let temporaryWorkerUrl=null;
function invalidateReport(){
  reportGeneration++;
  latestReport=null;latestReportIsDemo=false;
  resultsEl.hidden=true;compsWrap.hidden=true;actionRow.hidden=true;
  document.getElementById('arv-printable-report')?.replaceChildren();
  return reportGeneration;
}
form.addEventListener('input',invalidateReport);

function getWorkerUrl() {
  if(temporaryWorkerUrl!==null)return temporaryWorkerUrl;
  try{return localStorage.getItem(WORKER_URL_STORAGE_KEY)||DEFAULT_WORKER_URL;}catch{return DEFAULT_WORKER_URL;}
}

function workerSetupMessage() {
  return `Worker URL missing. Save it in localStorage key "${WORKER_URL_STORAGE_KEY}" (via Save button) or use "Run with demo data".`;
}

function isWorkerUrlConfigured(url = getWorkerUrl()) {
  try{const parsed=new URL(url);return parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&!parsed.hostname.includes('YOUR-WORKER')&&!parsed.hostname.includes('your-worker');}catch{return false;}
}

function updateWorkerStateUi(url = getWorkerUrl()) {
  const configured = isWorkerUrlConfigured(url);
  calculateBtn.title = configured ? "" : "Real ARV unavailable: set up the valuation worker. Demo is a separate button.";
  calculateBtn.disabled = !configured;

  if (demoBanner) {
    demoBanner.hidden = configured;
  }

  if (!configured) {
    setStatus("Real ARV is not configured. Use the explicitly labeled demo button to explore a sample report.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.IBAnalytics && typeof window.IBAnalytics.trackToolOpen === "function") {
    window.IBAnalytics.trackToolOpen("arv");
  }

  workerUrlInput.value = getWorkerUrl();
  if (currentOriginEl) {
    currentOriginEl.textContent = window.location.origin;
  }
  updateWorkerStateUi();
}, { once: true });

function trackCalcError(reason, extra = {}) {
  if (window.IBAnalytics && typeof window.IBAnalytics.track === "function") {
    window.IBAnalytics.track("calc_error", {
      tool_name: "arv",
      page_path: window.location.pathname,
      reason,
      ...extra
    });
  }
}

function mapWorkerError(error, workerUrl) {
  const message = (error?.message || "").trim();
  const networkError = error instanceof TypeError || message === "Failed to fetch";

  if (message.includes("FORBIDDEN_ORIGIN") || networkError) {
    return `FORBIDDEN_ORIGIN: configura ALLOWED_ORIGIN en el worker. Origin actual: ${window.location.origin}`;
  }

  return message || `Unable to calculate ARV using ${workerUrl}.`;
}

function money(value) {
  return value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }):'N/A';
}

function number(value, digits = 0) {
  return value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value).toLocaleString("en-US", { maximumFractionDigits: digits }):'N/A';
}

function setStatus(text, loading = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("loader", loading);
}

function setError(message) {
  errorEl.hidden = !message;
  errorEl.textContent = message || "";
}

function createKvRow(label, value) {
  const wrapper = document.createElement("div");
  wrapper.className = "kv-row";

  const labelEl = document.createElement("span");
  labelEl.textContent = label;

  const valueEl = document.createElement("strong");
  valueEl.textContent = value;

  wrapper.append(labelEl, valueEl);
  return wrapper;
}

function renderKeyValueRows(container, rows) {
  container.textContent = "";
  rows.forEach(({ label, value }) => {
    container.append(createKvRow(label, value));
  });
}

function createCompCell(value) {
  const td = document.createElement("td");
  td.textContent = value;
  return td;
}

function renderComps(comps) {
  compsBody.textContent = "";

  comps.forEach((comp) => {
    const tr = document.createElement("tr");
    tr.append(
      createCompCell(comp.address || "N/A"),
      createCompCell(number(comp.distanceMiles, 2)),
      createCompCell(comp.soldDate || "N/A"),
      createCompCell(money(comp.soldPrice)),
      createCompCell(number(comp.beds, 1)),
      createCompCell(number(comp.baths, 1)),
      createCompCell(number(comp.sqft)),
      createCompCell(money(comp.pricePerSqft)),
      createCompCell(number(comp.score, 3))
    );
    compsBody.append(tr);
  });
}

function render(payload, isDemo = false) {
  if(!payload?.subject||!(payload.subject.sqft>0)||!Array.isArray(payload.comps)||!payload.comps.length||
    !payload.arv||!['estimate','low','high'].every(k=>typeof payload.arv[k]==='number'&&Number.isFinite(payload.arv[k])&&payload.arv[k]>=0)||
    payload.arv.estimate<=0||payload.arv.low>payload.arv.estimate||payload.arv.high<payload.arv.estimate||
    payload.comps.some(c=>!c||!(c.soldPrice>0)||!Number.isFinite(c.soldPrice)||!(c.sqft>0)||!Number.isFinite(c.sqft)))throw Error('Invalid valuation response: required property, comparable sales or range is missing.');
  latestReport = payload;
  isDemo = isDemo || payload?.meta?.demo === true || payload?.meta?.provider === 'DUMMY';
  latestReportIsDemo = isDemo;
  const { subject, comps, arv, meta } = payload;

  renderKeyValueRows(subjectFields, [
    { label: "Address", value: subject.address || "N/A" },
    { label: "Beds", value: number(subject.beds, 1) },
    { label: "Baths", value: number(subject.baths, 1) },
    { label: "Sqft", value: number(subject.sqft) },
    { label: "Type", value: subject.propertyType || "N/A" },
    { label: "Year", value: String(subject.yearBuilt || "N/A") },
    { label: "Lot", value: `${number(subject.lotSqft)} sqft` }
  ]);

  renderKeyValueRows(arvFields, [
    { label: "Estimate", value: money(arv.estimate) },
    { label: "Low", value: money(arv.low) },
    { label: "High", value: money(arv.high) },
    { label: "Calidad orientativa / Screening quality (0–100; no probabilidad)", value: arv.quality?String(arv.quality.qualityScore):"No evaluada / Not assessed" },
    { label: "Comparables utilizados / Comparable sales used", value: String(arv.quality?.sampleSize??comps.length) },
    { label: "Base del rango / Range basis", value: arv.rangeType==='observed_comparable_ppsf'?"Precios por pie² observados / Observed prices per sqft":"Rango sin verificar / Unverified range" },
    { label: "Method", value: arv.method },
    { label: "PPSF Weighted", value: money(arv.ppsfWeighted) }
  ]);

  renderComps(comps);

  if (meta?.warnings?.length) {
    setStatus(`${isDemo ? "DEMO — sample data. " : ""}Done with warnings: ${meta.warnings.join(" | ")}`);
  } else {
    setStatus(isDemo ? "DEMO — sample property only, not a valuation of your address." : "Done.");
  }

  resultsEl.hidden = false;
  compsWrap.hidden = false;
  actionRow.hidden = false;
}

function pref(key, fallback){
  if(window.IB_REPORT_PREFERENCES&&Object.hasOwn(window.IB_REPORT_PREFERENCES,key))return window.IB_REPORT_PREFERENCES[key]||fallback;
  try{return localStorage.getItem(key)||fallback}catch(error){return fallback}
}
function docEnglish(){return pref('ib_document_language','es')==='en'}
function R(es,en){return docEnglish()?en:es}
function reportNotes(){return document.getElementById('arv-analyst-notes')?.value?.trim()||''}
function reportText(payload) {
  const {subject, comps, arv, meta}=payload;
  const detailed=pref('ib_report_detail','detailed')!=='summary';
  const notes=reportNotes();
  const parts=[
    R('INFORME DE ARV','ARV REPORT')+(latestReportIsDemo?' — DEMO':''),
    R('Generado','Generated')+': '+(meta?.generatedAt||new Date().toISOString()),
    R('Proveedor','Provider')+': '+(meta?.provider||R('No informado','Not supplied')),
    R('Preparado por','Prepared by')+': '+(pref('ib_display_name','')||'—'),
    R('Compañía','Company')+': '+(pref('ib_company_name','')||'—'),
    '',
    R('Propiedad analizada','Subject')+': '+(subject?.address||'—'),
    R('Habitaciones/Baños','Beds/Baths')+': '+(subject?.beds??'—')+'/'+(subject?.baths??'—'),
    R('Superficie','Area')+': '+(subject?.sqft??'—')+' sqft',
    R('Tipo','Type')+': '+(subject?.propertyType||'—'),
    R('Año','Year')+': '+(subject?.yearBuilt||'—'),
    '',
    R('ARV estimado','Estimated ARV')+': '+money(arv?.estimate),
    R('Rango','Range')+': '+money(arv?.low)+' – '+money(arv?.high),
    R('Calidad orientativa (0–100, no es probabilidad)','Screening quality (0–100, not probability)')+': '+(arv?.quality?.qualityScore??R('No evaluada','Not assessed')),
    R('Comparables utilizados','Comparable sales used')+': '+(arv?.quality?.sampleSize??comps?.length??0),
    R('Base del rango','Range basis')+': '+(arv?.rangeType==='observed_comparable_ppsf'?R('Precios observados por pie²; no es intervalo de confianza','Observed comparable prices per sqft; not a confidence interval'):R('Rango del proveedor/demo sin verificar','Unverified provider/demo range')),
    R('Método','Method')+': '+(arv?.method||'—')
  ];
  if(detailed){
    parts.push(R('Precio ponderado por pie²','Weighted price per sqft')+': '+money(arv?.ppsfWeighted));
    parts.push('',R('Comparables','Comparable properties')+':');
    for(const [index,comp] of (comps||[]).entries()){
      parts.push((index+1)+'. '+(comp.address||'—')+
        ' | '+R('Venta','Sale')+': '+money(comp.soldPrice)+
        ' | '+(comp.sqft||0)+' sqft'+
        ' | '+R('Distancia','Distance')+': '+(comp.distanceMiles??'—')+' mi'+
        ' | '+R('Fecha','Date')+': '+(comp.soldDate||'—')+
        ' | '+R('Puntuación','Score')+': '+number(comp.score,3));
    }
  }
  if(meta?.warnings?.length)parts.push('',R('Advertencias','Warnings')+':',...meta.warnings.map(w=>'- '+w));
  if(notes)parts.push('',R('Notas del analista','Analyst notes')+':',notes);
  if(notes&&pref('ib_notes_detail','detailed')==='detailed'){
    parts.push(R('Comprobación de notas','Notes verification')+': '+
      R('Contrastar con documentación, estado de la propiedad y comparables recientes.','Cross-check against documents, property condition and recent comparable sales.'));
  }
  parts.push('',latestReportIsDemo
    ?R('DEMO: contiene datos ficticios; NO es un valor de mercado real.','DEMO: sample data, NOT a real market valuation.')
    :R('Estimación informativa. Comprueba fuentes, fechas, condición de la propiedad y comparables antes de invertir.','Informational estimate. Verify sources, dates, property condition and comparables before investing.'));
  // Same notice as under the results (assets/js/disclaimers.js).
  const notice=window.IBDisclaimer?.text('automated-arv',R('es','en'));
  if(notice)parts.push(R('Importante: ','Important: ')+notice);
  return parts.join("\n");
}

async function fetchArv(address) {
  const workerUrl = getWorkerUrl();
  if (!isWorkerUrlConfigured(workerUrl)) {
    throw new Error(workerSetupMessage());
  }

  const response = await fetch(`${workerUrl}/api/arv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, options: { maxComps: 8 } })
  });

  let json;
  try {
    json = await response.json();
  } catch {
    throw new Error("Invalid JSON response from worker.");
  }

  if (!response.ok) {
    const message = json?.error?.message || "Unable to calculate ARV.";
    throw new Error(message);
  }

  return json;
}

async function loadDemoReport() {
  const response = await fetch(DEMO_DATA_PATH);
  if (!response.ok) {
    throw new Error("Unable to load demo data.");
  }

  return response.json();
}

saveWorkerBtn.addEventListener("click", () => {
  invalidateReport();
  const value = workerUrlInput.value.trim();
  temporaryWorkerUrl=value||DEFAULT_WORKER_URL;
  let persisted=true;
  try{localStorage.setItem(WORKER_URL_STORAGE_KEY,temporaryWorkerUrl);}catch{persisted=false;}

  if (isWorkerUrlConfigured(value)) {
    setStatus(persisted?"Worker URL saved. You can now calculate ARV.":"Configuración temporal: almacenamiento bloqueado / Temporary configuration: browser storage is blocked.");
    setError("");
    updateWorkerStateUi(value);
    return;
  }

  updateWorkerStateUi(value);
});

demoBtn.addEventListener("click", async () => {
  const generation=invalidateReport();
  setError("");
  setStatus("Loading demo data...", true);

  try {
    const payload = await loadDemoReport();
    if(generation!==reportGeneration)return;
    render(payload, true);
    setStatus("DEMO — example only; not a valuation of the entered address.");
  } catch (error) {
    if(generation!==reportGeneration)return;
    setStatus("Failed.");
    setError(error.message);
    trackCalcError("demo_load_failed", { message: error.message });
  } finally {
    if(generation===reportGeneration)statusEl.classList.remove("loader");
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const generation=invalidateReport();
  if (window.IBAnalytics && typeof window.IBAnalytics.trackCalcRun === "function") {
    window.IBAnalytics.trackCalcRun("arv");
  }
  const address = (new FormData(form).get("address") || "").toString().trim();

  if (!address) {
    setError("Please add an address.");
    return;
  }

  if(!isWorkerUrlConfigured()){
    setError("Real ARV unavailable. Configure a valuation worker, or press Run with demo data to inspect a sample report.");
    return;
  }

  setError("");
  setStatus("Calculating ARV...", true);
  resultsEl.hidden = true;
  compsWrap.hidden = true;
  actionRow.hidden = true;

  try {
    const payload = await fetchArv(address);
    if(generation!==reportGeneration)return;
    render(payload, false);
    if (window.IBAnalytics && typeof window.IBAnalytics.trackCalcSuccess === "function") {
      window.IBAnalytics.trackCalcSuccess("arv", { result: "arv_estimate" });
    }
  } catch (error) {
    if(generation!==reportGeneration)return;
    const workerUrl = getWorkerUrl();
    const errorMessage = mapWorkerError(error, workerUrl);
    setStatus("Failed.");
    setError(errorMessage);
    trackCalcError("calc_failed", { message: errorMessage, worker_url: workerUrl, mode: "worker" });
  } finally {
    if(generation===reportGeneration)statusEl.classList.remove("loader");
  }
});

copyBtn.addEventListener("click", async () => {
  if (!latestReport) return;
  const text = reportText(latestReport);
  await navigator.clipboard.writeText(text);
  setStatus("Report copied to clipboard.");
});

exportBtn.addEventListener("click", () => {
  if (!latestReport) return;
  const {confidence:deprecatedConfidence,...assessment}=latestReport.arv;
  const exported={...latestReport,arv:assessment,exportMetadata:{
    statisticalConfidence:false,
    demo:latestReportIsDemo,
    documentLanguage:docEnglish()?'en':'es',
    reportDetail:pref('ib_report_detail','detailed'),
    analystNotes:reportNotes(),
    exportedAt:new Date().toISOString()
  }};
  const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `arv-report-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  setStatus("JSON exported.");
});

document.addEventListener("DOMContentLoaded",()=>{
  if(!actionRow)return;
  const panel=document.createElement('div');
  panel.className='arv-notes-panel';
  panel.style.cssText='margin:14px 0;padding:12px;border:1px solid #dce5ef;border-radius:10px';
  const label=document.createElement('label');
  label.htmlFor='arv-analyst-notes';
  label.textContent='Analysis notes / Notas del análisis';
  label.style.cssText='display:block;font-weight:700;margin-bottom:7px';
  const notes=document.createElement('textarea');
  notes.id='arv-analyst-notes';notes.maxLength=3000;notes.rows=4;
  notes.style.cssText='width:100%;box-sizing:border-box;padding:10px;border-radius:8px';
  notes.placeholder='Assumptions, property condition, comp adjustments, risks / Supuestos, ajustes y riesgos';
  panel.append(label,notes);actionRow.parentElement?.insertBefore(panel,actionRow);
  const textButton=document.createElement('button');
  textButton.type='button';textButton.className='btn';
  textButton.textContent='Exportar informe TXT / Export TXT report';
  textButton.addEventListener('click',()=>{
    if(!latestReport)return;
    const blob=new Blob([reportText(latestReport)],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='arv-report-'+Date.now()+'.txt';
    link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  const printButton=document.createElement('button');printButton.id='arv-print-report';
  printButton.type='button';printButton.className='btn';
  printButton.textContent='Imprimir / Guardar PDF · Print / Save PDF';
  const printable=document.createElement('section');printable.id='arv-printable-report';printable.hidden=true;
  document.body.append(printable);
  const printStyle=document.createElement('style');
  printStyle.textContent='@page{size:letter;margin:0.6in}#arv-printable-report .arv-print-brand{display:flex;align-items:center;gap:5px;margin-top:10px;padding-top:5px;border-top:1px solid #e3e8ee;font-size:8pt;color:#7b8a99}@media print{body>:not(#arv-printable-report){display:none!important}#arv-printable-report{display:block!important;color:#172b3d;background:#fff;font:11pt/1.5 Arial,sans-serif}#arv-printable-report h1{font-size:19pt;border-bottom:2px solid #146d82;padding-bottom:12px}#arv-printable-report pre{white-space:pre-wrap;overflow-wrap:anywhere;font:10pt/1.5 Arial,sans-serif;margin:0}}';
  document.head.append(printStyle);
  printButton.addEventListener('click',()=>{
    if(!latestReport)return;
    // The member's company leads the document; our brand is a small closing line.
    const client=pref('ib_company_name','')||pref('ib_display_name','');
    const heading=document.createElement('h1');heading.textContent=client||(docEnglish()?'ARV report':'Informe de ARV');
    const body=document.createElement('pre');body.textContent=reportText(latestReport);
    const brand=document.createElement('p');brand.className='arv-print-brand';
    const root=new URL('../../',document.baseURI).href;
    const logo=document.createElement('img');logo.src=root+'assets/brand/favicon.svg';logo.alt='';logo.width=12;logo.height=12;
    brand.append(logo,document.createTextNode((docEnglish()?'Prepared with':'Preparado con')+' InvestorBlueprint · '+root.replace(/^https?:\/\//,'').replace(/\/$/,'')));
    printable.replaceChildren(heading,body,brand);printable.lang=docEnglish()?'en':'es';
    window.print();
  });
  actionRow.append(textButton,printButton);
});
