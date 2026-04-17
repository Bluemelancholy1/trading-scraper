const http = require('http');
function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({hostname:'localhost',port:3456,path,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{resolve(JSON.parse(d));}catch(e){reject(new Error(d));}});});
    req.on('error',reject);req.write(data);req.end();
  });
}
async function main() {
  await post('/login',{password:'881199'});
  // 抓全部页，找所有老师的 title
  const {rows} = await post('/fetch',{page:1,filters:{pt:'2026/04/09'}});
  const seen=new Set();
  rows.forEach(r=>{if(r.teacher&&!seen.has(r.teacher)){seen.add(r.teacher);console.log('teacher:',r.teacher);}});
  // 看raw HTML里 data12 和它前面的 data2（时间）、data5（品种）来确定
  const raw = (await post('/fetch',{page:1,filters:{pt:'2026/04/09'},raw:true}) || {};
  const fs=require('fs');
  fs.writeFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/raw-pc2.html',raw.raw||'','utf8');
  // 找所有 data12 行
  const matches=raw.raw.match(/<li[^>]*>[\s\S]*?<\/li>/g)||[];
  matches.slice(0,20).forEach((li,i)=>{
    const data2=li.match(/class="data2"[^>]*title="([^"]+)"/);
    const data12=li.match(/class="data12"[^>]*title="([^"]+)"/);
    const data5=li.match(/class="data5"[^>]*title="([^"]+)"/);
    if(data2&&data12)console.log((i+1)+'. '+data2[1]+' | '+data5[1]+' | '+data12[1]);
  });
  process.exit(0);
}
main().catch(e=>{console.error(e.message);process.exit(1);});
setTimeout(()=>{console.log('TIMEOUT');process.exit(1);},30000);
