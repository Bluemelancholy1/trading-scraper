const fs = require('fs');
const buf = fs.readFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/app.js');

// The first occurrence of 'document' should be at 2079
// Let's see the exact bytes around there
console.log('Bytes 2070-2100:');
for (let i = 2070; i < 2100; i++) {
  const b = buf[i];
  const char = b >= 32 && b < 127 ? String.fromCharCode(b) : '.';
  console.log(i, b.toString(16).padStart(2,'0'), JSON.stringify(char));
}
