$log = 'C:\Users\Public\vs_fw.log'
Start-Transcript -Path $log -Force | Out-Null
Write-Host "=== VendorSaathi firewall rules $(Get-Date) ==="

Write-Host "--- remove old copies (idempotent re-run) ---"
netsh advfirewall firewall delete rule name="VendorSaathi Frontend (3000)"
Write-Host "exit=$LASTEXITCODE"
netsh advfirewall firewall delete rule name="VendorSaathi Backend (8002)"
Write-Host "exit=$LASTEXITCODE"

Write-Host "--- add allow rules (scoped to the campus /19 subnet) ---"
netsh advfirewall firewall add rule name="VendorSaathi Frontend (3000)" dir=in action=allow protocol=TCP localport=3000 remoteip=192.168.128.0/19
Write-Host "exit=$LASTEXITCODE"
netsh advfirewall firewall add rule name="VendorSaathi Backend (8002)" dir=in action=allow protocol=TCP localport=8002 remoteip=192.168.128.0/19
Write-Host "exit=$LASTEXITCODE"

Write-Host "--- verify ---"
netsh advfirewall firewall show rule name="VendorSaathi Frontend (3000)"
netsh advfirewall firewall show rule name="VendorSaathi Backend (8002)"

Stop-Transcript | Out-Null
