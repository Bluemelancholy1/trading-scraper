const https = require('https');

function fetch(url, method, postData, cookie) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opt = {
      hostname: u.hostname, port: u.port || 443,
      path: u.pathname + u.search,
      method: method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://nbqh.lulutong.club/',
        'Origin': 'https://nbqh.lulutong.club',
      },
      timeout: 15000,
    };
    if (cookie) opt.headers['Cookie'] = cookie;
    if (postData) {
      opt.headers['Content-Length'] = Buffer.byteLength(postData);
    }
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
  console.log('Room cookie:', roomCookie.substring(0, 80));

  // Step 2: Get miniLogin page
  const loginPage = await fetch('https://nbqh.lulutong.club/miniLogin.asp', 'GET', null, roomCookie);
  console.log('Login page status:', loginPage.status, 'len:', loginPage.body.length);
  console.log('Login page first 2000:', loginPage.body.substring(0, 2000));
  
  // Look for form action
  const formMatch = loginPage.body.match(/<form[^>]*action="([^"]*)"[^>]*>/i);
  console.log('Form action:', formMatch ? formMatch[1] : 'NOT FOUND');
  
  // Look for input fields
  const inputs = loginPage.body.match(/<input[^>]*>/gi);
  if (inputs) console.log('Inputs:', inputs.join('\n'));
  
  // Look for script with login logic
  const scripts = loginPage.body.match(/<script[\s\S]*?<\/script>/gi);
  scripts && scripts.forEach((s, i) => {
    if (/login|post|ajax|submit/i.test(s)) {
      console.log(`Script ${i}:`, s.substring(0, 500));
    }
  });
}

main().catch(e => console.log('ERR:', e.message));
