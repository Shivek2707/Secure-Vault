Write-Host "🚀 Launching SecureVault Hybrid-Cloud Environment..." -ForegroundColor Cyan

# 1. Open the Public Cloud Version
$renderUrl = "https://secure-vault-p44c.onrender.com"
Write-Host "🌍 Opening Render App..." -ForegroundColor Blue
Start-Process $renderUrl

# 2. Start Local Tunnels in Minimized Windows
Write-Host "📈 Setting up local Infrastructure Tunnels..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "kubectl port-forward svc/monitoring-stack-kube-prom-prometheus 9090:9090 -n monitoring" -WindowStyle Minimized
Start-Process powershell -ArgumentList "kubectl port-forward deployment/monitoring-stack-grafana 3000:3000 -n monitoring" -WindowStyle Minimized
Start-Process powershell -ArgumentList "kubectl port-forward deployment/secure-vault-deployment 8080:8080" -WindowStyle Minimized

# 3. Wait 5 seconds for connection
Start-Sleep -s 5

# 4. Open Local Monitoring Dashboards
Write-Host "🌐 Opening Local Dashboards..." -ForegroundColor Green
Start-Process "http://localhost:8080"      # Local App
Start-Process "http://localhost:9090"      # Prometheus
Start-Process "http://localhost:3000"      # Grafana

Write-Host "✅ System Ready! Good luck with the presentation, Shivek." -ForegroundColor Green