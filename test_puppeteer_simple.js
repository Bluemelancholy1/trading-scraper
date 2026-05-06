const puppeteer = require('puppeteer');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

  const url = 'https://qh.yemacaijing.net/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1';
  console.log('Fetching:', url);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const content = await page.content();
    console.log('Content length:', content.length);

    // 检查是否有数据
    if (content.includes('data2')) {
      const matches = content.match(/class="data2"[^>]*title="[^"]+"/g);
      console.log('Found', matches ? matches.length : 0, 'rows');
      if (matches && matches.length > 0) {
        console.log('First row:', matches[0]);
      }
    } else {
      console.log('No data2 found in content');
      console.log('First 500 chars:', content.substring(0, 500));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }

  await browser.close();
  console.log('Done!');
})();
