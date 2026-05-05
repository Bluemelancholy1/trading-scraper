$body = '{"appPass":"881199","password":"881199","phone":"16616135917","pass":"135917","pages":5,"mode":"jc","filters":{"date":"2026/04/29"}}'
$resp = Invoke-WebRequest -Uri 'http://localhost:3456/fetch' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing -TimeoutSec 120
$json = $resp.Content | ConvertFrom-Json

Write-Host "=== 建仓页 4/29 全部记录 ==="
Write-Host "Total: $($json.rows.Count)"

# 找上午9-13点的记录
$amRecords = $json.rows | Where-Object { $_.openTime -like '*2026/4/29 0*' -or $_.openTime -like '*2026/4/29 1*' -or $_.openTime -like '*2026/4/29 9*' -or $_.openTime -like '*2026/4/29 10*' -or $_.openTime -like '*2026/4/29 11*' -or $_.openTime -like '*2026/4/29 12*' -or $_.openTime -like '*2026/4/29 13:*' }
Write-Host "上午记录数: $($amRecords.Count)"
foreach ($r in $amRecords) {
    Write-Host "$($r.openTime) | $($r.product) | $($r.direction) | open=$($r.openPrice) | SL=$($r.stopLoss) TP=$($r.takeProfit) | teacher=$($r.teacher)"
}