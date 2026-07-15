const fs = require('fs');
const path = require('path');
const dirs = ['C:/Users/chen/.qclaw/workspace/trading-scraper'];
const files = ['proxy-server.js', 'app.js', 'index.html', 'main.js', 'README.md', 'CHANGELOG.md', 'dist4/release-notes.md'];
const pattern = /V18|v18|err.*18|18.*err/i;

for (const dir of dirs) {
  for (const file of files) {
    const fp = path.join(dir, file);
    if (!fs.existsSync(fp)) continue;
    const content = fs.readFileSync(fp, 'utf8');
    const lines = content.split('\n');
    const matches = lines.filter((l, i) => pattern.test(l));
    if (matches.length > 0) {
      console.log(`\n=== ${file} ===`);
      matches.forEach(m => console.log(m.trim()));
    }
  }
}

// Also check for "V18" in all JS files
const allJs = fs.readdirSync(dirs[0]).filter(f => f.endsWith('.js'));
console.log('\n=== All JS files with V18 or err18 ===');
for (const file of allJs) {
  const fp = path.join(dirs[0], file);
  const content = fs.readFileSync(fp, 'utf8');
  const lines = content.split('\n');
  const matches = lines.filter((l, i) => pattern.test(l));
  if (matches.length > 0) {
    console.log(`${file}: ${matches.length} match(es)`);
    matches.forEach(m => console.log('  ' + m.trim().substring(0, 120)));
  }
}
