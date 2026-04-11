@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

set "PORT=5500"
set "BASE=http://127.0.0.1:%PORT%"
set "HOME_URL=%BASE%/anasayfa/"

REM Explorer'dan acilinca PATH kis kalabiliyor; yaygin Python kurulumlari
for /d %%P in ("%LocalAppData%\Programs\Python\Python*") do (
  set "PATH=%%P;%%P\Scripts;%PATH%"
)
if exist "%ProgramFiles%\Python312\python.exe" set "PATH=%ProgramFiles%\Python312;%ProgramFiles%\Python312\Scripts;%PATH%"
if exist "%ProgramFiles%\Python311\python.exe" set "PATH=%ProgramFiles%\Python311;%ProgramFiles%\Python311\Scripts;%PATH%"

echo.
echo  ATA Quick Guide - yerel sunucu
echo  Ana sayfa: %HOME_URL%
echo  Kok:       %BASE%/
echo.

set "PYRUN="
py -3 -c "import sys" >nul 2>&1 && set "PYRUN=py -3"
if not defined PYRUN py -c "import sys" >nul 2>&1 && set "PYRUN=py"
if not defined PYRUN python -c "import sys" >nul 2>&1 && set "PYRUN=python"

if not defined PYRUN (
  echo [Hata] Python bulunamadi. https://www.python.org/downloads/
  echo Kurulumda "Add python.exe to PATH" secenegini isaretleyin.
  echo Alternatif: start-local.ps1 - sag tik, PowerShell ile calistir.
  echo.
  pause
  exit /b 1
)

netstat -ano | findstr ":%PORT% " | findstr LISTENING >nul 2>&1
if %errorlevel%==0 (
  echo [Uyari] Port %PORT% kullanimda. Bu dosyada PORT degerini degistirin.
  echo.
  pause
  exit /b 1
)

echo Sunucu ayri pencerede; hazir olunca tarayici acilir. Durdurmak: sunucu penceresinde Ctrl+C
echo.

start "ATA Quick Guide sunucu" cmd /k "cd /d ""%~dp0"" && title ATA Quick Guide sunucu && echo. && echo  http.server %PORT% - Ctrl+C && echo. && %PYRUN% -m http.server %PORT%"

set /a _n=0
:waitup
ping -n 2 127.0.0.1 >nul
set /a _n+=1
curl -sf -o NUL "%HOME_URL%" >nul 2>&1
if not errorlevel 1 goto :browser
powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -Uri '%HOME_URL%' -TimeoutSec 2).StatusCode | Out-Null } catch { exit 1 }" >nul 2>&1
if %errorlevel%==0 goto :browser
if %_n% lss 15 goto :waitup

echo [Uyari] Sunucu yanit vermedi. Elle acin: %HOME_URL%
goto :afterbrowser

:browser
start "" "%HOME_URL%"

:afterbrowser
echo.
echo Adres: %HOME_URL%
echo Bu pencereyi kapatabilirsiniz; sunucu diger pencerede calisir.
echo.
pause
endlocal
exit /b 0
