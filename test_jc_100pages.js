const https = require('https');
const cookie = 'Guest_Name=4ufwU803; ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; bg_img=images%2Fbg%2F23.jpg; ASPSESSIONIDACTRAADQ=BFOFLJDBGMOBNBKPGBALNHNG';

function httpGet(path) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'qh.yemacaijing.net', path,
      headers: { 'Cookie': cookie, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Accept-Language': 'zh-CN,zh;q=0.9' }
    };
    https.get(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d })); }).on('error', reject);
  });
}

function parseJC(html) {
  const rows = [];
  const re = /<li>([\s\S]*?)<\/li>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const li = m[1];
    const get = re2 => { const r = li.match(re2); return r ? r[1].trim() : ''; };
    const openTime = get(/class="data2"[^>]*title="([^"]+)"/);
    if (!openTime) continue;
    const direction = get(/class="data3"[^>]*title="([^"]+)"/);
    const product = get(/class="data5"[^>]*title="([^"]+)"/);
    const stopLoss = get(/class="data7"[^>]*title="([^"]+)"/).replace(/\u00a0/g, ' ');
    const takeProfit = get(/class="data8"[^>]*title="([^"]+)"/).replace(/\u00a0/g, ' ');
    if (openTime && direction) rows.push({ openTime, direction, product, stopLoss, takeProfit, _date: new Date(openTime) });
  }
  return rows;
}

async function main() {
  // Fetch JC 100 pages
  console.log('Fetching JC 100 pages...');
  const jcAll = [];
  for (let p = 1; p <= 100; p++) {
    const r = await httpGet('/generalmodule/shouted/_data_start_show.asp?classid=8&roomid=7000&page=' + p);
    const rows = parseJC(r.body);
    if (rows.length === 0) { console.log('JC page', p, 'empty - STOP at page', p); break; }
    jcAll.push(...rows);
    if (p % 20 === 0) console.log('JC page', p, 'total:', jcAll.length, '| earliest:', jcAll[jcAll.length-1]?.openTime);
  }
  console.log('\nTotal JC rows:', jcAll.length);
  console.log('JC time range:', jcAll[0]?.openTime, '~', jcAll[jcAll.length-1]?.openTime);
  
  // Get PC first 3 pages  
  console.log('\nFetching PC 3 pages...');
  const pcAll = [];
  for (let p = 1; p <= 3; p++) {
    const r = await httpGet('/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=' + p);
    const re = /<li>([\s\S]*?)<\/li>/g;
    let m;
    while ((m = re.exec(r.body)) !== null) {
      const li = m[1];
      const get = re2 => { const r2 = li.match(re2); return r2 ? r2[1].trim() : ''; };
      const openTime = get(/class="data2"[^>]*title="([^"]+)"/);
      if (!openTime) continue;
      const direction = get(/class="data3"[^>]*title="([^"]+)"/);
      const product = get(/class="data5"[^>]*title="([^"]+)"/);
      let closePrice = '';
      const d10 = li.match(/class="data10"[\s\S]*?<\/span>/);
      if (d10) { const v = d10[0].match(/value="([^"]*)"/); if (v) closePrice = v[1].trim(); }
      if (openTime && direction) pcAll.push({ openTime, direction, product, closePrice: closePrice || '', _date: new Date(openTime) });
    }
  }
  console.log('PC rows:', pcAll.length);
  console.log('PC time range:', pcAll[0]?.openTime, '~', pcAll[pcAll.length-1]?.openTime);

  // Merge test
  const normProduct = p => ({'原油':'美原油','小道指':'小纳指','黄金':'美黄金'}[p] || p);
  let matched = 0, unmatched = 0;
  const samples = [];
  for (const pr of pcAll) {
    if (!pr.closePrice || pr.closePrice === '0') continue;
    const prProd = normProduct(pr.product);
    let best = null, bestDiff = Infinity;
    for (const jc of jcAll) {
      if (normProduct(jc.product) !== prProd) continue;
      if (jc.direction !== pr.direction) continue;
      const diff = Math.abs(pr._date - jc._date);
      if (diff < bestDiff && diff <= 10 * 60 * 1000) { bestDiff = diff; best = jc; }
    }
    if (best) { matched++; if (samples.length < 5) samples.push({ pr, best, diff: Math.round(bestDiff/1000) }); }
    else unmatched++;
  }
  console.log('\nMerge result:', matched, 'matched /', matched+unmatched, 'closed PC rows');
  console.log('Unmatched:', unmatched);
  for (const s of samples) {
    console.log('  Match:', s.pr.openTime, '|', s.pr.product, '-> SL:', s.best.stopLoss, '| diff:', s.diff, 's');
  }
}

main().catch(console.error);
