const fs = require('fs');
const buf = fs.readFileSync('end_test3.html');
const str = buf.toString('latin1');

// Find all data spans
const re = /<span class="data\d+">[^<]*<\/span>/g;
let m;
let count = 0;
const samples = [];
while ((m = re.exec(str)) !== null) {
  if (count < 40) samples.push(m[0]);
  count++;
}
console.log('Total data spans:', count);
samples.forEach((s, i) => console.log(i, s));

// Also check for data7 and data8 specifically
const d7re = /<span class="data7">([^<]*)<\/span>/g;
const d8re = /<span class="data8">([^<]*)<\/span>/g;
let d7 = [], d8 = [], dm;
while ((dm = d7re.exec(str)) !== null) d7.push(dm[1]);
while ((dm = d8re.exec(str)) !== null) d8.push(dm[1]);
console.log('\ndata7 (SL) values:', d7.length);
d7.slice(0,10).forEach((v,i) => console.log('  SL['+i+']:', v));
console.log('\ndata8 (TP) values:', d8.length);
d8.slice(0,10).forEach((v,i) => console.log('  TP['+i+']:', v));
