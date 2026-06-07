@echo off
call .\test.bat
if %errorlevel% neq 0 (
    exit /b %errorlevel%
)
if exist release rmdir /s /q release
mkdir release
mkdir release\config
mkdir release\client
copy go-server\go-server.exe release\game.exe > nul
xcopy /e /i /y config release\config > nul
xcopy /e /i /y ts-client\dist release\client > nul
exit /b 0
