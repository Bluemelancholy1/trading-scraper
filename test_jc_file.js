const https = require('fs');

const data = require('fs').readFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/jc_curl_result.html', 'utf8');
console.log('File length:', data.length);

// Find total rows info
const matches = data.match(/共\s*(\d+)\s*条|总\s*(\d+)\s*条|总\s*(\d+)\s*页/g);
console.log('Total info matches:', matches);

// Find page nav info
const nav = data.match(/共.*?条.*?总.*?页/s);
console.log('Nav:', nav ? nav[0].substring(0, 200) : 'none');

// Show last 3 JC row timestamps
const re = /class="data2"[^>]*title="([^"]+)"/g;
const times = [];
let m;
while ((m = re.exec(data)) !== null) {
  times.push(m[1]);
}
console.log('JC times in file (first 3):', times.slice(0, 3));
console.log('JC times in file (last 3):', times.slice(-3));
console.log('Total JC rows in file:', times.length);

// Now parse with proper regex
const liRe = /<li>([\s\S]*?)<\/li>/g;
const rows = [];
let lm;
while ((lm = liRe.exec(data)) !== null) {
  const li = lm[1];
  const get = re2 => { const r = li.match(re2); return r ? r[1].trim() : ''; };
  const openTime = get(/class="data2"[^>]*title="([^"]+)"/);
  if (!openTime) continue;
  const product = get(/class="data5"[^>]*title="([^"]+)"/);
  const direction = get(/class="data3"[^>]*title="([^"]+)"/);
  const stopLoss = get(/class="data7"[^>]*title="([^"]+)"/);
  const takeProfit = get(/class="data8"[^>]*title="([^"]+)"/);
  rows.push({ openTime, direction, product, stopLoss, takeProfit });
}
console.log('\nParsed JC rows:', rows.length);
console.log('First 5:', rows.slice(0, 5));
console.log('Last 5:', rows.slice(-5));
