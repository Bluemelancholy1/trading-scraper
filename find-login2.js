const https = require('https');

function check(url) {
  return new Promise(resolve => {
    https.get({ hostname: new URL(url).hostname, path: '/' + new URL(url).pathname.replace(/^\//, ''),
      headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ url, status: res.statusCode, body: d.substring(0, 150) }));
    }).on('error', e => resolve({ url, status: 'ERR', body: e.message }));
  });
}

async function main() {
  const urls = [
    'https://www.lulutong.club/',
    'https://lulutong.club/',
    'https://nbqh.lulutong.club/reg.asp',
    'https://nbqh.lulutong.club/register.asp',
    'https://nbqh.lulutong.club/user/reg.asp',
    'https://nbqh.lulutong.club/user/login.asp',
    'https://www.lulutong.club/login.asp',
  ];
  for (const u of urls) {
    const r = await check(u);
    console.log(`[${r.status}] ${r.url}`);
    if (r.body && !r.body.includes('Error')) console.log('  ', r.body.substring(0, 100));
  }
}

main().catch(e => console.log('ERR:', e.message));
