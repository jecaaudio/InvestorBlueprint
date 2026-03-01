const DEFAULT_WORKER_URL = "https://YOUR-WORKER.workers.dev";
const WORKER_URL = localStorage.getItem("arvWorkerUrl") || DEFAULT_WORKER_URL;

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

let latestReport = null;

document.addEventListener("DOMContentLoaded", () => {
  if (window.IBAnalytics && typeof window.IBAnalytics.trackToolOpen === "function") {
    window.IBAnalytics.trackToolOpen("arv");
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

function row(label, value) {
  return `<div class="kv-row"><span>${label}</span><strong>${value}</strong></div>`;
}

function render(payload) {
  latestReport = payload;
  const { subject, comps, arv, meta } = payload;

  subjectFields.innerHTML = [
    row("Address", subject.address || "N/A"),
    row("Beds", number(subject.beds, 1)),
    row("Baths", number(subject.baths, 1)),
    row("Sqft", number(subject.sqft)),
    row("Type", subject.propertyType || "N/A"),
    row("Year", subject.yearBuilt || "N/A"),
    row("Lot", `${number(subject.lotSqft)} sqft`)
  ].join("");

  arvFields.innerHTML = [
    row("Estimate", money(arv.estimate)),
    row("Low", money(arv.low)),
    row("High", money(arv.high)),
    row("Confidence", `${arv.confidence}%`),
    row("Method", arv.method),
    row("PPSF Weighted", money(arv.ppsfWeighted))
  ].join("");

  compsBody.innerHTML = comps.map((comp) => `
    <tr>
      <td>${comp.address || "N/A"}</td>
      <td>${number(comp.distanceMiles, 2)}</td>
      <td>${comp.soldDate || "N/A"}</td>
      <td>${money(comp.soldPrice)}</td>
      <td>${number(comp.beds, 1)}</td>
      <td>${number(comp.baths, 1)}</td>
      <td>${number(comp.sqft)}</td>
      <td>${money(comp.pricePerSqft)}</td>
      <td>${number(comp.score, 3)}</td>
    </tr>
  `).join("");

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
  const response = await fetch(`${WORKER_URL}/api/arv`, {
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
    setError(`${error.message} Configure WORKER_URL in tools/arv/arv.js or localStorage.arvWorkerUrl.`);
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
