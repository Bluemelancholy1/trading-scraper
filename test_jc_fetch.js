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
    const fd = JSON.stringify({pages: 1, mode: 'jc'});
    const freq = http.request({
      hostname: 'localhost', port: 3456, path: '/fetch', method: 'POST',
      headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(fd)}
    }, fres => {
      let fr = '';
      fres.on('data', c => fr += c);
      fres.on('end', () => {
        const data = JSON.parse(fr);
        console.log('JC mode rows:', data.rows ? data.rows.length : 0);
        if (data.rows) {
          data.rows.forEach((row, i) => {
            console.log((i+1) + '. ' + row.openTime + ' | ' + row.direction + ' | ' + row.product + ' | 开仓:' + row.openPrice + ' | 止损:' + row.stopLoss + ' | 止盈:' + row.takeProfit + ' | ' + row.teacher);
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