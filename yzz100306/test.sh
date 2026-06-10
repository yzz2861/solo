#!/bin/bash

cd "$(dirname "$0")"

echo "========================================"
echo "  光伏电站巡检系统 - 功能测试脚本"
echo "========================================"
echo ""

BASE_URL="http://localhost:8000"

echo "1. 测试服务是否启动..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
if [ "$response" != "200" ]; then
    echo "   ❌ 服务未启动，请先运行 ./start.sh"
    exit 1
fi
echo "   ✅ 服务运行正常"
echo ""

echo "2. 导入组件台账 CSV..."
response=$(curl -s -X POST "$BASE_URL/api/import/components" \
    -F "file=@sample_data/components.csv")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
echo ""

echo "3. 导入缺陷识别 JSON..."
response=$(curl -s -X POST "$BASE_URL/api/import/defects" \
    -F "file=@sample_data/defects.json")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
echo ""

echo "4. 导入维修反馈 CSV..."
response=$(curl -s -X POST "$BASE_URL/api/import/repairs" \
    -F "file=@sample_data/repairs.csv")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
echo ""

echo "5. 测试重复导入（应跳过）..."
response=$(curl -s -X POST "$BASE_URL/api/import/defects" \
    -F "file=@sample_data/defects.json")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
echo ""

echo "6. 查询组件 PV-001 全生命周期..."
response=$(curl -s "$BASE_URL/api/components/PV-001")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
echo ""

echo "7. 查询所有缺陷列表..."
response=$(curl -s "$BASE_URL/api/defects?limit=5")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
echo ""

echo "8. 查询复查未通过的缺陷..."
response=$(curl -s "$BASE_URL/api/abnormal/recheck-failed")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
echo ""

echo "9. 查询备件用量异常（阈值 1000 元）..."
response=$(curl -s "$BASE_URL/api/abnormal/spare-parts?threshold=1000")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
echo ""

echo "10. 修改 DF-2024-004 的复核意见..."
response=$(curl -s -X PUT "$BASE_URL/api/defects/DF-2024-004/review" \
    -H "Content-Type: application/json" \
    -d '{"recheck_opinion": "人工复核确认热斑存在，建议尽快处理", "recheck_result": "确认缺陷", "recheck_passed": "no", "rechecker": "张工"}')
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
echo ""

echo "11. 获取缺陷闭环报告..."
response=$(curl -s "$BASE_URL/api/reports/closed-loop")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
echo ""

echo "========================================"
echo "  测试完成！"
echo "========================================"
echo ""
echo "可以访问 http://localhost:8000/docs 查看完整 API 文档"
