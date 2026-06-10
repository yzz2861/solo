#!/bin/bash

echo "========================================"
echo "  客服工单SLA审计系统 - 启动中"
echo "========================================"

cd "$(dirname "$0")"

if [ ! -d "backend/node_modules" ]; then
  echo "正在安装后端依赖..."
  cd backend && npm install --no-audit --no-fund && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "正在安装前端依赖..."
  cd frontend && npm install --no-audit --no-fund && cd ..
fi

echo ""
echo "启动后端服务 (端口 3001)..."
cd backend && node src/server.js &
BACKEND_PID=$!

sleep 2

echo "启动前端服务 (端口 5173)..."
cd ../frontend && npx vite --host &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "  系统启动完成！"
echo "  前端地址: http://localhost:5173"
echo "  后端API:  http://localhost:3001/api/health"
echo "========================================"
echo ""
echo "按 Ctrl+C 停止服务"

trap "echo '正在停止服务...'; kill $FRONTEND_PID 2>/dev/null; kill $BACKEND_PID 2>/dev/null; exit 0" INT

wait
