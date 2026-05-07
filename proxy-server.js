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
const BASE = 'https://qh.yemacaijing.net';
let APP_PASS = '135917';  // 应用访问密码（解锁用，2026-04-29更新）

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
  '美黄金': { unit: 10,  unitCcy: 'USD', rate: 7.98, priceDiv: 1   },  // $100/整点
  '黄金':   { unit: 10,  unitCcy: 'CNY', rate: 7.98, priceDiv: 1   },  // ¥10/整点
  '小道指': { unit: 10, unitCcy: 'USD', rate: 7.98, priceDiv: 1   },  // 小道琼斯指数，$10/整点
  '美精铜': { unit: 10, unitCcy: 'USD', rate: 7.98, priceDiv: 100 },  // 美铜，美分/磅，除100转为美元
  '德指':   { unit: 25, unitCcy: 'EUR', rate: 9.10, priceDiv: 1   },  // 德国DAX，€25/点
  '小德指': { unit: 5,  unitCcy: 'EUR', rate: 9.10, priceDiv: 1   },  // 小德指，€5/点
};

// 陈少浏览器真实请求头（2026-05-06 从浏览器Network面板复制cURL获得）
// 这是能让服务器放行的关键组合
const BROWSER_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'Cookie': 'Guest_Name=4ufwU803; ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; bg_img=images%2Fbg%2F23.jpg; ASPSESSIONIDAATQDADR=DAFBHNOBDOCEGDDAHKKOKCND',
  'Pragma': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0',
  'sec-ch-ua': '"Chromium";v="146", "Not-A.Brand";v="24", "Microsoft Edge";v="146"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
};

let aspSession = '';  // will be set by ASP login flow
let loginCookie = 'ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true';  // ishow from browser
let guestCookie = 'Guest_Name=4ufwU803';  // Guest_Name from browser
let appLoggedIn = false;   // 默认未登录，输入正确密码后解锁
const LOGIN_PASSWORD = '135917';  // ASP网站登录密码（陈少账号）
let loginTime = 0;

// 内存缓存：避免短时间内重复抓取
let cachedFetch = null;   // { key, data, ts }
const CACHE_TTL = 5 * 60 * 1000;  // 5分钟缓存

// === 远程配置 ===
const CONFIG_URL = 'https://raw.githubusercontent.com/Bluemelancholy1/trading-scraper/main/remote-config.json';
const APP_VERSION = require('./package.json').version;
let remoteConfig = { enabled: true, password: '', latestVersion: '', updateUrl: '', message: '' };
let configLoaded = false;

function loadRemoteConfig() {
  log('info', 'Loading remote config...');
  httpReq(CONFIG_URL, 'GET', null, { 'Cache-Control': 'no-cache' })
    .then(resp => {
      if (resp.status === 200) {
        try {
          const cfg = JSON.parse(resp.body);
          remoteConfig = { ...remoteConfig, ...cfg };
          configLoaded = true;
          // 用远程密码覆盖本地密码（如果远程配置了）
          if (cfg.password) APP_PASS = cfg.password;
          log('ok', 'Remote config loaded: enabled=' + cfg.enabled + ', password=' + (cfg.password ? '***' : 'use default'));
        } catch(e) {
          log('warn', 'Remote config parse error');
        }
      }
    })
    .catch(e => {
      log('warn', 'Remote config fetch failed: ' + e.message + ' (will use defaults)');
    });
}

