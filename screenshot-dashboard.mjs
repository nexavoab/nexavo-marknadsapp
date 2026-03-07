import { chromium } from 'playwright';

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: true });
  
  // Desktop viewport
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const desktopPage = await desktopContext.newPage();
  
  // Login
  await desktopPage.goto('http://localhost:4444/login');
  await desktopPage.fill('input[type="email"]', 'hq@test.nexavo.se');
  await desktopPage.fill('input[type="password"]', 'Test1234!');
  await desktopPage.click('button[type="submit"]');
  
  // Wait for redirect to dashboard
  await desktopPage.waitForURL('**/hq/**', { timeout: 15000 });
  await desktopPage.waitForLoadState('networkidle');
  await desktopPage.waitForTimeout(2000); // Allow time for data to load
  
  // Take desktop screenshot
  await desktopPage.screenshot({ 
    path: 'screenshots/dashboard-desktop-1440.png',
    fullPage: true,
  });
  console.log('Desktop screenshot saved');
  
  // Mobile viewport
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
  });
  const mobilePage = await mobileContext.newPage();
  
  // Login on mobile
  await mobilePage.goto('http://localhost:4444/login');
  await mobilePage.fill('input[type="email"]', 'hq@test.nexavo.se');
  await mobilePage.fill('input[type="password"]', 'Test1234!');
  await mobilePage.click('button[type="submit"]');
  
  // Wait for redirect
  await mobilePage.waitForURL('**/hq/**', { timeout: 15000 });
  await mobilePage.waitForLoadState('networkidle');
  await mobilePage.waitForTimeout(2000);
  
  // Take mobile screenshot
  await mobilePage.screenshot({ 
    path: 'screenshots/dashboard-mobile-390.png',
    fullPage: true,
  });
  console.log('Mobile screenshot saved');
  
  await browser.close();
  console.log('Done!');
}

takeScreenshots().catch(console.error);
