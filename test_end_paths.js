const https = require('https');
const cookie = 'Guest_Name=4ufwU803; ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; bg_img=images%2Fbg%2F23.jpg; ASPSESSIONIDACTRAADQ=BFOFLJDBGMOBNBKPGBALNHNG';

function httpGet(path) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'qh.yemacaijing.net', path,
      headers: { 'Cookie': cookie, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Accept-Language': 'zh-CN,zh;q=0.9' }
    };
    https.get(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d })); }).on('error', reject);
  });
}

async function main() {
  // Test various paths for end/closed data
  const paths = [
    '/generalmodule/shouted/_Data_End_Show.asp?roomid=7000&page=1',
    '/generalmodule/shouted/_Data_End_Show.asp?RoomID=7000&page=1',
    '/_Data_End_Show.asp?roomid=7000&page=1',
    '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1',
  ];
  
  for (const p of paths) {
    const r = await httpGet(p);
    console.log('Path:', p);
    console.log('Status:', r.status, 'Length:', r.body.length);
    const d7 = r.body.match(/class="data7"[^>]*title="([^"]+)"/g);
    const d8 = r.body.match(/class="data8"[^>]*title="([^"]+)"/g);
    console.log('data7:', d7 ? d7.length + ' found' : 'none');
    console.log('data8:', d8 ? d8.length + ' found' : 'none');
    if (d7) console.log('Sample data7:', d7.slice(0, 3));
    if (d8) console.log('Sample data8:', d8.slice(0, 3));
    console.log('First 200:', r.body.substring(0, 200));
    console.log('---');
  }
}

main().catch(console.error);
