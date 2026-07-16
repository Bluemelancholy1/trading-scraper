// 五子棋 - 双人对战 / 人机对战
// 15×15 棋盘，五连子胜
// 模式：pvp（双人）/ pve-easy（简单）/ pve-medium（中等）/ pve-hard（困难）
// 暴露：openGomoku / closeGomoku / resetGomoku / undoGomoku / setGomokuMode

const GOMOKU_SIZE = 15;
const GOMOKU_CELL = 36;
const GOMOKU_PAD = 24;
const GOMOKU_W = GOMOKU_PAD * 2 + GOMOKU_CELL * (GOMOKU_SIZE - 1);
const GOMOKU_H = GOMOKU_W;

// 模式：pvp / pve-easy / pve-medium / pve-hard
let gMode = 'pvp';
let gPlayerColor = 1;         // 人机模式下玩家执黑(1)或白(2)
let gStarted = false;        // 是否已开始游戏
let gBoard = [];
let gCurrent = 1;
let gGameOver = false;
let gWinner = 0;
let gMoves = [];
let gTimerInterval = null;
let gSeconds = 0;
let gStartTime = 0;
let gAiThinking = false;
// 联网对战状态
let gNetWs = null;          // WebSocket 连接
let gNetRole = null;        // 'host' | 'guest'
let gNetMyColor = 0;        // 1=黑(先) 2=白(后)
let gNetConnected = false;  // 双方是否已连接

// ====== 棋型分数 ======
const S = {
  FIVE: 100000, OPEN4: 15000, RUSH4: 2000, OPEN3: 2000,
  SLEEP3: 200,  OPEN2: 300,   SLEEP2: 30,   ONE: 5,
};

// 评估一条线
function lineScore(board, r, c, dr, dc, player) {
  let cnt = 1, open = 0;
  let nr = r + dr, nc = c + dc;
  while (nr >= 0 && nr < GOMOKU_SIZE && nc >= 0 && nc < GOMOKU_SIZE) {
    if (board[nr][nc] === player) { cnt++; nr += dr; nc += dc; }
    else { if (board[nr][nc] === 0) open++; break; }
  }
  nr = r - dr; nc = c - dc;
  while (nr >= 0 && nr < GOMOKU_SIZE && nc >= 0 && nc < GOMOKU_SIZE) {
    if (board[nr][nc] === player) { cnt++; nr -= dr; nc -= dc; }
    else { if (board[nr][nc] === 0) open++; break; }
  }
  if (cnt >= 5) return S.FIVE;
  if (cnt === 4) return open === 2 ? S.OPEN4 : S.RUSH4;
  if (cnt === 3) return open === 2 ? S.OPEN3 : S.SLEEP3;
  if (cnt === 2) return open === 2 ? S.OPEN2 : S.SLEEP2;
  return open > 0 ? S.ONE : 0;
}

// 评估落子 (r,c) 后己方得分
function scoreAt(board, r, c, player) {
  if (board[r][c] !== 0) return -1;
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  let total = 0;
  for (const [dr,dc] of dirs) total += lineScore(board, r, c, dr, dc, player);
  return total;
}

