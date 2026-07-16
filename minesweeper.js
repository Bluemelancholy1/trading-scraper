// === Minesweeper - 暗黑科技风 ===
let mBoard = [], mRevealed = [], mFlagged = [];
let mRows = 9, mCols = 9, mMines = 10;
let mGameOver = false, mWon = false, mFirstClick = true;
let mTimerInterval = null, mSeconds = 0;
let mCanvas, mCtx, mCellSize;
let mHoverCell = null;

// 经典扫雷数字配色
const NUM_COLORS = {
  1: '#00bcd4', // 青蓝 - 科技感
  2: '#4caf50', // 绿
  3: '#ff5252', // 红
  4: '#7c4dff', // 紫
  5: '#ff9800', // 橙
  6: '#00e5ff', //  cyan
  7: '#ff4081', // 粉
  8: '#9e9e9e'  // 灰
};

// 暗黑科技风配色
const COLORS = {
  bg: '#0f1117',
  cellHidden: '#1a1d2e',
  cellHiddenTop: '#2a2d3e',
  cellHiddenBottom: '#0a0d1a',
  cellRevealed: '#0a0d1a',
  cellRevealedBorder: '#1a1d2e',
  mine: '#ff5252',
  mineGlow: '#ff1744',
  flag: '#ff6b6b',
  border: '#333',
  highlight: '#f0c040'
};

function initMinesweeper() {
  mBoard = []; mRevealed = []; mFlagged = [];
  mGameOver = false; mWon = false; mFirstClick = true;
  mSeconds = 0; mHoverCell = null;
  clearInterval(mTimerInterval); mTimerInterval = null;
  
  // 初始化数组
  for (let r = 0; r < mRows; r++) {
    mBoard[r] = []; mRevealed[r] = []; mFlagged[r] = [];
    for (let c = 0; c < mCols; c++) {
      mBoard[r][c] = 0;
      mRevealed[r][c] = false;
      mFlagged[r][c] = false;
    }
  }
  
  // 随机布雷
  let placed = 0;
  while (placed < mMines) {
    const r = Math.floor(Math.random() * mRows);
    const c = Math.floor(Math.random() * mCols);
    if (mBoard[r][c] !== -1) {
      mBoard[r][c] = -1;
      placed++;
    }
  }
  
  // 计算数字
  for (let r = 0; r < mRows; r++) {
    for (let c = 0; c < mCols; c++) {
      if (mBoard[r][c] !== -1) {
        let cnt = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < mRows && nc >= 0 && nc < mCols && mBoard[nr][nc] === -1) {
              cnt++;
            }
          }
        }
        mBoard[r][c] = cnt;
      }
    }
  }
  
  // 更新UI
  updateMineCounter();
  document.getElementById('mineTimer').textContent = '000';
  updateSmiley('😎');
  
  // 获取canvas
  mCanvas = document.getElementById('mineCanvas');
  mCtx = mCanvas.getContext('2d');
  mCellSize = mCanvas.width / mCols;
  
  // 绑定事件
  bindMineEvents();
  
  drawMines();
}

