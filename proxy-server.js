// DayueKX Proxy Server v3 - 建仓提醒 + 平仓提醒 + 合并模式
// Run: node proxy-server.js | Open: http://localhost:3456/

const http = require('http');
const https = require('https');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const PORT = 3456;
const ROOM_ID = 7000;
const BASE = 'https://nbqh.lulutong.club';

const TEACHERS = {
  4421:'大元老师', 4767:'青松老师', 3814:'山野老师',
  3154:'羽木老师',  4732:'安然老师', 4460:'泰山老师',
  3153:'大元老师', 3155:'夏美老师',
};

let roomCookie = '';
let loginCookie = '';
let loginTime = 0;

function log(type, msg) {
  const icons = {info:'i',ok:'OK',warn:'W',err:'X',data:'D'};
  const ts = new Date().toLocaleTimeString('zh-CN');
  process.stdout.write(`[${icons[type]||'>'}] [${ts}] ${msg}\n`);
}

function httpReq(targetUrl, method, postData, extraHeaders) {
  return new Promise((resolve, reject) => {
    try {
      const pu = new URL(targetUrl);
      const lib = pu.protocol === 'https:' ? https : http;
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*', 'Accept-Language': 'zh-CN',
        ...(extraHeaders || {}),
      };
      const opt = { hostname: pu.hostname, port: pu.port || 443,
        path: pu.pathname + pu.search, method: method || 'GET',
        headers, timeout: 25000 };
      const req = lib.request(opt, res => {
        const sc = res.headers['set-cookie'];
        if (sc) {
          const newCookie = sc.map(c => c.split(';')[0]).join('; ');
          if (newCookie.includes('ASPSESSIONID')) roomCookie = newCookie;
          else if (newCookie.includes('ishow')) loginCookie = newCookie;
        }
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.on('error', reject);
      if (postData) req.write(postData);
      req.end();
    } catch(e) { reject(e); }
  });
}

function getFullCookie() {
  return [roomCookie, loginCookie].filter(Boolean).join('; ');
}

// --- 登录 ---
async function login(password, phone, pass) {
  try {
    await httpReq(BASE + '/');
    await httpReq(BASE + '/Handle/CheckRoomPass.asp?ac=CheckRoomPass&RID=' + ROOM_ID + '&P=' + encodeURIComponent(password));
    log('info', 'Room cookie: ' + (roomCookie ? 'YES' : 'NO'));
    if (phone && pass) {
      const pd = querystring.stringify({Method:'Login',UserMail:'',usertel:phone,UserPass:pass,_AutoLogin:'1',GoUrl:''});
      await httpReq(BASE + '/handle/qlogin/', 'POST', pd, {
        'Content-Type':'application/x-www-form-urlencoded','Origin':BASE,'Content-Length':Buffer.byteLength(pd),
        'Cookie': roomCookie,
      });
      log('info', 'Login cookie: ' + (loginCookie ? 'YES' : 'NO'));
    }
    loginTime = Date.now();
    log('ok', 'LOGIN OK room=' + !!roomCookie + ' user=' + !!loginCookie);
    return true;
  } catch(e) {
    log('err', 'Login failed: ' + e.message);
    return false;
  }
}

// --- 解析建仓提醒（止损/止盈数据源） ---
function parseJCPage(html) {
  const rows = [];
  const re = /<li>([\s\S]*?)<\/li>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const li = m[1];
    const get = re2 => { const r = li.match(re2); return r ? r[1].trim() : ''; };
    
    const openTime   = get(/class="data2"[^>]*title="([^"]+)"/);
    if (!openTime) continue;
    const direction  = get(/class="data3"[^>]*title="([^"]+)"/);
    const product    = get(/class="data5"[^>]*title="([^"]+)"/);
    const rawOpen   = get(/class="data6"[^>]*title="([^"]+)"/);
    const stopLoss  = get(/class="data7"[^>]*title="([^"]+)"/).replace(/\u00a0/g, ' ');
    const takeProfit = get(/class="data8"[^>]*title="([^"]+)"/).replace(/\u00a0/g, ' ');
    const teacher   = get(/class="data9"[^>]*title="([^"]+)"/);
    
    // 智能拆分拼接的开仓价（如 "92309240" = "9230" + "9240"）
    let openPrice = rawOpen;
    const rawNum = rawOpen.replace(/\D/g, '');
    if (rawNum.length >= 8 && rawNum.length <= 14) {
      const half = Math.ceil(rawNum.length / 2);
      openPrice = rawNum.substring(0, half);
    }
    
    if (openPrice && direction) {
      rows.push({
        openTime, direction, product, openPrice,
        stopLoss: stopLoss || '',
        takeProfit: takeProfit || '',
        closeTime: '', closePrice: '', profitPts: '',
        teacher: teacher || '',
        source: 'jc', isClosed: false,
      });
    }
  }
  return rows;
}

