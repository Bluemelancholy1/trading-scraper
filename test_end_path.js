const puppeteer = require('puppeteer');

async function testEndPath() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  
  console.log('Testing /generalmodule/shouted/_Data_End_Show.asp...');
  
  await page.goto('https://qh.yemacaijing.net/generalmodule/shouted/_Data_End_Show.asp?roomid=7000&page=1', {
    waitUntil: 'domcontentloaded',
    timeout: 25000
  });
  
  const content = await page.content();
  console.log('Length:', content.length);
  console.log('First 200:', content.substring(0, 200));
  
  await browser.close();
}

testEndPath();