// === Data Visualization (Canvas Charts) v2 ===
// v2: hover tooltips + performance optimization

// ----- Tooltip singleton -----
let _chartTip = null;
function _getTooltip() {
  if (!_chartTip) {
    _chartTip = document.createElement('div');
    _chartTip.id = 'chartTip';
    Object.assign(_chartTip.style, {
      position: 'fixed', pointerEvents: 'none', zIndex: '99999',
      padding: '8px 12px', borderRadius: '6px', fontSize: '12px',
      lineHeight: '1.6', whiteSpace: 'nowrap', display: 'none',
      boxShadow: '0 4px 14px rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)'
    });
    document.body.appendChild(_chartTip);
  }
  return _chartTip;
}
function _showTooltip(e, html) {
  const tt = _getTooltip();
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  tt.style.background = isLight ? '#fff' : '#1a1d2e';
  tt.style.color = isLight ? '#333' : '#ecf0f1';
  tt.style.border = isLight ? '1px solid #ddd' : '1px solid rgba(255,255,255,0.12)';
  tt.innerHTML = html;
  tt.style.display = 'block';
  // Position near cursor, avoid overflow
  let l = e.clientX + 16, t = e.clientY - 12;
  const r = tt.offsetWidth, b = tt.offsetHeight;
  if (l + r > window.innerWidth - 8) l = e.clientX - r - 16;
  if (t + b > window.innerHeight - 8) t = e.clientY - b - 8;
  if (t < 8) t = 8;
  tt.style.left = l + 'px';
  tt.style.top = t + 'px';
}
function _hideTooltip() {
  const tt = _chartTip;
  if (tt) tt.style.display = 'none';
}

// ----- State: slices/points for hover + hash for cache -----
let _pieSlices = [];
let _trendPoints = [];
let _pieHash = '', _trendHash = '';
let _pieHoverBound = false, _trendHoverBound = false;
let _updateTimer = null;

// ----- Coordinate helper (canvas attr size vs CSS display size) -----
function _canvasScale(canvas) {
  const rect = canvas.getBoundingClientRect();
  return { sx: canvas.width / rect.width, sy: canvas.height / rect.height, rect };
}

/**
 * Draw teacher profit pie chart
 */
function drawPieChart(teacherData, canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  // Performance: skip if hidden
  const panel = document.getElementById('chartPanel');
  if (panel && panel.style.display === 'none') return;

  // Performance: hash check
  const h = teacherData.map(t => t.name + '|' + t.profitAmt + '|' + t.total).join(',');
  if (h === _pieHash) return;
  _pieHash = h;

  const ctx = canvas.getContext('2d');
  const w = canvas.width, hh = canvas.height;
  const cx = w / 2, cy = hh / 2, r = Math.min(cx, cy) - 20;
  ctx.clearRect(0, 0, w, hh);

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';

  if (!teacherData || teacherData.length === 0) {
    ctx.fillStyle = isLight ? '#f5f5f5' : '#0f1117';
    ctx.fillRect(0, 0, w, hh);
    ctx.fillStyle = '#666';
    ctx.font = '14px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据', cx, cy);
    _pieSlices = [];
    return;
  }

  ctx.fillStyle = isLight ? '#f5f5f5' : '#0f1117';
  ctx.fillRect(0, 0, w, hh);

  const colors = ['#00ff88','#ff4757','#3498db','#f0c040','#e67e22','#9b59b6','#1abc9c','#e74c3c','#2ecc71','#f39c12'];
  const total = teacherData.reduce((s, t) => s + Math.abs(t.profitAmt || 0), 0);
  if (total === 0) {
    ctx.fillStyle = '#666';
    ctx.font = '14px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText('暂无盈亏数据', cx, cy);
    _pieSlices = [];
    return;
  }

  // Store slice info for hover
  _pieSlices = [];
  let startAngle = -Math.PI / 2;
  teacherData.forEach((t, i) => {
    const val = Math.abs(t.profitAmt || 0);
    const sliceAngle = (val / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;
    const pct = total > 0 ? (val / total * 100) : 0;

    _pieSlices.push({ name: t.name, profitAmt: t.profitAmt, pct, startAngle, endAngle: startAngle + sliceAngle, color: colors[i % colors.length] });

    if (sliceAngle < 0.001) { startAngle += sliceAngle; return; }

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.strokeStyle = isLight ? '#fff' : '#0f1117';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    if (sliceAngle > 0.25) {
      const labelAngle = startAngle + sliceAngle / 2;
      const lr = r * 0.65;
      const lx = cx + Math.cos(labelAngle) * lr;
      const ly = cy + Math.sin(labelAngle) * lr;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px "Microsoft YaHei"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.name, lx, ly);
    }

    startAngle += sliceAngle;
  });

  // Center circle
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = isLight ? '#f5f5f5' : '#1a1d2e';
  ctx.fill();
  ctx.strokeStyle = isLight ? '#ddd' : '#333';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = isLight ? '#333' : '#ecf0f1';
  ctx.font = 'bold 13px "Microsoft YaHei"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('总盈亏', cx, cy - 8);
  ctx.font = 'bold 16px "Microsoft YaHei"';
  const totalAmt = teacherData.reduce((s, t) => s + (t.profitAmt || 0), 0);
  ctx.fillStyle = totalAmt >= 0 ? '#00ff88' : '#ff4757';
  ctx.fillText('¥' + (totalAmt >= 0 ? '+' : '') + totalAmt.toFixed(0), cx, cy + 14);

  // Hover binding (once)
  if (!_pieHoverBound) {
    _pieHoverBound = true;
    canvas.addEventListener('mousemove', function(e) {
      if (!_pieSlices.length) { _hideTooltip(); return; }
      const { sx, sy, rect } = _canvasScale(canvas);
      const mx = (e.clientX - rect.left) * sx;
      const my = (e.clientY - rect.top) * sy;
      const dx = mx - cx, dy = my - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);

      // Outside ring or center hole
      if (dist > r || dist < r * 0.35) { _hideTooltip(); return; }

      let angle = Math.atan2(dy, dx);
      if (angle < -Math.PI/2) angle += Math.PI * 2;
      if (angle > Math.PI*1.5) angle -= Math.PI * 2;

      const slice = _pieSlices.find(s => angle >= s.startAngle && angle < s.endAngle);
      if (slice) {
        _showTooltip(e, `<b>${slice.name}</b><br>盈亏: ¥${slice.profitAmt >= 0 ? '+' : ''}${slice.profitAmt}<br>占比: ${slice.pct.toFixed(1)}%`);
      } else {
        _hideTooltip();
      }
    });
    canvas.addEventListener('mouseleave', _hideTooltip);
  }
}

