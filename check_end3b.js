const fs = require('fs');
const buf = fs.readFileSync('end_test3.html');
const str = buf.toString('latin1');

// Find all <li> or <div> that contain data rows
// Look for patterns like <li class="data_row"> or similar
console.log('=== Looking for data row containers ===');
const liRe = /<li[^>]*>[\s\S]*?<\/li>/g;
let m, liCount = 0;
while ((m = liRe.exec(str)) !== null) {
  liCount++;
  if (liCount <= 3) console.log('LI['+liCount+']:', m[0].substring(0, 300));
}
console.log('Total LI tags:', liCount);

// Look for ul/ol
console.log('\n=== UL/OL ===');
if (str.includes('<ul')) {
  const ulStart = str.indexOf('<ul');
  console.log('UL context:', str.substring(ulStart, ulStart + 200));
}

// Look for data2 with actual values (not header)
console.log('\n=== All data2 occurrences ===');
const d2re = /data2[^>]*>([^<]*)</g;
let d2count = 0;
while ((m = d2re.exec(str)) !== null) {
  d2count++;
  if (d2count <= 5) console.log('data2['+d2count+']:', m[1]);
}
console.log('Total data2:', d2count);

// Print a chunk of the body
console.log('\n=== BODY excerpt (chars 1500-3000) ===');
const bodyStart = str.indexOf('<body');
if (bodyStart > -1) {
  console.log(str.substring(bodyStart, bodyStart + 1500));
}
