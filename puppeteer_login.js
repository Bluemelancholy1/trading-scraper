const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');

  console.log('Navigating to login page...');
  await page.goto('https://qh.yemacaijing.net/', { waitUntil: 'networkidle2', timeout: 30000 });

  // Fill login form
  await page.evaluate(() => {
    document.querySelector('input[name="username"]').value = '16616135917';
    document.querySelector('input[name="password"]').value = '135917';
  });

  // Submit
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 3000));

  // Get cookies
  const cookies = await page.cookies('https://qh.yemacaijing.net');
  console.log('Cookies after login:', JSON.stringify(cookies, null, 2));

  // Try to access _Data_End_Show
  console.log('\nTesting _Data_End_Show.asp...');
  const response = await page.goto('https://qh.yemacaijing.net/generalmodule/shouted/_Data_End_Show.asp?roomid=7000&page=1', { timeout: 30000 });
  const body = await page.content();
  console.log('Status:', response.status());
  console.log('Body length:', body.length);
  console.log('Has data7:', body.includes('data7'));
  console.log('Has 请注册:', body.includes('请注册'));

  await browser.close();
})();
