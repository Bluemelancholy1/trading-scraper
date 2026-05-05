# 强制抓取最新数据（加时间戳防缓存）
$body = '{"appPass":"881199","password":"881199","phone":"16616135917","pass":"135917","pages":8,"mode":"jc","bust":1735478400}'
$resp = Invoke-WebRequest -Uri 'http://localhost:3456/fetch' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing -TimeoutSec 180
$json = $resp.Content | ConvertFrom-Json

Write-Host "=== 强制刷新 建仓页（8页）==="
Write-Host "Total: $($json.rows.Count)"
Write-Host "Cached: $($json.cached)"

# 找4/29有SL/TP的
$today = $json.rows | Where-Object { $_.openTime -like '*2026/4/29*' }
Write-Host "4/29记录数: $($today.Count)"
foreach ($r in $today) {
    $sl = if ($r.stopLoss -ne '') { $r.stopLoss } else { "(空)" }
    $tp = if ($r.takeProfit -ne '') { $r.takeProfit } else { "(空)" }
    Write-Host "$($r.openTime) | $($r.product) | $($r.direction) | open=$($r.openPrice) | SL=$sl | TP=$tp | teacher=$($r.teacher)"
}

# 统计有/无SL/TP
$hasSL = ($json.rows | Where-Object { $_.stopLoss -ne '' }).Count
$noSL = ($json.rows | Where-Object { $_.stopLoss -eq '' }).Count
Write-Host ""
Write-Host "=== 全部8页统计 ==="
Write-Host "有SL: $hasSL / 无SL: $noSL"