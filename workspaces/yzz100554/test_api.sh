#!/bin/bash

echo "=========================================="
echo "农资赊销还款服务 API 测试脚本"
echo "=========================================="

BASE_URL="http://localhost:3000/api"

echo ""
echo "1. 测试健康检查..."
curl -s "$BASE_URL/health" | python3 -m json.tool

echo ""
echo "2. 测试老板登录..."
BOSS_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"boss","password":"boss123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
echo "老板Token获取成功"

echo ""
echo "3. 测试店员登录..."
CLERK_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"clerk","password":"clerk123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
echo "店员Token获取成功"

echo ""
echo "4. 获取农户列表..."
curl -s "$BASE_URL/farmers" \
  -H "Authorization: Bearer $BOSS_TOKEN" | python3 -m json.tool | head -50

echo ""
echo "5. 获取商品列表..."
curl -s "$BASE_URL/products" \
  -H "Authorization: Bearer $BOSS_TOKEN" | python3 -m json.tool | head -50

echo ""
echo "6. 获取作物季列表..."
curl -s "$BASE_URL/seasons" \
  -H "Authorization: Bearer $BOSS_TOKEN" | python3 -m json.tool

echo ""
echo "7. 创建销售单测试..."
TODAY=$(date +%Y-%m-%d)
curl -s -X POST "$BASE_URL/sales-orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BOSS_TOKEN" \
  -d '{
    "farmer_id": 1,
    "season_id": 1,
    "sale_date": "'$TODAY'",
    "remark": "测试春耕赊销",
    "items": [
      {"product_id": 1, "quantity": 2, "unit_price": 60, "remark": "杂交水稻种子"},
      {"product_id": 3, "quantity": 5, "unit_price": 180, "remark": "复合肥"}
    ]
  }' | python3 -m json.tool

echo ""
echo "8. 录入还款测试..."
curl -s -X POST "$BASE_URL/repayments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BOSS_TOKEN" \
  -d '{
    "farmer_id": 1,
    "sales_order_id": 1,
    "amount": 500,
    "repayment_date": "'$TODAY'",
    "payment_method": "现金",
    "remark": "测试还款"
  }' | python3 -m json.tool

echo ""
echo "9. 录入退货测试..."
curl -s -X POST "$BASE_URL/returns" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BOSS_TOKEN" \
  -d '{
    "sales_order_id": 1,
    "sales_order_item_id": 1,
    "quantity": 1,
    "return_date": "'$TODAY'",
    "reason": "测试退货",
    "remark": "退回1袋种子"
  }' | python3 -m json.tool

echo ""
echo "10. 查询农户账单..."
curl -s "$BASE_URL/queries/farmer/1/ledger" \
  -H "Authorization: Bearer $BOSS_TOKEN" | python3 -m json.tool | head -80

echo ""
echo "11. 查询欠款表..."
curl -s "$BASE_URL/reports/outstanding" \
  -H "Authorization: Bearer $BOSS_TOKEN" | python3 -m json.tool | head -50

echo ""
echo "12. 查询审计日志..."
curl -s "$BASE_URL/audit-logs?page=1&pageSize=5" \
  -H "Authorization: Bearer $BOSS_TOKEN" | python3 -m json.tool | head -60

echo ""
echo "13. 测试店员权限 - 尝试修改农户（应该被拒绝）..."
curl -s -X PUT "$BASE_URL/farmers/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -d '{"name":"王大春修改"}' | python3 -m json.tool

echo ""
echo "14. 测试店员权限 - 录入非当天还款（应该被拒绝）..."
curl -s -X POST "$BASE_URL/repayments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -d '{
    "farmer_id": 1,
    "amount": 100,
    "repayment_date": "2025-01-01",
    "payment_method": "现金"
  }' | python3 -m json.tool

echo ""
echo "15. 查询当天收款..."
curl -s "$BASE_URL/repayments/today" \
  -H "Authorization: Bearer $BOSS_TOKEN" | python3 -m json.tool

echo ""
echo "=========================================="
echo "测试完成！"
echo "=========================================="
