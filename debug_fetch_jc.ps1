$body = '{"appPass":"881199","password":"881199","phone":"16616135917","pass":"135917","pages":3,"mode":"jc"}'
$resp = Invoke-WebRequest -Uri 'http://localhost:3456/fetch' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing -TimeoutSec 60
$json = $resp.Content | ConvertFrom-Json
$json | ConvertTo-Json -Depth 10