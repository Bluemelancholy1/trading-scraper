const http = require('http');
const d = JSON.stringify({password: '135917'});
const req = http.request({
  hostname: 'localhost', port: 3456, path: '/unlock', method: 'POST',
  headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(d)}
}, res => {
  let r = '';
  res.on('data', c => r += c);
  res.on('end', () => {
    // Test both modes
    const fd = JSON.stringify({pages: 2, mode: 'merged'});
    const freq = http.request({
      hostname: 'localhost', port: 3456, path: '/fetch', method: 'POST',
      headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(fd)}
    }, fres => {
      let fr = '';
      fres.on('data', c => fr += c);
      fres.on('end', () => {
        const data = JSON.parse(fr);
        console.log('Total merged rows:', data.rows ? data.rows.length : 0);
        console.log('\nMerged data (first 10, check stopLoss/takeProfit):');
        if (data.rows) {
          data.rows.slice(0, 10).forEach((row, i) => {
            console.log((i+1) + '. ' + row.openTime + ' | ' + row.direction + ' | ' + row.product + ' | 开:' + row.openPrice + ' | 止:' + row.stopLoss + ' | 盈:' + row.takeProfit + ' | 平:' + row.closePrice + ' | 老师:' + row.teacher);
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