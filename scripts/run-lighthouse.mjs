import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Browser, detectBrowserPlatform, install, resolveBuildId } from '@puppeteer/browsers';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = path.join(rootDir, '.cache', 'chrome');
const platform = detectBrowserPlatform();

if (!platform) {
  throw new Error('Could not detect a compatible Chrome for Testing platform.');
}

const buildId = await resolveBuildId(Browser.CHROME, platform, 'stable');
const installedBrowser = await install({
  browser: Browser.CHROME,
  buildId,
  cacheDir,
  platform
});

const lhciBin = process.platform === 'win32'
  ? path.join(rootDir, 'node_modules', '.bin', 'lhci.cmd')
  : path.join(rootDir, 'node_modules', '.bin', 'lhci');

const child = spawn(lhciBin, ['autorun', '--config=./lighthouserc.json'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: false,
  env: {
    ...process.env,
    LHCI_CHROME_PATH: installedBrowser.executablePath
  }
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
