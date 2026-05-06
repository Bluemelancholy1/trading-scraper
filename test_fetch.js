const http = require('http');
const d = JSON.stringify({password: '135917'});
const req = http.request({
  hostname: 'localhost', port: 3456, path: '/unlock', method: 'POST',
  headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(d)}
}, res => {
  let r = '';
  res.on('data', c => r += c);
  res.on('end', () => {
    console.log('/unlock:', r);
    // then test /fetch
    const fd = JSON.stringify({pages: 2});
    const freq = http.request({
      hostname: 'localhost', port: 3456, path: '/fetch', method: 'POST',
      headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(fd)}
    }, fres => {
      let fr = '';
      fres.on('data', c => fr += c);
      fres.on('end', () => {
        const data = JSON.parse(fr);
        console.log('/fetch ok:', data.ok, 'mode:', data.mode, 'rows:', data.rows ? data.rows.length : 'N/A');
        if (data.rows && data.rows.length > 0) {
          console.log('\nSample row:');
          console.log('  开仓时间:', data.rows[0].openTime);
          console.log('  方向:', data.rows[0].direction);
          console.log('  商品:', data.rows[0].product);
          console.log('  开仓点位:', data.rows[0].openPrice);
          console.log('  止损:', data.rows[0].stopLoss);
          console.log('  止盈:', data.rows[0].takeProfit);
          console.log('  平仓点位:', data.rows[0].closePrice);
          console.log('  获利点数:', data.rows[0].profitPts);
          console.log('  老师:', data.rows[0].teacher);
        }
        if (data.error) console.log('  Error:', data.error);
      });
    });
    freq.write(fd);
    freq.end();
  });
});
req.write(d);
req.end();