// --- 解析平仓提醒（平仓点位数据源） ---
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
    
    // 平仓价格从 data10 span 里的 input value 提取
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
        stopLoss: '', takeProfit: '',
        closeTime: closeTime || '', closePrice: closePrice || '',
        profitPts: '', teacher: teacher || '',
        source: 'pc', isClosed: true,
      });
    }
  }
  return rows;
}

function extractTotal(html) {
  const m = html.match(/总(\d+)条/);
  if (m) return parseInt(m[1]);
  const m2 = html.match(/总(\d+)页/);
  if (m2) return parseInt(m2[1]) * 10;
  return 10;
}

// --- 抓取单页（支持日期过滤） ---
async function fetchPage(page, url, parser, filters) {
  const params = new URLSearchParams({ roomid: String(ROOM_ID), page: String(page) });
  if (filters) {
    if (filters.pt) params.set('pt', filters.pt);     // 开始日期（ASP格式 2026/04/10）
    if (filters.et) params.set('et', filters.et);     // 结束日期
  }
  const fullUrl = url + (url.includes('?') ? '&' : '?') + params.toString();
  log('data', 'GET: ' + fullUrl.replace(BASE, ''));
  const resp = await httpReq(fullUrl, 'GET', null, { Cookie: getFullCookie() });
  if (resp.status !== 200) throw new Error('HTTP ' + resp.status);
  const rows = parser(resp.body);
  return { rows, totalRows: extractTotal(resp.body) };
}

// --- 抓取多页数据 ---
async function fetchPages(maxPages, url, parser, filters) {
  const allRows = [];
  let totalRows = 0;
  for (let p = 1; p <= maxPages; p++) {
    try {
      const r = await fetchPage(p, url, parser, filters);
      allRows.push(...r.rows);
      totalRows = r.totalRows;
      if (p === 1) log('ok', url.includes('start') ? 'JC' : 'PC' + ' total=' + totalRows);
      if (r.rows.length < 10) break; // 最后一页不足10条，没有更多了
    } catch(e) {
      log('warn', 'Page ' + p + ' error: ' + e.message);
      break;
    }
  }
  return { rows: allRows, totalRows };
}

// --- 合并模式：建仓+平仓 ---
async function fetchMerged(filters, maxPages) {
  maxPages = maxPages || 8; // 默认8页=80条
  // 取建仓提醒多页作为止损止盈字典
  const jcR = await fetchPages(maxPages, BASE + '/generalmodule/shouted/_data_start_show.asp', parseJCPage, filters);
  log('ok', 'JC loaded ' + jcR.rows.length + ' rows (for stop loss/take profit lookup)');
  
  // 取平仓提醒多页（带平仓价格）
  const pcR = await fetchPages(maxPages, BASE + '/generalmodule/shouted/_Data_Ping_Show.asp', parsePCPage, filters);
  log('ok', 'PC loaded ' + pcR.rows.length + ' rows');
  
  // 建立建仓字典：用于查找止损止盈
  // key 策略：商品+方向+老师+开仓价（更精确匹配）
  const jcMap = {};
  jcR.rows.forEach(r => {
    const key = r.product + '|' + r.direction + '|' + r.teacher + '|' + r.openPrice;
    if (!jcMap[key]) jcMap[key] = r;
  });
  
  // 合并
  const merged = pcR.rows.map(r => {
    // 精确匹配：商品+方向+老师+开仓价
    let key = r.product + '|' + r.direction + '|' + r.teacher + '|' + r.openPrice;
    let jc = jcMap[key];
    // 降级匹配：商品+方向+老师
    if (!jc) {
      key = r.product + '|' + r.direction + '|' + r.teacher;
      for (const [k, v] of Object.entries(jcMap)) {
        if (k.startsWith(key) && !jcMap[k + '|' + r.openPrice]) { jc = v; break; }
      }
    }
    if (!jc) {
      key = r.product + '|' + r.direction + '|' + r.teacher;
      jc = jcMap[Object.keys(jcMap).find(k => k.startsWith(key))];
    }
    if (jc) {
      r.stopLoss   = jc.stopLoss;
      r.takeProfit = jc.takeProfit;
    }
    // 计算获利点数
    if (r.openPrice && r.closePrice) {
      const o = parseFloat(r.openPrice);
      const c = parseFloat(r.closePrice);
      if (!isNaN(o) && !isNaN(c) && c !== 0) {
        let pts = 0;
        if (r.direction === '多') pts = c - o;
        else if (r.direction === '空') pts = o - c;
        r.profitPts = pts > 0 ? '+' + pts.toFixed(2) : pts.toFixed(2);
      }
    }
    return r;
  });
  
  return { rows: merged, totalRows: pcR.totalRows, mode: 'merged' };
}