function bindMineEvents() {
  // 移除旧事件
  const newCanvas = mCanvas.cloneNode(true);
  mCanvas.parentNode.replaceChild(newCanvas, mCanvas);
  mCanvas = newCanvas;
  mCtx = mCanvas.getContext('2d');
  
  // 鼠标移动 - 悬停效果
  mCanvas.addEventListener('mousemove', (e) => {
    const rect = mCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const c = Math.floor(x / mCellSize);
    const r = Math.floor(y / mCellSize);
    
    if (r >= 0 && r < mRows && c >= 0 && c < mCols) {
      if (!mRevealed[r][c] && !mGameOver) {
        mHoverCell = { r, c };
        drawMines();
      }
    } else {
      if (mHoverCell) {
        mHoverCell = null;
        drawMines();
      }
    }
  });
  
  mCanvas.addEventListener('mouseleave', () => {
    mHoverCell = null;
    drawMines();
  });
  
  // 左键点击
  mCanvas.addEventListener('mousedown', (e) => {
    if (mGameOver) return;
    const rect = mCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const c = Math.floor(x / mCellSize);
    const r = Math.floor(y / mCellSize);
    
    if (r >= 0 && r < mRows && c >= 0 && c < mCols) {
      if (e.button === 0) { // 左键
        if (!mFlagged[r][c]) {
          // 按下动画
          drawCellPressed(r, c);
        }
      }
    }
  });
  
  mCanvas.addEventListener('mouseup', (e) => {
    if (mGameOver) return;
    const rect = mCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const c = Math.floor(x / mCellSize);
    const r = Math.floor(y / mCellSize);
    
    if (r >= 0 && r < mRows && c >= 0 && c < mCols) {
      if (e.button === 0) { // 左键揭开
        if (!mFlagged[r][c]) {
          reveal(r, c);
        }
      } else if (e.button === 2) { // 右键插旗
        e.preventDefault();
        toggleFlag(r, c);
      }
    }
    drawMines();
  });
  
  // 禁用右键菜单
  mCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function drawCellPressed(r, c) {
  const x = c * mCellSize;
  const y = r * mCellSize;
  const pad = 1;
  
  // 按下状态 - 凹陷
  mCtx.fillStyle = COLORS.cellRevealed;
  mCtx.fillRect(x + pad, y + pad, mCellSize - pad * 2, mCellSize - pad * 2);
  
  // 内边框
  mCtx.strokeStyle = COLORS.cellRevealedBorder;
  mCtx.lineWidth = 1;
  mCtx.strokeRect(x + pad + 0.5, y + pad + 0.5, mCellSize - pad * 2 - 1, mCellSize - pad * 2 - 1);
}

function drawMines() {
  if (!mCtx) return;
  
  // 清空背景
  mCtx.fillStyle = COLORS.bg;
  mCtx.fillRect(0, 0, mCanvas.width, mCanvas.height);
  
  for (let r = 0; r < mRows; r++) {
    for (let c = 0; c < mCols; c++) {
      drawCell(r, c);
    }
  }
}

function drawCell(r, c) {
  const x = c * mCellSize;
  const y = r * mCellSize;
  const pad = 1;
  
  if (!mRevealed[r][c]) {
    // 未揭开的格子 - 3D 凸起效果
    const isHover = mHoverCell && mHoverCell.r === r && mHoverCell.c === c;
    const isPressed = false; // 简化，不追踪持续按下
    
    // 阴影层
    mCtx.fillStyle = '#000';
    mCtx.fillRect(x + 2, y + 2, mCellSize - 2, mCellSize - 2);
    
    // 主体 - 渐变
    const grad = mCtx.createLinearGradient(x, y, x, y + mCellSize);
    if (isHover) {
      grad.addColorStop(0, '#3a3d4e');
      grad.addColorStop(1, '#1a1d2e');
    } else {
      grad.addColorStop(0, COLORS.cellHiddenTop);
      grad.addColorStop(1, COLORS.cellHidden);
    }
    mCtx.fillStyle = grad;
    mCtx.fillRect(x + pad, y + pad, mCellSize - pad * 2, mCellSize - pad * 2);
    
    // 高光边框（左上）
    mCtx.strokeStyle = isHover ? '#4a4d5e' : '#3a3d4e';
    mCtx.lineWidth = 1;
    mCtx.beginPath();
    mCtx.moveTo(x + pad, y + mCellSize - pad);
    mCtx.lineTo(x + pad, y + pad);
    mCtx.lineTo(x + mCellSize - pad, y + pad);
    mCtx.stroke();
    
    // 阴影边框（右下）
    mCtx.strokeStyle = '#050810';
    mCtx.beginPath();
    mCtx.moveTo(x + mCellSize - pad, y + pad);
    mCtx.lineTo(x + mCellSize - pad, y + mCellSize - pad);
    mCtx.lineTo(x + pad, y + mCellSize - pad);
    mCtx.stroke();
    
    // 插旗
    if (mFlagged[r][c]) {
      drawFlag(x, y);
    }
  } else {
    // 已揭开的格子 - 凹陷效果
    mCtx.fillStyle = COLORS.cellRevealed;
    mCtx.fillRect(x + pad, y + pad, mCellSize - pad * 2, mCellSize - pad * 2);
    
    // 内边框
    mCtx.strokeStyle = COLORS.cellRevealedBorder;
    mCtx.lineWidth = 1;
    mCtx.strokeRect(x + pad + 0.5, y + pad + 0.5, mCellSize - pad * 2 - 1, mCellSize - pad * 2 - 1);
    
    if (mBoard[r][c] === -1) {
      // 地雷
      drawMine(x, y, mGameOver && !mWon);
    } else if (mBoard[r][c] > 0) {
      // 数字 - 带发光效果
      drawNumber(x, y, mBoard[r][c]);
    }
  }
  
  // 游戏结束显示未标记的雷
  if (mGameOver && mBoard[r][c] === -1 && !mFlagged[r][c] && !mRevealed[r][c]) {
    drawMine(x, y, false);
  }
}

function drawFlag(x, y) {
  const cx = x + mCellSize / 2;
  const cy = y + mCellSize / 2;
  const size = mCellSize * 0.5;
  
  // 旗杆
  mCtx.strokeStyle = '#888';
  mCtx.lineWidth = 2;
  mCtx.beginPath();
  mCtx.moveTo(cx + size * 0.1, cy + size * 0.3);
  mCtx.lineTo(cx + size * 0.1, cy - size * 0.3);
  mCtx.stroke();
  
  // 旗帜
  mCtx.fillStyle = COLORS.flag;
  mCtx.beginPath();
  mCtx.moveTo(cx + size * 0.1, cy - size * 0.3);
  mCtx.lineTo(cx - size * 0.25, cy - size * 0.1);
  mCtx.lineTo(cx + size * 0.1, cy + size * 0.05);
  mCtx.fill();
  
  // 底座
  mCtx.fillStyle = '#666';
  mCtx.fillRect(cx - size * 0.15, cy + size * 0.25, size * 0.3, size * 0.08);
}

function drawMine(x, y, isExploded) {
  const cx = x + mCellSize / 2;
  const cy = y + mCellSize / 2;
  const r = mCellSize * 0.28;
  
  if (isExploded) {
    // 爆炸背景
    mCtx.fillStyle = 'rgba(255, 23, 68, 0.3)';
    mCtx.fillRect(x + 1, y + 1, mCellSize - 2, mCellSize - 2);
  }
  
  // 外发光
  const glow = mCtx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.5);
  glow.addColorStop(0, isExploded ? 'rgba(255, 23, 68, 0.8)' : 'rgba(255, 82, 82, 0.4)');
  glow.addColorStop(1, 'transparent');
  mCtx.fillStyle = glow;
  mCtx.fillRect(x, y, mCellSize, mCellSize);
  
  // 地雷主体
  mCtx.fillStyle = isExploded ? '#ff1744' : COLORS.mine;
  mCtx.beginPath();
  mCtx.arc(cx, cy, r, 0, Math.PI * 2);
  mCtx.fill();
  
  // 高光
  mCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  mCtx.beginPath();
  mCtx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.25, 0, Math.PI * 2);
  mCtx.fill();
  
  // 刺
  mCtx.strokeStyle = isExploded ? '#ff5252' : '#c62828';
  mCtx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const x1 = cx + Math.cos(angle) * r * 0.7;
    const y1 = cy + Math.sin(angle) * r * 0.7;
    const x2 = cx + Math.cos(angle) * r * 1.3;
    const y2 = cy + Math.sin(angle) * r * 1.3;
    mCtx.beginPath();
    mCtx.moveTo(x1, y1);
    mCtx.lineTo(x2, y2);
    mCtx.stroke();
  }
}

