const https = require('https');
const http = require('http');

function fetch(url) {
  return new Promise((resolve, reject) => {
    const pu = new URL(url);
    const lib = pu.protocol === 'https:' ? https : http;
    lib.get({ hostname: pu.hostname, port: pu.port || 443, path: pu.pathname + pu.search,
      headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('timeout', req => { req.destroy(); reject(new Error('timeout')); })
      .on('error', reject);
  });
}

async function main() {
  // 主页
  const home = await fetch('https://nbqh.lulutong.club/');
  console.log('HOME HTML (searching for login/reg links):');
  const lines = home.split('\n');
  lines.forEach((l, i) => {
    if (/login|reg|user|logined|username|account/i.test(l)) {
      console.log(`LINE ${i}: ${l.trim()}`);
    }
  });
  
  // 找 JS 文件
  const jsFiles = [...home.matchAll(/src="([^"]+\.js[^"]*)"/g)].map(m => m[1]);
  console.log('\nJS files:', jsFiles);
  
  // 检查 base.js
  if (jsFiles.includes('/js/base.js')) {
    const baseJs = await fetch('https://nbqh.lulutong.club/js/base.js?2015-3-31');
    console.log('\nBASE.JS (searching for login/reg/Show):');
    baseJs.split('\n').forEach((l, i) => {
      if (/login|reg|Show\(|user|/i.test(l)) {
        console.log(`LINE ${i}: ${l.trim()}`);
      }
    });
  }
}

main().catch(e => console.log('ERR:', e.message));
