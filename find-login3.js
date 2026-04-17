const http = require('http');
const https = require('https');
const { URL } = require('url');

let sessionCookie = null;

function req(targetUrl, useCookie) {
  return new Promise((resolve, reject) => {
    const pu = new URL(targetUrl);
    const lib = pu.protocol === 'https:' ? https : http;
    const opt = {
      hostname: pu.hostname, port: pu.port || 443,
      path: pu.pathname + pu.search,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 15000,
    };
    if (useCookie && sessionCookie) opt.headers['Cookie'] = sessionCookie;
    const req = lib.request(opt, res => {
      const sc = res.headers['set-cookie'];
      if (sc) sessionCookie = sc.map(c => c.split(';')[0]).join('; ');
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data, cookie: sessionCookie }));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  // Step 1: Enter room with password
  const home = await req('https://nbqh.lulutong.club/');
  console.log('Step1 - Room page status:', home.status);
  
  const login = await req('https://nbqh.lulutong.club/Handle/CheckRoomPass.asp?ac=CheckRoomPass&RID=7000&P=881199');
  console.log('Step2 - Room login status:', login.status, '| Cookie:', login.cookie ? 'YES' : 'NO');
  
  if (!login.cookie) { console.log('NO COOKIE'); return; }
  
  // Step 3: Fetch the main room page (with session)
  const room = await req('https://nbqh.lulutong.club/', true);
  
  // Search for Reg, login, Show, href patterns
  const searchTerms = ['Reg.', 'Reg\.Show', 'Reg\.show', 'login', 'Login', 'reg', 'Reg', 'href.*login', 'user.*login', 'showLogin', 'showReg', 'RegShow'];
  searchTerms.forEach(term => {
    try {
      const re = new RegExp(term, 'gi');
      const matches = room.body.match(re);
      if (matches && matches.length > 0) {
        console.log(`\nFOUND "${term}": ${matches.length} times`);
        // Find surrounding context
        let idx = room.body.search(re);
        const ctx = room.body.substring(Math.max(0, idx - 100), idx + 200);
        console.log('Context:', ctx.replace(/\n/g, ' ').substring(0, 300));
      }
    } catch(e) {}
  });
  
  // Also look for all href="..." patterns
  const hrefs = room.body.match(/href="([^"]+)"/g);
  if (hrefs) {
    console.log('\nAll hrefs:', hrefs.slice(0, 50));
  }
  
  // Look for src="..." patterns (scripts/iframes)
  const srcs = room.body.match(/src="([^"]+)"/g);
  if (srcs) {
    console.log('\nAll srcs:', srcs.slice(0, 30));
  }
  
  // Look for inline scripts
  const scripts = room.body.match(/<script[\s\S]*?<\/script>/gi);
  if (scripts) {
    scripts.slice(0, 5).forEach((s, i) => {
      if (/Reg|login|user/i.test(s)) {
        console.log(`\nScript ${i} (contains Reg/login):`, s.substring(0, 500));
      }
    });
  }
  
  console.log('\nRoom page length:', room.body.length);
  // Print first 2000 chars
  console.log('First 2000:', room.body.substring(0, 2000));
}

main().catch(e => console.log('ERR:', e.message));
