// Test fetch with real cookies from browser
const http = require('http');
const https = require('https');
const fs = require('fs');

function request(opts, postData) {
  return new Promise((resolve) => {
    const mod = opts.port === 3456 ? http : https;
    const req = mod.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    if (postData) req.write(postData);
    req.end();
  });
}

async function main() {
  // 1. 直接用陈少的真实Cookie请求平仓提醒页
  const realCookies = 'Guest_Name=4ufwU803; ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; ASPSESSIONIDCARTDBCR=EMIDGGEBLODJMDJMDIIDOGIO';
  
  const hp = { hostname: 'qh.yemacaijing.net', port: 443, path: '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1', method: 'GET', headers: { Cookie: realCookies, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }, rejectUnauthorized: false };
  
  const r = await request(hp, null);
  fs.writeFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/pc_direct.html', r.body);
  
  const re = /<li>([\s\S]*?)<\/li>/g;
  const liMatches = [...r.body.matchAll(re)];
  const totalLi = liMatches.length;
  const d7 = (r.body.match(/class="data7"/g) || []).length;
  const d8 = (r.body.match(/class="data8"/g) || []).length;
  
  console.log('=== Direct Browser Cookie Request ===');
  console.log('Status:', r.status);
  console.log('HTML size:', r.body.length);
  console.log('Total li records:', totalLi);
  console.log('data7 spans:', d7);
  console.log('data8 spans:', d8);
  
  if (totalLi > 0) {
    // Show first 3 records
    for (let i = 0; i < Math.min(3, liMatches.length); i++) {
      const li = liMatches[i][1];
      const get = r2 => { const m = li.match(r2); return m ? m[1].trim() : '(none)' };
      console.log('\n--- Record #' + (i+1) + ' ---');
      console.log('time:', get(/class="data2"[^>]*title="([^"]+)"/));
      console.log('type:', get(/class="data3"[^>]*title="([^"]+)"/));
      console.log('product:', get(/class="data5"[^>]*title="([^"]+)"/));
      console.log('open:', get(/class="data6"[^>]*title="([^"]+)"/));
      console.log('SL:', get(/class="data7"[^>]*title="([^"]+)"/));
      console.log('TP:', get(/class="data8"[^>]*title="([^"]+)"/));
    }
  }
}
main();