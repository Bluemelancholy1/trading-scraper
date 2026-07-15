// 五子棋 - 双人对战（Gomoku / Five-in-a-Row）
// 15×15 棋盘，玩家1执黑先手，玩家2执白，标准规则五连子胜
// 暴露：openGomoku / closeGomoku / resetGomoku

const GOMOKU_SIZE = 15;             // 棋盘 15x15
const GOMOKU_CELL = 36;             // 每格 36px
const GOMOKU_PAD = 24;              // 边距 24px
const GOMOKU_W = GOMOKU_PAD * 2 + GOMOKU_CELL * (GOMOKU_SIZE - 1);
const GOMOKU_H = GOMOKU_W;

let gBoard = [];                    // 0=空 1=黑 2=白
let gCurrent = 1;                   // 当前玩家 1=黑 2=白
let gGameOver = false;
let gWinner = 0;                    // 0=无 1=黑 2=白 3=平局
let gMoves = [];                    // 落子历史 [{r,c,player}, ...]
let gTimerInterval = null;
let gSeconds = 0;
let gStartTime = 0;

function initGomokuBoard() {
  gBoard = [];
  for (let r = 0; r < GOMOKU_SIZE; r++) {
    gBoard.push(new Array(GOMOKU_SIZE).fill(0));
  }
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
  // 背景
  ctx.fillStyle = '#dcb35c';
  ctx.fillRect(0, 0, GOMOKU_W, GOMOKU_H);
  // 网格
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 1;
  for (let i = 0; i < GOMOKU_SIZE; i++) {
    const p = GOMOKU_PAD + i * GOMOKU_CELL;
    ctx.beginPath();
    ctx.moveTo(GOMOKU_PAD, p);
    ctx.lineTo(GOMOKU_W - GOMOKU_PAD, p);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p, GOMOKU_PAD);
    ctx.lineTo(p, GOMOKU_H - GOMOKU_PAD);
    ctx.stroke();
  }
  // 星位（天元 + 四角的四个）
  const stars = [[3, 3], [3, 11], [11, 3], [11, 11], [7, 7]];
  ctx.fillStyle = '#5a3a1a';
  for (const [sr, sc] of stars) {
    const cx = GOMOKU_PAD + sc * GOMOKU_CELL;
    const cy = GOMOKU_PAD + sr * GOMOKU_CELL;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // 棋子
  for (let r = 0; r < GOMOKU_SIZE; r++) {
    for (let c = 0; c < GOMOKU_SIZE; c++) {
      if (gBoard[r][c] !== 0) drawGomokuStone(ctx, r, c, gBoard[r][c]);
    }
  }
  // 标记最后一手
  if (gMoves.length > 0) {
    const last = gMoves[gMoves.length - 1];
    const cx = GOMOKU_PAD + last.c * GOMOKU_CELL;
    const cy = GOMOKU_PAD + last.r * GOMOKU_CELL;
    ctx.strokeStyle = '#ff3333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(cx - 5, cy - 5, 10, 10);
    ctx.stroke();
  }
  // 更新状态栏
  updateGomokuStatus();
}

function drawGomokuStone(ctx, r, c, player) {
  const cx = GOMOKU_PAD + c * GOMOKU_CELL;
  const cy = GOMOKU_PAD + r * GOMOKU_CELL;
  const radius = GOMOKU_CELL * 0.42;
  // 阴影
  const grad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, radius);
  if (player === 1) {
    grad.addColorStop(0, '#666');
    grad.addColorStop(1, '#000');
  } else {
    grad.addColorStop(0, '#fff');
    grad.addColorStop(1, '#bbb');
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = player === 1 ? '#000' : '#888';
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

function updateGomokuStatus() {
  const status = document.getElementById('gomokuStatus');
  const player = document.getElementById('gomokuCurrentPlayer');
  if (gGameOver) {
    if (gWinner === 1) status.innerHTML = '🏆 <b style="color:#000">黑子</b> 获胜！';
    else if (gWinner === 2) status.innerHTML = '🏆 <b style="color:#fff;text-shadow:0 0 4px #000">白子</b> 获胜！';
    else status.innerHTML = '🤝 平局';
    if (player) player.textContent = '—';
  } else {
    status.innerHTML = gCurrent === 1 ? '⚫ <b>黑子</b> 落子' : '⚪ <b>白子</b> 落子';
    if (player) player.textContent = gCurrent === 1 ? '黑' : '白';
  }
  const moveCount = document.getElementById('gomokuMoveCount');
  if (moveCount) moveCount.textContent = gMoves.length;
}

function checkGomokuWin(r, c, player) {
  // 四个方向: 横 竖 主斜 反斜
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    let count = 1;
    // 正向
    for (let i = 1; i < 5; i++) {
      const nr = r + dr * i, nc = c + dc * i;
      if (nr < 0 || nr >= GOMOKU_SIZE || nc < 0 || nc >= GOMOKU_SIZE) break;
      if (gBoard[nr][nc] !== player) break;
      count++;
    }
    // 反向
    for (let i = 1; i < 5; i++) {
      const nr = r - dr * i, nc = c - dc * i;
      if (nr < 0 || nr >= GOMOKU_SIZE || nc < 0 || nc >= GOMOKU_SIZE) break;
      if (gBoard[nr][nc] !== player) break;
      count++;
    }
    if (count >= 5) return true;
  }
  return false;
}

function gomokuClick(e) {
  if (gGameOver) return;
  const canvas = document.getElementById('gomokuCanvas');
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;
  // 找到最近的交叉点
  const c = Math.round((mx - GOMOKU_PAD) / GOMOKU_CELL);
  const r = Math.round((my - GOMOKU_PAD) / GOMOKU_CELL);
  if (r < 0 || r >= GOMOKU_SIZE || c < 0 || c >= GOMOKU_SIZE) return;
  // 容差：只有距离交叉点足够近才算
  const cx = GOMOKU_PAD + c * GOMOKU_CELL;
  const cy = GOMOKU_PAD + r * GOMOKU_CELL;
  const dx = Math.abs(mx - cx), dy = Math.abs(my - cy);
  if (Math.max(dx, dy) > GOMOKU_CELL * 0.45) return;
  if (gBoard[r][c] !== 0) return;
  // 落子
  gBoard[r][c] = gCurrent;
  gMoves.push({ r, c, player: gCurrent });
  if (checkGomokuWin(r, c, gCurrent)) {
    gGameOver = true;
    gWinner = gCurrent;
  } else if (gMoves.length === GOMOKU_SIZE * GOMOKU_SIZE) {
    gGameOver = true;
    gWinner = 0; // 平局
  } else {
    gCurrent = gCurrent === 1 ? 2 : 1;
  }
  drawGomokuBoard();
}

function openGomoku() {
  document.getElementById('gomokuModal').style.display = 'flex';
  initGomokuBoard();
  drawGomokuBoard();
  const canvas = document.getElementById('gomokuCanvas');
  canvas.onclick = gomokuClick;
}

function closeGomoku() {
  if (gTimerInterval) {
    clearInterval(gTimerInterval);
    gTimerInterval = null;
  }
  document.getElementById('gomokuModal').style.display = 'none';
}

function resetGomoku() {
  initGomokuBoard();
  drawGomokuBoard();
}
