@echo off
git add .
git commit -m %1
if %errorlevel% neq 0 exit /b %errorlevel%
git push
if %errorlevel% neq 0 exit /b %errorlevel%
exit /b 0
