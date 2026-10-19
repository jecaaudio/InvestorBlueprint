import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Use the Chromium installed by the same Playwright step used for axe tests.
const chromePath = chromium.executablePath();

const lhciBin = process.platform === 'win32'
  ? path.join(rootDir, 'node_modules', '.bin', 'lhci.cmd')
  : path.join(rootDir, 'node_modules', '.bin', 'lhci');

const child = spawn(lhciBin, ['autorun', '--config=./lighthouserc.json'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: false,
  env: {
    ...process.env,
    LHCI_CHROME_PATH: chromePath
  }
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
