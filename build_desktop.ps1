cd ts-client
npm run build
cd ..

if (Test-Path "go-server/dist") {
    Remove-Item -Recurse -Force "go-server/dist"
}
New-Item -ItemType Directory -Path "go-server/dist" | Out-Null
Copy-Item -Recurse -Force "ts-client/dist/*" "go-server/dist/"

if (Test-Path "go-server/config") {
    Remove-Item -Recurse -Force "go-server/config"
}
New-Item -ItemType Directory -Path "go-server/config" | Out-Null
Copy-Item -Recurse -Force "config/*" "go-server/config/"

cd go-server
go build -ldflags="-H=windowsgui" -o ../necro-geometry.exe .
cd ..
