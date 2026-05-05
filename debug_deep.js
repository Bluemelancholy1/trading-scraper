// Deep analysis of pc_direct.html - look for any SL/TP data in any format
const fs = require('fs');
const html = fs.readFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/pc_direct.html', 'utf8');

console.log('=== HTML Structure Analysis ===');
console.log('Total size:', html.length, 'chars');

// Look for data7/data8 in any context
const d7Matches = html.match(/data7[^"]*"[^"]*"[^>]*>/gi);
const d8Matches = html.match(/data8[^"]*"[^"]*"[^>]*>/gi);
console.log('\ndata7 class references:', d7Matches ? d7Matches.length : 0);
console.log('data8 class references:', d8Matches ? d8Matches.length : 0);

// Check title attributes for numbers that could be SL/TP
const titles = [...html.matchAll(/title="([^"]+)"/g)].map(m => m[1]);
console.log('\n--- All title attributes ---');
titles.forEach((t, i) => console.log(i + ': ' + t));

// Look for any numbers in ranges like "25870-25920"
const ranges = html.match(/\d{4,}-\d{4,}/g);
console.log('\n--- Range-like numbers (could be TP ranges) ---');
console.log(ranges);

// Check if there's any hidden content
const hiddenContent = html.match(/display\s*:\s*none/gi);
console.log('\nHidden content (display:none):', hiddenContent ? hiddenContent.length : 0);

// Check for any JavaScript that might render data
const scripts = html.match(/<script[\s\S]*?<\/script>/gi);
console.log('\nScript tags:', scripts ? scripts.length : 0);
if (scripts && scripts.length > 0) {
  console.log('Script content preview:');
  scripts.forEach((s, i) => console.log('Script #' + i + ':', s.substring(0, 300)));
}

// Check CSS - what elements use data7/data8?
const data7css = html.match(/\.data7[^{]+\{[\s\S]*?\}/gi);
const data8css = html.match(/\.data8[^{]+\{[\s\S]*?\}/gi);
console.log('\n--- CSS for data7/data8 ---');
data7css && data7css.forEach(c => console.log('data7 CSS:', c.substring(0, 200)));
data8css && data8css.forEach(c => console.log('data8 CSS:', c.substring(0, 200)));

// Check the first li record in detail - all class attributes
const firstLi = html.match(/<li[^>]*>([\s\S]*?)<\/li>/);
if (firstLi) {
  console.log('\n--- First li full content (first 2000 chars) ---');
  console.log(firstLi[1].substring(0, 2000));
}

// Check for iframe or nested content
const iframes = html.match(/<iframe[^>]*>/gi);
console.log('\n--- Iframes ---');
console.log(iframes);

// Check for data attribute (data-* attributes)
const dataAttrs = html.match(/data-[a-z]+="[^"]*"/gi);
console.log('\n--- data-* attributes ---');
console.log(dataAttrs ? dataAttrs.slice(0, 20) : '(none)');