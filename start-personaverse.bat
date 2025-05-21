@echo off
chcp 65001 >nul
title 角色宇宙 - 一键启动脚本

echo ======================================
echo       角色宇宙 - 一键启动脚本
echo ======================================
echo.

:: 设置错误处理
set "ERROR_OCCURRED=0"

:: 检查 Node.js 是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [检测] Node.js 未安装，准备下载并安装...
    
    :: 创建临时目录
    mkdir "%TEMP%\node_setup" 2>nul
    cd /d "%TEMP%\node_setup"
    
    :: 下载 Node.js 安装程序
    echo [下载] 正在下载 Node.js 安装程序...
    powershell -Command "& {Invoke-WebRequest -Uri 'https://nodejs.org/dist/v18.16.0/node-v18.16.0-x64.msi' -OutFile 'node_setup.msi'}"
    
    if not exist "node_setup.msi" (
        echo [错误] Node.js 下载失败，请手动安装 Node.js 后再运行此脚本。
        echo 您可以从 https://nodejs.org/zh-cn/download/ 下载安装。
        set "ERROR_OCCURRED=1"
        goto END
    )
    
    :: 安装 Node.js
    echo [安装] 正在安装 Node.js...
    start /wait msiexec /i node_setup.msi /qn
    
    :: 检查安装是否成功
    where node >nul 2>nul
    if %errorlevel% neq 0 (
        echo [错误] Node.js 安装失败，请手动安装 Node.js 后再运行此脚本。
        set "ERROR_OCCURRED=1"
        goto END
    )
    
    echo [成功] Node.js 安装完成！
    cd /d "%~dp0"
) else (
    echo [检测] Node.js 已安装，版本: 
    node -v
)

echo.

:: 检查项目目录
if not exist "package.json" (
    echo [错误] 未找到 package.json 文件。
    echo 请确保在项目根目录运行此脚本。
    set "ERROR_OCCURRED=1"
    goto END
)

:: 检查 package.json 中是否包含必要的脚本命令
findstr /C:"genkit:dev" "package.json" >nul
if %errorlevel% neq 0 (
    echo [警告] package.json 中可能缺少 "genkit:dev" 脚本命令。
    echo 请确认项目配置，或修改此启动脚本中的相应命令。
    set "ERROR_OCCURRED=1"
    goto END
)

findstr /C:"dev" "package.json" >nul
if %errorlevel% neq 0 (
    echo [警告] package.json 中可能缺少 "dev" 脚本命令。
    echo 请确认项目配置，或修改此启动脚本中的相应命令。
    set "ERROR_OCCURRED=1"
    goto END
)

:: 检查依赖是否已安装
if not exist "node_modules" (
    echo [检测] 项目依赖未安装，开始安装...
    call npm install
    
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败，请检查网络连接或手动运行 npm install
        set "ERROR_OCCURRED=1"
        goto END
    )
    
    echo [成功] 项目依赖已安装完成！
) else (
    echo [检测] 项目依赖已安装。
)

echo.

:: 检查 .env 文件
if not exist ".env" (
    echo [检测] .env 文件不存在，创建默认配置...
    (
        echo # 角色宇宙环境配置
        echo # 请在下面填写您的 Gemini API 密钥
        echo GEMINI_API_KEY=
        echo # MongoDB 连接设置
        echo MONGODB_URI=mongodb://localhost:27017/communityAppDB
        echo # 社区 API URL (本地开发可留空)
        echo # NEXT_PUBLIC_COMMUNITY_API_URL=
    ) > .env
    
    echo [提醒] 已创建 .env 文件，请编辑该文件并填写必要的 API 密钥。
    timeout /t 5 >nul
) else (
    :: 检查 .env 文件是否包含必要的密钥
    findstr /C:"GEMINI_API_KEY=" ".env" >nul
    if %errorlevel% neq 0 (
        echo [警告] .env 文件中可能缺少 GEMINI_API_KEY 配置。
        echo [提示] 请确保 .env 文件中包含 GEMINI_API_KEY=您的API密钥
    ) else (
        echo [检测] .env 文件存在并包含 API 密钥配置。
    )
)

echo.

:: 检查 Genkit
echo [检测] 正在检查 Genkit...
call where genkit >nul 2>nul
if %errorlevel% neq 0 (
    echo [检测] Genkit 未安装，开始安装...
    call npm install -g genkit
    
    :: 不再检查错误代码，直接再次检查 genkit 命令是否可用
    call where genkit >nul 2>nul
    if %errorlevel% neq 0 (
        echo [警告] Genkit 可能未正确安装，但将尝试继续运行。
    ) else (
        echo [成功] Genkit 安装完成！
    )
) else (
    echo [检测] Genkit 已安装。
)

echo.
echo ======================================
echo          准备启动服务
echo ======================================
echo.
echo [信息] 即将启动两个服务:
echo    1. Next.js 前端 (localhost:9002)
echo    2. Genkit AI 服务 (localhost:3500)
echo.
echo [提示] 如需终止服务，请关闭所有弹出的命令行窗口。
echo.
timeout /t 3 >nul

:: 启动 Genkit 服务
echo [启动] 正在启动 Genkit AI 服务...
start cmd /k "title 角色宇宙 - Genkit AI 服务 && color 0A && echo 正在启动 Genkit 服务... && npm run genkit:dev || (echo 服务启动失败 && pause)"

:: 短暂延迟，避免两个服务同时启动可能的冲突
timeout /t 2 >nul

:: 启动 Next.js 服务
echo [启动] 正在启动 Next.js 前端...
start cmd /k "title 角色宇宙 - Next.js 前端 && color 0B && echo 正在启动 Next.js 服务... && npm run dev || (echo 服务启动失败 && pause)"

echo [成功] 服务启动命令已发送，请在浏览器中访问 http://localhost:9002
echo.
echo 如果您是首次使用，请确保：
echo  1. 已在 .env 文件中配置了 GEMINI_API_KEY
echo  2. 两个服务都已成功启动（请查看相应的命令行窗口）
echo.
echo [完成] 启动流程结束，可以关闭此窗口。

:END
if "%ERROR_OCCURRED%"=="1" (
    echo.
    echo [错误] 脚本执行过程中遇到问题，请查看上方错误信息。
    echo 请按任意键退出...
)

pause 