# Trading Scraper v1.0.18 构建后测试脚本
# 用法：powershell -File test-v1018.ps1

$BASE = "http://localhost:3456"
$PASS = "135917"
$passed = 0
$failed = 0

function Test-Step {
    param($Name, $ScriptBlock)
    try {
        $result = & $ScriptBlock
        Write-Host "  ✅ $Name" -ForegroundColor Green
        $script:passed++
        return $result
    } catch {
        Write-Host "  ❌ $Name : $_" -ForegroundColor Red
        $script:failed++
        return $null
    }
}

Write-Host "`n===== Trading Scraper v1.0.18 测试报告 =====" -ForegroundColor Yellow
Write-Host "时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" -ForegroundColor Gray

# 1. 端口是否在监听
Test-Step "端口 3456 监听中" {
    $r = netstat -an | Select-String "LISTENING" | Select-String ":3456 "
    if (-not $r) { throw "端口 3456 未监听" }
}

# 2. /status 端点
$status = Test-Step "GET /status 返回 200" {
    $r = Invoke-WebRequest "$BASE/status" -TimeoutSec 5 -UseBasicParsing
    if ($r.StatusCode -ne 200) { throw "状态码 $($r.StatusCode)" }
    $r
}
if ($status) {
    Test-Step " /status body 包含 appReady" {
        $t = $status.Content
        if ($t -notmatch '"ok"') { throw "无 ok 字段" }
        Write-Host "    → ok=$($t -match 'true'?$true:$false)"
    }
}

# 3. /unlock 正确密码
$unlock = Test-Step "POST /unlock 正确密码 → ok" {
    $b = @{password=$PASS} | ConvertTo-Json
    $r = Invoke-WebRequest "$BASE/unlock" -Method POST -Body $b -ContentType "application/json" -TimeoutSec 10 -UseBasicParsing
    if ($r.StatusCode -ne 200) { throw "状态码 $($r.StatusCode)" }
    $r
}
if ($unlock) {
    Test-Step " /unlock 返回 ok=true" {
        $t = $unlock.Content
        if ($t -notmatch '"ok":\s*true') { throw "解锁失败: $t" }
        Write-Host "    → $t"
    }
}

# 4. /unlock 错误密码
Test-Step "POST /unlock 错误密码 → 拒绝" {
    $b = @{password="wrong"} | ConvertTo-Json
    try {
        $r = Invoke-WebRequest "$BASE/unlock" -Method POST -Body $b -ContentType "application/json" -TimeoutSec 5 -UseBasicParsing
        if ($r.Content -match '"ok":\s*true') { throw "错误密码竟然通过了!" }
        Write-Host "    → 正确拒绝"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 403 -or $_.Exception.Response.StatusCode -eq 401 -or $_.Exception.Response.StatusCode -eq 400) {
            Write-Host "    → 正确拒绝 (HTTP $([int]$_.Exception.Response.StatusCode))"
        } else {
            throw $_
        }
    }
}

# 5. GET /api/status (解锁后)
$apiStatus = Test-Step "GET /api/status 解锁后" {
    $r = Invoke-WebRequest "$BASE/api/status" -TimeoutSec 10 -UseBasicParsing
    if ($r.StatusCode -ne 200) { throw "状态码 $($r.StatusCode)" }
    $r
}
if ($apiStatus) {
    Test-Step " /api/status 数据不为空" {
        $t = $apiStatus.Content
        if ($t.Length -lt 10) { throw "返回太短: $t" }
        Write-Host "    → $($t.Substring(0, [Math]::Min(120, $t.Length)))..."
    }
}

# 6. /fetch 数据抓取
$fetch = Test-Step "GET /fetch?pages=1 数据抓取" {
    $r = Invoke-WebRequest "$BASE/fetch?pages=1" -TimeoutSec 30 -UseBasicParsing
    if ($r.StatusCode -ne 200) { throw "状态码 $($r.StatusCode)" }
    $r
}
if ($fetch) {
    Test-Step " /fetch 返回数据行数 > 0" {
        $t = $fetch.Content
        if ($t -match '"rows":(\d+)') {
            $rows = [int]$Matches[1]
            if ($rows -eq 0) { throw "0 行数据" }
            Write-Host "    → $rows 行数据"
        } else {
            Write-Host "    → 无 rows 字段，检查 content..."
            Write-Host "    → $(($t -split ',').Count) 条记录"
        }
    }
}

# 7. index.html 可访问
Test-Step "GET /index.html 返回 200" {
    $r = Invoke-WebRequest "$BASE/index.html" -TimeoutSec 5 -UseBasicParsing
    if ($r.StatusCode -ne 200) { throw "状态码 $($r.StatusCode)" }
}

# 8. app.js 可访问
Test-Step "GET /app.js 存在" {
    $r = Invoke-WebRequest "$BASE/app.js" -TimeoutSec 5 -UseBasicParsing
    if ($r.StatusCode -ne 200) { throw "状态码 $($r.StatusCode)" }
    if ($r.Content.Length -lt 1000) { throw "app.js 内容太短: $($r.Content.Length) bytes" }
    Write-Host "    → $($r.Content.Length) bytes"
}

# 9. lottery.js 可访问
Test-Step "GET /lottery.js 存在" {
    $r = Invoke-WebRequest "$BASE/lottery.js" -TimeoutSec 5 -UseBasicParsing
    if ($r.StatusCode -ne 200) { throw "状态码 $($r.StatusCode)" }
    if ($r.Content.Length -lt 100) { throw "lottery.js 内容太短: $($r.Content.Length) bytes" }
    Write-Host "    → $($r.Content.Length) bytes"
}

# 10. minesweeper.js 可访问
Test-Step "GET /minesweeper.js 存在" {
    $r = Invoke-WebRequest "$BASE/minesweeper.js" -TimeoutSec 5 -UseBasicParsing
    if ($r.StatusCode -ne 200) { throw "状态码 $($r.StatusCode)" }
    if ($r.Content.Length -lt 100) { throw "minesweeper.js 内容太短: $($r.Content.Length) bytes" }
    Write-Host "    → $($r.Content.Length) bytes"
}

# 总结
Write-Host "`n===== 测试结果 =====" -ForegroundColor Yellow
$total = $passed + $failed
$color = if ($failed -eq 0) { "Green" } else { "Red" }
Write-Host "通过: $passed / $total  失败: $failed" -ForegroundColor $color

if ($failed -eq 0) {
    Write-Host "`n✅ 全部通过，可以上传发布！" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n❌ 有测试失败，请修复后重试" -ForegroundColor Red
    exit 1
}
