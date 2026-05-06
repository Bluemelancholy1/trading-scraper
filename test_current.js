const http = require('http');

http.get('http://localhost:3456/fetch?mode=merged&pages=1&_t=' + Date.now(), (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    try {
      const j = JSON.parse(data);
      console.log('ok:', j.ok, 'cached:', j.cached, 'rows:', j.rows ? j.rows.length : 0);
      if (j.rows) {
        j.rows.forEach((r, i) => {
          if (i < 15) {
            console.log(`${i+1}. ${r.product} ${r.direction} | 开:${r.openPrice} → 平:${r.closePrice} | profitPts=${JSON.stringify(r.profitPts)} | SL=${r.stopLoss} TP=${r.takeProfit}`);
          }
        });
      }
    } catch(e) {
      console.log('Parse error:', e.message);
      console.log('Raw (first 500):', data.substring(0, 500));
    }
  });
}).on('error', e => console.log('Error:', e.message));
