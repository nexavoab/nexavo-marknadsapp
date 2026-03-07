import { chromium } from 'playwright';

const BASE_URL = 'https://nexavo-marknadsapp.vercel.app';
const CREDENTIALS = { email: 'hq@test.nexavo.se', password: 'Test1234!' };

async function takeScreenshots() {
  const browser = await chromium.launch();
  
  // Desktop viewport
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 }
  });

  // Mobile viewport
  const mobilePage = await browser.newPage({
    viewport: { width: 390, height: 844 }
  });

  try {
    // Desktop login and screenshots
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', CREDENTIALS.email);
    await page.fill('input[type="password"]', CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/hq**', { timeout: 10000 });
    console.log('✓ Desktop logged in');

    // Go to campaigns
    await page.goto(`${BASE_URL}/hq/campaigns`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/04-campaigns-desktop.jpg', type: 'jpeg', quality: 80 });
    console.log('✓ Campaigns desktop screenshot');

    // Go to calendar
    await page.goto(`${BASE_URL}/hq/calendar`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/06-calendar-desktop.jpg', type: 'jpeg', quality: 80 });
    console.log('✓ Calendar desktop screenshot');

    // Mobile login
    await mobilePage.goto(`${BASE_URL}/login`);
    await mobilePage.fill('input[type="email"]', CREDENTIALS.email);
    await mobilePage.fill('input[type="password"]', CREDENTIALS.password);
    await mobilePage.click('button[type="submit"]');
    await mobilePage.waitForURL('**/hq**', { timeout: 10000 });
    console.log('✓ Mobile logged in');

    // Mobile calendar
    await mobilePage.goto(`${BASE_URL}/hq/calendar`);
    await mobilePage.waitForTimeout(1500);
    await mobilePage.screenshot({ path: 'screenshots/05-calendar-mobile.jpg', type: 'jpeg', quality: 80 });
    console.log('✓ Calendar mobile screenshot');

    console.log('\n✅ Remaining screenshots saved!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

takeScreenshots();
