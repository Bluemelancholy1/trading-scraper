const fs = require('fs');
const p = JSON.parse(fs.readFileSync('package.json','utf8'));
p.build.win = p.build.win || {};
p.build.nsis = p.build.nsis || {};
p.build.win.artifactName = 'trading-scraper-setup-${version}.${ext}';
p.build.nsis.artifactName = 'trading-scraper-setup-${version}.${ext}';
fs.writeFileSync('package.json', JSON.stringify(p,null,2) + '\n');
console.log('artifactName set to:', p.build.win.artifactName);
