const puppeteer = require('puppeteer');

(async () => {
  console.log('Testing new API path...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // 试试新路径（陈少截图里的）
    // 需要先确定完整URL，让我试试几个可能的
    const paths = [
      'https://qh.yemacaijing.net/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000',
      'https://qh.yemacaijing.net/generalmodule/shouted/_Data_End_Show.asp?roomid=7000',
      'https://qh.yemacaijing.net/generalmodule/shouted/_Data_Pin.asp?roomid=7000',
      // 旧路径（对比）
      'https://qh.yemacaijing.net/_Data_End_Show.asp?roomid=7000'
    ];
    
    for (const url of paths) {
      console.log('\n--- Testing:', url.split('?')[0].split('/').pop(), '---');
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
      
      const content = await page.content();
      console.log('Length:', content.length);
      console.log('Status via url:', page.url().includes('Error') ? '404' : '200');
      
      const hasError = content.includes('Error') && content.length < 500;
      const hasData = content.length > 1000;
      
      if (hasData) {
        console.log('✅ GOT DATA! Length:', content.length);
        console.log('First 150:', content.slice(0, 150));
        break;
      } else if (hasError) {
        console.log('❌ Error page');
      }
    }
    
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await browser.close();
})();