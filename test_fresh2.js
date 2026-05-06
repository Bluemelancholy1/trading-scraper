const http = require('http');

// Unlock first
const d = JSON.stringify({password: '135917'});
const req = http.request({
  hostname: 'localhost', port: 3456, path: '/unlock', method: 'POST',
  headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(d)}
}, res => {
  let r = '';
  res.on('data', c => r += c);
  res.on('end', () => {
    // Fresh request with different pages to bypass cache
    const fd = JSON.stringify({pages: 2, mode: 'merged'});
    const freq = http.request({
      hostname: 'localhost', port: 3456, path: '/fetch', method: 'POST',
      headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(fd)}
    }, fres => {
      let fr = '';
      fres.on('data', c => fr += c);
      fres.on('end', () => {
        const data = JSON.parse(fr);
        console.log('Total rows:', data.rows ? data.rows.length : 0);
        console.log('Cached:', data.cached);
        if (data.rows) {
          data.rows.slice(0, 10).forEach((row, i) => {
            console.log((i+1) + '. ' + row.product + ' ' + row.direction + ' | 开:' + row.openPrice + ' → 平:' + row.closePrice + ' | 获利点数:' + row.profitPts + ' | 金额:' + row.profitAmt);
          });
        }
      });
    });
    freq.write(fd);
    freq.end();
  });
});
req.write(d);
req.end();
