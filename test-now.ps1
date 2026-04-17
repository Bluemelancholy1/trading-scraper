$r = Invoke-RestMethod -Uri "http://localhost:3456/login" -Method POST -Body (@{password="881199";phone="16616135917";pass="135917"} | ConvertTo-Json) -ContentType "application/json"
Write-Host "Login:" $r.ok

$f = Invoke-RestMethod -Uri "http://localhost:3456/fetch" -Method POST -Body (@{mode="merged";pages=1} | ConvertTo-Json) -ContentType "application/json"
Write-Host "Fetch:" $f.ok "Rows:" $f.rows.Count "Total:" $f.totalRows
if ($f.rows.Count -gt 0) {
    $r2 = $f.rows[0]
    Write-Host "First row:"
    Write-Host "  Time:" $r2.openTime "Direction:" $r2.direction "Product:" $r2.product "Price:" $r2.openPrice
    Write-Host "  SL:" $r2.stopLoss "TP:" $r2.takeProfit "Close:" $r2.closePrice "Pts:" $r2.profitPts
}
