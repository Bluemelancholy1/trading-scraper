// Vercel Serverless API - 大粤K线数据抓取
const https = require('https');
const { URL } = require('url');
const querystring = require('querystring');

const ROOM_ID = 7000;
const BASE = 'https://nbqh.lulutong.club';
const APP_PASS = process.env.APP_PASS || '881199';

const TEACHERS = {
  4421:'大元老师', 4767:'青松老师', 3814:'山野老师',
  3154:'羽木老师',  4732:'安然老师', 4460:'泰山老师',
  3153:'大元老师', 3155:'夏美老师',
};

const CONTRACTS = {
  '小纳指': { unit: 20,  unitCcy: 'USD', rate: 7.98, priceDiv: 1 },
  '微纳指': { unit: 2,   unitCcy: 'USD', rate: 7.98, priceDiv: 1 },
  '恒指':   { unit: 50,  unitCcy: 'HKD', rate: 1.00, priceDiv: 1 },
  '美原油': { unit: 10,  unitCcy: 'USD', rate: 7.98, priceDiv: 1 },
  '美黄金': { unit: 100, unitCcy: 'USD', rate: 7.98, priceDiv: 1 },
  '黄金':   { unit: 10,  unitCcy: 'CNY', rate: 7.98, priceDiv: 1 },
};

// 内存缓存
let cachedFetch = null;
const CACHE_TTL = 5 * 60 * 1000;