function drawNumber(x, y, num) {
  const cx = x + mCellSize / 2;
  const cy = y + mCellSize / 2;
  const color = NUM_COLORS[num] || '#fff';
  
  // 发光效果
  mCtx.shadowColor = color;
  mCtx.shadowBlur = 8;
  
  mCtx.fillStyle = color;
  mCtx.font = `bold ${mCellSize * 0.55}px "Courier New", monospace`;
  mCtx.textAlign = 'center';
  mCtx.textBaseline = 'middle';
  mCtx.fillText(num.toString(), cx, cy + 1);
  
  // 重置阴影
  mCtx.shadowBlur = 0;
}

function reveal(r, c) {
  if (mGameOver || mRevealed[r][c] || mFlagged[r][c]) return;
  
  // 首次点击保护
  if (mFirstClick) {
    if (mBoard[r][c] === -1) {
      // 把雷移走
      mBoard[r][c] = 0;
      let placed = 0;
      while (placed < 1) {
        const nr = Math.floor(Math.random() * mRows);
        const nc = Math.floor(Math.random() * mCols);
        if (!(nr === r && nc === c) && mBoard[nr][nc] !== -1) {
          mBoard[nr][nc] = -1;
          placed++;
        }
      }
      // 重新计算数字
      for (let i = 0; i < mRows; i++) {
        for (let j = 0; j < mCols; j++) {
          if (mBoard[i][j] !== -1) {
            let cnt = 0;
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const nr = i + dr, nc = j + dc;
                if (nr >= 0 && nr < mRows && nc >= 0 && nc < mCols && mBoard[nr][nc] === -1) {
                  cnt++;
                }
              }
            }
            mBoard[i][j] = cnt;
          }
        }
      }
    }
    mFirstClick = false;
    mTimerInterval = setInterval(() => {
      mSeconds++;
      document.getElementById('mineTimer').textContent = mSeconds.toString().padStart(3, '0');
    }, 1000);
  }
  
  mRevealed[r][c] = true;
  
  if (mBoard[r][c] === -1) {
    // 踩雷
    gameOver(false);
  } else if (mBoard[r][c] === 0) {
    // 空白扩散
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < mRows && nc >= 0 && nc < mCols) {
          reveal(nr, nc);
        }
      }
    }
  }
  
  checkWin();
  drawMines();
}

