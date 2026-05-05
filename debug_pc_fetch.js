const http = require('http');

function req(url, method, body, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { hostname: u.hostname, port: u.port || 3456, path: u.pathname + u.search, method, headers: headers || {} };
    const x = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ s: res.statusCode, b: d }));
    });
    x.on('error', reject);
    if (body) x.write(body);
    x.end();
  });
}

(async () => {
  const u1 = await req('http://localhost:3456/unlock', 'POST', JSON.stringify({ password: '414102' }), { 'Content-Type': 'application/json' });
  const u2 = await req('http://localhost:3456/login', 'POST', JSON.stringify({ phone: '16616135917', pass: '881199' }), { 'Content-Type': 'application/json' });

  // merged mode
  const u3 = await req('http://localhost:3456/fetch', 'POST', JSON.stringify({ mode: 'merged', pages: 10 }), { 'Content-Type': 'application/json' });
  const d = JSON.parse(u3.b);

  // Show first 10 and last 10 rows dates
  console.log('Total rows:', d.rows.length);
  console.log('\nFirst 10 rows:');
  d.rows.slice(0, 10).forEach(r => {
    console.log(r.openTime + ' | ' + r.product + ' | ' + r.direction + ' | OP:' + r.openPrice + ' | CL:' + r.closePrice + ' | SL:' + r.stopLoss + ' | TP:' + r.takeProfit);
  });
  console.log('\nLast 5 rows:');
  d.rows.slice(-5).forEach(r => {
    console.log(r.openTime + ' | ' + r.product + ' | ' + r.direction + ' | OP:' + r.openPrice + ' | CL:' + r.closePrice + ' | SL:' + r.stopLoss + ' | TP:' + r.takeProfit);
  });
  // Check unique dates
  const dates = [...new Set(d.rows.map(r => r.openTime.split(' ')[0]))];
  console.log('\nUnique dates:', dates.slice(0, 20));
})().catch(e => console.error(e.message));