function httpReq(targetUrl, method, postData, extraHeaders) {
  return new Promise((resolve, reject) => {
    try {
      const pu = new URL(targetUrl);
      const opt = { 
        hostname: pu.hostname, 
        port: pu.port || 443,
        path: pu.pathname + pu.search, 
        method: method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': '*/*', 
          'Accept-Language': 'zh-CN',
          ...(extraHeaders || {}),
        },
        timeout: 25000 
      };
      const req = https.request(opt, res => {
        const sc = res.headers['set-cookie'];
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve({ status: res.statusCode, body: data, cookies: sc }));
      });
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.on('error', e => reject(e));
      if (postData) req.write(postData);
      req.end();
    } catch(e) { reject(e); }
  });
}

async function login(password, phone, pass) {
  try {
    await httpReq(BASE + '/');
    await httpReq(BASE + '/Handle/CheckRoomPass.asp?ac=CheckRoomPass&RID=' + ROOM_ID + '&P=' + encodeURIComponent(password));
    if (phone && pass) {
      const pd = querystring.stringify({Method:'Login',UserMail:'',usertel:phone,UserPass:pass,_AutoLogin:'1',GoUrl:''});
      await httpReq(BASE + '/handle/qlogin/', 'POST', pd, {
        'Content-Type':'application/x-www-form-urlencoded',
        'Origin':BASE,
        'Content-Length':Buffer.byteLength(pd),
      });
    }
    return true;
  } catch(e) {
    return false;
  }
}

function parseJCPage(html) {
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

function parsePCPage(html) {
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
    if (d10) {
      const v = d10[0].match(/value="([^"]*)"/);
      if (v) closePrice = v[1].trim();
    }
    
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

async function fetchPage(page, url, parser, filters) {
  const params = new URLSearchParams({ roomid: String(ROOM_ID), page: String(page) });
  if (filters) {
    if (filters.pt) params.set('pt', filters.pt);
    if (filters.et) params.set('et', filters.et);
  }
  const fullUrl = url + (url.includes('?') ? '&' : '?') + params.toString();
  const resp = await httpReq(fullUrl, 'GET');
  if (resp.status !== 200) throw new Error('HTTP ' + resp.status);
  const rows = parser(resp.body);
  return { rows, totalRows: extractTotal(resp.body) };
}

async function fetchPages(maxPages, url, parser, filters) {
  const allRows = [];
  let totalRows = 0;
  for (let p = 1; p <= maxPages; p++) {
    try {
      const r = await fetchPage(p, url, parser, filters);
      allRows.push(...r.rows);
      totalRows = r.totalRows;
      if (r.rows.length < 10) break;
    } catch(e) { break; }
  }
  return { rows: allRows, totalRows };
}

async function fetchMerged(filters, maxPages) {
  maxPages = maxPages || 8;
  const jcR = await fetchPages(maxPages, BASE + '/generalmodule/shouted/_data_start_show.asp', parseJCPage, filters);
  const pcR = await fetchPages(maxPages, BASE + '/generalmodule/shouted/_Data_Ping_Show.asp', parsePCPage, filters);
  
  const jcMap = {};
  jcR.rows.forEach(r => {
    const timeKey = r.product + '|' + r.direction + '|' + r.teacher + '|' + r.openTime;
    const priceKey = r.product + '|' + r.direction + '|' + r.teacher + '|' + r.openPrice;
    if (!jcMap[timeKey]) jcMap[timeKey] = r;
    if (!jcMap[priceKey]) jcMap[priceKey] = r;
  });
  
  const merged = pcR.rows.map(r => {
    let key = r.product + '|' + r.direction + '|' + r.teacher + '|' + r.openTime;
    let jc = jcMap[key];
    if (!jc) {
      key = r.product + '|' + r.direction + '|' + r.teacher + '|' + r.openPrice;
      jc = jcMap[key];
    }
    if (!jc) {
      key = r.product + '|' + r.direction + '|' + r.teacher;
      jc = jcMap[Object.keys(jcMap).find(k => k.startsWith(key))];
    }
    if (jc) {
      r.stopLoss = jc.stopLoss;
      r.takeProfit = jc.takeProfit;
    }
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
        if (cv.unit) {
          const amount = pts * cv.unit * cv.rate;
          r.profitAmt = amount > 0 ? '+¥' + amount.toFixed(0) : '¥' + amount.toFixed(0);
        } else {
          r.profitAmt = '未知品种';
        }
      }
    }
    return r;
  });
  
  let filtered = merged;
  if (filters && (filters.pt || filters.et)) {
    function normDate(str) {
      const parts = str.split('/');
      return parts[0] + '-' + String(parts[1]).padStart(2, '0') + '-' + String(parts[2]).padStart(2, '0');
    }
    const fPt = filters.pt ? normDate(filters.pt) : null;
    const fEt = filters.et ? normDate(filters.et) : null;
    filtered = merged.filter(row => {
      const d = normDate(row.openTime.split(' ')[0]);
      if (fPt && d < fPt) return false;
      if (fEt && d > fEt) return false;
      return true;
    });
  }
  return { rows: filtered, totalRows: filtered.length, mode: 'merged' };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  
  const url = req.url || '/';
  
  if (url === '/status' || url === '/api/status') {
    return res.json({ loggedIn: true, appReady: true });
  }
  
  if (url === '/teachers' || url === '/api/teachers') {
    return res.json(TEACHERS);
  }
  
  if ((url === '/fetch' || url === '/api/fetch') && req.method === 'POST') {
    try {
      const opts = req.body || {};
      const { mode = 'merged' } = opts;
      const maxPages = Math.min(opts.pages || 8, 50);
      
      const cacheKey = `${mode}|${maxPages}|${JSON.stringify(opts.filters || {})}`;
      if (cachedFetch && cachedFetch.key === cacheKey && Date.now() - cachedFetch.ts < CACHE_TTL) {
        return res.json({ ok: true, mode, ...cachedFetch.data, cached: true });
      }
      
      let result;
      if (mode === 'merged') {
        result = await fetchMerged(opts.filters || {}, maxPages);
      } else if (mode === 'pc') {
        result = await fetchPages(maxPages, BASE + '/generalmodule/shouted/_Data_Ping_Show.asp', parsePCPage, opts.filters || {});
      } else {
        result = await fetchPages(maxPages, BASE + '/generalmodule/shouted/_data_start_show.asp', parseJCPage, opts.filters || {});
      }
      
      cachedFetch = { key: cacheKey, data: result, ts: Date.now() };
      return res.json({ ok: true, mode, ...result });
    } catch(e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
  
  if ((url === '/unlock' || url === '/api/unlock') && req.method === 'POST') {
    const data = req.body || {};
    if (data.password === APP_PASS) {
      return res.json({ ok: true });
    }
    return res.json({ ok: false, error: '密码错误' });
  }
  
  if ((url === '/lock' || url === '/api/lock') && req.method === 'GET') {
    return res.json({ ok: true });
  }
  
  res.status(404).json({ error: 'Not found' });
};
