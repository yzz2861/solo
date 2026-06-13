#!/bin/bash
set -e

BASE="http://localhost:3000/api"

echo "=========================================="
echo "  门卫角色权限边界验证测试"
echo "=========================================="
echo ""

# 1. 登录
echo "=== 第1步: 各角色登录 ==="
TOKEN_ZS=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"username":"zhangsan","password":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
TOKEN_ADMIN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"username":"xingzheng","password":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
TOKEN_WW=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"username":"wangwu","password":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
TOKEN_GUARD=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"username":"guard1","password":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
TOKEN_LEGAL=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"username":"zhaoliu","password":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
echo "✅ 全部登录成功"
echo ""

# 2. 获取审批人和行政ID
APPROVER_ID=$(curl -s $BASE/users?role=APPROVER -H "Authorization: Bearer $TOKEN_ADMIN" | python3 -c "import sys,json; users=json.load(sys.stdin)['data']; print(users[0]['id'] if users else '')")
ADMIN_ID=$(curl -s $BASE/users?role=ADMIN -H "Authorization: Bearer $TOKEN_ADMIN" | python3 -c "import sys,json; users=json.load(sys.stdin)['data']; print([u['id'] for u in users if u['username']=='xingzheng'][0])")
echo "审批人ID: $APPROVER_ID"
echo "行政ID: $ADMIN_ID"
echo ""

# 3. 员工发起两个申请：一个今天取章，一个历史的
echo "=== 第2步: 创建测试申请 ==="

# 申请A - 今天取章的
APP_A=$(curl -s -X POST $BASE/applications \
  -H "Authorization: Bearer $TOKEN_ZS" \
  -H 'Content-Type: application/json' \
  -d "{
    \"borrowType\": \"TAKE_OUT\",
    \"materialType\": \"CONTRACT\",
    \"materialName\": \"XX公司年度销售合同\",
    \"materialPages\": 15,
    \"materialAmount\": 880000,
    \"materialDescription\": \"与XX公司2026年度销售框架合同，涉及多类产品\",
    \"expectedReturnDate\": \"2026-06-15T18:00:00.000Z\",
    \"approverId\": \"$APPROVER_ID\",
    \"handlerId\": \"$ADMIN_ID\"
  }")
