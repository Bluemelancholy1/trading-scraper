try {
    $w = [System.Net.WebRequest]::Create('http://localhost:3456/status')
    $w.Timeout = 5000
    $r = $w.GetResponse()
    $s = $r.GetResponseStream()
    $sr = New-Object System.IO.StreamReader($s)
    $content = $sr.ReadToEnd()
    $r.Close()
    Write-Host "Status response: $content"
} catch {
    Write-Host "ERR:" $_.Exception.Message
}

# Test login
try {
    $body = '{"password":"881199","phone":"16616135917","pass":"135917"}'
    $w2 = [System.Net.WebRequest]::Create('http://localhost:3456/login')
    $w2.Method = 'POST'
    $w2.ContentType = 'application/json'
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    $w2.ContentLength = $bytes.Length
    $reqStream = $w2.GetRequestStream()
    $reqStream.Write($bytes, 0, $bytes.Length)
    $reqStream.Close()
    $w2.Timeout = 15000
    $r2 = $w2.GetResponse()
    $s2 = $r2.GetResponseStream()
    $sr2 = New-Object System.IO.StreamReader($s2)
    $content2 = $sr2.ReadToEnd()
    $r2.Close()
    Write-Host "Login response: $content2"
} catch {
    Write-Host "Login ERR:" $_.Exception.Message
}

# Test fetch
Start-Sleep 1
try {
    $body3 = '{"mode":"jc"}'
    $w3 = [System.Net.WebRequest]::Create('http://localhost:3456/fetch')
    $w3.Method = 'POST'
    $w3.ContentType = 'application/json'
    $bytes3 = [System.Text.Encoding]::UTF8.GetBytes($body3)
    $w3.ContentLength = $bytes3.Length
    $reqStream3 = $w3.GetRequestStream()
    $reqStream3.Write($bytes3, 0, $bytes3.Length)
    $reqStream3.Close()
    $w3.Timeout = 15000
    $r3 = $w3.GetResponse()
    $s3 = $r3.GetResponseStream()
    $sr3 = New-Object System.IO.StreamReader($s3)
    $content3 = $sr3.ReadToEnd()
    $r3.Close()
    $j = $content3 | ConvertFrom-Json
    Write-Host "Fetch OK: $($j.ok), rows: $($j.rows.Count), total: $($j.totalRows)"
    if ($j.rows.Count -gt 0) {
        Write-Host "First row:" ($j.rows[0] | ConvertTo-Json)
    }
} catch {
    Write-Host "Fetch ERR:" $_.Exception.Message
}
