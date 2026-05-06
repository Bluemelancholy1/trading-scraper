const https = require('https');
const url = 'https://qh.yemacaijing.net/_Data_End_Show.asp?roomid=7000&page=1';
const headers = {
  'Cookie': 'Guest_Name=4ufwU803; ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; bg_img=images%2Fbg%2F23.jpg; ASPSESSIONIDACTRAADQ=BFOFLJDBGMOBNBKPGBALNHNG',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};
https.get(url, { headers }, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('HTTP', res.statusCode, '| Size:', d.length);
    console.log('First 200 chars:', d.slice(0, 200));
  });
}).on('error', e => console.log('ERR:', e.message));