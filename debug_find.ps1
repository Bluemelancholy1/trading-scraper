$resp = Invoke-WebRequest -Uri 'http://localhost:3456/data?pages=1&days=7' -UseBasicParsing -TimeoutSec 30
$json = $resp.Content | ConvertFrom-Json
$records = $json.records
Write-Host "Total records: $($records.Count)"
Write-Host ""

# 找4/29 11:04附近的记录
$target = $records | Where-Object { $_.openTime -like '*2026/04/29 11:04*' }
if ($target) {
    $target | ConvertTo-Json -Depth 10
} else {
    Write-Host "=== 没找到精确11:04的，找11点附近的 ==="
    $nearby = $records | Where-Object { $_.openTime -like '*2026/04/29 11:*' }
    foreach ($r in $nearby) {
        $r | ConvertTo-Json -Depth 5
        Write-Host "---"
    }
    Write-Host "11点附近记录数: $($nearby.Count)"
}

Write-Host ""
Write-Host "=== 4/29 所有记录 ==="
$today = $records | Where-Object { $_.openTime -like '*2026/04/29*' }
Write-Host "4/29记录数: $($today.Count)"
foreach ($r in $today) {
    Write-Host "openTime=$($r.openTime) stopLoss=$($r.stopLoss) takeProfit=$($r.takeProfit) product=$($r.product)"
}