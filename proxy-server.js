// DayueKX Proxy Server v3 - 建仓提醒 + 平仓提醒 + 合并模式
// Run: node proxy-server.js | Open: http://localhost:3456/

const http = require('http');
const https = require('https');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const PORT = process.env.PORT || 3456;
const ROOM_ID = 7000;
const BASE = 'https://nbqh.lulutong.club';
const APP_PASS = process.env.APP_PASS || '881199';  // 应用访问密码

const TEACHERS = {
  4421:'大元老师', 4767:'青松老师', 3814:'山野老师',
  3154:'羽木老师',  4732:'安然老师', 4460:'泰山老师',
  3153:'大元老师', 3155:'夏美老师',
};

// 品种汇率配置
// 汇率: 1 USD=7.98 CNY, 1 HKD=1 CNY, 1 EUR=9.1 CNY
// 每点价值（由用户提供，2026-04-17 更新）
// priceDiv: 原始价格需要除以该值才能还原实际价格（如美原油原始传"5900"=59.00美元，需/100）
// unit: 每小点/整点价值（美元），用于盈亏金额计算
const CONTRACTS = {
  '小纳指': { unit: 20,  unitCcy: 'USD', rate: 7.98, priceDiv: 1   },  // $20/整点
  '微纳指': { unit: 2,   unitCcy: 'USD', rate: 7.98, priceDiv: 1   },  // $2/整点
  '恒指':   { unit: 50,  unitCcy: 'HKD', rate: 1.00, priceDiv: 1   },  // HK$50/整点
  '美原油': { unit: 10,  unitCcy: 'USD', rate: 7.98, priceDiv: 1   },  // $10/小点，1整点=100小点=$1000
  '美黄金': { unit: 100, unitCcy: 'USD', rate: 7.98, priceDiv: 1   },  // $100/整点
  '黄金':   { unit: 10,  unitCcy: 'CNY', rate: 7.98, priceDiv: 1   },  // ¥10/整点
};

let roomCookie = '';
let loginCookie = '';
let appLoggedIn = false;   // 默认未登录，输入正确密码后解锁
const LOGIN_PASSWORD = '881199';
let loginTime = 0;

