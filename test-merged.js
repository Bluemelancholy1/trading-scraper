const http = require('http');

function apiReq(path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const opts = { hostname: 'localhost', port: 3456, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) } };
    const req = http.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } });
    });
    req.on('error', reject);
    req.write(bodyStr); req.end();
  });
}

async function main() {
  const r = await apiReq('/login', { password: '881199', phone: '16616135917', pass: '135917' });
  console.log('Login:', r.ok, 'room:', r.room, 'user:', r.user);
  
  const merged = await apiReq('/fetch', { mode: 'merged' });
  console.log('\n合并模式结果:', merged.ok, 'rows:', merged.rows ? merged.rows.length : 0, 'total:', merged.totalRows);
  
  if (merged.rows) {
    merged.rows.slice(0, 10).forEach((row, i) => {
      console.log(`\nRow ${i+1} [${row.isClosed ? '已平仓' : '未平仓'}]:`);
      console.log('  开仓:', row.openTime, row.direction, row.product, '开', row.openPrice);
      if (row.stopLoss) console.log('  止损:', row.stopLoss);
      if (row.takeProfit) console.log('  止盈:', row.takeProfit);
      if (row.closeTime) console.log('  平仓:', row.closeTime, row.closePrice);
      if (row.profitPts) console.log('  获利点数:', row.profitPts);
      console.log('  老师:', row.teacher);
    });
  }
}

main().catch(e => console.log('ERR:', e.message));
