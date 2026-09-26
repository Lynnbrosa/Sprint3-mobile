# gera o APK de release no windows.
# o cmake do gesture-handler monta caminho com mais de 260 caracteres quando o projeto
# está em pasta funda (Desktop) e o ninja morre. compilar numa pasta curta resolve.
param(
  [string]$PastaCurta = "C:\pm"
)

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
$versao = (Get-Content "$raiz\package.json" -Raw | ConvertFrom-Json).version

Write-Host "espelhando $raiz -> $PastaCurta"
# /XD com caminho completo: um /XD build solto apagaria o build/ de dentro do node_modules
robocopy $raiz $PastaCurta /MIR /NFL /NDL /NJH /NP /MT:16 `
  /XD "$raiz\android" "$raiz\ios" "$raiz\.git" "$raiz\.expo" "$raiz\dist-apk" `
      "$PastaCurta\android" | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy falhou ($LASTEXITCODE)" }

# daemon do gradle segura o classes.dex do build anterior e o prebuild morre com EBUSY
if (Test-Path "$PastaCurta\android\gradlew.bat") {
  & "$PastaCurta\android\gradlew.bat" -p "$PastaCurta\android" --stop | Out-Null
  Start-Sleep -Seconds 5
}

Push-Location $PastaCurta
try {
  npx expo prebuild -p android --no-install
  if ($LASTEXITCODE -ne 0) { throw "prebuild falhou" }
  Push-Location android
  # sem daemon: um daemon parado segura o classes.dex e o próximo prebuild não limpa a pasta
  .\gradlew.bat assembleRelease --no-daemon "-Dorg.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g"
  if ($LASTEXITCODE -ne 0) { throw "gradle falhou" }
  Pop-Location
} finally {
  Pop-Location
}

New-Item -ItemType Directory -Force "$raiz\dist-apk" | Out-Null
$destino = "$raiz\dist-apk\PrevioPLS-$versao.apk"
Copy-Item "$PastaCurta\android\app\build\outputs\apk\release\app-release.apk" $destino -Force
Write-Host "apk: $destino"
