import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const outDir = path.resolve('.playwright');
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/ms-playwright/chromium-1208/chrome-linux64/chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 1 });

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.getByRole('heading', { name: '霓虹俄罗斯方块' }).waitFor();
  await page.getByLabel('俄罗斯方块棋盘').waitFor();
  await page.screenshot({ path: path.join(outDir, '01-start-screen.png'), fullPage: true });

  await page.getByRole('button', { name: '开始游戏' }).click();
  await page.waitForTimeout(600);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, '02-playing-screen.png'), fullPage: true });

  await page.keyboard.press('KeyP');
  await page.getByText('游戏暂停').waitFor();
  await page.screenshot({ path: path.join(outDir, '03-paused-screen.png'), fullPage: true });

  const health = await page.evaluate(async () => {
    const response = await fetch('/health');
    return response.json();
  });

  const summary = {
    url: page.url(),
    title: await page.title(),
    health,
    screenshots: [
      '01-start-screen.png',
      '02-playing-screen.png',
      '03-paused-screen.png',
    ],
    feedbackPanelText: await page.locator('.feedback-panel').innerText(),
  };

  await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser.close();
}
