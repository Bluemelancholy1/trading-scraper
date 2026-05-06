const puppeteer = require('puppeteer');

(async () => {
  console.log('Launching browser...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  
  const page = await browser.newPage();
  
  // 模拟真实浏览器
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
  
  console.log('Navigating to data page...');
  
  const url = 'https://qh.yemacaijing.net/_Data_End_Show.asp?roomid=7000';
  
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('Status:', response.status());
    console.log('Final URL:', page.url());
    
    const content = await page.content();
    console.log('Content length:', content.length);
    console.log('First 200 chars:', content.slice(0, 200));
    
    // 检查是否成功（有数据表格还是错误页）
    const hasError = content.includes('施主') || content.includes('请慢走');
    const hasData = content.includes('data1') || content.includes('data2') || content.includes('平仓');
    
    console.log('\nResult:');
    console.log('- Has error page:', hasError);
    console.log('- Has data:', hasData);
    
    if (hasData) {
      console.log('\n✅ SUCCESS! Browser can fetch data.');
    } else if (hasError) {
      console.log('\n❌ Blocked (nginx static error page)');
    }
    
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await browser.close();
})();