// --- HTTP Server ---
const server = http.createServer((req, res) => {
  try {
    let urlPath;
    try { urlPath = new URL(req.url, 'http://localhost:' + PORT).pathname; }
    catch(e) { urlPath = req.url || '/'; }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (urlPath === '/favicon.ico') { res.writeHead(204); res.end(); return; }

    // Serve index.html
    if (urlPath === '/' || urlPath === '/index.html') {
      const htmlFile = path.join(__dirname, 'index.html');
      try {
        const html = fs.readFileSync(htmlFile, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch(e) { res.writeHead(404); res.end('not found'); }
      return;
    }

    if (urlPath === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ loggedIn: !!(roomCookie || loginCookie) }));
      return;
    }
    if (urlPath === '/teachers') {
      res.writeHead(200, {'Content-Type':'application/json'});
      res.end(JSON.stringify(TEACHERS));
      return;
    }

    // POST /login
    if (urlPath === '/login') {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body || '{}');
          const ok = await login(data.password || '881199', data.phone, data.pass);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok, room: !!roomCookie, user: !!loginCookie }));
        } catch(e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: e.message }));
        }
      });
      return;
    }

    // POST /fetch
    if (urlPath === '/fetch') {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', async () => {
        try {
          if (!roomCookie) throw new Error('Not logged in. POST /login first.');
          const opts = JSON.parse(body || '{}');
          const { mode = 'merged' } = opts;
          
          let result;
          const maxPages = Math.min(opts.pages || 8, 50); // 默认8页=80条，上限50页
          if (mode === 'merged') {
            result = await fetchMerged(opts.filters || {}, maxPages);
          } else if (mode === 'pc') {
            result = await fetchPages(maxPages, BASE + '/generalmodule/shouted/_Data_Ping_Show.asp', parsePCPage, opts.filters || {});
          } else {
            result = await fetchPages(maxPages, BASE + '/generalmodule/shouted/_data_start_show.asp', parseJCPage, opts.filters || {});
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, mode, ...result }));
        } catch(e) {
          log('err', '/fetch error: ' + e.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: e.message }));
        }
      });
      return;
    }

    res.writeHead(404); res.end(JSON.stringify({ error: 'Unknown' }));
  } catch(e) {
    log('err', 'Request error: ' + e.message);
    res.writeHead(500); res.end('error');
  }
});

server.on('error', e => log('err', 'Server: ' + e.message));

server.listen(PORT, '0.0.0.0', () => {
  log('ok', `Server v3 started on http://localhost:${PORT}`);
  log('info', `Open http://localhost:${PORT}/ in browser`);
  log('info', `Login: POST /login {password:"881199", phone:"16616135917", pass:"135917"}`);
});

process.on('uncaughtException', e => { log('err', 'FATAL: ' + e.message); process.exit(1); });
process.on('unhandledRejection', e => { log('err', 'REJECTION: ' + (e && e.message ? e.message : String(e))); });
