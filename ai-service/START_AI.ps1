Write-Host "🤖 KHỞI ĐỘNG AI SERVICE" -ForegroundColor Cyan
Write-Host ""

# Check Python
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (!$pythonCmd) {
    Write-Host "❌ Python không được cài đặt!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Python: $($pythonCmd.Version)" -ForegroundColor Green
Write-Host ""

# Check uvicorn
$uvicornCheck = python -m pip show uvicorn 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ uvicorn chưa được cài đặt!" -ForegroundColor Red
    Write-Host "   Chạy: pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ uvicorn đã cài đặt" -ForegroundColor Green
Write-Host ""

Write-Host "🚀 Starting AI Service..." -ForegroundColor Yellow
Write-Host "📍 URL: http://0.0.0.0:8000" -ForegroundColor Cyan
Write-Host "📍 Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  QUAN TRỌNG: Listen trên 0.0.0.0 để Docker có thể kết nối!" -ForegroundColor Yellow
Write-Host "❌ Nhấn Ctrl+C để dừng" -ForegroundColor Yellow
Write-Host ""

# Start với --host 0.0.0.0 để Docker backend có thể kết nối
uvicorn main:app --reload --host 0.0.0.0 --port 8000
