import { chromium } from 'playwright';

const BASE_URL = 'https://nexavo-marknadsapp.vercel.app';
const CREDENTIALS = { email: 'hq@test.nexavo.se', password: 'Test1234!' };

async function takeScreenshots() {
  const browser = await chromium.launch();
  
  // Mobile viewport (390px)
  const mobilePage = await browser.newPage({
    viewport: { width: 390, height: 844 }
  });

  // Desktop viewport
  const desktopPage = await browser.newPage({
    viewport: { width: 1440, height: 900 }
  });

  // Login function
  async function login(page, label) {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', CREDENTIALS.email);
    await page.fill('input[type="password"]', CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/hq**', { timeout: 10000 });
    console.log(`✓ ${label} logged in`);
  }

  try {
    // Login both
    await login(mobilePage, 'Mobile');
    await login(desktopPage, 'Desktop');

    // Screenshot: Dashboard already taken, skip

    // Mobile: Open hamburger menu
    await mobilePage.click('button:has(svg)'); // Hamburger menu button
    await mobilePage.waitForTimeout(500);

    // Navigate to campaigns - mobile
    await mobilePage.click('a[href="/hq/campaigns"]');
    await mobilePage.waitForTimeout(1500);
    await mobilePage.screenshot({ path: 'screenshots/03-campaigns-mobile.jpg', type: 'jpeg', quality: 80 });
    console.log('✓ Campaigns mobile screenshot');

    // Desktop: Navigate to campaigns
    await desktopPage.click('a[href="/hq/campaigns"]');
    await desktopPage.waitForTimeout(1500);
    await desktopPage.screenshot({ path: 'screenshots/04-campaigns-desktop.jpg', type: 'jpeg', quality: 80 });
    console.log('✓ Campaigns desktop screenshot');

    // Mobile: Open hamburger menu again
    await mobilePage.click('button:has(svg)');
    await mobilePage.waitForTimeout(500);

    // Navigate to calendar - mobile
    await mobilePage.click('a[href="/hq/calendar"]');
    await mobilePage.waitForTimeout(1500);
    await mobilePage.screenshot({ path: 'screenshots/05-calendar-mobile.jpg', type: 'jpeg', quality: 80 });
    console.log('✓ Calendar mobile screenshot');

    // Desktop: Navigate to calendar
    await desktopPage.click('a[href="/hq/calendar"]');
    await desktopPage.waitForTimeout(1500);
    await desktopPage.screenshot({ path: 'screenshots/06-calendar-desktop.jpg', type: 'jpeg', quality: 80 });
    console.log('✓ Calendar desktop screenshot');

    console.log('\n✅ All screenshots saved to screenshots/');
  } catch (error) {
    console.error('Error:', error.message);
    // Take error screenshots
    await mobilePage.screenshot({ path: 'screenshots/error-mobile.jpg', type: 'jpeg' });
    await desktopPage.screenshot({ path: 'screenshots/error-desktop.jpg', type: 'jpeg' });
  } finally {
    await browser.close();
  }
}

takeScreenshots();
