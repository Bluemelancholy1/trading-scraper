const API = '';  // 同源代理（Electron proxy-server.js）
const ROOM_ID = 7000;

const TEACHERS = {
  4421:'大元老师', 4767:'青松老师', 3814:'山野老师',
  3154:'羽木老师', 4732:'安然老师', 4460:'泰山老师',
  3153:'大元老师', 3155:'夏美老师',
};

// 品种合约配置（与 proxy-server.js 保持一致，用于前端重算盈亏）
const CONTRACTS = {
  '小纳指': { unit: 20,  unitCcy: 'USD', rate: 7.98, priceDiv: 1    },
  '微纳指': { unit: 2,   unitCcy: 'USD', rate: 7.98, priceDiv: 1    },
  '恒指':   { unit: 50,  unitCcy: 'HKD', rate: 1.00, priceDiv: 1    },
  '美原油': { unit: 10,  unitCcy: 'USD', rate: 7.98, priceDiv: 1    },
  '美黄金': { unit: 10,  unitCcy: 'USD', rate: 7.98, priceDiv: 1    },
  '黄金':   { unit: 10,  unitCcy: 'CNY', rate: 7.98, priceDiv: 1    },
  '小道指': { unit: 10,  unitCcy: 'USD', rate: 7.98, priceDiv: 1    },
  '美精铜': { unit: 12.5,unitCcy: 'USD', rate: 7.98, priceDiv: 1    },
  '德指':   { unit: 25,  unitCcy: 'EUR', rate: 9.10, priceDiv: 1    },
  '小德指': { unit: 5,   unitCcy: 'EUR', rate: 9.10, priceDiv: 1    },
};

const COLS = [
  {key:'openTime',  label:'开仓时间',  w:'160'},
  {key:'direction', label:'方向',      w:'55'},
  {key:'product',   label:'商品',      w:'100'},
  {key:'openPrice', label:'开仓点位',  w:'100'},
  {key:'stopLoss',  label:'止损',     w:'100', cls:'sl'},
  {key:'takeProfit',label:'止盈',     w:'130', cls:'tp'},
  {key:'closeTime', label:'平仓时间',  w:'160'},
  {key:'closePrice',label:'平仓点位',  w:'100'},
  {key:'profitPts', label:'获利点数',  w:'90',  cls:'profit'},
  {key:'profitAmt', label:'盈亏金额',  w:'90',  cls:'profit'},
  {key:'teacher',   label:'老师',      w:'90'},
  {key:'status',    label:'状态',      w:'70'},
];

// State
let allRows = [];
let filteredRows = [];
let page = 1;
const PAGE_SIZE = 20;
let currentMode = 'merged';
let isFetching = false;

