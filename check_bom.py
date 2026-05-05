import sys
with open(r'C:\Users\chen\.qclaw\workspace\trading-scraper\proxy-server.js', 'rb') as f:
    raw = f.read(200)
print('First 10 bytes (hex):', raw[:10].hex())
print('First 10 chars:', raw[:10])
text = raw[:50].decode('utf-8-sig', errors='replace')
print('BOM stripped text preview:', repr(text))