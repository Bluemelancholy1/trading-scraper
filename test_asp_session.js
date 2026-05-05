// 探测：ishow cookie是否影响服务器返回的字段数量
const https = require('https');
const fs = require('fs');

function postRequest(path, body, headers = {}) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'qh.yemacaijing.net',
      port: 443,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://qh.yemacaijing.net/',
        ...headers
      },
      rejectUnauthorized: false
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    req.write(body);
    req.end();
  });
}

function getRequest(path, headers = {}) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'qh.yemacaijing.net',
      port: 443,
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://qh.yemacaijing.net/',
        ...headers
      },
      rejectUnauthorized: false
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    req.end();
  });
}

async function main() {
  console.log('=== ASP Session + ishow cookie 测试 ===\n');

  // Step 1: 先访问主页，建立ASP Session
  console.log('[Step 1] 访问主页，建立ASP Session...');
  const home = await getRequest('/generalmodule/shouted/shouted_index.asp?roomid=7000');
  const aspSession1 = home.headers['set-cookie']?.[0]?.split(';')[0] || '';
  console.log('ASP Session from home:', aspSession1);
  
  // Step 2: 带着ASP Session访问平仓页（无ishow）
  console.log('\n[Step 2] 无ishow访问平仓页...');
  const pcNoIshow = await getRequest('/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1', {
    'Cookie': aspSession1
  });
  const d7a = (pcNoIshow.body.match(/class="data7"/g) || []).length;
  console.log(`Status:${pcNoIshow.status} Size:${pcNoIshow.body.length} data7:${d7a}`);

  // Step 3: 先在主页设置ishow cookie，再访问平仓页
  console.log('\n[Step 3] 带ishow访问主页设置Session...');
  const home2 = await getRequest('/generalmodule/shouted/shouted_index.asp?roomid=7000', {
    'Cookie': 'ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true'
  });
  const aspSession2 = home2.headers['set-cookie']?.[0]?.split(';')[0] || '';
  console.log('ASP Session with ishow:', aspSession2);
  
  // Step 4: 带ishow的Session访问平仓页
  console.log('\n[Step 4] 带ishow Session访问平仓页...');
  const pcWithIshow = await getRequest('/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1', {
    'Cookie': `ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; ${aspSession2}`
  });
  const d7b = (pcWithIshow.body.match(/class="data7"/g) || []).length;
  const li = (pcWithIshow.body.match(/<li>/g) || []).length;
  console.log(`Status:${pcWithIshow.status} Size:${pcWithIshow.body.length} li:${li} data7:${d7b}`);
  
  if (d7b > 0) {
    console.log('\n🎉 成功！找到了12列数据！');
    fs.writeFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/pc_with_ishow_session.html', pcWithIshow.body);
  } else {
    console.log('\n❌ data7仍为0，需要进一步排查');
    // 保存一份对比
    fs.writeFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/pc_no_ishow.html', pcNoIshow.body);
    fs.writeFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/pc_with_ishow.html', pcWithIshow.body);
  }

  // Step 5: 检查session是不是通过URL传递的（cookieless session）
  console.log('\n[Step 5] 检查是否为Cookieless Session...');
  const home3 = await getRequest('/generalmodule/shouted/shouted_index.asp?roomid=7000');
  // ASP cookieless sessions embed session ID in URL like /S(someid)/
  const hasCookieless = home3.body.includes('/S(') || home3.body.includes('(S(');
  console.log('Cookieless session detected:', hasCookieless);
  
  // 检查主页里的iframe src
  const iframeMatches = [...home3.body.matchAll(/src=["']([^"']+)["']/gi)].map(m => m[1]);
  const iframeSrcs = iframeMatches.filter(s => s.includes('_Data') || s.includes('shouted'));
  console.log('Iframe srcs:', iframeSrcs.slice(0, 5).join('\n'));
  
  // 检查是否有JavaScript动态加载
  const jsSrcs = [...home3.body.matchAll(/<script[^>]*src=["']([^"']+)["']/gi)].map(m => m[1]);
  console.log('JS files:', jsSrcs.slice(0, 5).join('\n'));
  
  // 检查主页完整内容
  fs.writeFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/home_index.html', home3.body);
  console.log('\n主页已保存到 home_index.html');
}
main();