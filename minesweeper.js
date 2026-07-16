// === Minesweeper - 暗黑科技风 ===
let mBoard = [], mRevealed = [], mFlagged = [];
let mRows = 9, mCols = 9, mMines = 10;
let mGameOver = false, mWon = false, mFirstClick = true;
let mTimerInterval = null, mSeconds = 0;
let mCanvas, mCtx, mCellSize;
let mHoverCell = null;
let mPressedCell = null;  // 正在按下的格子
let mExplodingCells = []; // 爆炸动画中的格子
let mConfetti = [];       // 胜利彩带
let mAnimationId = null;  // 动画帧ID

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
  mSeconds = 0; mHoverCell = null; mPressedCell = null;
  mExplodingCells = []; mConfetti = [];
  if (mAnimationId) { cancelAnimationFrame(mAnimationId); mAnimationId = null; }
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
    if (mGameOver) return;
    const rect = mCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const c = Math.floor(x / mCellSize);
    const r = Math.floor(y / mCellSize);
    
    if (r >= 0 && r < mRows && c >= 0 && c < mCols) {
      if (!mRevealed[r][c]) {
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
    mPressedCell = null;
    drawMines();
  });
  
  // 左键按下
  mCanvas.addEventListener('mousedown', (e) => {
    if (mGameOver) return;
    const rect = mCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const c = Math.floor(x / mCellSize);
    const r = Math.floor(y / mCellSize);
    
    if (r >= 0 && r < mRows && c >= 0 && c < mCols) {
      if (e.button === 0) { // 左键
        if (!mFlagged[r][c] && !mRevealed[r][c]) {
          mPressedCell = { r, c };
          updateSmiley('😮'); // 紧张表情
          drawMines();
        }
      }
    }
  });
  
  // 全局鼠标松开（处理拖出canvas的情况）
  document.addEventListener('mouseup', () => {
    if (mPressedCell && !mGameOver) {
      mPressedCell = null;
      updateSmiley('😎');
      drawMines();
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
  
  // 绘制胜利彩带
  if (mWon && mConfetti.length > 0) {
    drawConfetti();
  }
}

function drawCell(r, c) {
  const x = c * mCellSize;
  const y = r * mCellSize;
  const pad = 1;
  
  // 检查是否在爆炸动画中
  const exploding = mExplodingCells.find(e => e.r === r && e.c === c);
  if (exploding) {
    drawExplodingCell(x, y, exploding.phase);
    return;
  }
  
  if (!mRevealed[r][c]) {
    // 未揭开的格子 - 3D 凸起效果
    const isHover = mHoverCell && mHoverCell.r === r && mHoverCell.c === c;
    const isPressed = mPressedCell && mPressedCell.r === r && mPressedCell.c === c;
    
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

// 爆炸动画绘制
function drawExplodingCell(x, y, phase) {
  const pad = 1;
  const shakeX = (Math.random() - 0.5) * 4 * phase;
  const shakeY = (Math.random() - 0.5) * 4 * phase;
  
  // 背景变红闪烁
  const redIntensity = 0.3 + phase * 0.5;
  mCtx.fillStyle = `rgba(255, 23, 68, ${redIntensity})`;
  mCtx.fillRect(x + pad + shakeX, y + pad + shakeY, mCellSize - pad * 2, mCellSize - pad * 2);
  
  // 爆炸波纹
  const cx = x + mCellSize / 2 + shakeX;
  const cy = y + mCellSize / 2 + shakeY;
  const rippleRadius = mCellSize * 0.3 + phase * mCellSize * 0.5;
  
  const grad = mCtx.createRadialGradient(cx, cy, 0, cx, cy, rippleRadius);
  grad.addColorStop(0, 'rgba(255, 23, 68, 0.8)');
  grad.addColorStop(0.5, 'rgba(255, 100, 50, 0.4)');
  grad.addColorStop(1, 'transparent');
  
  mCtx.fillStyle = grad;
  mCtx.beginPath();
  mCtx.arc(cx, cy, rippleRadius, 0, Math.PI * 2);
  mCtx.fill();
  
  // 地雷
  drawMine(x + shakeX, y + shakeY, true);
}

// 初始化胜利彩带
function initConfetti() {
  mConfetti = [];
  const colors = ['#f0c040', '#00bcd4', '#4caf50', '#ff5252', '#7c4dff', '#ff9800'];
  for (let i = 0; i < 100; i++) {
    mConfetti.push({
      x: Math.random() * mCanvas.width,
      y: Math.random() * mCanvas.height - mCanvas.height,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 6 + 4,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2
    });
  }
}

// 绘制彩带动画
function drawConfetti() {
  if (!mWon || mConfetti.length === 0) return;
  
  let active = false;
  for (let p of mConfetti) {
    if (p.y < mCanvas.height + 20) {
      active = true;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      
      mCtx.save();
      mCtx.translate(p.x, p.y);
      mCtx.rotate(p.rotation);
      mCtx.fillStyle = p.color;
      mCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      mCtx.restore();
    }
  }
  
  if (active && mAnimationId) {
    requestAnimationFrame(drawConfettiLoop);
  }
}

function drawConfettiLoop() {
  drawMines();
  drawConfetti();
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
  
  if (!won) {
    // 爆炸动画 - 找到踩中的雷开始
    let explodedR = -1, explodedC = -1;
    for (let r = 0; r < mRows; r++) {
      for (let c = 0; c < mCols; c++) {
        if (mBoard[r][c] === -1 && mRevealed[r][c]) {
          explodedR = r;
          explodedC = c;
        }
      }
    }
    
    // 触发爆炸动画
    if (explodedR >= 0) {
      triggerExplosion(explodedR, explodedC);
    }
    
    // 延迟显示所有雷
    setTimeout(() => {
      for (let r = 0; r < mRows; r++) {
        for (let c = 0; c < mCols; c++) {
          if (mBoard[r][c] === -1) {
            mRevealed[r][c] = true;
          }
        }
      }
      drawMines();
    }, 600);
  }
  
  updateSmiley(won ? '😎' : '😵');
  drawMines();
}

// 触发爆炸动画
function triggerExplosion(startR, startC) {
  mExplodingCells = [];
  const queue = [{ r: startR, c: startC, delay: 0 }];
  const visited = new Set([`${startR},${startC}`]);
  
  // BFS 扩散爆炸效果
  while (queue.length > 0) {
    const { r, c, delay } = queue.shift();
    mExplodingCells.push({ r, c, phase: 0, delay });
    
    // 相邻格子
    const neighbors = [
      [r-1, c], [r+1, c], [r, c-1], [r, c+1],
      [r-1, c-1], [r-1, c+1], [r+1, c-1], [r+1, c+1]
    ];
    
    for (const [nr, nc] of neighbors) {
      if (nr >= 0 && nr < mRows && nc >= 0 && nc < mCols && 
          mBoard[nr][nc] === -1 && !visited.has(`${nr},${nc}`)) {
        visited.add(`${nr},${nc}`);
        queue.push({ r: nr, c: nc, delay: delay + 100 });
      }
    }
  }
  
  // 动画循环
  let startTime = null;
  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    
    let active = false;
    for (let cell of mExplodingCells) {
      if (elapsed >= cell.delay) {
        const progress = (elapsed - cell.delay) / 400; // 400ms 动画
        if (progress < 1) {
          cell.phase = 1 - progress;
          active = true;
        } else {
          cell.phase = 0;
        }
      } else {
        active = true;
      }
    }
    
    drawMines();
    
    if (active) {
      requestAnimationFrame(animate);
    } else {
      mExplodingCells = [];
    }
  }
  
  requestAnimationFrame(animate);
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
    // 触发胜利彩带
    initConfetti();
    mAnimationId = requestAnimationFrame(drawConfettiLoop);
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