APP_A_ID=$(echo "$APP_A" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
echo "申请A（今天取章）ID: $APP_A_ID"

# 申请B - 历史的（我们先创建，审批，取章，归还，模拟历史记录）
APP_B=$(curl -s -X POST $BASE/applications \
  -H "Authorization: Bearer $TOKEN_ZS" \
  -H 'Content-Type: application/json' \
  -d "{
    \"borrowType\": \"TAKE_OUT\",
    \"materialType\": \"AGREEMENT\",
    \"materialName\": \"YY公司合作协议\",
    \"materialPages\": 8,
    \"materialAmount\": 200000,
    \"materialDescription\": \"与YY公司的战略合作协议\",
    \"expectedReturnDate\": \"2026-06-05T18:00:00.000Z\",
    \"approverId\": \"$APPROVER_ID\",
    \"handlerId\": \"$ADMIN_ID\"
  }")
APP_B_ID=$(echo "$APP_B" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
echo "申请B（历史记录）ID: $APP_B_ID"

# 审批通过两个申请
curl -s -X POST $BASE/applications/$APP_A_ID/approve \
  -H "Authorization: Bearer $TOKEN_WW" \
  -H 'Content-Type: application/json' \
  -d '{"action":"APPROVED","comment":"同意外借，请妥善保管"}' > /dev/null
curl -s -X POST $BASE/applications/$APP_B_ID/approve \
  -H "Authorization: Bearer $TOKEN_WW" \
  -H 'Content-Type: application/json' \
  -d '{"action":"APPROVED","comment":"同意"}' > /dev/null

# 确认取章
curl -s -X POST $BASE/applications/$APP_A_ID/pickup \
  -H "Authorization: Bearer $TOKEN_ADMIN" > /dev/null
curl -s -X POST $BASE/applications/$APP_B_ID/pickup \
  -H "Authorization: Bearer $TOKEN_ADMIN" > /dev/null

# 申请B（历史的）已归还
curl -s -X POST $BASE/applications/$APP_B_ID/return \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H 'Content-Type: application/json' \
  -d '{"returnedPages": 8}' > /dev/null

echo "✅ 测试数据创建完成"
echo ""

# 4. 验证：门卫看列表
echo "=== 第3步: 验证 - 门卫查看申请列表 ==="
echo ""
echo "【预期】只返回当天取章安排结构（pendingPickup / todayPickedUp / todayReturned），不是list结构；"
echo "       不包含历史申请（如申请B）；不含材料名称、页数、金额、说明等敏感字段"
echo ""
echo "门卫列表返回结果："
GUARD_LIST=$(curl -s $BASE/applications -H "Authorization: Bearer $TOKEN_GUARD")
echo "$GUARD_LIST" | python3 -m json.tool
echo ""

# 检查返回结构
HAS_PENDING=$(echo "$GUARD_LIST" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print('YES' if 'pendingPickup' in d else 'NO')")
HAS_LIST=$(echo "$GUARD_LIST" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print('YES' if 'list' in d else 'NO')")
echo "✅ 包含pendingPickup结构: $HAS_PENDING"
echo "❌ 不包含list结构: $HAS_LIST (预期NO)"
echo ""

# 检查是否包含材料名称等敏感字段
FIRST_ITEM=$(echo "$GUARD_LIST" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
items = d.get('todayPickedUp', []) + d.get('pendingPickup', []) + d.get('todayReturned', [])
if items:
    print(json.dumps(items[0]))
else:
    print('{}')
")
echo "门卫看到的第一条记录字段："
echo "$FIRST_ITEM" | python3 -m json.tool
echo ""

HAS_MATERIAL_NAME=$(echo "$FIRST_ITEM" | python3 -c "import sys,json; d=json.load(sys.stdin); print('YES' if 'materialName' in d else 'NO')")
HAS_MATERIAL_PAGES=$(echo "$FIRST_ITEM" | python3 -c "import sys,json; d=json.load(sys.stdin); print('YES' if 'materialPages' in d else 'NO')")
HAS_MATERIAL_AMOUNT=$(echo "$FIRST_ITEM" | python3 -c "import sys,json; d=json.load(sys.stdin); print('YES' if 'materialAmount' in d else 'NO')")
HAS_MATERIAL_DESC=$(echo "$FIRST_ITEM" | python3 -c "import sys,json; d=json.load(sys.stdin); print('YES' if 'materialDescription' in d else 'NO')")
HAS_APPLICANT_NAME=$(echo "$FIRST_ITEM" | python3 -c "import sys,json; d=json.load(sys.stdin); print('YES' if 'applicantName' in d else 'NO')")
HAS_DEPARTMENT=$(echo "$FIRST_ITEM" | python3 -c "import sys,json; d=json.load(sys.stdin); print('YES' if 'department' in d else 'NO')")

echo "字段检查："
echo "  - 材料名称 materialName: $HAS_MATERIAL_NAME (预期: NO)"
echo "  - 材料页数 materialPages: $HAS_MATERIAL_PAGES (预期: NO)"
echo "  - 材料金额 materialAmount: $HAS_MATERIAL_AMOUNT (预期: NO)"
echo "  - 材料说明 materialDescription: $HAS_MATERIAL_DESC (预期: NO)"
echo "  - 申请人姓名 applicantName: $HAS_APPLICANT_NAME (预期: YES)"
echo "  - 部门 department: $HAS_DEPARTMENT (预期: YES)"
echo ""

# 5. 验证：门卫查看详情
echo "=== 第4步: 验证 - 门卫查看申请详情 ==="
echo ""
echo "【测试A】门卫查看今天取章的申请详情（应该成功，但字段精简）"
DETAIL_A=$(curl -s $BASE/applications/$APP_A_ID -H "Authorization: Bearer $TOKEN_GUARD")
echo "$DETAIL_A" | python3 -m json.tool

DETAIL_CODE=$(echo "$DETAIL_A" | python3 -c "import sys,json; print(json.load(sys.stdin)['code'])")
echo "状态码: $DETAIL_CODE (预期: 200)"

HAS_MATERIAL_NAME_DETAIL=$(echo "$DETAIL_A" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print('YES' if 'materialName' in d else 'NO')")
HAS_MATERIAL_PAGES_DETAIL=$(echo "$DETAIL_A" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print('YES' if 'materialPages' in d else 'NO')")
HAS_MATERIAL_AMOUNT_DETAIL=$(echo "$DETAIL_A" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print('YES' if 'materialAmount' in d else 'NO')")

echo "详情字段检查："
echo "  - 材料名称: $HAS_MATERIAL_NAME_DETAIL (预期: NO)"
echo "  - 材料页数: $HAS_MATERIAL_PAGES_DETAIL (预期: NO)"
echo "  - 材料金额: $HAS_MATERIAL_AMOUNT_DETAIL (预期: NO)"
echo ""

echo "【测试B】门卫查看历史申请详情（应该403拒绝）"
DETAIL_B=$(curl -s $BASE/applications/$APP_B_ID -H "Authorization: Bearer $TOKEN_GUARD")
echo "$DETAIL_B" | python3 -m json.tool
DETAIL_B_CODE=$(echo "$DETAIL_B" | python3 -c "import sys,json; print(json.load(sys.stdin)['code'])")
echo "状态码: $DETAIL_B_CODE (预期: 403)"
echo ""

# 6. 验证：门卫访问审批历史
echo "=== 第5步: 验证 - 门卫访问审批历史（预期403） ==="
HISTORY_RES=$(curl -s $BASE/applications/$APP_A_ID/history -H "Authorization: Bearer $TOKEN_GUARD")
echo "$HISTORY_RES" | python3 -m json.tool
HISTORY_CODE=$(echo "$HISTORY_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['code'])")
echo "状态码: $HISTORY_CODE (预期: 403)"
echo ""

# 7. 对比：员工/行政看列表是正常结构
echo "=== 第6步: 对比验证 - 其他角色列表结构正常 ==="
echo ""
echo "员工看自己的申请列表（list结构）："
EMP_LIST=$(curl -s $BASE/applications -H "Authorization: Bearer $TOKEN_ZS")
EMP_HAS_LIST=$(echo "$EMP_LIST" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print('YES' if 'list' in d else 'NO')")
EMP_TOTAL=$(echo "$EMP_LIST" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['total'])")
echo "  有list字段: $EMP_HAS_LIST (预期: YES)"
echo "  记录总数: $EMP_TOTAL"
echo ""

echo "行政看全部申请列表（list结构）："
ADMIN_LIST=$(curl -s $BASE/applications -H "Authorization: Bearer $TOKEN_ADMIN")
ADMIN_HAS_LIST=$(echo "$ADMIN_LIST" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print('YES' if 'list' in d else 'NO')")
ADMIN_TOTAL=$(echo "$ADMIN_LIST" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['total'])")
echo "  有list字段: $ADMIN_HAS_LIST (预期: YES)"
echo "  记录总数: $ADMIN_TOTAL"
echo ""

echo "行政看申请详情（有完整字段）："
ADMIN_DETAIL=$(curl -s $BASE/applications/$APP_A_ID -H "Authorization: Bearer $TOKEN_ADMIN")
ADMIN_HAS_NAME=$(echo "$ADMIN_DETAIL" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print('YES' if 'materialName' in d else 'NO')")
ADMIN_HAS_PAGES=$(echo "$ADMIN_DETAIL" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print('YES' if 'materialPages' in d else 'NO')")
ADMIN_HAS_AMOUNT=$(echo "$ADMIN_DETAIL" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print('YES' if 'materialAmount' in d else 'NO')")
echo "  材料名称: $ADMIN_HAS_NAME (预期: YES)"
echo "  材料页数: $ADMIN_HAS_PAGES (预期: YES)"
echo "  材料金额: $ADMIN_HAS_AMOUNT (预期: YES)"
echo ""

# 8. 验证门卫专用 /guard/schedule 接口也能正常工作
echo "=== 第7步: 验证 - 门卫专用接口 /guard/schedule 正常 ==="
GUARD_SCHEDULE=$(curl -s $BASE/guard/schedule -H "Authorization: Bearer $TOKEN_GUARD")
echo "$GUARD_SCHEDULE" | python3 -m json.tool
echo ""

echo "=========================================="
echo "  ✅ 门卫权限边界验证完成！"
echo "=========================================="
