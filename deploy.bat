@echo off
cd /d "c:\Users\akash\Downloads\final-mp3-player"
echo === Starting deployment === > deploy_log.txt

echo --- Git init --- >> deploy_log.txt
git init >> deploy_log.txt 2>&1
echo Exit: %errorlevel% >> deploy_log.txt

echo --- Git remote --- >> deploy_log.txt
git remote remove origin >> deploy_log.txt 2>&1
git remote add origin https://github.com/Akashmathi/mp3-player-final.git >> deploy_log.txt 2>&1
echo Exit: %errorlevel% >> deploy_log.txt

echo --- Git config --- >> deploy_log.txt
git config user.email "akashmathi777@gmail.com" >> deploy_log.txt 2>&1
git config user.name "Akashmathi" >> deploy_log.txt 2>&1

echo --- Git add --- >> deploy_log.txt
git add -A >> deploy_log.txt 2>&1
echo Exit: %errorlevel% >> deploy_log.txt

echo --- Git status --- >> deploy_log.txt
git status >> deploy_log.txt 2>&1

echo --- Git commit --- >> deploy_log.txt
git commit -m "Deploy: MP3 Player with YouTube search and cloud sync" >> deploy_log.txt 2>&1
echo Exit: %errorlevel% >> deploy_log.txt

echo --- Git push --- >> deploy_log.txt
git push -u origin main --force >> deploy_log.txt 2>&1
echo Exit: %errorlevel% >> deploy_log.txt

echo --- Done --- >> deploy_log.txt
type deploy_log.txt
