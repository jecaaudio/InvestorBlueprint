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

let latestReport = null;

function getWorkerUrl() {
  return localStorage.getItem(WORKER_URL_STORAGE_KEY) || DEFAULT_WORKER_URL;
}

function isWorkerUrlConfigured(url = getWorkerUrl()) {
  return Boolean(url) && !url.includes("YOUR-WORKER");
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.IBAnalytics && typeof window.IBAnalytics.trackToolOpen === "function") {
    window.IBAnalytics.trackToolOpen("arv");
  }

  workerUrlInput.value = getWorkerUrl();
  if (!isWorkerUrlConfigured()) {
    setStatus("Set a Worker URL and click Save, or use Run with demo data.");
  }
}, { once: true });

function money(value) {
  return Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function number(value, digits = 0) {
  return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: digits });
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

function render(payload) {
  latestReport = payload;
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
    { label: "Confidence", value: `${arv.confidence}%` },
    { label: "Method", value: arv.method },
    { label: "PPSF Weighted", value: money(arv.ppsfWeighted) }
  ]);

  renderComps(comps);

  if (meta?.warnings?.length) {
    setStatus(`Done with warnings: ${meta.warnings.join(" | ")}`);
  } else {
    setStatus("Done.");
  }

  resultsEl.hidden = false;
  compsWrap.hidden = false;
  actionRow.hidden = false;
}

function reportText(payload) {
  const { subject, comps, arv, meta } = payload;
  return [
    "ARV REPORT",
    `Generated: ${meta.generatedAt}`,
    `Provider: ${meta.provider}`,
    "",
    `Subject: ${subject.address}`,
    `Beds/Baths: ${subject.beds}/${subject.baths}`,
    `Sqft: ${subject.sqft}`,
    `Type: ${subject.propertyType}`,
    `Year: ${subject.yearBuilt}`,
    "",
    `ARV Estimate: ${money(arv.estimate)}`,
    `Range: ${money(arv.low)} - ${money(arv.high)}`,
    `Confidence: ${arv.confidence}%`,
    "",
    "Comps:",
    ...comps.map((comp, index) => `${index + 1}. ${comp.address} | ${money(comp.soldPrice)} | ${comp.sqft} sqft | score ${number(comp.score, 3)}`)
  ].join("\n");
}

async function fetchArv(address) {
  const workerUrl = getWorkerUrl();
  if (!isWorkerUrlConfigured(workerUrl)) {
    throw new Error("Worker URL is not configured. Add it below and click Save, or use Run with demo data.");
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
  const value = workerUrlInput.value.trim();
  localStorage.setItem(WORKER_URL_STORAGE_KEY, value || DEFAULT_WORKER_URL);

  if (isWorkerUrlConfigured(value)) {
    setStatus("Worker URL saved. You can now calculate ARV.");
    setError("");
    return;
  }

  setStatus("Worker URL saved as placeholder. Add a real URL or run demo data.");
});

demoBtn.addEventListener("click", async () => {
  setError("");
  setStatus("Loading demo data...", true);

  try {
    const payload = await loadDemoReport();
    render(payload);
    setStatus("Demo data loaded.");
  } catch (error) {
    setStatus("Failed.");
    setError(error.message);
  } finally {
    statusEl.classList.remove("loader");
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (window.IBAnalytics && typeof window.IBAnalytics.trackCalcRun === "function") {
    window.IBAnalytics.trackCalcRun("arv");
  }
  const address = (new FormData(form).get("address") || "").toString().trim();

  if (!address) {
    setError("Please add an address.");
    return;
  }

  setError("");
  setStatus("Calculating ARV...", true);
  resultsEl.hidden = true;
  compsWrap.hidden = true;
  actionRow.hidden = true;

  try {
    const payload = await fetchArv(address);
    render(payload);
    if (window.IBAnalytics && typeof window.IBAnalytics.trackCalcSuccess === "function") {
      window.IBAnalytics.trackCalcSuccess("arv", { result: "arv_estimate" });
    }
  } catch (error) {
    setStatus("Failed.");
    setError(error.message);
  } finally {
    statusEl.classList.remove("loader");
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
  const blob = new Blob([JSON.stringify(latestReport, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `arv-report-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  setStatus("JSON exported.");
});
