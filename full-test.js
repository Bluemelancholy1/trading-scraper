const http = require('http');

function apiReq(path, method, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const opts = { hostname: 'localhost', port: 3456, path, method: method || 'GET',
      headers: { 'Content-Type': 'application/json' } };
    if (bodyStr) opts.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    const req = http.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  // Login
  const loginR = await apiReq('/login', 'POST', { password: '881199', phone: '16616135917', pass: '135917' });
  console.log('Login:', JSON.stringify(loginR));
  
  // Fetch JC
  const jcR = await apiReq('/fetch', 'POST', { mode: 'jc' });
  console.log('\n建仓提醒:', jcR.ok, 'rows:', jcR.rows ? jcR.rows.length : 0, 'total:', jcR.totalRows);
  if (jcR.rows && jcR.rows.length > 0) {
    console.log('First:', JSON.stringify(jcR.rows[0]));
    console.log('Last:', JSON.stringify(jcR.rows[jcR.rows.length - 1]));
    // Check stopLoss/takeProfit
    const withSL = jcR.rows.filter(r => r.stopLoss);
    const withTP = jcR.rows.filter(r => r.takeProfit);
    console.log('With stopLoss:', withSL.length, '| With takeProfit:', withTP.length);
  }
  
  // Fetch PC
  const pcR = await apiReq('/fetch', 'POST', { mode: 'pc' });
  console.log('\n平仓提醒:', pcR.ok, 'rows:', pcR.rows ? pcR.rows.length : 0, 'total:', pcR.totalRows);
  if (pcR.rows && pcR.rows.length > 0) {
    console.log('First:', JSON.stringify(pcR.rows[0]));
  }
}

main().catch(e => console.log('ERR:', e.message));
