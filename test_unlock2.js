const http = require('http');

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 3456,
      path,
      method,
      headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  // 1. Unlock
  const r1 = await request('POST', '/unlock', JSON.stringify({ password: '135917' }));
  console.log('UNLOCK:', r1.status, r1.body);

  // 2. Login to ASP
  const r0 = await request('POST', '/login', JSON.stringify({ account: '16616135917', password: '135917' }));
  console.log('LOGIN:', r0.status, r0.body);

  // 2. Quick fetch (3 pages merged)
  const r2 = await request('GET', '/fetch?mode=merged&pages=3');
  const j2 = JSON.parse(r2.body);
  console.log('FETCH rows:', j2.data?.length);
  // 找今天有平仓价的记录
  const today = j2.data?.filter(r => r.openTime && r.openTime.startsWith('2026-04-29') && r.closeTime);
  console.log('Today closed rows:', today?.length);
  today?.slice(0, 3).forEach(r => {
    console.log('Sample:', JSON.stringify({ openTime: r.openTime, product: r.product, stopLoss: r.stopLoss, takeProfit: r.takeProfit, closeTime: r.closeTime }));
  });
  // 也看前3行
  console.log('First 3:', JSON.stringify(j2.data?.slice(0,3).map(r => ({ ot: r.openTime, pd: r.product, sl: r.stopLoss, tp: r.takeProfit, cl: r.closeTime }))));
})();