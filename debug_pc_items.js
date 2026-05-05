const fs = require('fs');
const html = fs.readFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/pc_raw.html', 'utf8');

// Extract all <li> records properly - need to find the actual list items
// The HTML has <li> tags but the first match picked up CSS/JS. Let's find .item divs instead
const itemRegex = /<div class="item"[^>]*>([\s\S]*?)<\/div>\s*<\/li>/g;
const items = [];
let m;
while ((m = itemRegex.exec(html)) !== null) {
  items.push(m[0]);
}

console.log('Found', items.length, '.item divs');

if (items.length > 0) {
  // Print first 3 items
  for (let i = 0; i < Math.min(3, items.length); i++) {
    console.log('\n=== ITEM ' + (i+1) + ' ===');
    console.log(items[i].substring(0, 1500));
  }
}

// Also try: find all spans with data classes to see what fields exist
console.log('\n=== ALL SPAN DATA CLASSES FOUND ===');
const spanRegex = /<span class="(data\d+)"/g;
const classes = new Set();
while ((m = spanRegex.exec(html)) !== null) {
  classes.add(m[1]);
}
console.log(Array.from(classes).sort());

// Check if any span has data7 or data8 with content
const d7match = html.match(/<span class="data7"[^>]*>([^<]*)</gi);
const d8match = html.match(/<span class="data8"[^>]*>([^<]*)</gi);
console.log('\ndata7 spans:', d7match ? d7match.length : 0);
if (d7match) d7match.forEach(s => console.log('  ', s.substring(0, 100)));
console.log('data8 spans:', d8match ? d8match.length : 0);
if (d8match) d8match.forEach(s => console.log('  ', s.substring(0, 100)));
