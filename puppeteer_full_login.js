// Puppeteer 完整登录 + 抓取 _Data_End_Show.asp（含止损止盈）
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  
  // Step 1: 访问首页获取初始Session
  console.log('[1] 访问首页...');
  await page.goto('https://qh.yemacaijing.net/', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  console.log('  首页标题:', await page.title());
  
  // Step 2: 填写登录表单
  console.log('[2] 填写登录表单...');
  // 先看看页面结构
  const loginFormHTML = await page.evaluate(() => {
    const forms = document.querySelectorAll('form');
    let info = '';
    forms.forEach(f => {
      info += `Form action="${f.action}"\n`;
      f.querySelectorAll('input').forEach(inp => {
        info += `  input: name="${inp.name}" type="${inp.type}" id="${inp.id}"\n`;
      });
      f.querySelectorAll('button').forEach(btn => {
        info += `  button: text="${btn.textContent.trim()}" type="${btn.type}"\n`;
      });
    });
    return info;
  });
  console.log('  表单结构:\n' + loginFormHTML);
  
  // 尝试方式1: 直接填input
  try {
    await page.type('input[name="username"]', '16616135917', { delay: 50 });
    await page.type('input[name="password"]', '135917', { delay: 50 });
    console.log('  已填写账号密码');
    
    // 点击登录按钮
    const btnClicked = await page.evaluate(() => {
      const btns = document.querySelectorAll('button[type="submit"], input[type="submit"]');
      if (btns.length > 0) { btns[0].click(); return true; }
      // 也尝试找登录按钮文字
      const allBtns = [...document.querySelectorAll('button, [onclick]')];
      const loginBtn = allBtns.find(b => b.textContent.includes('登录') || b.textContent.includes('Login'));
      if (loginBtn) { loginBtn.click(); return true; }
      return false;
    });
    console.log('  点击登录按钮:', btnClicked);
  } catch(e) {
    console.log('  方式1失败:', e.message);
  }
  
  await new Promise(r => setTimeout(r, 5000));
  
  // 检查登录结果
  const afterLoginUrl = page.url();
  const cookies = await page.cookies('https://qh.yemacaijing.net');
  console.log('\n[3] 登录后状态:');
  console.log('  URL:', afterLoginUrl);
  console.log('  Cookies数量:', cookies.length);
  cookies.forEach(c => console.log(`    ${c.name}=${c.value.substring(0,40)}...`));
  
  // Step 3: 验证房间密码
  console.log('\n[4] 验证房间密码...');
  try {
    await page.goto('https://qh.yemacaijing.net/Handle/CheckRoomPass.asp?ac=CheckRoomPass&RID=7000&P=414102', { waitUntil: 'networkidle2', timeout: 15000 });
    const roomBody = await page.content();
    console.log('  房间验证响应长度:', roomBody.length);
  } catch(e) {
    console.log('  房间验证错误:', e.message);
  }
  
  // Step 4: 尝试抓取 _Data_End_Show.asp（完整平仓数据，含止损止盈）
  console.log('\n[5] 测试 _Data_End_Show.asp...');
  try {
    const resp = await page.goto('https://qh.yemacaijing.net/_Data_End_Show.asp?RoomID=7000&page=1', { waitUntil: 'networkidle2', timeout: 25000 });
    const body = await page.content();
    console.log('  状态码:', resp.status());
    console.log('  Body长度:', body.length);
    console.log('  包含data7(止损):', body.includes('data7'));
    console.log('  包含data8(止盈):', body.includes('data8'));
    console.log('  包含"请注册":', body.includes('请注册'));
    
    if (body.includes('data7') && !body.includes('请注册')) {
      // 成功！保存到文件
      require('fs').writeFileSync('end_show_test.html', body, 'utf8');
      console.log('\n✅ 成功! 已保存到 end_show_test.html');
      
      // 解析测试
      const re = /<li>([\s\S]*?)<\/li>/g;
      let m, count = 0;
      while ((m = re.exec(body)) !== null && count < 3) {
        count++;
        const li = m[1];
        const get = r => { const x = li.match(r); return x ? x[1].trim() : ''; };
        console.log(`\n--- 第${count}条 ---`);
        console.log(`  开仓时间: ${get(/class="data2"[^>]*title="([^"]+)"/)}`);
        console.log(`  方向: ${get(/class="data3"[^>]*title="([^"]+)"/)}`);
        console.log(`  商品: ${get(/class="data5"[^>]*title="([^"]+)"/)}`);
        console.log(`  开仓价: ${get(/class="data6"[^>]*title="([^"]+)"/)}`);
        console.log(`  止损(data7): ${get(/class="data7"[^>]*title="([^"]+)"/)}`);
        console.log(`  止盈(data8): ${get(/class="data8"[^>]*title="([^"]+)"/)}`);
        console.log(`  平仓时间: ${get(/class="data9"[^>]*title="([^"]+)"/)}`);
        console.log(`  平仓价: ${get(/class="data10"[^>]*title="([^"]+)"/)}`);
        console.log(`  老师: ${get(/class="data12"[^>]*title="([^"]+)"/)}`);
      }
    } else {
      console.log('\n❌ 失败，可能未登录成功或权限不足');
      // 显示前500字符帮助调试
      console.log('  前500字符:', body.substring(0, 500));
    }
  } catch(e) {
    console.log('  _Data_End_Show 错误:', e.message);
  }
  
  // Step 5: 同时也测试新路径的 _Data_Ping_Show.asp
  console.log('\n[6] 测试新路径 _Data_Ping_Show.asp...');
  try {
    await page.goto('https://qh.yemacaijing.net/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1', { waitUntil: 'networkidle2', timeout: 25000 });
    const body2 = await page.content();
    console.log('  Body长度:', body2.length);
    console.log('  包含data7:', body2.includes('data7'));
    console.log('  包含"请注册":', body2.includes('请注册'));
  } catch(e) {
    console.log('  新路径错误:', e.message);
  }
  
  await browser.close();
  console.log('\n完成!');
})().catch(e => console.error('FATAL:', e));
