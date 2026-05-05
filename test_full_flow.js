const http = require('http');
const BASE = 'localhost';
const PORT = 3456;

function req(method, path, body) {
  return new Promise((resolve) => {
    const r = http.request({ hostname: BASE, port: PORT, path, method, headers: { 'Content-Type': 'application/json' } }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    if (body) r.write(body);
    r.end();
  });
}

(async () => {
  console.log('=== Step 1: Unlock with APP_PASS=135917 ===');
  const r1 = await req('POST', '/unlock', JSON.stringify({ password: '135917' }));
  console.log('UNLOCK:', r1.status, r1.body);

  console.log('\n=== Step 2: Login with 超管账号 16616135917 / 135917 ===');
  const r2 = await req('POST', '/login', JSON.stringify({ account: '16616135917', password: '135917' }));
  console.log('LOGIN:', r2.status, r2.body);

  console.log('\n=== Step 3: Fetch merged data 3 pages ===');
  const r3 = await req('GET', '/fetch?mode=merged&pages=3&date=2026-04-29');
  console.log('FETCH status:', r3.status);
  if (r3.status === 200) {
    try {
      const data = JSON.parse(r3.body);
      console.log('Total rows:', data.rows ? data.rows.length : 'N/A');
      if (data.rows) {
        data.rows.slice(0, 5).forEach((row, i) => {
          console.log((i + 1) + '. ' + row.openTime + ' | ' + row.direction + ' ' + row.symbol + ' | O:' + row.openPrice + ' | SL:' + row.stopLoss + ' | TP:' + row.takeProfit + ' | CL:' + row.closePrice + ' | Profit:' + row.profit);
        });
      } else if (data.error) {
        console.log('Error:', data.error);
      }
    } catch (e) {
      console.log('Parse error:', e.message);
      console.log('Raw:', r3.body.slice(0, 300));
    }
  } else {
    console.log('FETCH body:', r3.body.slice(0, 300));
  }
})();