// ====== AI：评分选点 ======
function aiMove() {
  if (gGameOver || !gStarted || gAiThinking) return;
  gAiThinking = true;

  // 困难模式：minimax + alpha-beta（深度2）
  if (gMode === 'pve-hard') {
    const result = minimaxRoot(gBoard, gCurrent, 2);
    doPlace(result.r, result.c);
    gAiThinking = false;
    return;
  }

  // 简单/中等：贪心评分
  const ai = gCurrent;
  const enemy = ai === 1 ? 2 : 1;
  const limit = gMode === 'pve-medium' ? 3 : 2; // 搜索半径

  const cand = new Set();
  if (gMoves.length === 0) {
    cand.add(Math.floor(GOMOKU_SIZE/2) * GOMOKU_SIZE + Math.floor(GOMOKU_SIZE/2));
  } else {
    for (let r = 0; r < GOMOKU_SIZE; r++) {
      for (let c = 0; c < GOMOKU_SIZE; c++) {
        if (gBoard[r][c] !== 0) {
          for (let dr = -limit; dr <= limit; dr++) {
            for (let dc = -limit; dc <= limit; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = r+dr, nc = c+dc;
              if (nr >= 0 && nr < GOMOKU_SIZE && nc >= 0 && nc < GOMOKU_SIZE && gBoard[nr][nc] === 0)
                cand.add(nr * GOMOKU_SIZE + nc);
            }
          }
        }
      }
    }
    if (cand.size === 0) cand.add(Math.floor(GOMOKU_SIZE/2) * GOMOKU_SIZE + Math.floor(GOMOKU_SIZE/2));
  }

  let best = -Infinity, br = -1, bc = -1;
  for (const code of cand) {
    const r = Math.floor(code / GOMOKU_SIZE), c = code % GOMOKU_SIZE;
    // 进攻分
    const myS = scoreAt(gBoard, r, c, ai);
    // 防守分
    const enS = scoreAt(gBoard, r, c, enemy);
    const attack = myS * (gMode === 'pve-medium' ? 1.5 : 1.2);
    const defend = enS * (gMode === 'pve-medium' ? 1.0 : 0.7);
    // 中等难度：加入随机扰动
    const noise = gMode === 'pve-medium' ? (Math.random() - 0.5) * 50 : 0;
    const total = attack + defend + noise;
    if (total > best) { best = total; br = r; bc = c; }
  }
  doPlace(br, bc);
  gAiThinking = false;
}

// ====== Minimax + Alpha-Beta（困难模式）======
function evalBoard(board, player) {
  let s = 0;
  for (let r = 0; r < GOMOKU_SIZE; r++) {
    for (let c = 0; c < GOMOKU_SIZE; c++) {
      if (board[r][c] === player) s += scoreAt(board, r, c, player);
      else if (board[r][c] !== 0) s -= scoreAt(board, r, c, board[r][c]);
    }
  }
  return s;
}

