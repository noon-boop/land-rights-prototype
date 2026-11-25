@echo off
REM 一次性构建 + 部署脚本：PC 端 -> 根目录，农户端 -> /farmer/
REM 用法：双击运行，或在 git-bash 里 bash deploy.bat
setlocal
cd /d "%~dp0"

echo [1/5] 构建 PC 端…
cd /d "%~dp0pc"
call npm run build || goto :fail
cd /d "%~dp0"

echo [2/5] 构建农户端 H5…
cd /d "%~dp0farmer"
call npx uni build -p h5 || goto :fail
cd /d "%~dp0"

echo [3/5] 组装 gh-pages 目录…
if exist "%~dp0.tmp-deploy" rmdir /s /q "%~dp0.tmp-deploy"
mkdir "%~dp0.tmp-deploy"
xcopy "%~dp0pc\dist" "%~dp0.tmp-deploy\" /E /I /Y /Q >nul
mkdir "%~dp0.tmp-deploy\farmer"
xcopy "%~dp0farmer\dist\build\h5" "%~dp0.tmp-deploy\farmer\" /E /I /Y /Q >nul
copy /Y "%~dp0.tmp-deploy\index.html" "%~dp0.tmp-deploy\404.html" >nul
type nul > "%~dp0.tmp-deploy\.nojekyll"

echo [4/5] 提交到 gh-pages 分支…
cd /d "%~dp0.tmp-deploy"
git init -q -b gh-pages
git remote add origin git@github.com:noon-boop/land-rights-prototype.git
git add -A
git -c user.name="noon-boop" -c user.email="1293376915@qq.com" commit -q -m "deploy: PC 端 + 农户端 H5 原型"
git push -f origin gh-pages || goto :fail

echo [5/5] 完成。等待 GitHub Pages 构建约 30 秒…
echo   PC     : https://noon-boop.github.io/land-rights-prototype/
echo   农户端 : https://noon-boop.github.io/land-rights-prototype/farmer/
goto :eof

:fail
echo.
echo *** 失败，请检查上方错误信息 ***
exit /b 1
