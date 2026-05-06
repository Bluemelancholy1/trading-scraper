// Puppeteer 完整浏览器流程：登录 + 抓取平仓数据（等待JS渲染完成）
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
  console.log('首页URL:', page.url());
  
  // Step 2: 用超管账号登录ASP
  console.log('\nStep 2: ASP登录...');
  const loginResult = await page.evaluate(async () => {
    try {
      const resp = await fetch('/Handle/Login.asp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'iUserName=16616135917&iUserPass=135917&Iremember=0'
      });
      const text = await resp.text();
      return { status: resp.status, body: text.substring(0, 200) };
    } catch(e) { return { error: e.message }; }
  });
  console.log('登录结果:', JSON.stringify(loginResult));
  await new Promise(r => setTimeout(r, 1000));
  
  // Step 3: 验证房间密码
  console.log('\nStep 3: 验证房间密码...');
  await page.goto('https://qh.yemacaijing.net/Handle/CheckRoomPass.asp?ac=CheckRoomPass&RID=7000&P=414102', { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));
  
  // Step 4: 尝试访问 _Data_End_Show.asp（旧路径，含止损止盈）
  console.log('\nStep 4a: 测试 _Data_End_Show.asp (旧路径)...');
  let endBody, endLen;
  try {
    await page.goto('https://qh.yemacaijing.net/_Data_End_Show.asp?RoomID=7000&page=1', { waitUntil: 'networkidle2', timeout: 20000 });
    endBody = await page.content();
    endLen = endBody.length;
    console.log('  _Data_End_Show.asp 长度:', endLen);
    console.log('  前200字符:', endBody.substring(0, 200));
    
    // 检查有没有 data7
    const hasData7 = endBody.includes('data7');
    const hasData7Title = /class="data7"[^>]*title="[^"]+"/.test(endBody);
    console.log('  有data7标签:', hasData7);
    console.log('  data7有title值:', hasData7Title);
    
    if (hasData7Title) {
      fs.writeFileSync('end_show_puppeteer.html', endBody, 'utf8');
      console.log('  已保存 end_show_puppeteer.html');
      
      // 解析前3条看看字段
      const re = /<li>([\s\S]*?)<\/li>/g;
      let m, count = 0;
      while ((m = re.exec(endBody)) !== null && count < 3) {
        count++;
        console.log('\n  === 第' + count + '条 ===');
        const spans = m[1].match(/class="data\d+"[^>]*title="([^"]*)"/g) || [];
        spans.forEach(s => console.log('    ' + s));
      }
    }
  } catch(e) {
    console.log('  _Data_End_Show.asp 错误:', e.message);
  }
  
  // Step 5: 尝试新路径 _Data_Ping_Show.asp（等待JS渲染）
  console.log('\nStep 4b: 测试新路径 _Data_Ping_Show.asp (等待JS渲染)...');
  try {
    await page.goto('https://qh.yemacaijing.net/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1', { 
      waitUntil: 'networkidle2', 
      timeout: 25000 
    });
    
    // 多等一下让JS执行完
    await new Promise(r => setTimeout(r, 3000));
    
    // 获取渲染后的HTML（包含JS动态填充的内容）
    const renderedHTML = await page.content();
    console.log('  渲染后HTML长度:', renderedHTML.length);
    
    // 提取所有li中的data7/data8
    const liRe = /<li>([\s\S]*?)<\/li>/g;
    let m, count = 0;
    let foundSL = false, foundTP = false;
    
    while ((m = liRe.exec(renderedHTML)) !== null && count < 8) {
      count++;
      const li = m[1];
      const allFields = li.match(/class="data\d+"[^>]*title="([^"]*)"/g) || [];
      
      // 找data7和data8
      const d7 = li.match(/class="data7"[^>]*title="([^"]*)"/);
      const d8 = li.match(/class="data8"[^>]*title="([^"]*)"/);
      const d11 = li.match(/class="data11"[^>]*title="([^"]*)"/);
      
      const d7val = d7 ? d7[1] : '(空)';
      const d8val = d8 ? d8[1] : '(空)';
      const d11val = d11 ? d11[1] : '(空)';
      
      if (d7 && d7[1]) foundSL = true;
      if (d8 && d8[1]) foundTP = true;
      
      // 获取关键字段
      const d2 = li.match(/class="data2"[^>]*title="([^"]*)"/);
      const d3 = li.match(/class="data3"[^>]*title="([^"]*)"/);
      const d5 = li.match(/class="data5"[^>]*title="([^"]*)"/);
      const d6 = li.match(/class="data6"[^>]*title="([^"]*)"/);
      const d9 = li.match(/class="data9"[^>]*title="([^"]*)"/);
      const d10 = li.match(/class="data10"[^>]*title="([^"]*)"/);
      const d12 = li.match(/class="data12"[^>]*title="([^"]*)"/);
      
      console.log('\n  第' + count + '条:', 
        (d2?d2[1]:'') + ' | ' + (d3?d3[1]:'') + ' | ' + (d5?d5[1]:'') + 
        ' | 开仓:' + (d6?d6[1]:'') + 
        ' | 止损[' + d7val + ']' + 
        ' | 止盈[' + d8val + ']' +
        ' | 平仓:' + (d10?d10[1]:'') + 
        ' | 获利[' + d11val + ']' +
        ' | ' + (d12?d12[1]:'')
      );
    }
    
    console.log('\n  发现止损数据:', foundSL);
    console.log('  发现止盈数据:', foundTP);
    console.log('  总共解析', count, '条');
    
    // 保存渲染后的HTML
    fs.writeFileSync('ping_show_rendered.html', renderedHTML, 'utf8');
    console.log('\n  已保存 ping_show_rendered.html');
    
  } catch(e) {
    console.log('  错误:', e.message);
  }
  
  await browser.close();
  console.log('\n=== 完成 ===');
})().catch(e => console.error('FATAL:', e));
