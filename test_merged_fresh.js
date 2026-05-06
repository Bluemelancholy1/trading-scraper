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
    console.log('/unlock:', r);
    // Fresh request - 3 pages to avoid cache
    const fd = JSON.stringify({pages: 3, mode: 'merged'});
    const freq = http.request({
      hostname: 'localhost', port: 3456, path: '/fetch', method: 'POST',
      headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(fd)}
    }, fres => {
      let fr = '';
      fres.on('data', c => fr += c);
      fres.on('end', () => {
        const data = JSON.parse(fr);
        console.log('Total merged rows:', data.rows ? data.rows.length : 0);
        console.log('Cached:', data.cached);
        console.log('\nMerged data (first 15, check stopLoss/takeProfit):');
        if (data.rows) {
          data.rows.slice(0, 15).forEach((row, i) => {
            console.log((i+1) + '. ' + row.openTime.substring(0,16) + ' | ' + row.direction + ' | ' + row.product + ' | 开:' + row.openPrice + ' | 止:' + (row.stopLoss || '(空)') + ' | 盈:' + (row.takeProfit || '(空)') + ' | 平:' + row.closePrice + ' | ' + row.teacher);
          });
        }
        if (data.error) console.log('Error:', data.error);
      });
    });
    freq.write(fd);
    freq.end();
  });
});
req.write(d);
req.end();