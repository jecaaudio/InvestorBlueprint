import path from 'node:path';
import {
  Browser,
  detectBrowserPlatform,
  install,
  resolveBuildId
} from '@puppeteer/browsers';

const cacheDir = path.resolve('.cache/chrome');
const platform = detectBrowserPlatform();

if (!platform) {
  throw new Error('No se pudo detectar una plataforma compatible para Chrome for Testing.');
}

const buildId = await resolveBuildId(Browser.CHROME, platform, 'stable');
const installedBrowser = await install({
  browser: Browser.CHROME,
  buildId,
  cacheDir,
  platform
});

console.log(installedBrowser.executablePath);
