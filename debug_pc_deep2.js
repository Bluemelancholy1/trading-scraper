const fs = require('fs');
const html = fs.readFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/pc_raw.html', 'utf8');

console.log('File size:', html.length, 'bytes');
console.log('Contains "data7":', html.includes('data7'));
console.log('Contains "data8":', html.includes('data8'));

// Find ALL spans with any class - including inside <li> items
// The issue might be that data7/data8 are in a different part of the HTML
const allSpans = html.match(/<span class="[^"]*"[^>]*>[^<]*<\/span>/g);
console.log('\nTotal spans found:', allSpans ? allSpans.length : 0);

// Group by class
const byClass = {};
if (allSpans) {
  allSpans.forEach(s => {
    const cm = s.match(/class="([^"]*)"/);
    if (cm) {
      const cls = cm[1];
      if (!byClass[cls]) byClass[cls] = [];
      byClass[cls].push(s);
    }
  });
}

for (const [cls, spans] of Object.entries(byClass)) {
  console.log(`\n${cls}: ${spans.length} occurrences`);
  if (spans.length <= 5) {
    spans.forEach(s => console.log('  ', s.substring(0, 120)));
  } else {
    console.log('  [first 3]:');
    spans.slice(0, 3).forEach(s => console.log('  ', s.substring(0, 120)));
    console.log('  [last 3]:');
    spans.slice(-3).forEach(s => console.log('  ', s.substring(0, 120)));
  }
}

// Also do a raw search for "data7" context
console.log('\n=== RAW "data7" CONTEXT ===');
const d7idx = [];
let idx = 0;
while ((idx = html.indexOf('data7', idx)) !== -1) {
  d7idx.push(idx);
  idx++;
}
d7idx.forEach(i => {
  console.log(`  pos ${i}: ...${html.substring(Math.max(0,i-30), i+50)}...`);
});

console.log('\n=== RAW "data8" CONTEXT ===');
const d8idx = [];
idx = 0;
while ((idx = html.indexOf('data8', idx)) !== -1) {
  d8idx.push(idx);
  idx++;
}
d8idx.forEach(i => {
  console.log(`  pos ${i}: ...${html.substring(Math.max(0,i-30), i+50)}...`);
});