// === API helper ===
async function api(path, method, body) {
  const r = await fetch(API + path, {
    method: method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
}

// === Render head ===
function renderHead() {
  document.getElementById('tableHead').innerHTML = '<tr>' + COLS.map(c =>
    `<th style="width:${c.w}px">${c.label}</th>`
  ).join('') + '</tr>';
}

// === Render table body ===
function renderTable(rows) {
  const start = (page - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);
  document.getElementById('tableBody').innerHTML = pageRows.map((row, i) => {
    const bg = i % 2 === 0 ? '' : 'style="background:#1c1f2d"';
    return '<tr ' + bg + '>' + COLS.map(c => {
      let val = row[c.key] !== undefined ? row[c.key] : '';
      const cls = c.cls || '';
      const title = val ? ` title="${val}"` : '';
      if (c.key === 'direction') return `<td><span class="dir ${val}">${val}</span></td>`;
      if (c.key === 'openPrice' || c.key === 'closePrice') {
        const edited = row['_edited_' + c.key];
        return `<td><div class="price-cell"><span class="price">${val}</span>${edited ? '<span class="edited-tag">已改</span>' : ''}<button class="edit-btn" onclick="openEditModal(${start+i},'${c.key}')" title="修改点位">✏️</button></div></td>`;
      }
      if (c.key === 'stopLoss' || c.key === 'takeProfit') {
        return `<td><span class="price${cls?' '+cls:''}">${val}</span></td>`;
      }
      if (c.key === 'profitPts') {
        const edited = row['_orig_profitPts'];
        const p = parseFloat(val);
        const cls = isNaN(p) ? '' : (p > 0 ? 'pos' : p < 0 ? 'neg' : '');
        return `<td><div class="price-cell"><span class="profit ${cls}">${val}</span>${edited ? '<span class="edited-tag">已改</span>' : ''}<button class="edit-btn" onclick="openEditModal(${start+i},'${c.key}')" title="修改">✏️</button></div></td>`;
      }
      if (c.key === 'profitAmt') {
        const edited = row['_orig_profitAmt'];
        const p = parseFloat(val.replace('¥','').replace('+',''));
        const cls = isNaN(p) ? '' : (p > 0 ? 'pos' : p < 0 ? 'neg' : '');
        return `<td><div class="price-cell"><span class="profit ${cls}">${val}</span>${edited ? '<span class="edited-tag">已改</span>' : ''}</div></td>`;
      }
      if (c.key === 'teacher') return `<td><span class="teacher-tag">${val}</span></td>`;
      if (c.key === 'status') {
        return row.isClosed
          ? `<td><span class="closed-badge">已平仓</span></td>`
          : `<td><span class="open-badge">未平仓</span></td>`;
      }
      return `<td${title} style="max-width:${c.w}px;overflow:hidden;text-overflow:ellipsis">${val}</td>`;
    }).join('') + '</tr>';
  }).join('');
  document.getElementById('tableInfo').textContent =
    `共 ${rows.length} 条 | 第 ${Math.min(start+1,rows.length)}-${Math.min(start+PAGE_SIZE,rows.length)} 条`;
}

// === Stats ===
function updateStats(rows) {
  document.getElementById('statTotal').textContent = rows.length;
  document.getElementById('statPage').textContent = rows.length > 0
    ? `${(page-1)*PAGE_SIZE+1}-${Math.min(page*PAGE_SIZE,rows.length)}` : 0;
  const closed = rows.filter(r=>r.isClosed).length;
  document.getElementById('statClosed').textContent = closed;
  document.getElementById('statOpen').textContent = rows.length - closed;
  const profitRows = rows.filter(r=>r.profitPts && parseFloat(r.profitPts)>0);
  const lossRows   = rows.filter(r=>r.profitPts && parseFloat(r.profitPts)<0);
  document.getElementById('statProfit').textContent = profitRows.length;
  document.getElementById('statLoss').textContent   = lossRows.length;
}

// === Pager ===
function renderPager(rows) {
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const nums = document.getElementById('pageNums');
  let html = '';
  for (let p = Math.max(1,page-2); p <= Math.min(totalPages,page+2); p++) {
    html += `<button class="${p===page?'active':''}" onclick="goPage(${p})">${p}</button>`;
  }
  nums.innerHTML = html;
  document.getElementById('pageInfo').textContent = `第 ${page} / ${totalPages} 页`;
}

function goPage(p) {
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  page = Math.max(1, Math.min(p, totalPages));
  renderTable(filteredRows);
  renderPager(filteredRows);
}

// === Teacher Summary ===
function updateTeacherSummary(rows) {
  const map = {};
  rows.forEach(r => {
    if (!r.teacher) return;
    if (!map[r.teacher]) map[r.teacher] = {
      name:r.teacher, total:0, wins:0, losses:0, open:0, unknown:0,
      profitAmt:0, winAmt:0, lossAmt:0
    };
    const t = map[r.teacher];
    t.total++;
    if (r.isClosed) {
      if (r.profitPts && r.profitPts !== '') {
        const pts = parseFloat(r.profitPts);
        if (!isNaN(pts)) {
          if (pts > 0) { t.wins++; t.winAmt += pts; }
          else if (pts < 0) { t.losses++; t.lossAmt += Math.abs(pts); }
        } else { t.unknown++; }
      } else { t.unknown++; }
      if (r.profitAmt && r.profitAmt !== '未知品种') {
        const amt = parseFloat(r.profitAmt.replace(/[¥+,]/g,''));
        if (!isNaN(amt)) t.profitAmt += amt;
      }
    } else { t.open++; }
  });

  const teachers = Object.values(map).sort((a,b)=>b.profitAmt-a.profitAmt);
  if (!teachers.length) { document.getElementById('teacherSummary').style.display='none'; return; }
  document.getElementById('teacherSummary').style.display='block';
  document.getElementById('teacherCards').innerHTML = teachers.map(t => {
    const closed = t.wins + t.losses;
    const winRate = closed > 0 ? (t.wins/closed*100).toFixed(1) : '-';
    const amtStr  = t.profitAmt >= 0 ? `+${t.profitAmt.toFixed(0)}` : t.profitAmt.toFixed(0);
    const barW    = closed > 0 ? (t.wins/closed*100) : 0;
    const checked = t.wins + t.losses + t.open + t.unknown;
    const diff    = t.total - checked;
    const avgWin  = t.wins > 0 ? t.winAmt/t.wins : 0;
    const avgLoss = t.losses > 0 ? t.lossAmt/t.losses : 0;
    const rr = avgLoss > 0 ? (avgWin/avgLoss).toFixed(1) : (t.wins>0?'∞':'-');
    return `<div class="t-card">
      <div class="t-name">${t.name}</div>
      <div class="t-row"><span>总喊单</span><span class="t-val">${t.total}</span></div>
      <div class="t-row"><span>盈利</span><span class="t-val win">${t.wins}</span></div>
      <div class="t-row"><span>亏损</span><span class="t-val lose">${t.losses}</span></div>
      <div class="t-row"><span>持仓中</span><span class="t-val">${t.open}</span></div>
      ${t.unknown > 0 ? `<div class="t-row"><span>未知</span><span class="t-val" style="color:#e67e22">${t.unknown}</span></div>` : ''}
      ${diff !== 0 ? `<div class="t-row"><span style="color:#e74c3c">⚠️差${Math.abs(diff)}单</span><span class="t-val"></span></div>` : ''}
      <div class="t-row"><span>胜率</span><span class="t-val rate">${winRate}%</span></div>
      <div class="t-row"><span>盈亏比</span><span class="t-val rate">${rr}</span></div>
      <div class="t-row"><span>总盈亏</span><span class="t-val ${t.profitAmt>=0?'win':'lose'}">¥${amtStr}</span></div>
      <div class="t-winrate"><div style="width:${barW}%"></div></div>
    </div>`;
  }).join('');
}

// === Apply filters ===
function applyFilters() {
  const startD = document.getElementById('fStart').value;
  const endD   = document.getElementById('fEnd').value;
  const teacher = document.getElementById('fTeacher').value;
  const dir    = document.getElementById('fDir').value;
  const product= document.getElementById('fProduct').value.trim();

  filteredRows = allRows.filter(row => {
    if (startD) {
      const p = row.openTime.split(' ')[0].split('/');
      const d = `${p[0]}-${String(p[1]).padStart(2,'0')}-${String(p[2]).padStart(2,'0')}`;
      if (d < startD) return false;
    }
    if (endD) {
      const p = row.openTime.split(' ')[0].split('/');
      const d = `${p[0]}-${String(p[1]).padStart(2,'0')}-${String(p[2]).padStart(2,'0')}`;
      if (d > endD) return false;
    }
    if (teacher && row.teacher !== teacher) return false;
    if (dir && row.direction !== dir) return false;
    if (product && !row.product.includes(product)) return false;
    return true;
  });

  page = 1;
  renderTable(filteredRows);
  renderPager(filteredRows);
  updateStats(filteredRows);
  updateTeacherSummary(filteredRows);
}



// === Edit Price Modal ===
let editRowIdx = -1;
let editField = '';

function openEditModal(idx, field) {
  const row = filteredRows[idx];
  if (!row) return;
  editRowIdx = idx;
  editField = field;
  const label = field === 'openPrice' ? '开仓点位' : field === 'closePrice' ? '平仓点位' : field === 'profitPts' ? '获利点数' : field === 'profitAmt' ? '盈亏金额' : '点位';
  document.getElementById('editTitle').textContent = '✏️ 修改' + label;
  document.getElementById('editLabel').textContent = label;
  const current = row[field] || '';
  document.getElementById('editInput').value = current;
  document.getElementById('editInfo').innerHTML =
    `<span>${row.product}</span> · <span>${row.direction}</span> · <span>${row.teacher || '-'}</span><br>` +
    `当前${label}：<span>${current || '(空)'}</span>` +
    (field === 'closePrice' && row.openPrice ? ` · 开仓点位：<span>${row.openPrice}</span>` : '') +
    (field === 'openPrice' && row.closePrice ? ` · 平仓点位：<span>${row.closePrice}</span>` : '') +
    (field === 'profitAmt' && row.profitPts ? ` · 获利点数：<span>${row.profitPts}</span>` : '');
  document.getElementById('editModal').classList.add('show');
  setTimeout(() => document.getElementById('editInput').focus(), 100);
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('show');
  editRowIdx = -1;
  editField = '';
}

function saveEdit() {
  if (editRowIdx < 0) return;
  const row = filteredRows[editRowIdx];
  const newVal = document.getElementById('editInput').value.trim();
  if (!newVal) return;
  
  // 开仓点位 / 平仓点位：直接保存，不触发计算
  if (editField === 'openPrice' || editField === 'closePrice') {
    const backupKey = '_orig_' + editField;
    if (!row[backupKey]) row[backupKey] = row[editField];
    row[editField] = newVal;
    row['_edited_' + editField] = true;
  // 获利点数：保存并计算盈亏金额
  } else if (editField === 'profitPts') {
    if (!row['_orig_profitPts']) row['_orig_profitPts'] = row['profitPts'];
    row['profitPts'] = newVal;
    row['_edited_profitPts'] = true;
    const cv = CONTRACTS[row.product] || {};
    if (cv.unit) {
      const pts = parseFloat(newVal.replace('+', ''));
      const amount = pts * cv.unit * cv.rate;
      const amtStr = amount.toFixed(0);
      row['profitAmt'] = amount >= 0 ? (amount > 0 ? '+¥' + amtStr : '¥0') : '¥' + amtStr;
    }
  // 盈亏金额：直接保存，不重新计算
  } else if (editField === 'profitAmt') {
    const backupKey = '_orig_' + editField;
    if (!row[backupKey]) row[backupKey] = row[editField];
    row[editField] = newVal;
    row['_edited_' + editField] = true;
  }
  
  const origIdx = allRows.indexOf(row);
  if (origIdx >= 0) { allRows[origIdx] = row; }
  closeEditModal();
  renderTable(filteredRows);
  updateStats(filteredRows);
  updateTeacherSummary(filteredRows);
}

function recalcProfit(row) {
  const cv = CONTRACTS[row.product] || {};
  const div = cv.priceDiv || 1;
  const o = parseFloat(row.openPrice) / div;
  const c = parseFloat(row.closePrice) / div;
  if (!isNaN(o) && !isNaN(c) && c !== 0) {
    let pts = 0;
    if (row.direction === '多') pts = c - o;
    else if (row.direction === '空') pts = o - c;
    row.profitPts = pts > 0 ? '+' + pts.toFixed(2) : pts.toFixed(2);
    if (cv.unit) {
      // 直接相乘：获利点数 × 每点价值 × 汇率
      const amount = pts * cv.unit * cv.rate;
      const amtStr = amount.toFixed(0);
      row.profitAmt = amount >= 0 ? (amount > 0 ? '+¥' + amtStr : '¥0') : '¥' + amtStr;
    } else {
      row.profitAmt = '未知品种';
    }
  }
}

// ESC / Enter for edit modal
document.addEventListener('keydown', e => {
  if (!document.getElementById('editModal').classList.contains('show')) return;
  if (e.key === 'Escape') closeEditModal();
  if (e.key === 'Enter') saveEdit();
});
// === Auto login ===
async function autoLogin() {
  try {
    const r = await api('/login', 'POST', {
      password: '881199',
      phone: '135917',
      pass: '135917',
    });
    if (r.ok) {
      document.getElementById('statusDot').classList.add('live');
      document.getElementById('statusTxt').textContent = '已登录';
      return true;
    }
    document.getElementById('statusTxt').textContent = '登录失败';
  } catch(e) {
    document.getElementById('statusTxt').textContent = '连接失败';
  }
  return false;
}

// === Error display ===
function showError(msg, type) {
  // 移除旧错误
  const old = document.getElementById('errorBanner');
  if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'errorBanner';
  el.className = 'banner error';
  el.style.cssText = 'position:fixed;top:60px;right:16px;z-index:9999;max-width:360px;cursor:pointer;font-size:13px;padding:12px 16px';
  el.innerHTML = msg + '<span style="margin-left:12px;font-size:11px;opacity:.7">[点击关闭]</span>';
  el.onclick = () => el.remove();
  document.querySelector('.wrap').prepend(el);
  // 3秒后自动消失（网络错误除外）
  if (type !== 'network') setTimeout(() => { if (el.parentNode) el.remove(); }, 5000);
}

// === Fetch ===
async function doFetch(forceAll, nocache = false) {
  if (isFetching) return;
  if (!forceAll && allRows.length > 0 && !nocache) { applyFilters(); return; }

  isFetching = true;
  const btn  = document.getElementById('btnFetchAll');
  const orig = btn.textContent;
  btn.textContent = '⏳ 抓取中...';
  btn.disabled = true;

  try {
    const filters = {};
    const s = document.getElementById('fStart').value;
    const e = document.getElementById('fEnd').value;
    if (s) filters.pt = s.replace(/-/g,'/');
    if (e) filters.et = e.replace(/-/g,'/');

    const r = await api('/fetch', 'POST', { mode: currentMode, filters, nocache });
    if (!r.ok) {
      const msg = r.error || (r.authError ? '请先解锁' : '抓取出错了');
      showError(msg, r.errType || 'server');
      return;
    }

    allRows = r.rows || [];
    filteredRows = [...allRows];
    page = 1;

    renderTable(filteredRows);
    renderPager(filteredRows);
    updateStats(filteredRows);
    updateTeacherSummary(filteredRows);

    document.getElementById('statsArea').style.display = 'grid';
    document.getElementById('filtersArea').style.display = 'block';
    document.getElementById('tableArea').style.display = 'block';
  } catch(e) {
    showError('🌐 网络请求失败：' + e.message, 'network');
  } finally {
    btn.textContent = orig;
    btn.disabled = false;
    isFetching = false;
  }
}

// === Export CSV ===
function exportCSV() {
  if (!filteredRows.length) { alert('没有数据可导出'); return; }
  const header = COLS.map(c=>c.label).join(',');
  const rows = filteredRows.map(row =>
    COLS.map(c => {
      let v = (row[c.key] !== undefined ? row[c.key] : '');
      if (String(v).includes(',')||String(v).includes('"')||String(v).includes('\n'))
        v = '"' + String(v).replace(/"/g,'""') + '"';
      return v;
    }).join(',')
  );
  const csv = '\uFEFF' + [header, ...rows].join('\r\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8-sig'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `大粤K线_合并_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}



// === Load teachers filter ===
async function loadTeachers() {
  try {
    const r = await api('/teachers');
    const sel = document.getElementById('fTeacher');
    Object.values(r).forEach(name => {
      const opt = document.createElement('option');
      opt.value = name; opt.textContent = name;
      sel.appendChild(opt);
    });
  } catch(e) {}
}

// === Auto Refresh ===
let arTimer = null, arCdTimer = null, arLeft = 0;

function startAR() {
  stopAR();
  const min = parseInt(document.getElementById('arInterval').value);
  arLeft = min * 60;
  arTimer = setInterval(() => { allRows=[]; doFetch(true); arLeft = min*60; }, min*60000);
  arCdTimer = setInterval(() => {
    arLeft--;
    const m = Math.floor(arLeft/60), s = arLeft%60;
    document.getElementById('arCountdown').textContent = `${m}:${String(s).padStart(2,'0')}`;
  }, 1000);
  document.getElementById('arToggle').classList.add('on');
  document.getElementById('arCountdown').textContent = `${min}:00`;
}

function stopAR() {
  if (arTimer) { clearInterval(arTimer); arTimer=null; }
  if (arCdTimer) { clearInterval(arCdTimer); arCdTimer=null; }
  document.getElementById('arToggle').classList.remove('on');
  document.getElementById('arCountdown').textContent = '';
}

// === Remote config banner ===
let _bannerLoaded = false;
async function loadRemoteBanner() {
  if (_bannerLoaded) return;
  _bannerLoaded = true;
  try {
    const cfg = await api('/config');
    if (cfg.latestVersion && cfg.currentVersion && cfg.latestVersion !== cfg.currentVersion) {
      const url = cfg.updateUrl || 'https://github.com/Bluemelancholy1/trading-scraper/releases';
      showBanner('info', `🆕 新版本 v${cfg.latestVersion}（当前 v${cfg.currentVersion}），<a href="${url}" target="_blank" style="color:#5dade2">点击下载</a>`);
    }
    if (cfg.message) showBanner('warn', cfg.message);
  } catch(e) {}
}

function showBanner(type, html) {
  const el = document.createElement('div');
  el.className = 'banner ' + type;
  el.innerHTML = html;
  document.querySelector('.wrap').prepend(el);
}

// === Lock / Unlock ===
async function doUnlock() {
  const pw = document.getElementById('lockInput').value;
  if (!pw) { document.getElementById('lockError').textContent = '请输入密码'; return; }
  try {
    const r = await api('/unlock', 'POST', { password: pw });
    if (r.ok) {
      document.getElementById('lockInput').value = '';
      document.getElementById('lockError').textContent = '';
      showDataScreen();
      loadRemoteBanner();
      await autoLogin();
      await doFetch(false);
    } else if (r.disabled) {
      document.getElementById('lockError').textContent = '该应用已被停用，请联系管理员';
    } else {
      document.getElementById('lockError').textContent = r.error || '密码错误';
    }
  } catch(e) {
    document.getElementById('lockError').textContent = '🌐 连接失败，请确认服务已启动（localhost:3456）';
  }
}

function showLockScreen() {
  document.getElementById('screenLock').classList.remove('hidden');
  document.getElementById('screenData').style.display = 'none';
}

function showDataScreen() {
  document.getElementById('screenLock').classList.add('hidden');
  document.getElementById('screenData').style.display = '';
}

// === Init ===
async function init() {
  const today = new Date().toISOString().slice(0,10);
  const weekAgo = new Date(Date.now()-7*86400000).toISOString().slice(0,10);
  document.getElementById('fEnd').value = today;
  document.getElementById('fStart').value = weekAgo;

  renderHead();
  loadTeachers();

  try {
    const r = await api('/status');
    if (r.appReady) {
      showDataScreen();
      loadRemoteBanner();
      if (!r.loggedIn) await autoLogin();
      await doFetch(false);
    } else {
      showLockScreen();
    }
  } catch(e) {
    showLockScreen();
  }
}

// === Event bindings ===
document.getElementById('btnFetch').onclick   = () => doFetch(false);
document.getElementById('btnForceRefresh').onclick = () => doFetch(false, true);
document.getElementById('btnFetchAll').onclick = () => doFetch(true);
document.getElementById('btnExport').onclick   = exportCSV;
document.getElementById('btnLottery').onclick   = openLottery;
document.getElementById('btnMinesweeper').onclick  = openMine;
document.getElementById('lotteryModal').addEventListener('click', e => {
  if (e.target.id === 'lotteryModal') closeLottery();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('lotteryModal').classList.contains('show')) closeLottery();
});
document.getElementById('btnFirst').onclick     = () => goPage(1);
document.getElementById('btnPrev').onclick      = () => goPage(page-1);
document.getElementById('btnNext').onclick      = () => goPage(page+1);
document.getElementById('btnLast').onclick      = () => goPage(9999);
document.getElementById('lockBtn').onclick      = doUnlock;
document.getElementById('lockInput').onkeydown  = e => { if(e.key==='Enter') doUnlock(); };
document.getElementById('btnLock').onclick      = async () => { await api('/lock','GET'); showLockScreen(); };

document.getElementById('arToggle').onclick = function() {
  this.classList.contains('on') ? stopAR() : startAR();
};
document.getElementById('arInterval').onchange = function() {
  if (document.getElementById('arToggle').classList.contains('on')) startAR();
};

['fStart','fEnd','fTeacher','fDir','fProduct'].forEach(id => {
  const el = document.getElementById(id);
  el.oninput  = applyFilters;
  el.onchange = applyFilters;
});

const MODE_LABELS = { merged:'合并模式', jc:'建仓提醒', pc:'平仓提醒' };
document.getElementById('btnMode').onclick = function() {
  const modes = ['merged','jc','pc'];
  const idx = modes.indexOf(currentMode);
  currentMode = modes[(idx+1)%3];
  this.textContent = '切换：' + MODE_LABELS[modes[(idx+2)%3]];
  document.getElementById('modeBadge').textContent = MODE_LABELS[currentMode];
  allRows=[]; filteredRows=[];
  renderHead();
  renderTable([]);
  renderPager([]);
  updateStats([]);
  updateTeacherSummary([]);
};

// === Auto Update ===
let pendingVersion = null;

function doInstallUpdate() {
  if (window.electronAPI) window.electronAPI.installUpdate();
}

if (window.electronAPI) {
  window.electronAPI.onUpdateStatus((data) => {
    const bar = document.getElementById('updateBar');
    const msg = document.getElementById('updateMsg');
    const btn = document.getElementById('btnInstall');
    if (!bar || !msg) return;

    if (data.status === 'available') {
      bar.style.display = 'flex';
      bar.className = 'banner info';
      msg.textContent = `🆕 发现新版本 v${data.version}，正在后台下载...`;
      btn.style.display = 'none';
      pendingVersion = data.version;
    } else if (data.status === 'downloading') {
      bar.style.display = 'flex';
      bar.className = 'banner info';
      msg.textContent = `📥 正在下载更新... ${data.progress}%`;
      btn.style.display = 'none';
    } else if (data.status === 'ready') {
      bar.style.display = 'flex';
      bar.className = 'banner info';
      msg.textContent = `✅ 新版本 v${data.version} 下载完成！`;
      btn.style.display = 'inline-flex';
    } else if (data.status === 'error') {
      bar.style.display = 'flex';
      bar.className = 'banner warn';
      msg.textContent = `⚠️ 更新检查失败：${data.error}`;
      btn.style.display = 'none';
    } else if (data.status === 'up-to-date') {
      bar.style.display = 'none';
    }
  });
}

init();