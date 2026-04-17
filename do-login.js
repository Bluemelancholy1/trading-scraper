const https = require('https');
const querystring = require('querystring');

function fetch(url, method, postData, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opt = {
      hostname: u.hostname, port: u.port || 443,
      path: u.pathname + u.search,
      method: method || 'GET',
      headers: headers || {},
      timeout: 15000,
    };
    const req = https.request(opt, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({
        status: res.statusCode,
        body: d,
        cookie: res.headers['set-cookie'],
        location: res.headers['location'],
      }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (postData) req.write(postData);
    req.end();
  });
}

async function main() {
  // Step 1: Get room cookie
  await fetch('https://nbqh.lulutong.club/');
  const r2 = await fetch('https://nbqh.lulutong.club/Handle/CheckRoomPass.asp?ac=CheckRoomPass&RID=7000&P=881199');
  const roomCookie = (r2.cookie || []).map(c => c.split(';')[0]).join('; ');
  console.log('Room cookie:', roomCookie.substring(0, 60));

  // Step 2: Open miniLogin to get GoUrl
  const lp = await fetch('https://nbqh.lulutong.club/miniLogin.asp', 'GET', null, { 'Cookie': roomCookie, 'User-Agent': 'Mozilla/5.0' });
  // Extract GoUrl from the page
  const goUrlMatch = lp.body.match(/value="([^"]*)"\s*name="GoUrl"/i);
  const goUrl = goUrlMatch ? goUrlMatch[1] : '';
  console.log('GoUrl:', decodeURIComponent(goUrl));

  // Step 3: Post login
  const postData = querystring.stringify({
    Method: 'Login',
    UserMail: '',
    usertel: '16616135917',
    UserPass: '135917',
    _AutoLogin: '1',
    GoUrl: goUrl,
  });

  const loginHeaders = {
    'Cookie': roomCookie,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Referer': 'https://nbqh.lulutong.club/miniLogin.asp',
    'Origin': 'https://nbqh.lulutong.club',
    'Content-Length': Buffer.byteLength(postData),
  };

  const loginResp = await fetch('https://nbqh.lulutong.club/handle/qlogin/', 'POST', postData, loginHeaders);
  console.log('\nLogin response status:', loginResp.status);
  console.log('Location:', loginResp.location || 'none');
  console.log('Body:', loginResp.body.substring(0, 500));
  
  // Get all cookies
  const allCookies = (loginResp.cookie || []).map(c => c.split(';')[0]);
  console.log('\nNew cookies:', allCookies.join('; '));
  
  // Combined cookie (room + login)
  const fullCookie = roomCookie ? roomCookie + '; ' + allCookies.join('; ') : allCookies.join('; ');
  console.log('\nFull cookie:', fullCookie.substring(0, 200));
  
  // Step 4: Try to access 建仓提醒 with the cookie
  if (loginResp.location || allCookies.length > 0) {
    const jcResp = await fetch('https://nbqh.lulutong.club/generalmodule/shouted/_data_start_show.asp?classid=8&roomid=7000', 'GET', null, { 'Cookie': fullCookie, 'User-Agent': 'Mozilla/5.0' });
    console.log('\n建仓提醒 page status:', jcResp.status, 'len:', jcResp.body.length);
    if (jcResp.body.includes('请注册会员') || jcResp.body.includes('请先登录')) {
      console.log('NOT LOGGED IN - still requires member');
    } else {
      console.log('SUCCESS! First 1000:', jcResp.body.substring(0, 1000));
    }
  }
}

main().catch(e => console.log('ERR:', e.message));
