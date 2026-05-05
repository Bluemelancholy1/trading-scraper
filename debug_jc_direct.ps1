# 直接请求建仓页原始数据
$body = '{"appPass":"881199","password":"881199","phone":"16616135917","pass":"135917","pages":3,"mode":"jc","filters":{"date":"2026/04/29"}}'
$resp = Invoke-WebRequest -Uri 'http://localhost:3456/fetch' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing -TimeoutSec 120
$json = $resp.Content | ConvertFrom-Json

Write-Host "=== 建仓页JC模式 4/29 ==="
Write-Host "Total: $($json.rows.Count)"

# 检查前几页
Write-Host "=== 第一页前3条 ==="
for ($i = 0; $i -lt 3; $i++) {
    $r = $json.rows[$i]
    Write-Host "$($r.openTime) | $($r.product) | $($r.direction) | open=$($r.openPrice) | SL=$($r.stopLoss) TP=$($r.takeProfit)"
}

# 统计有无SL/TP
$withSL = ($json.rows | Where-Object { $_.stopLoss -ne '' }).Count
$withoutSL = ($json.rows | Where-Object { $_.stopLoss -eq '' }).Count
Write-Host ""
Write-Host "有止损: $withSL / 无止损: $withoutSL"

# 打印所有有止损止盈的记录
Write-Host ""
Write-Host "=== 有SL/TP的记录 ==="
foreach ($r in $json.rows) {
    if ($r.stopLoss -ne '' -or $r.takeProfit -ne '') {
        Write-Host "$($r.openTime) | $($r.product) | $($r.direction) | open=$($r.openPrice) | SL=$($r.stopLoss) TP=$($r.takeProfit)"
    }
}