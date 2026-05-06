const puppeteer = require('puppeteer');

const BASE = 'https://qh.yemacaijing.net';
const ROOM_ID = 7000;

// 解析平仓提醒页（来自新路径 /generalmodule/shouted/_Data_Ping_Show.asp）
function parsePCPage(html) {
  const rows = [];
  const re = /<li>([\s\S]*?)<\/li>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const li = m[1];
    const get = re2 => { const r = li.match(re2); return r ? r[1].trim() : ''; };
    
    const openTime  = get(/class="data2"[^>]*title="([^"]+)"/);
    if (!openTime) continue;
    const direction = get(/class="data3"[^>]*title="([^"]+)"/);
    const product   = get(/class="data5"[^>]*title="([^"]+)"/);
    const rawOpen   = get(/class="data6"[^>]*title="([^"]+)"/);
    const closeTime = get(/class="data9"[^>]*title="([^"]+)"/);
    const teacher   = get(/class="data12"[^>]*title="([^"]+)"/);
    
    // 平仓价格从 data10 span 里的 value 提取
    let closePrice = '';
    const d10 = li.match(/class="data10"[\s\S]*?<\/span>/);
    if (d10) {
      const v = d10[0].match(/value="([^"]*)"/);
      if (v) closePrice = v[1].trim();
    }
    
    // 智能拆分
    let openPrice = rawOpen;
    const rawNum = rawOpen.replace(/\D/g, '');
    if (rawNum.length >= 8 && rawNum.length <= 14) {
      openPrice = rawNum.substring(0, Math.ceil(rawNum.length / 2));
    }
    
    if (openPrice && direction) {
      rows.push({
        openTime, direction, product, openPrice,
        stopLoss: '', takeProfit: '',  // 新路径没有SL/TP字段
        closeTime: closeTime || '', closePrice: closePrice || '',
        profitPts: '', teacher: teacher || '',
        source: 'pc', isClosed: !!closePrice,
      });
    }
  }
  return rows;
}

async function fetchWithPuppeteer(maxPages) {
  console.log('Launching browser...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  
  const allRows = [];
  let totalRows = 0;
  
  for (let p = 1; p <= maxPages; p++) {
    const url = BASE + '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=' + ROOM_ID + '&page=' + p;
    console.log('Fetching page ' + p + '...');
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
      const content = await page.content();
      
      if (content.length < 500) {
        console.log('Page ' + p + ' empty/error, stop.');
        break;
      }
      
      const rows = parsePCPage(content);
      allRows.push(...rows);
      totalRows = rows.length > 0 ? totalRows + rows.length : totalRows;
      
      console.log('  Got ' + rows.length + ' rows');
      
      if (rows.length < 10) break;
    } catch(e) {
      console.log('Page ' + p + ' error: ' + e.message);
      break;
    }
  }
  
  await browser.close();
  return { rows: allRows, totalRows: allRows.length };
}

(async () => {
  const maxPages = parseInt(process.argv[2] || '8');
  console.log('Fetching maxPages:', maxPages);
  
  const result = await fetchWithPuppeteer(maxPages);
  console.log('\nTotal:', result.rows.length, 'rows');
  console.log(JSON.stringify(result, null, 2));
})();