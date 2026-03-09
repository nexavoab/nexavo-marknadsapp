const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  // Login
  await page.goto('http://localhost:4444/login');
  await page.fill('input[type="email"]', 'hq@test.nexavo.se');
  await page.fill('input[type="password"]', 'Test1234!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // Dashboard med stängd chat
  await page.goto('http://localhost:4444/hq');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/v2_closed.png' });
  console.log('1: closed');

  // Klicka chat-bubbla
  const chatBtn = await page.$('button[class*="rounded-full"][class*="bg-primary"]');
  if (chatBtn) {
    await chatBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: '/tmp/v2_open.png' });
    console.log('2: open');

    // Skriv och skicka
    const input = await page.$('input[placeholder*="meddelande"]');
    if (input) {
      await input.type('Vad ska vi köra för kampanj till påsk?');
      await input.press('Enter');
      
      // Screenshot DIREKT efter Enter för att fånga loading
      await page.waitForTimeout(100);
      await page.screenshot({ path: '/tmp/v2_loading.png' });
      console.log('3: loading');
      
      // Vänta på svar
      await page.waitForTimeout(8000);
      await page.screenshot({ path: '/tmp/v2_response.png' });
      console.log('4: response');
    }
  }

  await browser.close();
  console.log('Done');
})();
