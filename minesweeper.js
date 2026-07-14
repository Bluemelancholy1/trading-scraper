// === Minesweeper ===
let mBoard = [], mRevealed = [], mFlagged = [], mRows = 9, mCols = 9, mMines = 10, mGameOver = false, mWon = false, mFirstClick = true, mTimerInterval = null, mSeconds = 0;

function initMinesweeper() {
  mBoard = []; mRevealed = []; mFlagged = []; mGameOver = false; mWon = false; mFirstClick = true; mSeconds = 0;
  clearInterval(mTimerInterval); mTimerInterval = null;
  for (let r = 0; r < mRows; r++) { mBoard[r] = []; mRevealed[r] = []; mFlagged[r] = []; for (let c = 0; c < mCols; c++) { mBoard[r][c] = 0; mRevealed[r][c] = false; mFlagged[r][c] = false; } }
  let placed = 0;
  while (placed < mMines) { const r = Math.floor(Math.random() * mRows), c = Math.floor(Math.random() * mCols); if (mBoard[r][c] !== -1) { mBoard[r][c] = -1; placed++; } }
  for (let r = 0; r < mRows; r++) for (let c = 0; c < mCols; c++) if (mBoard[r][c] !== -1) { let cnt = 0; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const nr = r+dr, nc = c+dc; if (nr>=0&&nr<mRows&&nc>=0&&nc<mCols&&mBoard[nr][nc]===-1) cnt++; } mBoard[r][c] = cnt; }
  if (mTimerInterval) clearInterval(mTimerInterval);
  document.getElementById('mineStatus').textContent = '💣 剩余雷数：' + mMines;
  document.getElementById('mineTimer').textContent = '0';
  document.getElementById('mineFlagCount').textContent = '0';
  drawMines();
}

function drawMines() {
  const canvas = document.getElementById('mineCanvas');
  const ctx = canvas.getContext('2d');
  const cellSize = canvas.width / mCols;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // 白底
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const numColors = {1:'#3498db',2:'#27ae60',3:'#e74c3c',4:'#8e44ad',5:'#c0392b',6:'#16a085',7:'#2c3e50',8:'#7f8c8d'};
  for (let r = 0; r < mRows; r++) {
    for (let c = 0; c < mCols; c++) {
      const x = c * cellSize, y = r * cellSize;
      // 格子黑线框
      ctx.strokeStyle = '#000000'; ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
      // 未揭开的格子：浅灰底
      if (!mRevealed[r][c] && !mGameOver) {
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(x+1, y+1, cellSize-2, cellSize-2);
      }
      if (mRevealed[r][c]) {
        // 揭开的格子：白底
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x+1, y+1, cellSize-2, cellSize-2);
        if (mBoard[r][c] === -1) {
          // 雷：红色圆
          ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(x+cellSize/2, y+cellSize/2, cellSize*0.28, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.stroke();
        } else if (mBoard[r][c] > 0) {
          // 数字
          ctx.fillStyle = numColors[mBoard[r][c]] || '#000';
          ctx.font = 'bold ' + (cellSize * 0.52) + 'px monospace';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(mBoard[r][c], x+cellSize/2, y+cellSize/2);
        }
      }
      if (mFlagged[r][c]) {
        // 旗
        ctx.font = (cellSize * 0.55) + 'px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🚩', x+cellSize/2, y+cellSize/2);
      }
      if (mGameOver && mBoard[r][c] === -1 && !mFlagged[r][c]) {
        // 游戏结束时显示未标记的雷
        ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(x+cellSize/2, y+cellSize/2, cellSize*0.28, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.stroke();
      }
    }
  }
  // Win check
  let revealedCount = 0;
  for (let r = 0; r < mRows; r++) for (let c = 0; c < mCols; c++) if (mRevealed[r][c]) revealedCount++;
  if (revealedCount === mRows * mCols - mMines) {
    mGameOver = true; mWon = true;
    document.getElementById('mineStatus').textContent = '🎉 恭喜胜利！用时 ' + mSeconds + ' 秒';
  }
}

function reveal(r, c) {
  if (mGameOver || mRevealed[r][c] || mFlagged[r][c]) return;
  if (mFirstClick) {
    // First click never a mine — regenerate if needed
    if (mBoard[r][c] === -1) {
      mBoard[r][c] = 0;
      let placed = 0;
      while (placed < 1) {
        const nr = Math.floor(Math.random() * mRows), nc = Math.floor(Math.random() * mCols);
        if (!(nr === r && nc === c) && mBoard[nr][nc] !== -1) { mBoard[nr][nc] = -1; placed++; }
      }
      for (let i = 0; i < mRows; i++) for (let j = 0; j < mCols; j++) if (mBoard[i][j] !== -1) {
        let cnt = 0; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          const nr = i+dr, nc = j+dc; if (nr>=0&&nr<mRows&&nc>=0&&nc<mCols&&mBoard[nr][nc]===-1) cnt++;
        } mBoard[i][j] = cnt;
      }
    }
    mFirstClick = false;
    mTimerInterval = setInterval(() => { mSeconds++; document.getElementById('mineTimer').textContent = mSeconds; }, 1000);
  }
  mRevealed[r][c] = true;
  if (mBoard[r][c] === -1) {
    mGameOver = true; clearInterval(mTimerInterval);
    // Reveal all mines
    for (let i = 0; i < mRows; i++) for (let j = 0; j < mCols; j++) if (mBoard[i][j] === -1) mRevealed[i][j] = true;
    document.getElementById('mineStatus').textContent = '💥 踩雷了！游戏结束';
    drawMines(); return;
  }
  if (mBoard[r][c] === 0) for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const nr = r+dr, nc = c+dc; if (nr>=0&&nr<mRows&&nc>=0&&nc<mCols) reveal(nr, nc); }
  drawMines();
}

function toggleFlag(e) {
  e.preventDefault();
  const canvas = document.getElementById('mineCanvas');
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX, y = (e.clientY - rect.top) * scaleY;
  const cellSize = canvas.width / mCols;
  const c = Math.floor(x / cellSize), r = Math.floor(y / cellSize);
  if (r<0||r>=mRows||c<0||c>=mCols||mRevealed[r][c]||mGameOver) return;
  mFlagged[r][c] = !mFlagged[r][c];
  let flagCount = 0;
  for (let i = 0; i < mRows; i++) for (let j = 0; j < mCols; j++) if (mFlagged[i][j]) flagCount++;
  document.getElementById('mineFlagCount').textContent = flagCount;
  document.getElementById('mineStatus').textContent = '💣 剩余雷数：' + (mMines - flagCount);
  drawMines();
}

function openMine() {
  document.getElementById('mineModal').style.display = 'flex';
  initMinesweeper();
  const canvas = document.getElementById('mineCanvas');
  canvas.onclick = function(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX, y = (e.clientY - rect.top) * scaleY;
    const cellSize = canvas.width / mCols;
    reveal(Math.floor(y / cellSize), Math.floor(x / cellSize));
  };
  canvas.oncontextmenu = toggleFlag;
}

function closeMine() {
  clearInterval(mTimerInterval);
  document.getElementById('mineModal').style.display = 'none';
}
