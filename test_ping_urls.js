// 探测平仓提醒页面的实际URL模式
const https = require('https');

function request(path, extraHeaders = {}) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'qh.yemacaijing.net',
      port: 443,
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://qh.yemacaijing.net/',
        'Accept': 'text/html,application/xhtml+xml',
        ...extraHeaders
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
  console.log('=== 测试各种可能的平仓提醒URL ===\n');
  
  const tests = [
    // 原始路径
    '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1',
    // 可能有.pt参数
    '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&pt=2026/04/30&page=1',
    // 主页路径
    '/generalmodule/shouted/shouted_index.asp?roomid=7000',
    '/generalmodule/shouted/shouted_index.asp?roomid=7000&tab=ping',
    // 不同参数
    '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1&t=' + Date.now(),
    // 搜索参数
    '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&action=search',
  ];

  for (const t of tests) {
    const r = await request(t);
    const d7 = (r.body.match(/class="data7"/g) || []).length;
    const d8 = (r.body.match(/class="data8"/g) || []).length;
    const li = (r.body.match(/<li>/g) || []).length;
    
    console.log(`URL: ${t.substring(0, 70)}`);
    console.log(`  Status:${r.status} Size:${r.body.length} li:${li} data7:${d7} data8:${d8}`);
    
    // 检查是否包含12列标记
    const hasHeader = r.body.includes('止损') || r.body.includes('data7');
    console.log(`  包含SL/TP标记: ${hasHeader}`);
    if (d7 > 0 || d8 > 0) {
      // 找到了！打印第一条
      const match = r.body.match(/<li>([\s\S]*?)<\/li>/);
      if (match) {
        console.log('  成功获取12列数据！');
      }
    }
    console.log('');
  }

  // 检查主页是否包含平仓数据iframe或内嵌内容
  console.log('=== 检查主页是否内嵌平仓数据 ===\n');
  const home = await request('/generalmodule/shouted/shouted_index.asp?roomid=7000');
  const frames = home.body.match(/<iframe[^>]*>/gi) || [];
  const srcs = home.body.match(/src=["'][^"']*["']/gi) || [];
  console.log('Iframes:', frames.slice(0, 5).join('\n'));
  console.log('Srcs:', srcs.slice(0, 10).join('\n'));
  
  const hasPing = home.body.includes('_Data_Ping_Show') || home.body.includes('平仓');
  console.log('包含平仓内容:', hasPing);
}
main();