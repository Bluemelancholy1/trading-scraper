const puppeteer = require('puppeteer');

async function testMultiplePages() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  
  console.log('Testing pagination pages 1-3...');
  
  for (let p = 1; p <= 3; p++) {
    await page.goto(`https://qh.yemacaijing.net/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=${p}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    const content = await page.content();
    const cheerio = require('cheerio');
    const $ = cheerio.load(content);
    const spans = $('span[class^=data]').get();
    
    console.log(`Page ${p}: ${spans.length} cells, ${spans.length/7} rows`);
  }
  
  // Also try the end page
  console.log('\nTesting _Data_End_Show.asp...');
  await page.goto('https://qh.yemacaijing.net/_Data_End_Show.asp?roomid=7000&page=1', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  const content = await page.content();
  console.log('Content length:', content.length);
  console.log('First 100 chars:', content.substring(0, 100));
  
  await browser.close();
}

testMultiplePages();