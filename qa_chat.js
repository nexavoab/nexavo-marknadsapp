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

  // Screenshot 1: Dashboard med stängd chat-bubbla
  await page.goto('http://localhost:4444/hq');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/chat_closed.png' });
  console.log('Screenshot 1: chat_closed.png');

  // Klicka på chat-bubblan
  const chatBtn = await page.$('button[class*="rounded-full"][class*="bg-primary"]');
  if (chatBtn) {
    await chatBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: '/tmp/chat_open.png' });
    console.log('Screenshot 2: chat_open.png');

    // Skriv ett meddelande
    const input = await page.$('input[placeholder*="meddelande"]');
    if (input) {
      await input.type('Vad ska vi köra för kampanj till påsk?');
      await page.screenshot({ path: '/tmp/chat_typed.png' });
      console.log('Screenshot 3: chat_typed.png');
      await input.press('Enter');
      await page.waitForTimeout(5000); // Vänta på AI-svar
      await page.screenshot({ path: '/tmp/chat_response.png' });
      console.log('Screenshot 4: chat_response.png');
    } else {
      console.log('ERROR: Input field not found');
    }
  } else {
    console.log('ERROR: Chat button not found');
  }

  await browser.close();
  console.log('Screenshots klara');
})();