// 内存缓存：避免短时间内重复抓取
let cachedFetch = null;   // { key, data, ts }
const CACHE_TTL = 5 * 60 * 1000;  // 5分钟缓存

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
      req.on('error', e => {
        if (e.message.includes('ECONNREFUSED') || e.message.includes('ENOTFOUND') || e.message.includes('ETIMEDOUT')) {
          reject(new Error('connect_fail'));
        } else {
          reject(e);
        }
      });
      // 连接超时：8秒内无法建立连接则放弃
      req.connectTimer = setTimeout(() => { req.destroy(); reject(new Error('connect_timeout')); }, 8000);
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
  // 优先用开仓时间匹配，其次用商品+方向+老师+开仓价
  const jcMap = {};
  jcR.rows.forEach(r => {
    // key1: 商品+方向+老师+开仓时间（最精确）
    const timeKey = r.product + '|' + r.direction + '|' + r.teacher + '|' + r.openTime;
    // key2: 商品+方向+老师+开仓价（降级匹配）
    const priceKey = r.product + '|' + r.direction + '|' + r.teacher + '|' + r.openPrice;
    if (!jcMap[timeKey]) jcMap[timeKey] = r;
    if (!jcMap[priceKey]) jcMap[priceKey] = r;
  });
  
  // 合并
  const merged = pcR.rows.map(r => {
    // 优先精确匹配：商品+方向+老师+开仓时间
    let key = r.product + '|' + r.direction + '|' + r.teacher + '|' + r.openTime;
    let jc = jcMap[key];
    // 降级匹配：商品+方向+老师+开仓价
    if (!jc) {
      key = r.product + '|' + r.direction + '|' + r.teacher + '|' + r.openPrice;
      jc = jcMap[key];
    }
    // 再降级：商品+方向+老师
    if (!jc) {
      key = r.product + '|' + r.direction + '|' + r.teacher;
      jc = jcMap[Object.keys(jcMap).find(k => k.startsWith(key))];
    }
    if (jc) {
      r.stopLoss   = jc.stopLoss;
      r.takeProfit = jc.takeProfit;
    }
    // 计算获利点数 & 盈亏金额(¥)
    // pts: 原始价格差值（美原油=小点数×1，其他=整点×priceDiv）
    // unit: 每小点/整点的美元/HKD价值
    if (r.openPrice && r.closePrice) {
      const cv = CONTRACTS[r.product] || {};
      const div = cv.priceDiv || 1;
      const o = parseFloat(r.openPrice) / div;
      const c = parseFloat(r.closePrice) / div;
      if (!isNaN(o) && !isNaN(c) && c !== 0) {
        let pts = 0;
        if (r.direction === '多') pts = c - o;
        else if (r.direction === '空') pts = o - c;
        r.profitPts = pts > 0 ? '+' + pts.toFixed(2) : pts.toFixed(2);

        // 盈亏金额 = 点数 × unit × 汇率，转人民币
        if (cv.unit) {
          const amount = pts * cv.unit * cv.rate;
          r.profitAmt = amount > 0 ? '+¥' + amount.toFixed(0) : '¥' + amount.toFixed(0);
        } else {
          // 未知品种：标记点数但无法算金额
          r.profitAmt = '未知品种';
        }
      }
    }
    return r;
  });
  
  // --- 服务端日期过滤（真正按开仓时间过滤，ASP的pt参数无效，改用Node.js过滤） ---
  // 标准化日期：统一成 YYYY-MM-DD 格式再比较（处理 ASP 返回的 2026/4/17 和前端传来的 2026-04-17）
  function normDate(str) {
    // 输入如 "2026/4/17" 或 "2026/04/17" → 输出 "2026-04-17"
    const parts = str.split('/');
    return parts[0] + '-' + String(parts[1]).padStart(2, '0') + '-' + String(parts[2]).padStart(2, '0');
  }
  let filtered = merged;
  if (filters) {
    if (filters.pt || filters.et) {
      const fPt = filters.pt ? normDate(filters.pt) : null;
      const fEt = filters.et ? normDate(filters.et) : null;
      filtered = merged.filter(row => {
        const d = normDate(row.openTime.split(' ')[0]);
        if (fPt && d < fPt) return false;
        if (fEt && d > fEt) return false;
        return true;
      });
      log('info', `Date filter: ${fPt || '*'} ~ ${fEt || '*'} → ${filtered.length} rows (from ${merged.length})`);
    }
  }

  return { rows: filtered, totalRows: filtered.length, mode: 'merged' };
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
      res.end(JSON.stringify({ loggedIn: !!(roomCookie || loginCookie), appReady: appLoggedIn }));
      return;
    }
    if (urlPath === '/teachers') {
      res.writeHead(200, {'Content-Type':'application/json'});
      res.end(JSON.stringify(TEACHERS));
      return;
    }

    // POST /unlock — 独立密码验证（不调ASP，纯本地比对）
    if (urlPath === '/unlock' && req.method === 'POST') {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body || '{}');
          if (data.password === APP_PASS) {
            appLoggedIn = true;
            loginTime = Date.now();
            log('info', 'App unlocked via /unlock');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: '密码错误' }));
          }
        } catch(e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: '请求格式错误' }));
        }
      });
      return;
    }
    // GET /lock — 锁屏
    if (urlPath === '/lock' && req.method === 'GET') {
      appLoggedIn = false;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    // POST /login
    if (urlPath === '/login') {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body || '{}');
          // 应用层密码验证（支持两种方式：传正确密码 或 已验证状态）
          if (data.appPass !== APP_PASS && !appLoggedIn) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, appError: true, error: '密码错误，请重新输入' }));
            return;
          }
          // 密码正确或已验证，标记为已验证
          appLoggedIn = true;
          // 如果之前已有有效 session，跳过 ASP 登录（避免重复连接）
          if (roomCookie && loginCookie) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, room: true, user: true, skipAsp: true }));
            return;
          }
          // 否则尝试 ASP 登录
          try {
            const ok = await login(data.password || '881199', data.phone, data.pass);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok, room: !!roomCookie, user: !!loginCookie }));
          } catch(e) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, aspError: true, error: e.message }));
          }
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
          if (!appLoggedIn) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, authError: true, error: '请先验证应用密码' }));
            return;
          }
          if (!roomCookie) throw new Error('Not logged in. POST /login first.');
          const opts = JSON.parse(body || '{}');
          const { mode = 'merged' } = opts;
          
          // 缓存检查：5分钟内相同请求直接返回
          const maxPages = Math.min(opts.pages || 8, 50);
          const cacheKey = `${mode}|${maxPages}|${JSON.stringify(opts.filters || {})}`;
          if (cachedFetch && cachedFetch.key === cacheKey && Date.now() - cachedFetch.ts < CACHE_TTL) {
            log('info', 'Cache hit (' + Math.round((CACHE_TTL - (Date.now() - cachedFetch.ts)) / 1000) + 's left)');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, mode, ...cachedFetch.data, cached: true }));
            return;
          }
          
          let result;
          if (mode === 'merged') {
            result = await fetchMerged(opts.filters || {}, maxPages);
          } else if (mode === 'pc') {
            result = await fetchPages(maxPages, BASE + '/generalmodule/shouted/_Data_Ping_Show.asp', parsePCPage, opts.filters || {});
          } else {
            result = await fetchPages(maxPages, BASE + '/generalmodule/shouted/_data_start_show.asp', parseJCPage, opts.filters || {});
          }
          
          // 存缓存
          cachedFetch = { key: cacheKey, data: result, ts: Date.now() };
          
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
