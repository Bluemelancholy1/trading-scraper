// Quick test: unlock then pc_raw
const http = require('http');
let cookie = '';

function request(opts, body) {
  return new Promise((resolve) => {
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        // capture cookies
        const sc = res.headers['set-cookie'];
        if (sc) cookie = sc.map(v => v.split(';')[0]).join('; ');
        resolve({ status: res.statusCode, body: d });
      });
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  // 1. unlock
  const r1 = await request({ host: 'localhost', port: 3456, path: '/unlock', method: 'POST', headers: { 'Content-Type': 'application/json' } }, JSON.stringify({ appPass: '135917' }));
  console.log('unlock:', r1.body);

  // 2. pc_raw
  const r2 = await request({ host: 'localhost', port: 3456, path: '/pc_raw', method: 'GET' }, null);
  console.log('pc_raw:', r2.body);
  console.log('pc_raw size:', r2.body.length);
}
main();