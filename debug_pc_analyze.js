const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\chen\\.qclaw\\workspace\\trading-scraper\\pc_raw.html', 'utf8');

// 检查所有带数字的class属性
const classes = html.match(/class="[^"]*data\d+[^"]*"/g);
if (classes) {
  console.log('=== 所有带data数字的class ===');
  classes.forEach(c => console.log(c));
}

// 看title行
const titleMatch = html.match(/<div class="title">[\s\S]{0,1000}<\/div>\s*<div class="dl">/);
if (titleMatch) {
  console.log('\n=== title + dl 区域 ===');
  console.log(titleMatch[0]);
} else {
  console.log('\n=== 搜索 title 区域 ===');
  const lines = html.split('\n');
  let inTitle = false;
  for (const line of lines) {
    if (line.includes('class="title"')) inTitle = true;
    if (inTitle) {
      console.log(line.trim());
      if (line.includes('class="dl"')) { inTitle = false; break; }
    }
  }
}

// 看前几条数据的完整结构
console.log('\n=== 第一条li完整结构 ===');
const liMatch = html.match(/<li>[\s\S]{0,2000}<li>/);
if (liMatch) {
  console.log(liMatch[0].substring(0, 1500));
}