function minimax(board, player, depth, alpha, beta, maximizing) {
  if (depth === 0) return { score: evalBoard(board, player), r: -1, c: -1 };
  const ai = player, en = ai === 1 ? 2 : 1;
  const cand = [];
  for (let r = 0; r < GOMOKU_SIZE; r++) {
    for (let c = 0; c < GOMOKU_SIZE; c++) {
      if (board[r][c] === 0) {
        cand.push({ code: r * GOMOKU_SIZE + c, s: scoreAt(board, r, c, maximizing ? ai : en) });
      }
    }
  }
  cand.sort((a, b) => b.s - a.s);
  const top = cand.slice(0, 15); // 只搜最强的15个点
  if (top.length === 0) return { score: evalBoard(board, player), r: -1, c: -1 };

  if (maximizing) {
    let best = { score: -Infinity, r: top[0].r, c: top[0].c };
    for (const item of top) {
      const r = Math.floor(item.code / GOMOKU_SIZE), c = item.code % GOMOKU_SIZE;
      board[r][c] = ai;
      if (scoreAt(board, r, c, ai) >= S.FIVE) { board[r][c] = 0; return { score: 500000, r, c }; }
      const res = minimax(board, player, depth - 1, alpha, beta, false);
      board[r][c] = 0;
      if (res.score > best.score) { best = { score: res.score, r, c }; }
      alpha = Math.max(alpha, res.score);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = { score: Infinity, r: top[0].r, c: top[0].c };
    for (const item of top) {
      const r = Math.floor(item.code / GOMOKU_SIZE), c = item.code % GOMOKU_SIZE;
      board[r][c] = en;
      const res = minimax(board, player, depth - 1, alpha, beta, true);
      board[r][c] = 0;
      if (res.score < best.score) { best = { score: res.score, r, c }; }
      beta = Math.min(beta, res.score);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function minimaxRoot(board, player, depth) {
  const result = minimax(board, player, depth, -Infinity, Infinity, true);
  return { r: result.r, c: result.c };
}

// ====== 游戏核心 ======
function startGomoku() {
  gStarted = true;
  initGomokuBoard();
  drawGomokuBoard();
  // 人机模式若玩家执白，AI 先手
  if (gMode !== 'pvp' && gPlayerColor === 2 && gCurrent === 1) {
    setTimeout(aiMove, 300);
  }
}

function initGomokuBoard() {
  gBoard = [];
  for (let r = 0; r < GOMOKU_SIZE; r++) gBoard.push(new Array(GOMOKU_SIZE).fill(0));
  gCurrent = 1;
  gGameOver = false;
  gWinner = 0;
  gMoves = [];
  gSeconds = 0;
  gStartTime = Date.now();
  if (gTimerInterval) clearInterval(gTimerInterval);
  gTimerInterval = setInterval(() => {
    gSeconds = Math.floor((Date.now() - gStartTime) / 1000);
    const t = document.getElementById('gomokuTimer');
    if (t) t.textContent = gSeconds;
  }, 500);
}

function drawGomokuBoard() {
  const canvas = document.getElementById('gomokuCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#dcb35c';
  ctx.fillRect(0, 0, GOMOKU_W, GOMOKU_H);
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 1;
  for (let i = 0; i < GOMOKU_SIZE; i++) {
    const p = GOMOKU_PAD + i * GOMOKU_CELL;
    ctx.beginPath(); ctx.moveTo(GOMOKU_PAD, p); ctx.lineTo(GOMOKU_W - GOMOKU_PAD, p); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p, GOMOKU_PAD); ctx.lineTo(p, GOMOKU_H - GOMOKU_PAD); ctx.stroke();
  }
  const stars = [[3,3],[3,11],[11,3],[11,11],[7,7]];
  ctx.fillStyle = '#5a3a1a';
  for (const [sr,sc] of stars) {
    ctx.beginPath();
    ctx.arc(GOMOKU_PAD + sc * GOMOKU_CELL, GOMOKU_PAD + sr * GOMOKU_CELL, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let r = 0; r < GOMOKU_SIZE; r++)
    for (let c = 0; c < GOMOKU_SIZE; c++)
      if (gBoard[r][c] !== 0) drawStone(ctx, r, c, gBoard[r][c]);
  if (gMoves.length > 0) {
    const last = gMoves[gMoves.length - 1];
    const cx = GOMOKU_PAD + last.c * GOMOKU_CELL;
    const cy = GOMOKU_PAD + last.r * GOMOKU_CELL;
    ctx.strokeStyle = '#ff3333'; ctx.lineWidth = 2;
    ctx.strokeRect(cx - 5, cy - 5, 10, 10);
  }
  updateGomokuUI();
}

function drawStone(ctx, r, c, player) {
  const cx = GOMOKU_PAD + c * GOMOKU_CELL, cy = GOMOKU_PAD + r * GOMOKU_CELL;
  const rad = GOMOKU_CELL * 0.42;
  const grad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, rad);
  if (player === 1) { grad.addColorStop(0, '#555'); grad.addColorStop(1, '#000'); }
  else { grad.addColorStop(0, '#fff'); grad.addColorStop(1, '#bbb'); }
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = player === 1 ? '#000' : '#888';
  ctx.lineWidth = 0.5; ctx.stroke();
}

function updateGomokuUI() {
  const hint = document.getElementById('gomokuHint');
  const controls = document.getElementById('gomokuControls');
  const boardArea = document.getElementById('gomokuBoardArea');
  const result = document.getElementById('gomokuResult');

  // 未开始 → 显示提示卡片
  if (!gStarted) {
    if (hint && gMode !== 'net') hint.style.display = 'flex';
    if (controls) controls.style.display = 'none';
    if (boardArea) boardArea.style.display = 'none';
    if (result) result.style.display = 'none';
    const status = document.getElementById('gomokuStatus');
    if (status) status.textContent = '选择模式后点击「开始游戏」';
    const player = document.getElementById('gomokuCurrentPlayer');
    if (player) player.textContent = '—';
    const mc = document.getElementById('gomokuMoveCount');
    if (mc) mc.textContent = '0';
    const meta = document.getElementById('gomokuMeta');
    if (meta) { const names = {pvp:'👥 双人对战','pve-easy':'🤖 人机·简单','pve-medium':'🤖 人机·中等','pve-hard':'🤖 人机·困难'}; let txt = names[gMode]||'👥 双人对战'; if(gMode!=='pvp') txt += ` · 玩家执${gPlayerColor===1?'⚫黑':'⚪白'}`; meta.textContent = txt; }
    return;
  }

  // 已开始 → 显示棋盘 + 控制栏
  if (hint) hint.style.display = 'none';
  if (controls) controls.style.display = 'flex';
  if (boardArea) boardArea.style.display = 'block';
  const netPanel = document.getElementById('gomokuNetPanel');
  if (netPanel) netPanel.style.display = 'none';
  const status = document.getElementById('gomokuStatus');
  const player = document.getElementById('gomokuCurrentPlayer');
  if (gGameOver) {
    // 胜负提示遮罩
    const rt = document.getElementById('gomokuResultText');
    let txt;
    if (gWinner === 0) txt = '🤝 平局';
    else if (gMode === 'pvp') txt = gWinner === 1 ? '🏆 黑子获胜！' : '🏆 白子获胜！';
    else if (gMode === 'net') txt = (gWinner === gNetMyColor) ? '🎉 你赢了！' : '💻 对手获胜！';
    else txt = (gWinner === gPlayerColor) ? '🎉 你赢了！' : '💻 电脑获胜！';
    if (rt) rt.innerHTML = txt;
    if (result) result.style.display = 'flex';
    if (status) status.innerHTML = txt;
    if (player) player.textContent = '—';
  } else {
    if (result) result.style.display = 'none';
    if (gMode === 'net') {
      if (status) status.innerHTML = (gCurrent === gNetMyColor) ? '♟ 轮到你落子' : '⏳ 等待对手…';
      if (player) player.textContent = (gNetMyColor === 1 ? '⚫黑' : '⚪白');
    } else {
      if (status) status.innerHTML = gCurrent === 1 ? '⚫ <b>黑子</b> 落子' : '⚪ <b>白子</b> 落子';
      if (player) player.textContent = gCurrent === 1 ? '黑' : '白';
    }
  }
  const mc = document.getElementById('gomokuMoveCount');
  if (mc) mc.textContent = gMoves.length;
  const meta = document.getElementById('gomokuMeta');
  if (meta) { const names = {pvp:'👥 双人对战','pve-easy':'🤖 人机·简单','pve-medium':'🤖 人机·中等','pve-hard':'🤖 人机·困难'}; let txt = names[gMode]||'👥 双人对战'; if(gMode!=='pvp') txt += ` · 玩家执${gPlayerColor===1?'⚫黑':'⚪白'}`; meta.textContent = txt; }
  const undoBtn = document.getElementById('btnUndoGomoku');
  if (undoBtn) { const can = gMode === 'net' ? false : (gMode === 'pvp' ? gMoves.length >= 1 : gMoves.length >= 2); undoBtn.disabled = !can; undoBtn.style.opacity = can ? '1' : '0.4'; }
}

function checkWin(r, c, player) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr,dc] of dirs) {
    let cnt = 1;
    for (let i = 1; i < 5; i++) {
      const nr = r+dr*i, nc = c+dc*i;
      if (nr < 0 || nr >= GOMOKU_SIZE || nc < 0 || nc >= GOMOKU_SIZE) break;
      if (gBoard[nr][nc] !== player) break;
      cnt++;
    }
    for (let i = 1; i < 5; i++) {
      const nr = r-dr*i, nc = c-dc*i;
      if (nr < 0 || nr >= GOMOKU_SIZE || nc < 0 || nc >= GOMOKU_SIZE) break;
      if (gBoard[nr][nc] !== player) break;
      cnt++;
    }
    if (cnt >= 5) return true;
  }
  return false;
}

function commitMove(r, c, player) {
  gBoard[r][c] = player;
  gMoves.push({ r, c, player });
  if (checkWin(r, c, player)) { gGameOver = true; gWinner = player; }
  else if (gMoves.length === GOMOKU_SIZE * GOMOKU_SIZE) { gGameOver = true; }
  else { gCurrent = player === 1 ? 2 : 1; }
  drawGomokuBoard();
}

function doPlace(r, c) {
  if (gGameOver || !gStarted) return;
  if (gBoard[r][c] !== 0) return;
  if (gMode === 'net') {
    if (!gNetConnected || gCurrent !== gNetMyColor) return;
    commitMove(r, c, gNetMyColor);
    if (gNetWs && gNetWs.readyState === 1) gNetWs.send(JSON.stringify({ t: 'move', r, c, player: gNetMyColor }));
  } else if (gMode === 'pvp') {
    commitMove(r, c, gCurrent);
  } else {
    if (gCurrent !== gPlayerColor) return;
    commitMove(r, c, gCurrent);
    if (!gGameOver && gCurrent !== gPlayerColor) setTimeout(aiMove, 250);
  }
}

function applyNetMove(r, c, player) {
  if (gGameOver || !gStarted) return;
  if (gBoard[r][c] !== 0) return;
  commitMove(r, c, player);
}

function onCanvasClick(e) {
  if (gGameOver || !gStarted || gAiThinking) return;
  if (gMode === 'net') { if (!gNetConnected || gCurrent !== gNetMyColor) return; }
  else if (gMode !== 'pvp' && gCurrent !== gPlayerColor) return;
  const canvas = document.getElementById('gomokuCanvas');
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * sx;
  const my = (e.clientY - rect.top) * sy;
  const c = Math.round((mx - GOMOKU_PAD) / GOMOKU_CELL);
  const r = Math.round((my - GOMOKU_PAD) / GOMOKU_CELL);
  if (r < 0 || r >= GOMOKU_SIZE || c < 0 || c >= GOMOKU_SIZE) return;
  const cx = GOMOKU_PAD + c * GOMOKU_CELL, cy = GOMOKU_PAD + r * GOMOKU_CELL;
  if (Math.abs(mx - cx) > GOMOKU_CELL * 0.45) return;
  if (Math.abs(my - cy) > GOMOKU_CELL * 0.45) return;
  doPlace(r, c);
}

// 悔棋
function undoGomoku() {
  if (gGameOver || !gStarted || gAiThinking) return;
  if (gMoves.length === 0) return;
  if (gMode === 'pvp') {
    const m = gMoves.pop();
    gBoard[m.r][m.c] = 0;
    gCurrent = m.player;
  } else {
    const steps = Math.min(2, gMoves.length);
    for (let k = 0; k < steps; k++) {
      const m = gMoves.pop();
      gBoard[m.r][m.c] = 0;
    }
    gCurrent = gPlayerColor;
  }
  gWinner = 0;
  drawGomokuBoard();
}

function setGomokuMode(mode, playerColor) {
  exitNetMode();
  const netP = document.getElementById('gomokuNetPanel'); if (netP) netP.style.display = 'none';
  const ri = document.getElementById('gomokuRoomInfo'); if (ri) ri.style.display = 'none';
  const hp = document.getElementById('gomokuHint'); if (hp) hp.style.display = 'flex';
  gMode = mode || 'pvp';
  gPlayerColor = playerColor || 1;
  // 已开始时切模式要重置
  if (gStarted) { gStarted = false; resetGomoku(); }
  // 同步按钮样式
  ['pvp','pve-easy','pve-medium','pve-hard'].forEach(m => {
    const btn = document.getElementById('gm_' + m);
    if (btn) {
      if (m === gMode) {
        btn.style.background = 'linear-gradient(135deg,#f0c040,#e0a020)';
        btn.style.color = '#1a1d2e';
        btn.style.fontWeight = 'bold';
      } else {
        btn.style.background = '';
        btn.style.color = '';
        btn.style.fontWeight = '';
      }
    }
  });
  const colorBox = document.getElementById('gomokuColorBox');
  if (colorBox) colorBox.style.display = gMode === 'pvp' ? 'none' : 'flex';
  ['black','white'].forEach(c => {
    const btn = document.getElementById('gc_' + c);
    if (btn) {
      const isBlack = c === 'black';
      const active = (isBlack && gPlayerColor === 1) || (!isBlack && gPlayerColor === 2);
      btn.style.background = active ? (isBlack ? '#000' : '#fff') : '';
      btn.style.color = active ? (isBlack ? '#fff' : '#000') : '';
      btn.style.fontWeight = active ? 'bold' : '';
    }
  });
  updateGomokuUI();
}

function openGomoku() {
  document.getElementById('gomokuModal').style.display = 'flex';
  gStarted = false;
  gMode = 'pvp';
  setGomokuMode('pvp', 1);
  const canvas = document.getElementById('gomokuCanvas');
  if (canvas) canvas.onclick = onCanvasClick;
}

function closeGomoku() {
  if (gTimerInterval) { clearInterval(gTimerInterval); gTimerInterval = null; }
  document.getElementById('gomokuModal').style.display = 'none';
}

function resetGomoku() {
  if (gMode === 'net' || gNetWs) {
    if (gNetWs) { try { gNetWs.close(); } catch(e){} }
    gNetWs = null; gNetConnected = false; gNetRole = null; gNetMyColor = 0;
  }
  initGomokuBoard();
  gStarted = false;
  updateGomokuUI();
}

// ====== 联网对战（局域网 P2P，无需外部服务器） ======
function exitNetMode() {
  if (gNetRole === 'host') { try { fetch('/gomoku/stop', { method: 'POST' }); } catch(e){} }
  if (gNetWs) { try { gNetWs.close(); } catch(e){} }
  gNetWs = null; gNetConnected = false; gNetRole = null; gNetMyColor = 0;
}

function showGomokuNet() {
  gMode = 'net';
  gNetMyColor = 0; gNetConnected = false; gNetRole = null;
  const hint = document.getElementById('gomokuHint');
  const net = document.getElementById('gomokuNetPanel');
  if (hint) hint.style.display = 'none';
  if (net) net.style.display = 'flex';
  setNetStatus('选择「创建房间」或输入房间号加入');
  updateGomokuUI();
}

function setNetStatus(text, isErr) {
  // 优先写外部 status（总是可见），同时在创建房间后同步到房间内 status
  const ext = document.getElementById('gomokuNetStatus');
  if (ext) { ext.textContent = text; ext.style.color = isErr ? '#ff6b6b' : '#f0c040'; }
  const inner = document.getElementById('gomokuRoomStatus');
  if (inner) { inner.textContent = text; inner.style.color = isErr ? '#ff6b6b' : '#f0c040'; }
}

function copyGomokuRoom() {
  const el = document.getElementById('gomokuRoomCode');
  if (el && navigator.clipboard) navigator.clipboard.writeText(el.textContent).catch(()=>{});
}

function gomokuCreateRoom() {
  gNetRole = 'host';
  setNetStatus('正在创建房间…');
  fetch('/gomoku/host', { method: 'POST' })
    .then(r => r.json())
    .then(d => {
      if (!d.ok) { setNetStatus('创建失败：' + (d.error || ''), true); return; }
      const code = d.room; // 6位数字
      const codeEl = document.getElementById('gomokuRoomCode');
      if (codeEl) codeEl.textContent = code;
      // 同步显示完整地址（小字）
      const wsUrlEl = document.getElementById('gomokuRoomWsUrl');
      if (wsUrlEl) wsUrlEl.textContent = d.wsUrl || '';
      const info = document.getElementById('gomokuRoomInfo');
      if (info) info.style.display = 'flex';
      // 记忆 host 的完整地址，guest 可跨机时使用
      try {
        if (d.wsUrl) localStorage.setItem('gomokuLastHostWsUrl', d.wsUrl);
        if (code) localStorage.setItem('gomokuLastHostRoom', code);
      } catch(e){}
      setNetStatus('等待对手加入…（把 6 位房间号发给朋友）');
      gomokuConnect(d.wsUrl || 'ws://localhost:3460');
    })
    .catch(e => setNetStatus('创建失败：' + e.message, true));
}

function copyGomokuWsUrl() {
  const el = document.getElementById('gomokuRoomWsUrl');
  if (el && navigator.clipboard) navigator.clipboard.writeText(el.textContent).catch(()=>{});
}

function gomokuJoinRoomFromInput() {
  const inp = document.getElementById('gomokuJoinInput');
  const val = inp ? inp.value.trim() : '';
  if (!val) { setNetStatus('请输入房间号', true); return; }
  gNetRole = 'guest';
  
  // 判断：6位数字 或 完整地址（ws://... 或 IP:PORT）
  if (/^\d{6}$/.test(val)) {
    // 6位数字 → 用记忆的 host 地址
    let wsUrl = '';
    try { wsUrl = localStorage.getItem('gomokuLastHostWsUrl') || ''; } catch(e){}
    if (!wsUrl) {
      setNetStatus('未记住 host 地址，请先在同一台机器上创建过房间，或输入完整地址（ws://...）', true);
      return;
    }
    gomokuConnect(wsUrl);
  } else {
    // 完整地址：ws://IP:PORT 或 IP:PORT
    const wsUrl = val.startsWith('ws://') ? val : ('ws://' + val);
    gomokuConnect(wsUrl);
  }
}

function gomokuConnect(wsUrl) {
  if (gNetWs) { try { gNetWs.close(); } catch(e){} gNetWs = null; }
  try {
    const ws = new WebSocket(wsUrl);
    gNetWs = ws;
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ t: 'hello', role: gNetRole }));
      setNetStatus(gNetRole === 'host' ? '房间已创建，等待对手加入…' : '已连接，等待开始…');
    });
    ws.addEventListener('message', (ev) => onNetMessage(ev.data));
    ws.addEventListener('close', () => {
      if (gNetConnected) { gNetConnected = false; setNetStatus('连接已断开'); }
      else if (gNetRole === 'guest') { setNetStatus('无法连接房间（检查房间号/是否同网络）', true); }
    });
    ws.addEventListener('error', () => {});
  } catch(e) { setNetStatus('连接错误：' + e.message, true); }
}

