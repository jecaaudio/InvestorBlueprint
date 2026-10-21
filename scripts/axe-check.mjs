import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const baseUrl = process.env.AXE_BASE_URL || 'http://127.0.0.1:4173';
const siteBasePath = (process.env.AXE_SITE_BASE_PATH || '/InvestorBlueprint').replace(/\/$/, '');
const pages = [
  '/index.html',
  '/pricing.html',
  '/login.html',
  '/account.html',
  '/admin.html',
  '/privacy.html',
  '/terms.html',
  '/404.html',
  '/calculadoras/venta.html',
  '/calculadoras/flip.html',
  '/calculadoras/rentas.html',
  '/calculadoras/arv.html',
  '/calculadoras/hard-money.html',
  '/tools/flip-calculator.html',
  '/tools/rental-cash-flow.html',
  '/tools/rent-calculator.html',
  '/tools/arv-estimator.html',
  '/tools/hard-money-analyzer.html',
  '/tools/roi-search.html',
  '/tools/arv/',
  '/calculadora-venta/'
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();

let hasViolations = false;

for (const pagePath of pages) {
  const page = await context.newPage();
  const url = `${baseUrl}${siteBasePath}${pagePath}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  const results = await new AxeBuilder({ page }).analyze();

  if (results.violations.length > 0) {
    hasViolations = true;
    console.error(`\n[axe] ${url} -> ${results.violations.length} violations`);
    for (const violation of results.violations) {
      console.error(`- ${violation.id}: ${violation.help}`);
      for(const node of violation.nodes.slice(0,5)){
        console.error(`    selector: ${node.target.join(', ')}`);
        console.error(`    summary: ${node.failureSummary || 'none'}`);
      }
    }
  } else {
    console.log(`[axe] ${url} -> 0 violations`);
  }

  await page.close();
}

await context.close();
await browser.close();

if (hasViolations) {
  process.exit(1);
}
