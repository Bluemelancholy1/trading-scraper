// Puppeteer 用135917账号登录 + 抓取建仓提醒页
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  
  // Step 1: 访问首页
  console.log('Step 1: 访问首页...');
  await page.goto('https://qh.yemacaijing.net/', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  
  // Step 2: 用135917账号ASP登录
  console.log('\nStep 2: 用135917账号登录...');
  const loginResult = await page.evaluate(async () => {
    try {
      const resp = await fetch('/Handle/Login.asp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'iUserName=135917&iUserPass=135917&Iremember=0'
      });
      const text = await resp.text();
      return { status: resp.status, len: text.length, preview: text.substring(0, 200) };
    } catch(e) { return { error: e.message }; }
  });
  console.log('登录结果:', JSON.stringify(loginResult));
  await new Promise(r => setTimeout(r, 1500));
  
  // Step 3: 验证房间密码
  console.log('\nStep 3: 验证房间密码...');
  try {
    await page.goto('https://qh.yemacaijing.net/Handle/CheckRoomPass.asp?ac=CheckRoomPass&RID=7000&P=414102', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1000));
    
    // 检查当前Cookie
    const cookies = await page.cookies();
    console.log('Cookies:', JSON.stringify(cookies.map(c => ({name: c.name, value: c.value.substring(0, 30)}))));
  } catch(e) {
    console.log('房间密码验证:', e.message);
  }
  
  // Step 4: 尝试新路径建仓提醒
  console.log('\nStep 4: 新路径 _data_start_show.asp (generalmodule/shouted)...');
  try {
    let url = 'https://qh.yemacaijing.net/generalmodule/shouted/_data_start_show.asp?classid=8&roomid=7000&page=1';
    console.log('  URL:', url);
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise(r => setTimeout(r, 4000)); // 等JS渲染
    
    let html = await page.content();
    console.log('  HTML长度:', html.length);
    console.log('  前500字符:', html.substring(0, 500));
    
    // 保存完整HTML
    fs.writeFileSync('jc_135917_rendered.html', html, 'utf8');
    console.log('  已保存 jc_135917_rendered.html');
    
    // 解析li条目
    if (!html.includes('请注册会员') && !html.includes('请慢走') && !html.includes('<title>Error')) {
      const liRe = /<li>([\s\S]*?)<\/li>/g;
      let m, count = 0;
      let foundSL = false, foundTP = false;
      
      while ((m = liRe.exec(html)) !== null && count < 15) {
        count++;
        const li = m[1];
        
        const d2 = li.match(/class="data2"[^>]*title="([^"]*)"/);
        const d3 = li.match(/class="data3"[^>]*title="([^"]*)"/);
        const d5 = li.match(/class="data5"[^>]*title="([^"]*)"/);
        const d6 = li.match(/class="data6"[^>]*title="([^"]*)"/);
        const d7 = li.match(/class="data7"[^>]*title="([^"]*)"/);  // 止损
        const d8 = li.match(/class="data8"[^>]*title="([^"]*)"/);  // 止盈
        const d12 = li.match(/class="data12"[^>]*title="([^"]*)"/); // 老师
        
        const d7val = d7 ? d7[1] : '(空)';
        const d8val = d8 ? d8[1] : '(空)';
        
        if (d7 && d7[1]) foundSL = true;
        if (d8 && d8[1]) foundTP = true;
        
        console.log(`\n  第${count}条: ${d2?d2[1]:''} | ${d3?d3[1]:''} | ${d5?d5[1]:''} | 开仓:${d6?d6[1]:''} | 止损[${d7val}] | 止盈[${d8val}] | ${d12?d12[1]:''}`);
      }
      
      console.log(`\n=== 结果 ===`);
      console.log(`总条数: ${count}`);
      console.log(`发现止损: ${foundSL}`);
      console.log(`发现止盈: ${foundTP}`);
    } else {
      console.log('  ❌ 页面返回错误或权限不足');
    }
    
  } catch(e) {
    console.log('错误:', e.message);
  }
  
  // Step 5: 也试试旧路径（万一135917账号能过旧路径）
  console.log('\n\nStep 5: 旧路径 _data_start_show.asp...');
  try {
    let url = 'https://qh.yemacaijing.net/_data_start_show.asp?classid=8&roomid=7000&page=1';
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));
    
    let html = await page.content();
    console.log('  HTML长度:', html.length);
    console.log('  前300字符:', html.substring(0, 300));
  } catch(e) {
    console.log('错误:', e.message);
  }
  
  await browser.close();
  console.log('\n=== 完成 ===');
})().catch(e => console.error('FATAL:', e));
