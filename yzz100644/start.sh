#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "📦 安装依赖..."
pip3 install -r requirements.txt -q 2>/dev/null

echo "🗑️ 清理旧数据..."
rm -f data/products.db

echo "🚀 启动产品说明书问答校验系统..."
python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
