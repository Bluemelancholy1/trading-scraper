// Debug merge logic
const http = require('http');

async function fetchDebug(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function main() {
  // Fetch merged and JC data
  const merged = await fetchDebug('http://localhost:3456/fetch?mode=merged&pages=8');
  const jc = await fetchDebug('http://localhost:3456/fetch?mode=jc&pages=8');
  
  console.log('=== 缺少止损止盈的记录 ===\n');
  
  const missing = merged.rows.filter(r => !r.stopLoss && !r.takeProfit);
  console.log('共', missing.length, '条缺少SL/TP\n');
  
  // 检查每条缺失记录，在JC中是否能找到匹配
  missing.forEach((r, i) => {
    console.log(`[${i+1}] ${r.openTime} ${r.product} ${r.direction} ${r.teacher}`);
    console.log(`    开仓价: ${r.openPrice}`);
    
    // 尝试在JC中查找
    const timeMatch = jc.rows.find(j => 
      j.product === r.product && 
      j.direction === r.direction && 
      j.teacher === r.teacher &&
      j.openTime === r.openTime
    );
    
    const priceMatch = jc.rows.find(j =>
      j.product === r.product &&
      j.direction === r.direction &&
      j.teacher === r.teacher &&
      j.openPrice === r.openPrice
    );
    
    const looseMatch = jc.rows.find(j =>
      j.product === r.product &&
      j.direction === r.direction &&
      j.teacher === r.teacher
    );
    
    if (timeMatch) {
      console.log(`    时间匹配: SL=${timeMatch.stopLoss || '空'} TP=${timeMatch.takeProfit || '空'}`);
    } else if (priceMatch) {
      console.log(`    价格匹配: SL=${priceMatch.stopLoss || '空'} TP=${priceMatch.takeProfit || '空'}`);
    } else if (looseMatch) {
      console.log(`    宽松匹配: SL=${looseMatch.stopLoss || '空'} TP=${looseMatch.takeProfit || '空'}`);
    } else {
      console.log(`    ❌ JC中无匹配记录`);
    }
    console.log('');
  });
}

main().catch(console.error);
