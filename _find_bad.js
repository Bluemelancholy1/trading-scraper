const fs = require('fs');
const c = fs.readFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/app.js', 'utf8');
const lines = c.split('\n');
lines.forEach((l, i) => {
  if (l.includes('cument') && !l.includes('document')) {
    console.log('Line', i+1, ':', l.substring(0, 100));
  }
});
