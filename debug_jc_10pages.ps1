$body = '{"appPass":"881199","password":"881199","phone":"16616135917","pass":"135917","pages":10,"mode":"jc"}'
$resp = Invoke-WebRequest -Uri 'http://localhost:3456/fetch' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing -TimeoutSec 180
$json = $resp.Content | ConvertFrom-Json

Write-Host "=== 建仓页全部记录（10页）==="
Write-Host "Total: $($json.rows.Count)"

# 只显示有SL/TP的
$hasSL = $json.rows | Where-Object { $_.stopLoss -ne '' -or $_.takeProfit -ne '' }
Write-Host "有SL/TP的记录: $($hasSL.Count)"

# 找4/29所有记录
$today = $json.rows | Where-Object { $_.openTime -like '*2026/4/29*' }
Write-Host "4/29 记录数: $($today.Count)"
foreach ($r in $today) {
    Write-Host "$($r.openTime) | $($r.product) | $($r.direction) | open=$($r.openPrice) | SL=$($r.stopLoss) TP=$($r.takeProfit)"
}

# 没有SL/TP的4/29记录
$noData = $today | Where-Object { $_.stopLoss -eq '' -and $_.takeProfit -eq '' }
Write-Host ""
Write-Host "4/29 没有SL/TP的记录: $($noData.Count)"
foreach ($r in $noData) {
    Write-Host "$($r.openTime) | $($r.product) | $($r.direction) | open=$($r.openPrice) | teacher=$($r.teacher)"
}