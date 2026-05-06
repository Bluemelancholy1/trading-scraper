// 详细解析 _Data_Ping_Show.asp 新路径的所有字段
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  
  // 先访问首页获取session
  await page.goto('https://qh.yemacaijing.net/', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));
  
  // 验证房间密码
  await page.goto('https://qh.yemacaijing.net/Handle/CheckRoomPass.asp?ac=CheckRoomPass&RID=7000&P=414102', { waitUntil: 'networkidle2', timeout: 15000 });
  
  // 抓取平仓数据
  console.log('抓取 _Data_Ping_Show.asp...');
  await page.goto('https://qh.yemacaijing.net/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1', { waitUntil: 'networkidle2', timeout: 25000 });
  const body = await page.content();
  
  // 保存原始HTML
  fs.writeFileSync('ping_show_full.html', body, 'utf8');
  console.log('已保存到 ping_show_full.html (' + body.length + ' bytes)');
  
  // 解析所有li
  const re = /<li>([\s\S]*?)<\/li>/g;
  let m;
  let count = 0;
  while ((m = re.exec(body)) !== null) {
    count++;
    const li = m[1];
    
    if (count <= 5) {
      console.log('\n=== 第' + count + '条记录 ===');
      
      // 提取所有 data* class 的 title 属性
      const allData = li.match(/class="data\d+"[^>]*title="([^"]*)"/g) || [];
      allData.forEach(d => {
        console.log('  ' + d);
      });
      
      // 也检查有没有没有 title 的 span
      const spansNoTitle = li.match(/class="data\d+">([^<]*)<\/span>/g) || [];
      if (spansNoTitle.length > 0) {
        console.log('  [无title的span]:');
        spansNoTitle.forEach(s => console.log('    ' + s));
      }
    }
  }
  
  console.log('\n总共 ' + count + ' 条记录');
  
  // 检查HTML中所有 data class 定义
  console.log('\n=== CSS中定义的data类 ===');
  const cssMatches = body.match(/\.data\d+\s*\{[^}]+\}/g) || [];
  cssMatches.forEach(c => console.log('  ' + c.substring(0, 80)));
  
  await browser.close();
})().catch(e => console.error('FATAL:', e));
