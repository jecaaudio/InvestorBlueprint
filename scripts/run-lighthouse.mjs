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

const lhciBin = path.join(rootDir, 'node_modules', '@lhci', 'cli', 'src', 'cli.js');

const args = [lhciBin, 'autorun', '--config=./lighthouserc.json'];
if (process.platform === 'win32') {
  args.push('--collect.startServerCommand=python -u -m http.server 4173 --bind 127.0.0.1 --directory ..');
}
const child = spawn(process.execPath, args, {
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
