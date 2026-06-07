@echo off
pushd "%~dp0"
call .\test.bat
if %errorlevel% neq 0 (
    echo [ERROR] Build failed
    popd
    pause
    exit /b %errorlevel%
)
if exist "%~dp0release" rmdir /s /q "%~dp0release"
mkdir "%~dp0release"
mkdir "%~dp0release\config"
mkdir "%~dp0release\client"
copy "%~dp0go-server\go-server.exe" "%~dp0release\game.exe" > nul
xcopy /e /i /y "%~dp0config" "%~dp0release\config" > nul
xcopy /e /i /y "%~dp0ts-client\dist" "%~dp0release\client" > nul
echo @start game.exe > "%~dp0release\play.bat"
echo [SUCCESS] Release built in .\release
popd
pause
exit /b 0
