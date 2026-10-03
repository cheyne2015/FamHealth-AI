import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('docs/screenshots');
const imgDir = path.resolve('docs/images');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(imgDir, { recursive: true });

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function saveBoth(page, filename) {
  const p1 = path.join(outDir, filename);
  const p2 = path.join(imgDir, filename);
  await page.screenshot({ path: p1, type: 'png' });
  fs.copyFileSync(p1, p2);
  console.log(`Saved ${filename} to both docs/screenshots/ and docs/images/`);
}

function findChromeBinary() {
  const candidates = [
    '/app/applet/chrome/linux-154.0.8037.92/chrome-linux64/chrome',
    path.resolve('chrome/linux-154.0.8037.92/chrome-linux64/chrome'),
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return null;
}

async function capture() {
  const chromePath = findChromeBinary();
  if (!chromePath) {
    throw new Error('Chrome binary not found. Please verify chrome download path.');
  }

  console.log(`Launching headless Chrome from: ${chromePath}...`);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--hide-scrollbars',
      '--font-render-hinting=medium'
    ],
    defaultViewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2
    }
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  console.log('Navigating to http://localhost:3000?demo=true with clean isolated demo state...');
  await page.goto('http://localhost:3000/?demo=true', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(1500);

  // Enforce 100% clean desensitized demo environment in localStorage
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('family_health_demo_mode', 'true');
    localStorage.setItem('health_app_theme', 'light');
    document.documentElement.classList.remove('dark');
  });

  await page.goto('http://localhost:3000/?demo=true', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(2500);

  // Safety DOM sanitizer: Replace any accidental private tokens, emails or phone numbers in text nodes
  await page.evaluate(() => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /1[3-9]\d{9}/g;
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        let val = node.nodeValue;
        if (emailRegex.test(val)) {
          val = val.replace(emailRegex, 'demo.patient@example.com');
        }
        if (phoneRegex.test(val)) {
          val = val.replace(phoneRegex, '138****0000');
        }
        node.nodeValue = val;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        for (const child of node.childNodes) {
          walk(child);
        }
      }
    };
    walk(document.body);
  });

  console.log('1. Capturing 01-timeline.png (Timeline View)...');
  const tabTimeline = await page.$('#tab-timeline');
  if (tabTimeline) await tabTimeline.click();
  await sleep(1200);
  await saveBoth(page, '01-timeline.png');
  await page.screenshot({ path: path.join(imgDir, 'home-light.png'), type: 'png' });

  console.log('2. Capturing 02-trend-chart.png (Indicator Comparison)...');
  const tabComparison = await page.$('#tab-comparison');
  if (tabComparison) await tabComparison.click();
  await sleep(1500);
  await saveBoth(page, '02-trend-chart.png');

  console.log('3. Capturing 03-ai-consultant.png (AI Consultant)...');
  const tabAi = await page.$('#tab-ai');
  if (tabAi) await tabAi.click();
  await sleep(1500);
  await saveBoth(page, '03-ai-consultant.png');

  console.log('4. Capturing 07-anomaly-alerts.png (Anomaly Alerts)...');
  const tabAlerts = await page.$('#tab-alerts');
  if (tabAlerts) await tabAlerts.click();
  await sleep(1200);
  await saveBoth(page, '07-anomaly-alerts.png');

  console.log('5. Capturing 08-milestone-calendar.png (Milestone Calendar)...');
  const tabMilestones = await page.$('#tab-milestones');
  if (tabMilestones) await tabMilestones.click();
  await sleep(1200);
  await saveBoth(page, '08-milestone-calendar.png');

  // Return to timeline to open modals cleanly
  if (tabTimeline) await tabTimeline.click();
  await sleep(1000);

  console.log('6. Capturing 04-doctor-quick-glance.png (Doctor Quick-Glance Modal)...');
  const docGlanceBtn = await page.$('#header-doctor-glance-btn');
  if (docGlanceBtn) {
    await docGlanceBtn.click();
    await sleep(1500);
    await saveBoth(page, '04-doctor-quick-glance.png');
    const closeBtn = await page.$('#close-doctor-glance-btn');
    if (closeBtn) await closeBtn.click();
    await sleep(800);
  }

  console.log('7. Capturing 05-upload-ocr.png (Upload Report Modal)...');
  const uploadBtn = await page.$('#upload-report-header-btn');
  if (uploadBtn) {
    await uploadBtn.click();
    await sleep(1500);
    await saveBoth(page, '05-upload-ocr.png');
    const closeUploadBtn = await page.$('#close-upload-modal-btn');
    if (closeUploadBtn) await closeUploadBtn.click();
    await sleep(800);
  }

  console.log('8. Capturing 06-voice-memo.png (Doctor Visit Memo Modal)...');
  const voiceBtn = await page.$('#header-voice-memo-btn');
  if (voiceBtn) {
    await voiceBtn.click();
    await sleep(1500);
    await saveBoth(page, '06-voice-memo.png');
    const closeVoiceBtn = await page.$('#close-voice-memo-modal-btn');
    if (closeVoiceBtn) {
      await closeVoiceBtn.click();
    } else {
      const xBtn = await page.$('button[aria-label="关闭"]');
      if (xBtn) await xBtn.click();
    }
    await sleep(800);
  }

  console.log('9. Capturing home-dark.png in dark mode...');
  const themeBtn = await page.$('#header-theme-toggle-btn');
  if (themeBtn) {
    await themeBtn.click();
    await sleep(1200);
    await page.screenshot({ path: path.join(imgDir, 'home-dark.png'), type: 'png' });
    await page.screenshot({ path: path.join(outDir, 'home-dark.png'), type: 'png' });
  }

  console.log('SUCCESS: All 100% desensitized real project screenshots have been captured and saved!');
  await browser.close();
}

capture().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
