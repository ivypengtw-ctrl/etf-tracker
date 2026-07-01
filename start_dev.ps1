# Start ETF Tracker dev servers
$root = "C:\Users\ivype\OneDrive\桌面\0430"

# Check if backend already running on port 8000
$backend = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if (-not $backend) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; .\.venv\Scripts\uvicorn.exe app.main:app --reload" -WindowStyle Normal
    Write-Host "Backend started on http://127.0.0.1:8000"
} else {
    Write-Host "Backend already running on port 8000"
}

# Check if frontend already running on port 3000
$frontend = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if (-not $frontend) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev" -WindowStyle Normal
    Write-Host "Frontend started on http://localhost:3000"
} else {
    Write-Host "Frontend already running on port 3000"
}
