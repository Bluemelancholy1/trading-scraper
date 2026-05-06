const puppeteer = require('puppeteer');

async function testNewPath() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // 设置更长的超时
  page.setDefaultTimeout(60000);
  
  console.log('Testing new path: /generalmodule/shouted/_Data_Ping_Show.asp');
  
  try {
    // 尝试新路径
    await page.goto('https://qh.yemacaijing.net/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    const content = await page.content();
    console.log('Status: Success');
    console.log('Content length:', content.length);
    console.log('First 200 chars:', content.substring(0, 200));
    
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await browser.close();
}

testNewPath();