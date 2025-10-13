@echo off
setlocal enabledelayedexpansion

:: === CONFIGURAÇÃO ===
set REPO_URL=https://github.com/ViewerPirate/HideakiBell.git
set MAIN_BRANCH=main

echo.
echo 🔥 Apagando todo o conteúdo remoto do repositório: %REPO_URL%
echo.

:: Inicializa um novo repositório (sem histórico)
git init
git checkout --orphan temp
git rm -rf .

echo # Novo repositório > README.md
git add README.md
git commit -m "Reinício do repositório"

git branch -M %MAIN_BRANCH%
git remote remove origin 2>nul
git remote add origin %REPO_URL%

echo.
echo 🚀 Enviando para o GitHub (substituindo tudo)...
git push -f origin %MAIN_BRANCH%

echo.
echo ✅ Repositório remoto resetado com sucesso!
pause
