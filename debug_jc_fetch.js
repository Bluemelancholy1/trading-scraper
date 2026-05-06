// Debug: Test JC fetch alone
const http = require('http');

const opts = {
  hostname: 'localhost', port: 3456, path: '/fetch?mode=jc&pages=3', method: 'GET',
  headers: { 'x-app-pass': '135917' }
};

const req = http.request(opts, res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    const j = JSON.parse(data);
    console.log('JC rows:', j.rows ? j.rows.length : 0);
    if (j.rows) {
      console.log('\nFirst 5 JC rows:');
      j.rows.slice(0, 5).forEach((r, i) => {
        console.log(`${i+1}. openTime=${r.openTime} product=${r.product} dir=${r.direction} openPrice=${r.openPrice} stopLoss=${r.stopLoss} takeProfit=${r.takeProfit}`);
      });
    }
  });
});
req.on('error', e => console.error(e));
req.end();