function toggleFlag(r, c) {
  if (mGameOver || mRevealed[r][c]) return;
  mFlagged[r][c] = !mFlagged[r][c];
  updateMineCounter();
  drawMines();
}

function updateMineCounter() {
  let flagCount = 0;
  for (let r = 0; r < mRows; r++) {
    for (let c = 0; c < mCols; c++) {
      if (mFlagged[r][c]) flagCount++;
    }
  }
  const remaining = mMines - flagCount;
  document.getElementById('mineCounter').textContent = remaining.toString().padStart(3, '0');
}

function updateSmiley(face) {
  const btn = document.getElementById('mineSmiley');
  if (btn) btn.textContent = face;
}

function gameOver(won) {
  mGameOver = true;
  mWon = won;
  clearInterval(mTimerInterval);
  
  // 显示所有雷
  for (let r = 0; r < mRows; r++) {
    for (let c = 0; c < mCols; c++) {
      if (mBoard[r][c] === -1) {
        mRevealed[r][c] = true;
      }
    }
  }
  
  updateSmiley(won ? '😎' : '😵');
  drawMines();
}

function checkWin() {
  let revealedCount = 0;
  for (let r = 0; r < mRows; r++) {
    for (let c = 0; c < mCols; c++) {
      if (mRevealed[r][c] && mBoard[r][c] !== -1) {
        revealedCount++;
      }
    }
  }
  
  if (revealedCount === mRows * mCols - mMines) {
    gameOver(true);
  }
}

// 打开/关闭弹窗
function openMine() {
  document.getElementById('mineModal').style.display = 'flex';
  initMinesweeper();
}

function closeMine() {
  document.getElementById('mineModal').style.display = 'none';
  clearInterval(mTimerInterval);
}
