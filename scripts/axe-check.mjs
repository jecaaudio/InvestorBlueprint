import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const baseUrl = process.env.AXE_BASE_URL || 'http://127.0.0.1:4173';
const pages = ['/', '/tools/rental-cash-flow.html', '/tools/rent-calculator.html'];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();

let hasViolations = false;

for (const pagePath of pages) {
  const page = await context.newPage();
  const url = `${baseUrl}${pagePath}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  const results = await new AxeBuilder({ page }).analyze();

  if (results.violations.length > 0) {
    hasViolations = true;
    console.error(`\n[axe] ${url} -> ${results.violations.length} violations`);
    for (const violation of results.violations) {
      console.error(`- ${violation.id}: ${violation.help}`);
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
