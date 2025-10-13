@echo off
setlocal enabledelayedexpansion

:: === CONFIGURAÇÃO ===
set REPO_URL=https://github.com/ViewerPirate/HideakiBell.git
set MAIN_BRANCH=main

echo.
echo 📂 Subindo todos os arquivos da pasta atual para %REPO_URL%
echo.

git init
git branch -M %MAIN_BRANCH%
git remote remove origin 2>nul
git remote add origin %REPO_URL%

git add .
git commit -m "Atualizando arquivos do projeto"
git push -f origin %MAIN_BRANCH%

echo.
echo ✅ Upload concluído com sucesso!
pause
