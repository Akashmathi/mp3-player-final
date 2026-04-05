$dir = "c:\Users\akash\Downloads\final-mp3-player"
Set-Location $dir

$log = @()

# Rename branch to main
$log += "=== Renaming master to main ==="
$result = git branch -m master main 2>&1
$log += $result
$log += "Exit: $LASTEXITCODE"

# Push to origin main
$log += "=== Pushing to origin main ==="
$result = git push -u origin main --force 2>&1
$log += $result
$log += "Exit: $LASTEXITCODE"

# Write log
$log | Out-File -FilePath "$dir\push_log.txt" -Encoding utf8

# Also print
$log | ForEach-Object { Write-Host $_ }
