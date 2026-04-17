const http = require('http');
const post = (path, data) => new Promise((ok, no) => {
  const r = http.request({hostname:'localhost',port:3456,path,method:'POST',
    headers:{'Content-Type':'application/json'}}, res => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', () => ok(JSON.parse(d)));
  }); r.write(JSON.stringify(data)); r.end();
});

(async () => {
  const l = await post('/login', {password:'881199',phone:'16616135917',pass:'135917'});
  console.log('Login:', l.ok, 'room:', l.room, 'user:', l.user);
  
  const f = await post('/fetch', {mode:'merged', pages:8});
  console.log('Rows:', f.rows.length, 'Total:', f.totalRows);
  
  const dates = new Set();
  f.rows.forEach(r => dates.add(r.openTime.split(' ')[0]));
  console.log('Dates:', [...dates].sort().join(', '));
  
  const withSL = f.rows.filter(r => r.stopLoss);
  console.log('With stopLoss:', withSL.length + '/' + f.rows.length);
  
  // Show first 3 and last 3
  console.log('\n--- First 3 ---');
  f.rows.slice(0,3).forEach((r,i) => 
    console.log(i+1, r.openTime, r.direction, r.product, r.openPrice, 
      'SL:'+r.stopLoss, 'TP:'+r.takeProfit, 'Close:'+r.closePrice, 'Pts:'+r.profitPts));
  console.log('\n--- Last 3 ---');
  f.rows.slice(-3).forEach((r,i) => 
    console.log(f.rows.length-2+i, r.openTime, r.direction, r.product, r.openPrice, 
      'SL:'+r.stopLoss, 'TP:'+r.takeProfit, 'Close:'+r.closePrice, 'Pts:'+r.profitPts));
})();
