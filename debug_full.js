// 完整调试 profitAmt 计算
const http = require('http');

const req = http.get('http://localhost:3456/fetch?pages=1', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const j = JSON.parse(d);
    const recs = (j.rows || []).filter(r => r.product && r.product.includes('\u5fb7'));
    
    const CONTRACTS = {
      '德指':   { unit: 25, unitCcy: 'EUR', rate: 9.10, priceDiv: 1 },
      '小德指': { unit: 5,  unitCcy: 'EUR', rate: 9.10, priceDiv: 1 }
    };
    
    console.log('德系记录:', recs.length);
    recs.forEach(r => {
      console.log('\n--- ' + r.product + ' ---');
      console.log('product bytes:', Buffer.from(r.product, 'utf8').toString('hex'));
      console.log('CONTRACTS keys:', Object.keys(CONTRACTS));
      
      const cv = CONTRACTS[r.product];
      console.log('cv lookup result:', cv);
      
      if (cv) {
        const openNum = parseFloat(r.openPrice);
        const pts = parseFloat(r.teacherProfit);
        console.log('openNum:', openNum, 'pts:', pts);
        if (!isNaN(openNum) && !isNaN(pts)) {
          const amount = pts * cv.unit * cv.rate;
          console.log('calc:', pts, '*', cv.unit, '*', cv.rate, '=', amount.toFixed(0));
          console.log('amt string:', amount > 0 ? '+¥' + amount.toFixed(0) : '¥' + amount.toFixed(0));
        }
      } else {
        // 尝试用 Unicode codepoint 匹配
        console.log('lookup failed, trying codepoint match...');
        for (const [k, v] of Object.entries(CONTRACTS)) {
          if ([...k].map(c => c.charCodeAt(0).toString(16)).join() === [...r.product].map(c => c.charCodeAt(0).toString(16)).join()) {
            console.log('MATCH found with key:', k);
            const pts = parseFloat(r.teacherProfit);
            const amount = pts * v.unit * v.rate;
            console.log('calc:', pts, '*', v.unit, '*', v.rate, '=', amount.toFixed(0));
          }
        }
      }
      
      console.log('current profitAmt:', r.profitAmt);
    });
  });
});

req.on('error', e => console.error(e));