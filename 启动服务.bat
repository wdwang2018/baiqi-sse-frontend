@echo off
chcp 65001 >nul
title 白起SSE - Next.js Dev Server

cd /d "%~dp0"

echo ================================
echo   白起SSE — AI销售管理系统
echo   启动 Next.js 开发服务器...
echo ================================
echo.
echo   浏览器打开: http://localhost:3000/dashboard
echo   默认账号: admin@baiqi.ai / admin123
echo.
echo   按 Ctrl+C 停止服务
echo ================================
echo.

call npm run dev

pause
