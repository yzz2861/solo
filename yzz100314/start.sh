#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_PORT=3001
FRONTEND_PORT=5173
BACKEND_PID=""
FRONTEND_PID=""

echo "========================================"
echo "  客服工单SLA审计系统 - 启动中"
echo "========================================"

cd "$SCRIPT_DIR"

if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  echo "正在安装后端依赖..."
  (cd "$BACKEND_DIR" && npm install --no-audit --no-fund)
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "正在安装前端依赖..."
  (cd "$FRONTEND_DIR" && npm install --no-audit --no-fund)
fi

echo ""
echo "启动后端服务 (端口 $BACKEND_PORT)..."
(cd "$BACKEND_DIR" && node src/server.js) &
BACKEND_PID=$!

echo "等待后端服务就绪..."
BACKEND_READY=0
for i in $(seq 1 30); do
  if curl -s -f "http://localhost:$BACKEND_PORT/api/health" > /dev/null 2>&1; then
    BACKEND_READY=1
    echo "✓ 后端服务启动成功"
    break
  fi
  if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "✗ 后端服务启动失败，请检查错误日志"
    exit 1
  fi
  sleep 1
  echo -n "."
done

if [ "$BACKEND_READY" -ne 1 ]; then
  echo ""
  echo "✗ 后端服务启动超时，请检查端口 $BACKEND_PORT 是否被占用"
  kill $BACKEND_PID 2>/dev/null
  exit 1
fi

echo ""
echo "启动前端服务 (端口 $FRONTEND_PORT)..."
(cd "$FRONTEND_DIR" && npx vite --host) &
FRONTEND_PID=$!

echo "等待前端服务就绪..."
FRONTEND_READY=0
for i in $(seq 1 30); do
  if curl -s -f "http://localhost:$FRONTEND_PORT/" > /dev/null 2>&1; then
    FRONTEND_READY=1
    echo "✓ 前端服务启动成功"
    break
  fi
  if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "✗ 前端服务启动失败，请检查错误日志"
    kill $BACKEND_PID 2>/dev/null
    exit 1
  fi
  sleep 1
  echo -n "."
done

if [ "$FRONTEND_READY" -ne 1 ]; then
  echo ""
  echo "✗ 前端服务启动超时，请检查端口 $FRONTEND_PORT 是否被占用"
  kill $BACKEND_PID 2>/dev/null
  kill $FRONTEND_PID 2>/dev/null
  exit 1
fi

echo ""
echo "========================================"
echo "  ✅ 系统启动完成！"
echo "  前端地址: http://localhost:$FRONTEND_PORT"
echo "  后端API:  http://localhost:$BACKEND_PORT/api/health"
echo "========================================"
echo ""
echo "按 Ctrl+C 停止服务"

cleanup() {
  echo ""
  echo "正在停止服务..."
  if [ -n "$FRONTEND_PID" ]; then
    kill $FRONTEND_PID 2>/dev/null || true
  fi
  if [ -n "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null || true
  fi
  echo "服务已停止"
  exit 0
}

trap cleanup INT TERM

wait
