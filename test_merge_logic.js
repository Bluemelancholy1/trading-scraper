// Debug the merge logic directly with the actual data
const http = require('http');

// Unlock
const d = JSON.stringify({password: '135917'});
const req = http.request({
  hostname: 'localhost', port: 3456, path: '/unlock', method: 'POST',
  headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(d)}
}, res => {
  let r = '';
  res.on('data', c => r += c);
  res.on('end', () => {
    // Get JC data
    const fd = JSON.stringify({pages: 5, mode: 'jc'});
    const jcreq = http.request({
      hostname: 'localhost', port: 3456, path: '/fetch', method: 'POST',
      headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(fd)}
    }, jcres => {
      let jr = '';
      jcres.on('data', c => jr += c);
      jcres.on('end', () => {
        const jcData = JSON.parse(jr);
        const jcRows = jcData.rows || [];
        
        // Get PC data
        const pfd = JSON.stringify({pages: 3, mode: 'pc'});
        const pcreq = http.request({
          hostname: 'localhost', port: 3456, path: '/fetch', method: 'POST',
          headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(pfd)}
        }, pcres => {
          let pr = '';
          pcres.on('data', c => pr += c);
          pcres.on('end', () => {
            const pcData = JSON.parse(pr);
            const pcRows = pcData.rows || [];
            
            // Simulate the merge logic
            function tsMinute(str) {
              return str.substring(0, str.lastIndexOf(':'));
            }
            function normProduct(p) {
              const aliases = {'原油': '美原油', '小道指': '小纳指', '黄金': '美黄金'};
              return aliases[p] || p;
            }
            
            const jcByProduct = {};
            for (const r of jcRows) {
              const key = normProduct(r.product) + '|' + tsMinute(r.openTime) + '|' + r.direction;
              if (!jcByProduct[key]) jcByProduct[key] = [];
              jcByProduct[key].push(r);
            }
            
            console.log('=== JC keys (sample 5) ===');
            let i = 0;
            for (const k of Object.keys(jcByProduct)) {
              if (i++ >= 5) break;
              console.log('  ' + k);
            }
            
            console.log('\n=== PC rows (sample 5) ===');
            for (let j = 0; j < Math.min(5, pcRows.length); j++) {
              const pr = pcRows[j];
              const pk = normProduct(pr.product) + '|' + tsMinute(pr.openTime) + '|' + pr.direction;
              const candidates = jcByProduct[pk] || [];
              console.log('  PC key: ' + pk);
              console.log('    JC candidates: ' + candidates.length);
              if (candidates.length > 0) {
                console.log('    Found SL=' + candidates[0].stopLoss + ' TP=' + candidates[0].takeProfit);
              }
            }
            
            // Do the merge
            let matched = 0, unmatched = 0;
            for (const pr of pcRows) {
              const pk = normProduct(pr.product) + '|' + tsMinute(pr.openTime) + '|' + pr.direction;
              const candidates = jcByProduct[pk] || [];
              let best = null, bestDiff = Infinity;
              for (const jc of candidates) {
                const diff = Math.abs(new Date(pr.openTime) - new Date(jc.openTime));
                if (diff < bestDiff) { bestDiff = diff; best = jc; }
              }
              if (best && bestDiff < 120000) {
                pr.stopLoss = best.stopLoss;
                pr.takeProfit = best.takeProfit;
                matched++;
              } else {
                unmatched++;
              }
            }
            
            console.log('\n=== Merge result ===');
            console.log('Matched: ' + matched + ', Unmatched: ' + unmatched);
            console.log('\nFirst 10 merged rows:');
            for (let k = 0; k < Math.min(10, pcRows.length); k++) {
              const row = pcRows[k];
              console.log((k+1) + '. ' + row.openTime.substring(0,16) + ' | ' + row.direction + ' | ' + row.product + ' | 开:' + row.openPrice + ' | 止:' + (row.stopLoss || '(空)') + ' | 盈:' + (row.takeProfit || '(空)') + ' | 平:' + row.closePrice);
            }
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