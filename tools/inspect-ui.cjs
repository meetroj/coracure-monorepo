const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lnc/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs = require('node:fs');
(async () => {
  fs.mkdirSync('artifacts/ui', { recursive: true });
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', error => console.log('PAGE ERROR', error.message));
  await page.goto('http://127.0.0.1:4200');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'artifacts/ui/welcome-before.png', fullPage: true });
  console.log((await page.locator('body').innerText()).slice(0, 1800));
  await browser.close();
})();