// 每30分钟刷新一次远程配置
function startConfigPolling() {
  loadRemoteConfig(); // 启动时立即加载
  setInterval(loadRemoteConfig, 30 * 60 * 1000);
}

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
      const isTargetHost = pu.hostname === 'qh.yemacaijing.net';
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*', 'Accept-Language': 'zh-CN',
        ...(extraHeaders || {}),
      };
      const opt = { hostname: pu.hostname, port: pu.port || 443,
        path: pu.pathname + pu.search, method: method || 'GET',
        headers, timeout: 25000,
        // 该站点证书域名不匹配，忽略校验
        ...(isTargetHost ? { rejectUnauthorized: false } : {}),
      };
      const req = lib.request(opt, res => {
        const sc = res.headers['set-cookie'];
        if (sc) {
          for (const c of sc) {
            const val = c.split(';')[0];
            if (val.includes('ASPSESSIONID')) aspSession = val;
            else if (val.includes('ishow')) loginCookie = val;
          }
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

// 用陈少浏览器的完整请求头发请求（绕过CDN/WAF安全检测，2026-05-06）
function httpReqBrowser(targetUrl, method, extraHeaders) {
  return new Promise((resolve, reject) => {
    try {
      const pu = new URL(targetUrl);
      const lib = pu.protocol === 'https:' ? https : http;
      const headers = {
        ...BROWSER_HEADERS,
        ...(extraHeaders || {}),
      };
      const opt = {
        hostname: pu.hostname, port: pu.port || 443,
        path: pu.pathname + pu.search, method: method || 'GET',
        headers, timeout: 25000,
        rejectUnauthorized: false,
      };
      const req = lib.request(opt, res => {
        // 自动捕获 Set-Cookie 并更新 BROWSER_HEADERS（保持 session 新鲜）
        const sc = res.headers['set-cookie'];
        if (sc) {
          for (const c of sc) {
            const val = c.split(';')[0];
            if (val.includes('ASPSESSIONID')) {
              const parts = (BROWSER_HEADERS['Cookie'] || '').split(';').map(s => s.trim()).filter(Boolean);
              const updated = parts.filter(p => !p.startsWith('ASPSESSIONID'));
              updated.push(val);
              BROWSER_HEADERS['Cookie'] = updated.join('; ');
              log('info', 'Session refreshed: ' + val);
            }
          }
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
      req.connectTimer = setTimeout(() => { req.destroy(); reject(new Error('connect_timeout')); }, 8000);
      req.end();
    } catch(e) { reject(e); }
  });
}

function getFullCookie() {
  return [aspSession, loginCookie].filter(Boolean).join('; ');
}

// --- 登录 ---
async function login(password, phone, pass) {
  try {
    // Step 1: Get initial ASP session
    await httpReq(BASE + '/', 'GET', null, {});
    log('info', 'ASP session: ' + (aspSession ? 'YES' : 'NO'));
    // Step 2: Verify room password (must carry same session)
    await httpReq(BASE + '/Handle/CheckRoomPass.asp?ac=CheckRoomPass&RID=' + ROOM_ID + '&P=' + encodeURIComponent(password), 'GET', null, {
      'Cookie': getFullCookie(),
    });
    log('info', 'Room cookie: ' + (aspSession ? 'YES' : 'NO'));
    if (phone && pass) {
      const pd = querystring.stringify({Method:'Login',UserMail:'',usertel:phone,UserPass:pass,_AutoLogin:'1',GoUrl:''});
      await httpReq(BASE + '/handle/qlogin/', 'POST', pd, {
        'Content-Type':'application/x-www-form-urlencoded','Origin':BASE,'Content-Length':Buffer.byteLength(pd),
        'Cookie': getFullCookie(),
      });
      log('info', 'Login cookie: ' + (loginCookie ? 'YES' : 'NO'));
    }
    loginTime = Date.now();
    log('ok', 'LOGIN OK room=' + !!aspSession + ' user=' + !!loginCookie);
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

// --- 解析平仓完整数据（含止损止盈，2026-05-06 新路径）---
// URL: /generalmodule/shouted/_Data_End_Show.asp
// 字段：data2开仓时间, data3方向, data5商品, data6开仓点位, data7止损, data8止盈, data9平仓时间, data10平仓点位, data12老师
function parseEndPage(html) {
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
    const stopLoss  = get(/class="data7"[^>]*title="([^"]+)"/).replace(/\u00a0/g, ' ');
    const takeProfit = get(/class="data8"[^>]*title="([^"]+)"/).replace(/\u00a0/g, ' ');
    const closeTime = get(/class="data9"[^>]*title="([^"]+)"/);
    // data10可能是input或span
    let closePrice = get(/class="data10"[^>]*title="([^"]+)"/);
    if (!closePrice) {
      const d10 = li.match(/class="data10"[\s\S]*?<\/span>/);
      if (d10) { const v = d10[0].match(/value="([^"]*)"/); closePrice = v ? v[1].trim() : ''; }
    }
    const teacher   = get(/class="data12"[^>]*title="([^"]+)"/);
    const profitPtsRaw = get(/class="data11"[^>]*title="([^"]+)"/); // 老师填写的获利点数
    
    // 智能拆分拼接的开仓价
    let openPrice = rawOpen;
    const rawNum = rawOpen.replace(/\D/g, '');
    if (rawNum.length >= 8 && rawNum.length <= 14) {
      openPrice = rawNum.substring(0, Math.ceil(rawNum.length / 2));
    }
    
    const isClosed = !!(closePrice && closePrice !== '0');
    // 用老师填的获利点数，如果为空或0则自己算
    let profitPts = '';
    if (profitPtsRaw && profitPtsRaw !== '0') {
      profitPts = profitPtsRaw;
    } else if (isClosed && openPrice && closePrice) {
      const op = parseFloat(openPrice);
      const cp = parseFloat(closePrice);
      if (!isNaN(op) && !isNaN(cp) && op > 0 && cp > 0) {
        const diff = direction === '多' ? (cp - op) : (op - cp);
        profitPts = diff.toFixed(2);
      }
    }
    
    // 调试：输出恒指记录
    if (product && product.includes('恒')) {
      log('info', 'PARSE HSI: product=' + product + ' rawOpen=' + rawOpen + ' profitPtsRaw=' + JSON.stringify(profitPtsRaw) + ' closePrice=' + closePrice + ' final profitPts=' + profitPts);
    }
    
    if (openPrice && direction) {
      rows.push({
        openTime, direction, product, openPrice,
        stopLoss: stopLoss || '',
        takeProfit: takeProfit || '',
        closeTime: closeTime || '', closePrice: closePrice || '',
        profitPts: profitPts, teacher: teacher || '',
        source: 'end', isClosed,
      });
    }
  }
  return rows;
}

// --- 解析平仓提醒（平仓点位数据源，2026-05-06 新路径适配） ---
function parsePCPage(html) {
  const rows = []
  const re = /<li>([\s\S]*?)<\/li>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const li = m[1];
    const get = re2 => { const r = li.match(re2); return r ? r[1].trim() : '' };
    
    // 新路径字段映射（/generalmodule/shouted/_Data_Ping_Show.asp）
    // data2=开仓时间, data3=类型, data5=商品, data6=开仓点位
    // data9=平仓时间, data10=平仓点位(input), data12=老师
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
    
    // 智能拆分拼接的开仓价
    let openPrice = rawOpen;
    const rawNum = rawOpen.replace(/\D/g, '');
    if (rawNum.length >= 8 && rawNum.length <= 14) {
      openPrice = rawNum.substring(0, Math.ceil(rawNum.length / 2));
    }
    
    if (openPrice && direction) {
      rows.push({
        openTime, direction, product, openPrice,
        stopLoss: '',  // 新路径无止损止盈字段
        takeProfit: '',
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

// --- 用浏览器请求头抓取单页数据（绕过CDN/WAF安全检测，2026-05-06）---
async function fetchPageBrowser(page, url, parser, filters) {
  const params = new URLSearchParams({ roomid: String(ROOM_ID), page: String(page) });
  if (filters) {
    if (filters.pt) params.set('pt', filters.pt);
    if (filters.et) params.set('et', filters.et);
  }
  const fullUrl = url + (url.includes('?') ? '&' : '?') + params.toString();
  log('data', 'GET: ' + fullUrl.replace(BASE, ''));
  const resp = await httpReqBrowser(fullUrl, 'GET');
  if (resp.status !== 200) throw new Error('HTTP ' + resp.status + ': ' + resp.body.substring(0, 100));
  const rows = parser(resp.body);
  return { rows, totalRows: extractTotal(resp.body) };
}

// --- 抓取多页数据（浏览器请求头）---
async function fetchPagesBrowser(maxPages, url, parser, filters) {
  log('info', 'fetchPagesBrowser called with url=' + url + ' parser=' + (parser.name || 'anonymous'));
  const allRows = [];
  let totalRows = 0;
  for (let p = 1; p <= maxPages; p++) {
    try {
      const r = await fetchPageBrowser(p, url, parser, filters);
      allRows.push(...r.rows);
      totalRows = r.totalRows;
      if (p === 1) log('ok', url.includes('start') ? 'JC' : 'PC' + ' total=' + totalRows);
      if (r.rows.length < 10) break;
    } catch(e) {
      log('warn', 'Page ' + p + ' error: ' + e.message);
      break;
    }
  }
  return { rows: allRows, totalRows };
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

// --- 解析平仓结算页（完整13列，含止损止盈，2026-05-05新增）---
// --- 用浏览器请求头抓取多页（绕过CDN/WAF安全检测，2026-05-06突破）---
async function fetchWithBrowserHeaders(maxPages) {
  // 平仓提醒页（新路径，有平仓时间/点位/获利，无止损止盈）
  const pcUrl = BASE + '/generalmodule/shouted/_Data_Ping_Show.asp';
  const result = await fetchPagesBrowser(maxPages, pcUrl, parsePCPage, null);
  return result.rows;
}

// Normalize timestamp to minute precision for fuzzy matching
function tsMinute(str) {
  // "2026/5/6 13:04:55" -> "2026/5/6 13:04" (drop seconds)
  return str.substring(0, str.lastIndexOf(':'));
}

// fuzzy product name matching (some pages use "原油" instead of "美原油" etc.)
const PRODUCT_ALIASES = {
  '原油': '美原油',
  '小道指': '小纳指',  // may appear as alias
  '黄金': '美黄金',
};
function normProduct(p) { return PRODUCT_ALIASES[p] || p; }

// --- 合并模式：建仓(止损止盈) + 平仓(平仓点位) ---
// 合并策略：两边数据按"开仓时间(±2分钟) + 商品 + 方向"模糊匹配
async function fetchMerged(filters, maxPages) {
  // 合并模式默认抓更多页（覆盖更长历史，确保有时间重叠）
  maxPages = maxPages || 10;
  
  const jcUrl = BASE + '/generalmodule/shouted/_data_start_show.asp';
  const pcUrl = BASE + '/generalmodule/shouted/_Data_Ping_Show.asp';
  
  let jcRows = [], pcRows = [], totalRows = 0;
  try {
    const jcResult = await fetchPagesBrowser(maxPages, jcUrl, parseJCPage, filters);
    jcRows = jcResult.rows;
    log('ok', 'JC rows=' + jcRows.length);
  } catch(e) {
    log('warn', 'JC fetch failed: ' + e.message);
  }
  try {
    const pcResult = await fetchPagesBrowser(maxPages, pcUrl, parsePCPage, filters);
    pcRows = pcResult.rows;
    totalRows = pcResult.totalRows;
    log('ok', 'PC rows=' + pcRows.length + ' total=' + totalRows);
  } catch(e) {
    log('warn', 'PC fetch failed: ' + e.message);
  }

  // Merge: for each PC row, find JC match by product+direction+time window (±10min)
  // JC rows stored with their original Date for precise time comparison
  const jcWithDate = jcRows.map(r => ({ ...r, _date: new Date(r.openTime) }));
  const merged = [];
  let matched = 0, unmatched = 0;
  
  for (const pr of pcRows) {
    const prDate = new Date(pr.openTime);
    const prProd = normProduct(pr.product);
    
    // Find closest JC record within ±10 minutes, same product+direction
    let best = null, bestDiff = Infinity;
    for (const jc of jcWithDate) {
      if (normProduct(jc.product) !== prProd) continue;
      if (jc.direction !== pr.direction) continue;
      const diff = Math.abs(prDate - jc._date);
      if (diff < bestDiff && diff <= 10 * 60 * 1000) { // within 10 minutes
        bestDiff = diff;
        best = jc;
      }
    }
    
    if (best) {
      pr.stopLoss = best.stopLoss;
      pr.takeProfit = best.takeProfit;
      matched++;
    } else {
      unmatched++;
    }
    merged.push(pr);
  }

  // Mark closed JC records (those with a PC match within ±10min)
  const closedSet = new Set();
  for (const pr of pcRows) {
    const prDate = new Date(pr.openTime);
    const prProd = normProduct(pr.product);
    for (const jc of jcWithDate) {
      if (normProduct(jc.product) !== prProd) continue;
      if (jc.direction !== pr.direction) continue;
      if (Math.abs(prDate - jc._date) <= 10 * 60 * 1000) {
        closedSet.add(jc.openTime + '|' + jc.product + '|' + jc.direction);
      }
    }
  }
  
  // Append unclosed JC records (no PC match within ±10min)
  for (const jc of jcWithDate) {
    const key = jc.openTime + '|' + jc.product + '|' + jc.direction;
    if (!closedSet.has(key)) {
      merged.push({
        ...jc,
        _date: undefined,
        isClosed: false,
        closeTime: '',
        closePrice: '',
        profitPts: '持仓中',
        profitAmt: '—'
      });
    }
  }

  log('ok', 'Merged: ' + merged.length + ' rows (matched SL/TP=' + matched + ' unmatched=' + unmatched + ')');

  // 计算获利点数 & 盈亏金额
  for (const r of merged) {
    if (r.openPrice && r.closePrice && r.closePrice !== '0' && r.isClosed !== false) {
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
    } else {
      r.profitPts = r.profitPts || '持仓中';
      r.profitAmt = r.profitAmt || '—';
    }
  }

  // 服务端日期过滤（标准化 YYYY-MM-DD）
  function normDate(str) {
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
      log('info', 'Date filter: ' + (fPt||'*') + '~' + (fEt||'*') + ' => ' + filtered.length + ' rows');
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
      res.end(JSON.stringify({ loggedIn: !!(aspSession || loginCookie), appReady: appLoggedIn }));
      return;
    }
    if (urlPath === '/config') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        enabled: remoteConfig.enabled,
        latestVersion: remoteConfig.latestVersion,
        currentVersion: APP_VERSION,
        updateUrl: remoteConfig.updateUrl,
        message: remoteConfig.message,
        configLoaded
      }));
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
          // 检查远程是否禁用
          if (configLoaded && !remoteConfig.enabled) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, disabled: true, error: '该应用已被停用，请联系管理员' }));
            return;
          }
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
      aspSession = '';
      loginCookie = '';
      loginTime = 0;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    // DEBUG: GET /pc_raw — 抓平仓页原始HTML（临时）
    if (urlPath === '/pc_raw' && req.method === 'GET') {
      if (!aspSession) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not logged in' }));
        return;
      }
      const pcUrl = BASE + '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1&pt=50';
      const hp = new URL(BASE); hp.pathname = '/generalmodule/shouted/_Data_Ping_Show.asp';
      const opts = { hostname: hp.hostname, port: hp.port || 443, path: '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1', method: 'GET', headers: { 'Cookie': aspSession, 'User-Agent': 'Mozilla/5.0' }, rejectUnauthorized: false };
      require('https').request(opts, res2 => {
        let d = '';
        res2.on('data', c => d += c);
        res2.on('end', () => {
          // 保存到文件
          require('fs').writeFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/pc_raw.html', d, 'utf8');
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Saved ' + d.length + ' bytes to pc_raw.html');
        });
      }).end();
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
          if (aspSession && loginCookie) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, room: true, user: true, skipAsp: true }));
            return;
          }
          // 否则尝试 ASP 登录
          try {
            const ok = await login(data.password || '881199', data.phone, data.pass);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok, room: !!aspSession, user: !!loginCookie }));
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
          if (configLoaded && !remoteConfig.enabled) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, disabled: true, error: '该应用已被停用' }));
            return;
          }
          if (!appLoggedIn) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, authError: true, error: '请先验证应用密码' }));
            return;
          }
          // 用浏览器请求头抓取（绕过CDN/WAF安全检测，2026-05-06突破）
          // 不再用Puppeteer，直接用陈少浏览器的完整请求头组合
          const opts = JSON.parse(body || '{}');
          
          // 确保 session 有效（过期自动续）
          await ensureSession();
          const { mode = 'merged' } = opts;
          const maxPages = Math.min(opts.pages || 8, 50);
          
          // 缓存检查：5分钟内相同请求直接返回
          const cacheKey = `${mode}|${maxPages}|${JSON.stringify(opts.filters || {})}`;
          if (cachedFetch && cachedFetch.key === cacheKey && Date.now() - cachedFetch.ts < CACHE_TTL) {
            log('info', 'Cache hit (' + Math.round((CACHE_TTL - (Date.now() - cachedFetch.ts)) / 1000) + 's left)');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, mode, ...cachedFetch.data, cached: true }));
            return;
          }
          
          let result;
          if (mode === 'merged') {
            // 直接用 /generalmodule/shouted/_Data_End_Show.asp（13字段含止损止盈）
            const endUrl = BASE + '/generalmodule/shouted/_Data_End_Show.asp';
            result = await fetchPagesBrowser(maxPages, endUrl, parseEndPage, opts.filters || {});
          } else if (mode === 'pc') {
            const pcUrl = BASE + '/generalmodule/shouted/_Data_Ping_Show.asp';
            result = await fetchPagesBrowser(maxPages, pcUrl, parsePCPage, opts.filters || {});
          } else {
            const jcUrl = BASE + '/generalmodule/shouted/_data_start_show.asp';
            result = await fetchPagesBrowser(maxPages, jcUrl, parseJCPage, opts.filters || {});
          }
          
          // 计算获利金额（profitPts 已在 parseEndPage 里设置）
          for (const r of result.rows) {
            if (r.product === '恒指' && r.openPrice === '26060') {
              log('info', 'DEBUG 恒指 26060: profitPts=' + JSON.stringify(r.profitPts) + ' closePrice=' + r.closePrice);
            }
            if (r.profitPts && r.profitPts !== '') {
              // 已有获利点数，直接算金额
              const c = CONTRACTS[r.product] || CONTRACTS['恒指'];
              const priceDiv = c.priceDiv || 1;
              const unit = c.unit || 1;
              const rate = c.rate || 1;
              const profitAmt = parseFloat(r.profitPts) / priceDiv * unit * rate;
              r.profitAmt = profitAmt.toFixed(2);
            } else if (r.closePrice && r.closePrice !== '0' && r.openPrice) {
              // 没有获利点数，自己算
              const op = parseFloat(r.openPrice);
              const cp = parseFloat(r.closePrice);
              if (!isNaN(op) && !isNaN(cp) && op > 0 && cp > 0) {
                const diff = r.direction === '多' ? (cp - op) : (op - cp);
                r.profitPts = diff.toFixed(2);
                const c = CONTRACTS[r.product] || CONTRACTS['恒指'];
                const priceDiv = c.priceDiv || 1;
                const unit = c.unit || 1;
                const rate = c.rate || 1;
                const profitAmt = diff / priceDiv * unit * rate;
                r.profitAmt = profitAmt.toFixed(2);
              }
            }
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

// === 自动刷新 ASP Session（2026-05-07 新增，解决 session 过期问题）===
let lastSessionRefresh = 0;
const SESSION_TTL = 20 * 60 * 1000; // 20分钟刷新一次

async function refreshSession() {
  try {
    log('info', 'Refreshing ASP session...');
    const resp = await httpReqBrowser(BASE + '/', 'GET');
    lastSessionRefresh = Date.now();
    log('ok', 'Session refreshed (status=' + resp.status + ', size=' + resp.body.length + ')');
    return true;
  } catch(e) {
    log('warn', 'Session refresh failed: ' + e.message);
    return false;
  }
}

// 主动刷新（在 /fetch 前检查，过期自动续）
async function ensureSession() {
  if (Date.now() - lastSessionRefresh > SESSION_TTL) {
    await refreshSession();
  }
}

server.listen(PORT, '0.0.0.0', async () => {
  log('ok', `Server v3 started on http://localhost:${PORT}`);
  log('info', `App version: ${APP_VERSION}`);
  log('info', `Remote config: ${CONFIG_URL}`);
  startConfigPolling();
  // 启动时自动刷新 session（ishow 带 iAutoLogin=true 会触发服务端自动登录）
  await refreshSession();
  // 每20分钟自动刷新
  setInterval(refreshSession, SESSION_TTL);
});

process.on('uncaughtException', e => { log('err', 'FATAL: ' + e.message); process.exit(1); });
process.on('unhandledRejection', e => { log('err', 'REJECTION: ' + (e && e.message ? e.message : String(e))); });
