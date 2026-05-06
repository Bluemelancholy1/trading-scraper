const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3456,
  path: '/fetch',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const j = JSON.parse(data);
    console.log('Total rows:', j.rows.length);
    const hsi = j.rows.filter(r => r.product.includes('恒'));
    console.log('\n恒指记录:');
    hsi.slice(0, 5).forEach(r => {
      console.log(`${r.openTime} ${r.product} ${r.openPrice}->${r.closePrice} profitPts=${r.profitPts} teacherProfit=${r.teacherProfit || 'N/A'}`);
    });
  });
});

req.write(JSON.stringify({ pages: 1 }));
req.end();
