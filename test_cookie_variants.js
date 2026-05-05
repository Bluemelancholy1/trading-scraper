// Test: does the ASPSESSIONID cookie MATTER? Compare with/without it
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
  const baseHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://qh.yemacaijing.net/',
    'Accept': 'text/html,application/xhtml+xml'
  };
  
  const tests = [
    { name: 'No cookies at all', cookies: '' },
    { name: 'Only ishow cookie', cookies: 'ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true' },
    { name: 'Only ASPSESSIONID', cookies: 'ASPSESSIONIDCARTDBCR=EMIDGGEBLODJMDJMDIIDOGIO' },
    { name: 'Only Guest_Name', cookies: 'Guest_Name=4ufwU803' },
    { name: 'ishow + Guest_Name', cookies: 'ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; Guest_Name=4ufwU803' },
    { name: 'All three cookies', cookies: 'ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; ASPSESSIONIDCARTDBCR=EMIDGGEBLODJMDJMDIIDOGIO; Guest_Name=4ufwU803' },
  ];
  
  for (const t of tests) {
    const r = await request({
      hostname: 'qh.yemacaijing.net',
      port: 443,
      path: '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1',
      method: 'GET',
      headers: { ...baseHeaders, 'Cookie': t.cookies },
      rejectUnauthorized: false
    });
    
    const d7 = (r.body.match(/class="data7"/g) || []).length;
    const d8 = (r.body.match(/class="data8"/g) || []).length;
    const li = (r.body.match(/<li>/g) || []).length;
    
    console.log(`[${t.name}]`);
    console.log(`  Status:${r.status} Size:${r.body.length} li:${li} data7:${d7} data8:${d8}`);
    
    if (r.headers['set-cookie']) {
      console.log('  New cookies:', r.headers['set-cookie'].map(c => c.split(';')[0]).join(' | '));
    }
  }
  
  // Also check: what does the browser's Elements panel see?
  // If the page is rendered in an iframe, the Referer might matter
  console.log('\n=== Test: with Referer pointing to main page ===');
  const r2 = await request({
    hostname: 'qh.yemacaijing.net',
    port: 443,
    path: '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1',
    method: 'GET',
    headers: { 
      ...baseHeaders, 
      'Cookie': 'ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; ASPSESSIONIDCARTDBCR=EMIDGGEBLODJMDJMDIIDOGIO; Guest_Name=4ufwU803',
      'Referer': 'https://qh.yemacaijing.net/generalmodule/shouted/shouted_index.asp?roomid=7000'
    },
    rejectUnauthorized: false
  });
  const d7b = (r2.body.match(/class="data7"/g) || []).length;
  const d8b = (r2.body.match(/class="data8"/g) || []).length;
  console.log(`  Status:${r2.status} Size:${r2.body.length} data7:${d7b} data8:${d8b}`);
}
main();
