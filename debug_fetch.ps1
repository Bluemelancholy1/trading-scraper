$body = '{"appPass":"881199","password":"881199","phone":"16616135917","pass":"135917","pages":3,"mode":"merged"}'
$resp = Invoke-WebRequest -Uri 'http://localhost:3456/fetch' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing -TimeoutSec 60
$data = $resp.Content | ConvertFrom-Json

if ($data.ok) {
    Write-Host "Total records: $($data.data.records.Count)"
    Write-Host ""

    # 找4/29 11:04附近的
    $target = $data.data.records | Where-Object { $_.openTime -like '*2026/04/29 11:04*' }
    if ($target) {
        Write-Host "=== 找到精确11:04记录 ==="
        foreach ($r in $target) {
            Write-Host "openTime=$($r.openTime) stopLoss=$($r.stopLoss) takeProfit=$($r.takeProfit) direction=$($r.direction) product=$($r.product) teacher=$($r.teacher) openPrice=$($r.openPrice)"
        }
    } else {
        Write-Host "没找到精确11:04，找11点附近的"
        $nearby = $data.data.records | Where-Object { $_.openTime -like '*2026/04/29 11:*' }
        foreach ($r in $nearby) {
            Write-Host "$($r.openTime) | $($r.product) | $($r.direction) | open=$($r.openPrice) | stopLoss=$($r.stopLoss) | takeProfit=$($r.takeProfit) | teacher=$($r.teacher)"
        }
    }
    
    Write-Host ""
    Write-Host "=== 4/29 所有记录 ==="
    $today = $data.data.records | Where-Object { $_.openTime -like '*2026/04/29*' }
    Write-Host "4/29 记录数: $($today.Count)"
    foreach ($r in $today) {
        Write-Host "$($r.openTime) | $($r.product) | $($r.direction) | SL=$($r.stopLoss) TP=$($r.takeProfit) | teacher=$($r.teacher)"
    }
} else {
    Write-Host "Error: $($data.error)"
}