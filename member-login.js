// 用账号登录获取真实session，探测平仓页面结构
const http = require('http');
const https = require('https');
const querystring = require('querystring');

function httpReq(method, url, body, cookie) {
  return new Promise((resolve, reject) => {
    const pu = new URL(url);
    const lib = pu.protocol === 'https:' ? https : http;
    const opts = {
      hostname: pu.hostname, port: pu.port || 443,
      path: pu.pathname + pu.search, method,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 15000
    };
    if (cookie) opts.headers['Cookie'] = cookie;
    if (body) {
      opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const b = typeof body === 'string' ? body : querystring.stringify(body);
      opts.headers['Content-Length'] = Buffer.byteLength(b);
    }
    const req = lib.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d, setCookie: res.headers['set-cookie'] }));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : querystring.stringify(body));
    req.end();
  });
}

function getCookie(setCookies) {
  if (!setCookies) return '';
  return setCookies.map(c => c.split(';')[0]).join('; ');
}

async function main() {
  const base = 'https://nbqh.lulutong.club';

  // 1. 主页拿初始cookie
  const r0 = await httpReq('GET', base + '/', null, '');
  console.log('主页:', r0.status, 'Cookie:', getCookie(r0.setCookie));
  let cookie = getCookie(r0.setCookie);

  // 2. 账号密码登录 (先试试 /Handle/LoginCheck.asp)
  const loginUrls = [
    '/Handle/LoginCheck.asp',
    '/handle/LoginCheck.asp',
    '/Handle/UserLogin.asp',
    '/Handle/check.asp',
  ];
  
  const creds = { username: '16616135917', password: '135917' };
  
  for (const lu of loginUrls) {
    try {
      const r = await httpReq('POST', base + lu, creds, cookie);
      console.log(lu, '→ status:', r.status, 'body:', r.body.substring(0, 100), 'newCookie:', getCookie(r.setCookie));
      if (r.setCookie && r.body.trim() && !r.body.includes('error')) {
        cookie = getCookie(r.setCookie);
        console.log('  → SUCCESS cookie:', cookie);
        break;
    }
    } catch(e) { console.log(lu, 'ERR:', e.message); }
  }

  // 3. 试完再直接用房间密码cookie
  const r2 = await httpReq('GET', base + '/Handle/CheckRoomPass.asp?ac=CheckRoomPass&RID=7000&P=881199', null, cookie);
  console.log('\n房间密码登录:', r2.status, 'body:', r2.body.trim());
  if (r2.setCookie) { cookie = getCookie(r2.setCookie); console.log('新Cookie:', cookie); }

  // 4. 访问平仓页面
  const r3 = await httpReq('GET', base + '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1', null, cookie);
  console.log('\n平仓页面:', r3.status, 'len:', r3.body.length);
  if (r3.body.includes('<li>')) {
    const dataClasses = [...new Set([...r3.body.matchAll(/class="(data\d+)"[^>]*>/g)].map(x => x[1]))];
    console.log('data fields found:', dataClasses);
    // 打印第一个li
    const m = r3.body.match(/<li>([\s\S]*?)<\/li>/);
    if (m) console.log('\nFIRST LI HTML:\n', m[1]);
  } else {
    console.log('body:', r3.body.substring(0, 200));
  }
}

main().catch(e => console.log('FATAL:', e.message));
