@echo off
cd go-server
go test ./...
if %errorlevel% neq 0 exit /b %errorlevel%
go build
if %errorlevel% neq 0 exit /b %errorlevel%
cd ../ts-client
npm run test
if %errorlevel% neq 0 exit /b %errorlevel%
npm run build
if %errorlevel% neq 0 exit /b %errorlevel%
cd ..
echo OK
exit /b 0
