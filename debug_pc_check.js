// Check pc_raw.html for 10:01:53 record and data7/data8
const fs = require('fs');
const html = fs.readFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/pc_raw.html', 'utf8');

const re = /<li>([\s\S]*?)<\/li>/g;
let m;
let found = 0;

while ((m = re.exec(html)) !== null) {
  const li = m[1];
  if (li.includes('10:01') || li.includes('10:11') || (li.includes('恒指') && li.includes('安然'))) {
    found++;
    console.log('--- Record #' + found + ' (' + li.length + ' chars) ---');
    const get = r2 => { const r = li.match(r2); return r ? r[1].trim() : '(none)' };
    console.log('time:', get(/class="data2"[^>]*title="([^"]+)"/));
    console.log('dir:', get(/class="data3"[^>]*title="([^"]+)"/));
    console.log('product:', get(/class="data5"[^>]*title="([^"]+)"/));
    console.log('open:', get(/class="data6"[^>]*title="([^"]+)"/));
    console.log('SL(data7):', get(/class="data7"[^>]*title="([^"]+)"/));
    console.log('TP(data8):', get(/class="data8"[^>]*title="([^"]+)"/));
    console.log('closeT:', get(/class="data9"[^>]*title="([^"]+)"/));
    console.log('');
  }
}

const totalLi = (html.match(/<li>/g) || []).length;
const totalD7 = (html.match(/class="data7"/g) || []).length;
const totalD8 = (html.match(/class="data8"/g) || []).length;
console.log('=== GLOBAL ===');
console.log('Total <li>: ' + totalLi);
console.log('Total data7 spans: ' + totalD7);
console.log('Total data8 spans: ' + totalD8);
