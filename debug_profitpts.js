const fs = require('fs');
const html = fs.readFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/end_test3.html', 'utf8');
const re = /<li>([\s\S]*?)<\/li>/g;
let m;
while ((m = re.exec(html)) !== null) {
  const li = m[1];
  if (li.includes('26060')) {
    console.log('=== Found 26060 ===');
    // extract data11
    const d11 = li.match(/class="data11"[^>]*title="([^"]+)"/);
    console.log('data11 (profitPts):', d11 ? d11[1] : 'NO MATCH');
    // extract data10
    const d10 = li.match(/class="data10"[^>]*title="([^"]+)"/);
    console.log('data10 (closePrice):', d10 ? d10[1] : 'NO MATCH');
    // extract data6
    const d6 = li.match(/class="data6"[^>]*title="([^"]+)"/);
    console.log('data6 (openPrice):', d6 ? d6[1] : 'NO MATCH');
    // show the full li around data10 and data11
    const idx10 = li.indexOf('data10');
    const idx11 = li.indexOf('data11');
    if (idx10 > 0) console.log('around data10:', li.substring(Math.max(0,idx10-20), idx10+150));
    if (idx11 > 0) console.log('around data11:', li.substring(Math.max(0,idx11-20), idx11+150));
  }
}
