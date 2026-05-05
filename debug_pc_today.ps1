$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$body = @{'password'='881199'} | ConvertTo-Json
$r1 = Invoke-WebRequest -Uri 'http://localhost:3456/unlock' -Method POST -ContentType 'application/json' -Body $body -WebSession $s
Write-Host "Unlock:" $r1.StatusCode $r1.Content

$body2 = @{'phone'='16616135917';'pass'='881199'} | ConvertTo-Json
$r2 = Invoke-WebRequest -Uri 'http://localhost:3456/login' -Method POST -ContentType 'application/json' -Body $body2 -WebSession $s
Write-Host "Login:" $r2.StatusCode $r2.Content

# JC mode - check SL/TP in raw JC page
$body3 = @{'mode'='jc';'pages'=3} | ConvertTo-Json
$r3 = Invoke-WebRequest -Uri 'http://localhost:3456/fetch' -Method POST -ContentType 'application/json' -Body $body3 -WebSession $s
$data3 = $r3.Content | ConvertFrom-Json
Write-Host "JC rows:" $data3.rows.Count "Total:" $data3.totalRows

$today = $data3.rows | Where-Object { $_.openTime -like '2026/04/29*' }
Write-Host "`n=== 4/29 JC records (" $today.Count " total) ==="
foreach ($row in $today) {
    Write-Host "Time:" $row.openTime "Product:" $row.product "Dir:" $row.direction "Price:" $row.openPrice "SL:" $row.stopLoss "TP:" $row.takeProfit "Teacher:" $row.teacher
}
