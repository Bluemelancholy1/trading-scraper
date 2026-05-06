const http = require('http');

const d = JSON.stringify({password: '135917'});
const req = http.request({
  hostname: 'localhost', port: 3456, path: '/unlock', method: 'POST',
  headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(d)}
}, res => {
  let r = '';
  res.on('data', c => r += c);
  res.on('end', () => {
    const fd = JSON.stringify({pages: 1, mode: 'merged'});
    const freq = http.request({
      hostname: 'localhost', port: 3456, path: '/fetch', method: 'POST',
      headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(fd)}
    }, fres => {
      let fr = '';
      fres.on('data', c => fr += c);
      fres.on('end', () => {
        const data = JSON.parse(fr);
        if (data.rows) {
          data.rows.slice(0, 10).forEach((row, i) => {
            console.log((i+1) + '. ' + row.product + ' | profitPts=' + JSON.stringify(row.profitPts) + ' | source=' + row.source);
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