/**
 * Draw daily profit trend chart
 */
function drawTrendChart(rows, canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const panel = document.getElementById('chartPanel');
  if (panel && panel.style.display === 'none') return;

  // Performance: hash check
  const h = rows ? (rows.length + '|' + (rows[0]?.openTime||'') + '|' + (rows[rows.length-1]?.openTime||'')) : '';
  if (h === _trendHash) return;
  _trendHash = h;

  const ctx = canvas.getContext('2d');
  const w = canvas.width, hh = canvas.height;
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  ctx.clearRect(0, 0, w, hh);
  ctx.fillStyle = isLight ? '#f5f5f5' : '#0f1117';
  ctx.fillRect(0, 0, w, hh);

  if (!rows || rows.length < 2) {
    ctx.fillStyle = '#666';
    ctx.font = '14px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText('暂无趋势数据（至少需要2条记录）', w/2, hh/2);
    _trendPoints = [];
    return;
  }

  // Aggregate by day
  const dayMap = {};
  rows.forEach(r => {
    if (!r.openTime || !r.isClosed) return;
    const day = r.openTime.split(' ')[0];
    if (!dayMap[day]) dayMap[day] = 0;
    if (r.profitAmt && r.profitAmt !== '未知品种') {
      const amt = parseFloat(r.profitAmt.toString().replace(/[¥+,]/g,''));
      if (!isNaN(amt)) dayMap[day] += amt;
    }
  });

  const days = Object.keys(dayMap).sort();
  if (days.length < 2) {
    ctx.fillStyle = '#666';
    ctx.font = '14px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText('天数太少，无法绘制趋势', w/2, hh/2);
    _trendPoints = [];
    return;
  }

  const values = days.map(d => dayMap[d]);
  const maxVal = Math.max(...values.map(v=>Math.abs(v)), 1);
  const padL = 55, padR = 15, padT = 25, padB = 35;
  const chartW = w - padL - padR, chartH = hh - padT - padB;

  // Grid
  ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + chartH * (1 - i / 4);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
    ctx.fillStyle = isLight ? '#888' : '#666';
    ctx.font = '10px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(maxVal * (i/4*2 - 1)), padL - 5, y);
  }

  // Zero line
  const zeroY = padT + chartH / 2;
  ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(padL, zeroY); ctx.lineTo(w - padR, zeroY); ctx.stroke();
  ctx.setLineDash([]);

  // Plot
  const stepX = chartW / (days.length - 1);
  const pointCount = days.length;

  ctx.beginPath();
  ctx.strokeStyle = '#3498db'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  values.forEach((v, i) => {
    const x = padL + i * stepX;
    const y = zeroY - (v / maxVal) * (chartH / 2);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Fill
  ctx.lineTo(padL + (days.length - 1) * stepX, zeroY);
  ctx.lineTo(padL, zeroY); ctx.closePath();
  const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
  grad.addColorStop(0, 'rgba(52,152,219,0.25)');
  grad.addColorStop(1, 'rgba(52,152,219,0.02)');
  ctx.fillStyle = grad; ctx.fill();

  // Data points (store for hover)
  _trendPoints = [];
  values.forEach((v, i) => {
    const px = padL + i * stepX;
    const py = zeroY - (v / maxVal) * (chartH / 2);
    _trendPoints.push({ x: px, y: py, value: v, date: days[i] });

    ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI*2);
    ctx.fillStyle = v >= 0 ? '#00ff88' : '#ff4757';
    ctx.fill();
    ctx.strokeStyle = isLight ? '#fff' : '#0f1117'; ctx.lineWidth = 2; ctx.stroke();
  });

  // Day labels
  if (days.length > 1) {
    [0, Math.floor(days.length/2), days.length-1].forEach(idx => {
      const x = padL + idx * stepX;
      ctx.fillStyle = isLight ? '#888' : '#666';
      ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(days[idx].slice(5), x, hh - padB + 8);
      ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1; ctx.setLineDash([2,3]);
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, hh - padB); ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  // Hover binding (once)
  if (!_trendHoverBound) {
    _trendHoverBound = true;
    canvas.addEventListener('mousemove', function(e) {
      if (!_trendPoints.length) { _hideTooltip(); return; }
      const { sx, sy, rect } = _canvasScale(canvas);
      const mx = (e.clientX - rect.left) * sx;
      const my = (e.clientY - rect.top) * sy;

      let nearest = null, minD2 = 400; // 20px threshold
      _trendPoints.forEach(p => {
        const d2 = (mx-p.x)*(mx-p.x) + (my-p.y)*(my-p.y);
        if (d2 < minD2) { minD2 = d2; nearest = p; }
      });

      if (nearest) {
        _showTooltip(e, `<b>${nearest.date}</b><br>盈亏: ¥${nearest.value >= 0 ? '+' : ''}${nearest.value.toFixed(0)}`);
        // Highlight nearest point
        const { sx, sy } = _canvasScale(canvas);
        if (!canvas._hlPoint || canvas._hlPoint !== nearest) {
          // Redraw to clear old highlight — just draw highlight dot
        }
      } else {
        _hideTooltip();
      }
    });
    canvas.addEventListener('mouseleave', _hideTooltip);
  }
}

/**
 * Update both charts with current data
 */
function updateCharts() {
  // Performance: skip if panel hidden
  const panel = document.getElementById('chartPanel');
  if (panel && panel.style.display === 'none') return;

  // Performance: debounce 200ms
  if (_updateTimer) { clearTimeout(_updateTimer); _updateTimer = null; }
  _updateTimer = setTimeout(() => {
    _updateTimer = null;
    _doUpdateCharts();
  }, 200);
}

function _doUpdateCharts() {
  const teacherCards = document.getElementById('teacherCards');
  if (!teacherCards) return;

  const cards = teacherCards.querySelectorAll('.t-card');
  const teacherData = [];
  cards.forEach(card => {
    const nameEl = card.querySelector('.t-name');
    const rows = card.querySelectorAll('.t-row');
    if (!nameEl || rows.length < 6) return;
    const name = nameEl.textContent;
    const amtText = rows[rows.length-2]?.querySelector('.t-val')?.textContent || '¥0';
    const amt = parseFloat(amtText.replace(/[¥+¥,]/g,'')) || 0;
    const totalText = rows[0]?.querySelector('.t-val')?.textContent || '0';
    teacherData.push({ name, profitAmt: amt, total: parseInt(totalText) || 0 });
  });

  // Reset hash to force redraw
  _pieHash = '';
  drawPieChart(teacherData, 'pieChart');

  if (typeof filteredRows !== 'undefined') {
    _trendHash = '';
    drawTrendChart(filteredRows, 'trendChart');
  }
}

/**
 * Toggle chart panel visibility
 */
function toggleChartPanel() {
  const panel = document.getElementById('chartPanel');
  if (!panel) return;
  const isShow = panel.style.display !== 'none';
  panel.style.display = isShow ? 'none' : 'block';
  if (!isShow) {
    _pieHash = ''; _trendHash = '';
    updateCharts();
    if (typeof OpLog !== 'undefined') OpLog.add('chart', '打开图表面板');
  }
}
