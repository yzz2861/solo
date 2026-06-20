#!/bin/bash
BASE="http://localhost:3005/api/v1"
PASS=0
FAIL=0

assert_eq() {
  local name="$1"; local expected="$2"; local actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  ✅ $name"
    ((PASS++))
  else
    echo "  ❌ $name (期望 $expected, 实际 $actual)"
    ((FAIL++))
  fi
}

assert_contains() {
  local name="$1"; local substr="$2"; local text="$3"
  if echo "$text" | grep -q "$substr"; then
    echo "  ✅ $name"
    ((PASS++))
  else
    echo "  ❌ $name (缺少 '$substr')"
    ((FAIL++))
  fi
}

echo "=============================================="
echo "培训补考报名服务 - API 业务规则测试"
echo "=============================================="

echo -e "\n[测试1] 正常报名补考 (E001王五 C001未通过)"
R1=$(curl -s -X POST "$BASE/registrations" -H "Content-Type: application/json" \
  -d '{"employee_id":"E001","course_code":"C001","retake_batch_code":"B202606_C001"}')
assert_contains "报名成功" '"success":true' "$R1"
assert_contains "状态 pending" '"status":"pending"' "$R1"
R1ID=$(echo "$R1" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
echo "    报名ID: $R1ID"

echo -e "\n[测试2] 业务规则1 - 已通过员工不能报名 (E004郑十已过C001)"
R2=$(curl -s -X POST "$BASE/registrations" -H "Content-Type: application/json" \
  -d '{"employee_id":"E004","course_code":"C001","retake_batch_code":"B202606_C001"}')
assert_contains "被拦截返回失败" '"success":false' "$R2"
assert_contains "错误码 ALREADY_PASSED" 'ALREADY_PASSED' "$R2"

echo -e "\n[测试3] 业务规则3 - 重复提交自动合并"
R3=$(curl -s -X POST "$BASE/registrations" -H "Content-Type: application/json" \
  -d '{"employee_id":"E001","course_code":"C001","retake_batch_code":"B202606_C001"}')
assert_contains "返回 merged:true" '"merged":true' "$R3"
R3ID=$(echo "$R3" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
assert_eq "报名ID不变" "$R1ID" "$R3ID"

echo -e "\n[测试4] 多员工报名 (E002, E003, E004-C003, E005-C003)"
R4A=$(curl -s -X POST "$BASE/registrations" -H "Content-Type: application/json" \
  -d '{"employee_id":"E002","course_code":"C001","retake_batch_code":"B202606_C001"}')
assert_contains "E002-C001成功" '"success":true' "$R4A"
R4B=$(curl -s -X POST "$BASE/registrations" -H "Content-Type: application/json" \
  -d '{"employee_id":"E002","course_code":"C002","retake_batch_code":"B202606_C002"}')
assert_contains "E002-C002成功" '"success":true' "$R4B"
R4C=$(curl -s -X POST "$BASE/registrations" -H "Content-Type: application/json" \
  -d '{"employee_id":"E003","course_code":"C001","retake_batch_code":"B202606_C001"}')
assert_contains "E003-C001成功" '"success":true' "$R4C"
R4C_ID=$(echo "$R4C" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
R4D=$(curl -s -X POST "$BASE/registrations" -H "Content-Type: application/json" \
  -d '{"employee_id":"E004","course_code":"C003","retake_batch_code":"B202606_C003"}')
assert_contains "E004-C003成功" '"success":true' "$R4D"
R4E=$(curl -s -X POST "$BASE/registrations" -H "Content-Type: application/json" \
  -d '{"employee_id":"E005","course_code":"C003","retake_batch_code":"B202606_C003"}')
assert_contains "E005-C003成功" '"success":true' "$R4E"
R4E_ID=$(echo "$R4E" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

echo -e "\n[测试5] HR审核 - 通过E001的申请"
R5=$(curl -s -X PUT "$BASE/registrations/$R1ID/review" -H "Content-Type: application/json" \
  -d '{"action":"approve","operator":"HR001"}')
assert_contains "审核成功" '"success":true' "$R5"
assert_contains "状态 approved" '"registration_status":"approved"' "$R5"

echo -e "\n[测试6] HR审核 - 标记线下沟通并拒绝E003"
R6=$(curl -s -X PUT "$BASE/registrations/$R4C_ID/review" -H "Content-Type: application/json" \
  -d '{"action":"reject","operator":"HR001","rejection_reason":"需线下培训","need_offline_communication":true,"offline_communication_note":"联系部门主管安排"}')
assert_contains "审核成功" '"success":true' "$R6"
assert_contains "状态 rejected" '"registration_status":"rejected"' "$R6"
assert_contains "线下沟通标记" '"need_offline_communication":1' "$R6"

echo -e "\n[测试7] HR查看审核名单统计"
R7=$(curl -s "$BASE/hr/review")
STATS=$(echo "$R7" | python3 -c "import sys,json; s=json.load(sys.stdin)['data']['stats']; print(f\"{s['total']},{s['pending']},{s['approved']},{s['rejected']}\")" 2>/dev/null)
TOTAL=$(echo "$STATS" | cut -d, -f1)
PEND=$(echo "$STATS" | cut -d, -f2)
APP=$(echo "$STATS" | cut -d, -f3)
REJ=$(echo "$STATS" | cut -d, -f4)
echo "    统计: 总数=$TOTAL 待审核=$PEND 已通过=$APP 已拒绝=$REJ"
assert_eq "总数>=5" "1" "$([ $TOTAL -ge 5 ] && echo 1 || echo 0)"
assert_eq "已通过>=1" "1" "$([ $APP -ge 1 ] && echo 1 || echo 0)"
assert_eq "已拒绝>=1" "1" "$([ $REJ -ge 1 ] && echo 1 || echo 0)"

echo -e "\n[测试8] 成绩回写 - E001补考得85分(通过分数线80)"
R8=$(curl -s -X PUT "$BASE/registrations/$R1ID/score" -H "Content-Type: application/json" \
  -d '{"final_score":85}')
assert_contains "回写成功" '"success":true' "$R8"
assert_contains "通过" '"is_passed":true' "$R8"
assert_contains "已完成状态" '"registration_status":"completed"' "$R8"

echo -e "\n[测试9] 成绩回写后不再提醒 - E001标记为已通知"
NOTIFIED=$(echo "$R8" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['notified_to_assistant'])" 2>/dev/null)
assert_eq "notified_to_assistant=1" "1" "$NOTIFIED"

echo -e "\n[测试10] 业务规则2 - 补考次数限制 E001已通过不能再报名新批次"
R10=$(curl -s -X POST "$BASE/registrations" -H "Content-Type: application/json" \
  -d '{"employee_id":"E001","course_code":"C001","retake_batch_code":"B202607_C001"}')
assert_contains "已通过拦截" 'ALREADY_PASSED' "$R10"

echo -e "\n[测试11] 部门经理风险查询 - M001(技术研发部经理)"
R11=$(curl -s "$BASE/department/risk/M001")
assert_contains "查询成功" '"success":true' "$R11"
SUMMARY=$(echo "$R11" | python3 -c "import sys,json; s=json.load(sys.stdin)['data']['summary']; print(f\"total={s.get('total_registrations',0)},emp={s.get('affected_employees',0)},passed={s.get('passed_count',0)}\")" 2>/dev/null)
echo "    部门汇总: $SUMMARY"
HR_COUNT=$(echo "$R11" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']['high_risk_employees']))" 2>/dev/null)
echo "    高风险员工数: $HR_COUNT"
assert_eq "有高风险员工" "1" "$([ $HR_COUNT -ge 1 ] && echo 1 || echo 0)"

echo -e "\n[测试12] 部门助理未通过名单 - A001(研发部助理)"
R12=$(curl -s "$BASE/assistant/unnotified/A001")
assert_contains "查询成功" '"success":true' "$R12"
NEW_CNT=$(echo "$R12" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['total_new'])" 2>/dev/null)
TOTAL_UNP=$(echo "$R12" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['total_unpassed'])" 2>/dev/null)
IDS=$(echo "$R12" | python3 -c "import sys,json; print(','.join(map(str,json.load(sys.stdin)['data']['pending_notification_ids'])))" 2>/dev/null)
echo "    新提醒数=$NEW_CNT, 部门未通过总数=$TOTAL_UNP, 待通知ID=$IDS"
assert_eq "有新提醒" "1" "$([ $NEW_CNT -ge 1 ] && echo 1 || echo 0)"

echo -e "\n[测试13] 标记已通知, 避免反复提醒"
if [ -n "$IDS" ]; then
  R13=$(curl -s -X PUT "$BASE/assistant/mark-notified" -H "Content-Type: application/json" \
    -d "{\"ids\":[${IDS}]}")
  assert_contains "标记成功" '"success":true' "$R13"
  echo "    再次查询验证..."
  R13B=$(curl -s "$BASE/assistant/unnotified/A001")
  NEW2=$(echo "$R13B" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['total_new'])" 2>/dev/null)
  assert_eq "新提醒减少或为0" "1" "$([ $NEW2 -lt $NEW_CNT ] || [ $NEW2 -eq 0 ] && echo 1 || echo 0)"
  echo "    标记前新提醒=$NEW_CNT, 标记后=$NEW2"
fi

echo -e "\n[测试14] 月度数据导出 (2026年6月)"
R14=$(curl -s "$BASE/export/monthly?year=2026&month=6")
assert_contains "导出成功" '"success":true' "$R14"
EXP=$(echo "$R14" | python3 -c "import sys,json; s=json.load(sys.stdin)['data']['stats']; print(f\"未通过={s['not_passed_count']},已补考={s['retaken_count']}(过{s['retaken_passed']}/未{s['retaken_failed']}),需线下={s['need_offline_count']}\")" 2>/dev/null)
echo "    6月汇总: $EXP"

echo -e "\n[测试15] 员工完整记录查询 - E001"
R15=$(curl -s "$BASE/employees/E001/records")
assert_contains "查询成功" '"success":true' "$R15"
REG_CNT=$(echo "$R15" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']['registrations']))" 2>/dev/null)
SCR_CNT=$(echo "$R15" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']['original_scores']))" 2>/dev/null)
echo "    报名记录=$REG_CNT, 成绩记录=$SCR_CNT"
assert_eq "有报名记录" "1" "$([ $REG_CNT -ge 1 ] && echo 1 || echo 0)"

echo -e "\n=============================================="
echo "  测试完成: 通过 $PASS, 失败 $FAIL"
echo "=============================================="
[ $FAIL -eq 0 ] && echo "🎉 全部测试通过!" || echo "⚠️  有 $FAIL 项失败,请检查"
exit $FAIL
