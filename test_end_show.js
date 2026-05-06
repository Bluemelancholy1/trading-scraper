const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  
  // Test the NEW path for _Data_End_Show
  const url = 'https://qh.yemacaijing.net/generalmodule/shouted/_Data_End_Show.asp?roomid=7000&page=1';
  console.log('Testing:', url);
  
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  
  const content = await page.content();
  console.log('Length:', content.length);
  console.log('First 500 chars:', content.substring(0, 500));
  
  // Check if it has data7/data8 (stop loss/take profit)
  const hasData7 = content.includes('data7');
  const hasData8 = content.includes('data8');
  console.log('Has data7 (stop loss):', hasData7);
  console.log('Has data8 (take profit):', hasData8);
  
  await browser.close();
})();
