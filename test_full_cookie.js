// Test with COMPLETE cookie set including ASP Session Cookie
const https = require('https');
const fs = require('fs');

function request(opts) {
  return new Promise((resolve) => {
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    req.end();
  });
}

async function main() {
  // 陈少提供的完整Cookie（包含ASPSESSIONID）
  const fullCookies = 'ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; ASPSESSIONIDCARTDBCR=EMIDGGEBLODJMDJMDIIDOGIO; Guest_Name=4ufwU803';
  
  console.log('=== Test: Complete Cookie with ASP Session ===\n');
  
  for (const page of [1, 8]) {
    const r = await request({
      hostname: 'qh.yemacaijing.net',
      port: 443,
      path: `/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=${page}`,
      method: 'GET',
      headers: {
        'Cookie': fullCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://qh.yemacaijing.net/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      rejectUnauthorized: false
    });

    const d7 = (r.body.match(/class="data7"/g) || []).length;
    const d8 = (r.body.match(/class="data8"/g) || []).length;
    const li = (r.body.match(/<li>/g) || []).length;
    
    fs.writeFileSync(`C:/Users/chen/.qclaw/workspace/trading-scraper/pc_page${page}.html`, r.body);
    
    console.log(`Page ${page}:`);
    console.log('  Status:', r.status, '| Size:', r.body.length, '| li:', li, '| data7:', d7, '| data8:', d8);
    
    if (d7 > 0) {
      // Show first record with SL/TP
      const firstLi = r.body.match(/<li>([\s\S]*?)<\/li>/);
      if (firstLi) {
        const get = r2 => { const m = firstLi[1].match(r2); return m ? m[1] : 'none' };
        console.log('  First record:');
        console.log('    data7(SL):', get(/class="data7"[^>]*title="([^"]+)"/));
        console.log('    data8(TP):', get(/class="data8"[^>]*title="([^"]+)"/));
      }
    }
  }
  
  // Also check: what fields exist in the CSS header?
  const page1 = fs.readFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/pc_page1.html', 'utf8');
  const titleFields = [...page1.matchAll(/class="(data\d+)"/g)].map(m => m[1]);
  const uniqueFields = [...new Set(titleFields)];
  console.log('\nCSS-defined fields in page:', uniqueFields.join(', '));
}
main();
