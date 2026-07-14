// === Lottery ===
// 数组顺序 = 扇区顺序 = 概率顺序（从 12 点钟方向顺时针）
// 索引 0 在 12 点位置（指针正下方），其余顺时针排列
// 陈少要求：抽不到奖励，所以 1/2/3 等奖 0%，谢谢惠顾 + 再抽一次 = 100%
const LOTTERY_PRIZES = [
  { name: '一等奖',   amount: '¥66',     prob: 0,    color: '#ffd700', textColor: '#1a1d2e' },
  { name: '二等奖',   amount: '¥6',      prob: 0,    color: '#c0c0c0', textColor: '#1a1d2e' },
  { name: '三等奖',   amount: '¥0.6',    prob: 0,    color: '#cd7f32', textColor: '#fff'    },
  { name: '谢谢惠顾', amount: '再来一次', prob: 50,   color: '#555555', textColor: '#fff'    },
  { name: '再抽一次', amount: '免费再抽', prob: 50,   color: '#3498db', textColor: '#fff'    },
];
let lotterySpinning = false;
let lotteryCurrentAngle = 0;

function drawLotteryWheel(angle) {
  const canvas = document.getElementById('lotteryCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2, r = Math.min(W,H)/2 - 8;
  const n = LOTTERY_PRIZES.length;
  const arc = (Math.PI * 2) / n;
  // 12 点钟方向 = -PI/2
  const startBase = -Math.PI / 2;

  ctx.clearRect(0, 0, W, H);

  // 绘制扇区
  for (let i = 0; i < n; i++) {
    const start = startBase + angle + i * arc;
    const end   = start + arc;
    const p = LOTTERY_PRIZES[i];
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = p.color;
    ctx.fill();
    // 扇区边框
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 文字
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + arc/2);
    ctx.textAlign = 'center';
    ctx.fillStyle = p.textColor;
    ctx.font = 'bold 14px Microsoft YaHei';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 3;
    ctx.fillText(p.name, r * 0.62, 0);
    ctx.shadowBlur = 0;
    ctx.font = '11px Microsoft YaHei';
    ctx.fillText(p.amount, r * 0.62, 16);
    ctx.restore();
  }

  // 外圈装饰
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.strokeStyle = '#f0c040';
  ctx.lineWidth = 4;
  ctx.stroke();

  // 内圈装饰
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1d2e';
  ctx.fill();
  ctx.strokeStyle = '#f0c040';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f0c040';
  ctx.font = 'bold 14px Microsoft YaHei';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GO', cx, cy);
}

function openLottery() {
  document.getElementById('lotteryModal').classList.add('show');
  document.getElementById('lotteryResult').className = 'lottery-result';
  document.getElementById('lotteryResult').textContent = '';
  drawLotteryWheel(lotteryCurrentAngle * Math.PI / 180);
}

function closeLottery() {
  document.getElementById('lotteryModal').classList.remove('show');
}

function doLotteryDraw() {
  if (lotterySpinning) return;
  lotterySpinning = true;
  const btn = document.getElementById('lotteryDrawBtn');
  btn.disabled = true;
  btn.textContent = '抽奖中...';

  // 根据概率抽取奖项
  const r = Math.random() * 100;
  let acc = 0;
  let pickIdx = LOTTERY_PRIZES.length - 1; // 默认最后一项（兑底防止全部 prob=0/累加不命中）
  for (let i = 0; i < LOTTERY_PRIZES.length; i++) {
    acc += LOTTERY_PRIZES[i].prob;
    if (r < acc) { pickIdx = i; break; }
  }

  // 目标角度计算：让 pickIdx 扇区落在 12 点钟方向
  const n = LOTTERY_PRIZES.length;
  const degPerSector = 360 / n;
  const targetAngleDeg = -(pickIdx + 0.5) * degPerSector;
  const currentAngleDeg = ((lotteryCurrentAngle % 360) + 360) % 360;
  let diff = (targetAngleDeg - currentAngleDeg);
  diff = ((diff % 360) + 360) % 360;
  const totalSpin = 360 * (5 + Math.random() * 3) + diff;
  const newAngle = lotteryCurrentAngle + totalSpin;

  // 动画
  const duration = 4500;
  const startTime = performance.now();
  const startAngle = lotteryCurrentAngle;

  function animate(now) {
    const t = Math.min(1, (now - startTime) / duration);
    // easeOutCubic
    const eased = 1 - Math.pow(1 - t, 3);
    lotteryCurrentAngle = startAngle + totalSpin * eased;
    drawLotteryWheel(lotteryCurrentAngle * Math.PI / 180);
    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      // 完成
      lotterySpinning = false;
      btn.disabled = false;
      btn.textContent = '再抽一次';
      showLotteryResult(pickIdx);
    }
  }
  requestAnimationFrame(animate);
}

function showLotteryResult(idx) {
  const p = LOTTERY_PRIZES[idx];
  const el = document.getElementById('lotteryResult');
  el.className = 'lottery-result show';
  if (p.name === '一等奖' || p.name === '二等奖' || p.name === '三等奖') {
    el.classList.add('win');
    el.innerHTML = `🎉 恭喜中奖！<br>获得 <b>${p.name}</b> - ${p.amount}`;
  } else if (p.name === '谢谢惠顾') {
    el.classList.add('lose');
    el.innerHTML = `😢 ${p.name}<br><span style="font-size:13px;font-weight:normal">${p.amount}</span>`;
  } else {
    el.classList.add('retry');
    el.innerHTML = `🔄 ${p.name}！<br><span style="font-size:13px;font-weight:normal">${p.amount}</span>`;
  }
}
