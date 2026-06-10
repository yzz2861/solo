#!/bin/bash

cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "正在创建虚拟环境..."
    python3 -m venv venv
fi

echo "正在激活虚拟环境..."
source venv/bin/activate

echo "正在安装依赖..."
pip install -r requirements.txt

echo ""
echo "========================================"
echo "  光伏电站巡检缺陷闭环管理系统"
echo "========================================"
echo ""
echo "服务即将启动，请访问:"
echo "  API 文档: http://localhost:8000/docs"
echo "  根路径:   http://localhost:8000/"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
