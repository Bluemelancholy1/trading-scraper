const puppeteer = require('puppeteer');

(async () => {
  console.log('Launching browser...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-headless-mode'  // 尝试关闭headless特征
    ]
  });
  
  const context = browser.defaultBrowserContext();
  const page = await browser.newPage();
  
  // 模拟真实浏览器
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  
  try {
    // Step 1: 先访问主站首页，建立 session
    console.log('Step 1: Visit main site...');
    const mainUrl = 'https://qh.yemacaijing.net/';
    await page.goto(mainUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Main site status:', page.url());
    
    // 检查 cookie
    const clients = await page.cookies();
    console.log('Cookies after main site:', clients.map(c => c.name).join(', '));
    
    // Step 2: 访问直播间（触发登录跳转）
    console.log('\nStep 2: Visit room...');
    const roomUrl = 'https://qh.yemacaijing.net/room.asp?roomid=7000';
    await page.goto(roomUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Room URL:', page.url());
    
    const roomCookies = await page.cookies();
    console.log('Cookies after room:', roomCookies.map(c => c.name).join(', '));
    
    // Step 3: 最后访问数据接口
    console.log('\nStep 3: Visit data API...');
    const dataUrl = 'https://qh.yemacaijing.net/_Data_End_Show.asp?roomid=7000';
    const resp = await page.goto(dataUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('Data status:', resp.status());
    const content = await page.content();
    console.log('Content length:', content.length);
    console.log('First 200 chars:', content.slice(0, 200));
    
    const hasError = content.includes('施主') || content.includes('请慢走');
    const hasData = content.includes('data1') || content.includes('data2') || content.includes('平仓');
    
    console.log('\nResult:');
    console.log('- Has error page:', hasError);
    console.log('- Has data:', hasData);
    
    if (hasData) console.log('\n✅ SUCCESS!');
    else if (hasError) console.log('\n❌ Blocked');
    
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await browser.close();
})();