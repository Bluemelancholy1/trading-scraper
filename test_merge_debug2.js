const https = require('https');

const cookie = 'Guest_Name=4ufwU803; ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; bg_img=images%2Fbg%2F23.jpg; ASPSESSIONIDACTRAADQ=BFOFLJDBGMOBNBKPGBALNHNG';

function httpGet(path) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'qh.yemacaijing.net',
      path,
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': 'https://qh.yemacaijing.net/index.asp'
      }
    };
    https.get(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
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
    const rawOpen = get(/class="data6"[^>]*title="([^"]+)"/);
    const stopLoss = get(/class="data7"[^>]*title="([^"]+)"/).replace(/\u00a0/g, ' ');
    const takeProfit = get(/class="data8"[^>]*title="([^"]+)"/).replace(/\u00a0/g, ' ');
    const teacher = get(/class="data9"[^>]*title="([^"]+)"/);
    let openPrice = rawOpen;
    const rawNum = rawOpen.replace(/\D/g, '');
    if (rawNum.length >= 8 && rawNum.length <= 14) {
      openPrice = rawNum.substring(0, Math.ceil(rawNum.length / 2));
    }
    if (openPrice && direction) {
      rows.push({ openTime, direction, product, openPrice, stopLoss, takeProfit, teacher, _date: new Date(openTime) });
    }
  }
  return rows;
}

function parsePC(html) {
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
    const rawOpen = get(/class="data6"[^>]*title="([^"]+)"/);
    const closeTime = get(/class="data9"[^>]*title="([^"]+)"/);
    const teacher = get(/class="data12"[^>]*title="([^"]+)"/);
    let closePrice = '';
    const d10 = li.match(/class="data10"[\s\S]*?<\/span>/);
    if (d10) { const v = d10[0].match(/value="([^"]*)"/); if (v) closePrice = v[1].trim(); }
    let openPrice = rawOpen;
    const rawNum = rawOpen.replace(/\D/g, '');
    if (rawNum.length >= 8 && rawNum.length <= 14) {
      openPrice = rawNum.substring(0, Math.ceil(rawNum.length / 2));
    }
    if (openPrice && direction) {
      rows.push({ openTime, direction, product, openPrice, closeTime: closeTime || '', closePrice: closePrice || '', teacher: teacher || '', _date: new Date(openTime) });
    }
  }
  return rows;
}

async function main() {
  console.log('Fetching JC (3 pages)...');
  const jcPages = [];
  for (let p = 1; p <= 3; p++) {
    const r = await httpGet('/generalmodule/shouted/_data_start_show.asp?classid=8&roomid=7000&page=' + p);
    console.log('JC page', p, 'status:', r.status, 'len:', r.body.length);
    jcPages.push(...parseJC(r.body));
  }
  console.log('Total JC rows:', jcPages.length);
  console.log('First 3 JC:', jcPages.slice(0,3).map(r => r.openTime + ' | ' + r.direction + ' | ' + r.product + ' | 止:' + r.stopLoss + ' | 盈:' + r.takeProfit));
  
  console.log('\nFetching PC (3 pages)...');
  const pcPages = [];
  for (let p = 1; p <= 3; p++) {
    const r = await httpGet('/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=' + p);
    console.log('PC page', p, 'status:', r.status, 'len:', r.body.length);
    pcPages.push(...parsePC(r.body));
  }
  console.log('Total PC rows:', pcPages.length);
  console.log('First 3 PC:', pcPages.slice(0,3).map(r => r.openTime + ' | ' + r.direction + ' | ' + r.product + ' | 平:' + r.closePrice));
  
  // Test merge with time window
  console.log('\n--- Merge Test ---');
  const normProduct = p => ({'原油':'美原油','小道指':'小纳指','黄金':'美黄金'}[p] || p);
  let matched = 0;
  for (const pr of pcPages) {
    if (!pr.closePrice || pr.closePrice === '0') continue; // skip open positions
    const prDate = pr._date;
    const prProd = normProduct(pr.product);
    let best = null, bestDiff = Infinity;
    for (const jc of jcPages) {
      if (normProduct(jc.product) !== prProd) continue;
      if (jc.direction !== pr.direction) continue;
      const diff = Math.abs(prDate - jc._date);
      if (diff < bestDiff && diff <= 10 * 60 * 1000) {
        bestDiff = diff;
        best = jc;
      }
    }
    if (best) {
      matched++;
      console.log('MATCHED:', pr.openTime, '|', pr.product, '| 平:', pr.closePrice, '-> SL:', best.stopLoss, 'TP:', best.takeProfit, '| diff:', Math.round(bestDiff/1000), 's');
    }
  }
  console.log('Total matched:', matched, '/', pcPages.filter(r => r.closePrice && r.closePrice !== '0').length, 'closed positions');
}

main().catch(console.error);
