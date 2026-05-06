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
    
    // Get JC data separately
    const fd = JSON.stringify({pages: 5, mode: 'jc'});
    const jcreq = http.request({
      hostname: 'localhost', port: 3456, path: '/fetch', method: 'POST',
      headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(fd)}
    }, jcres => {
      let jr = '';
      jcres.on('data', c => jr += c);
      jcres.on('end', () => {
        const jcData = JSON.parse(jr);
        console.log('\nJC rows (fresh fetch):', jcData.rows ? jcData.rows.length : 0);
        console.log('JC rows sample:');
        if (jcData.rows) {
          jcData.rows.slice(0, 5).forEach((row, i) => {
            console.log('  ' + i + ': ' + row.openTime + ' | ' + row.direction + ' | ' + row.product + ' | SL=' + JSON.stringify(row.stopLoss) + ' | TP=' + JSON.stringify(row.takeProfit));
          });
        }
        
        // Now check what keys are in jcByProduct for the first few
        console.log('\nJC first 3 rows full content:');
        if (jcData.rows) {
          jcData.rows.slice(0, 3).forEach((row, i) => {
            console.log('  Row ' + i + ':', JSON.stringify(row));
          });
        }
      });
    });
    jcreq.write(fd);
    jcreq.end();
  });
});
req.write(d);
req.end();