function onNetMessage(data) {
  let msg; try { msg = JSON.parse(data); } catch(e){ return; }
  if (msg.t === 'hello') {
    gNetConnected = true;
    startNetGame();
    setNetStatus('');
  } else if (msg.t === 'move') {
    applyNetMove(msg.r, msg.c, msg.player);
  } else if (msg.t === 'restart') {
    gStarted = true; initGomokuBoard(); drawGomokuBoard();
  } else if (msg.t === 'bye') {
    gNetConnected = false;
    const st = document.getElementById('gomokuStatus');
    if (st) st.innerHTML = '⚠️ 对手已离开';
  }
}

function startNetGame() {
  gStarted = true;
  gNetMyColor = (gNetRole === 'host') ? 1 : 2;
  initGomokuBoard();
  drawGomokuBoard();
}

function gomokuPlayAgain() {
  if (gMode === 'net') {
    if (gNetWs && gNetWs.readyState === 1) gNetWs.send(JSON.stringify({ t: 'restart' }));
    gStarted = true; initGomokuBoard(); drawGomokuBoard();
  } else {
    startGomoku();
  }
}

function gomokuBackToSelect() {
  if (gMode === 'net') {
    if (gNetWs) { try { gNetWs.close(); } catch(e){} }
    gNetWs = null; gNetConnected = false; gNetRole = null; gNetMyColor = 0;
  }
  resetGomoku();
}
