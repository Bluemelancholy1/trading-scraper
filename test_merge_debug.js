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
    
    // Check JC + PC separately with 5 pages each
    const fd = JSON.stringify({pages: 5, mode: 'jc'});
    const jcreq = http.request({
      hostname: 'localhost', port: 3456, path: '/fetch', method: 'POST',
      headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(fd)}
    }, jcres => {
      let jr = '';
      jcres.on('data', c => jr += c);
      jcres.on('end', () => {
        const jcData = JSON.parse(jr);
        console.log('\nJC rows:', jcData.rows ? jcData.rows.length : 0);
        
        // Build a quick lookup of what keys we have in JC
        const jcKeys = new Set();
        if (jcData.rows) {
          jcData.rows.forEach(row => {
            const key = row.openTime + '|' + row.product + '|' + row.direction;
            jcKeys.add(key);
          });
        }
        
        // Now check PC
        const pfd = JSON.stringify({pages: 5, mode: 'pc'});
        const pcreq = http.request({
          hostname: 'localhost', port: 3456, path: '/fetch', method: 'POST',
          headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(pfd)}
        }, pcres => {
          let pr = '';
          pcres.on('data', c => pr += c);
          pcres.on('end', () => {
            const pcData = JSON.parse(pr);
            console.log('PC rows:', pcData.rows ? pcData.rows.length : 0);
            
            // Check each PC row if it has a JC match
            let matchCount = 0;
            let noMatchCount = 0;
            pcData.rows.forEach(row => {
              const key = row.openTime + '|' + row.product + '|' + row.direction;
              if (jcKeys.has(key)) {
                matchCount++;
                // Find the matching JC row
                const match = jcData.rows.find(r => 
                  r.openTime === row.openTime && r.product === row.product && r.direction === row.direction
                );
                console.log('MATCH: ' + row.openTime + ' ' + row.product + ' ' + row.direction + ' | SL=' + (match ? match.stopLoss : '?') + ' TP=' + (match ? match.takeProfit : '?'));
              } else {
                noMatchCount++;
              }
            });
            
            console.log('\nMatches: ' + matchCount + ', No match: ' + noMatchCount);
            console.log('\nJC keys sample (first 5):');
            let i = 0;
            jcKeys.forEach(k => { console.log('  ' + k); i++; if (i >= 5) return; });
            
            console.log('\nPC keys sample (first 5):');
            i = 0;
            pcData.rows.forEach(row => {
              const key = row.openTime + '|' + row.product + '|' + row.direction;
              console.log('  ' + key);
              i++; if (i >= 5) return;
            });
          });
        });
        pcreq.write(pfd);
        pcreq.end();
      });
    });
    jcreq.write(fd);
    jcreq.end();
  });
});
req.write(d);
req.end();