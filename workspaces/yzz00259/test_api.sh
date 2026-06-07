#!/bin/bash

BASE_URL="http://localhost:5000"

echo "======================================"
echo "  楼栋水表异常API 验收测试"
echo "======================================"

echo ""
echo "[01] 测试健康检查接口..."
curl -s "$BASE_URL/api/health" | python3 -m json.tool

echo ""
echo "[02] 查看规则版本列表..."
curl -s "$BASE_URL/api/rules" | python3 -m json.tool

echo ""
echo "======================================"
echo "  场景一：完整数据"
echo "======================================"

echo ""
echo "[1.1] 完整数据 - 通过 (数据正常)"
curl -s -X POST "$BASE_URL/api/abnormal/check" \
  -H "Content-Type: application/json" \
  -d '{
    "biz_no": "LD-SB-2025-000001",
    "object_status": {
      "building_id": "BLD-001",
      "metrics": {
        "usage_increase_rate": 0.1,
        "usage_decrease_rate": 0.05,
        "night_day_ratio": 0.1,
        "zero_usage_days": 0,
        "pressure_cv": 0.1,
        "min_hourly_flow_ratio": 0.8
      }
    },
    "time_window": {
      "start": "2025-07-01 00:00:00",
      "end": "2025-07-07 23:59:59"
    },
    "rule_version": "v2.0",
    "operator": "zhangsan"
  }' | python3 -m json.tool

echo ""
echo "[1.2] 完整数据 - 拦截 (触发高优先级异常)"
curl -s -X POST "$BASE_URL/api/abnormal/check" \
  -H "Content-Type: application/json" \
  -d '{
    "biz_no": "LD-SB-2025-000002",
    "object_status": {
      "building_id": "BLD-002",
      "metrics": {
        "usage_increase_rate": 0.6,
        "night_day_ratio": 0.4,
        "min_hourly_flow_ratio": 2.0
      }
    },
    "time_window": {
      "start": "2025-07-01 00:00:00",
      "end": "2025-07-07 23:59:59"
    },
    "rule_version": "v2.0",
    "operator": "lisi"
  }' | python3 -m json.tool

echo ""
echo "[1.3] 完整数据 - 待复核"
curl -s -X POST "$BASE_URL/api/abnormal/check" \
  -H "Content-Type: application/json" \
  -d '{
    "biz_no": "LD-SB-2025-000003",
    "object_status": {
      "building_id": "BLD-003",
      "metrics": {
        "zero_usage_days": 6,
        "pressure_cv": 0.35
      }
    },
    "time_window": {
      "start": "2025-07-01 00:00:00",
      "end": "2025-07-07 23:59:59"
    },
    "rule_version": "v2.0",
    "operator": "wangwu"
  }' | python3 -m json.tool

echo ""
echo "======================================"
echo "  场景二：时间越界"
echo "======================================"

echo ""
echo "[2.1] 时间越界 - 早于规则生效时间"
curl -s -X POST "$BASE_URL/api/abnormal/check" \
  -H "Content-Type: application/json" \
  -d '{
    "biz_no": "LD-SB-2025-000004",
    "object_status": {
      "building_id": "BLD-004",
      "metrics": {"usage_increase_rate": 0.1}
    },
    "time_window": {
      "start": "2023-01-01 00:00:00",
      "end": "2023-01-07 23:59:59"
    },
    "rule_version": "v2.0",
    "operator": "test_user"
  }' | python3 -m json.tool

echo ""
echo "[2.2] 时间格式错误"
curl -s -X POST "$BASE_URL/api/abnormal/check" \
  -H "Content-Type: application/json" \
  -d '{
    "biz_no": "LD-SB-2025-000005",
    "object_status": {
      "building_id": "BLD-005",
      "metrics": {"usage_increase_rate": 0.1}
    },
    "time_window": {
      "start": "not-a-date",
      "end": "2025-07-07 23:59:59"
    },
    "rule_version": "v2.0",
    "operator": "test_user"
  }' | python3 -m json.tool

echo ""
echo "======================================"
echo "  场景三：编号错误"
echo "======================================"

echo ""
echo "[3.1] 业务编号格式错误"
curl -s -X POST "$BASE_URL/api/abnormal/check" \
  -H "Content-Type: application/json" \
  -d '{
    "biz_no": "INVALID-123",
    "object_status": {
      "building_id": "BLD-006",
      "metrics": {"usage_increase_rate": 0.1}
    },
    "time_window": {
      "start": "2025-07-01 00:00:00",
      "end": "2025-07-07 23:59:59"
    },
    "rule_version": "v2.0",
    "operator": "test_user"
  }' | python3 -m json.tool

echo ""
echo "[3.2] 业务编号为空"
curl -s -X POST "$BASE_URL/api/abnormal/check" \
  -H "Content-Type: application/json" \
  -d '{
    "biz_no": "",
    "object_status": {
      "building_id": "BLD-007",
      "metrics": {"usage_increase_rate": 0.1}
    },
    "time_window": {
      "start": "2025-07-01 00:00:00",
      "end": "2025-07-07 23:59:59"
    },
    "rule_version": "v2.0",
    "operator": "test_user"
  }' | python3 -m json.tool

echo ""
echo "======================================"
echo "  场景四：配置缺失"
echo "======================================"

echo ""
echo "[4.1] 规则版本不存在"
curl -s -X POST "$BASE_URL/api/abnormal/check" \
  -H "Content-Type: application/json" \
  -d '{
    "biz_no": "LD-SB-2025-000008",
    "object_status": {
      "building_id": "BLD-008",
      "metrics": {"usage_increase_rate": 0.1}
    },
    "time_window": {
      "start": "2025-07-01 00:00:00",
      "end": "2025-07-07 23:59:59"
    },
    "rule_version": "v99.0",
    "operator": "test_user"
  }' | python3 -m json.tool

echo ""
echo "======================================"
echo "  验证：重复处理稳定性"
echo "======================================"

echo ""
echo "[5.1] 第一次请求"
RESP1=$(curl -s -X POST "$BASE_URL/api/abnormal/check" \
  -H "Content-Type: application/json" \
  -d '{
    "biz_no": "LD-SB-2025-000010",
    "object_status": {
      "building_id": "BLD-010",
      "metrics": {"usage_increase_rate": 0.5}
    },
    "time_window": {
      "start": "2025-07-01 00:00:00",
      "end": "2025-07-07 23:59:59"
    },
    "rule_version": "v2.0",
    "operator": "repeat_test"
  }')
echo "$RESP1" | python3 -m json.tool
TRACE_ID=$(echo "$RESP1" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['trace_id'])")
echo "  Trace ID: $TRACE_ID"

echo ""
echo "[5.2] 第二次请求 (重复请求)"
RESP2=$(curl -s -X POST "$BASE_URL/api/abnormal/check" \
  -H "Content-Type: application/json" \
  -d '{
    "biz_no": "LD-SB-2025-000010",
    "object_status": {
      "building_id": "BLD-010",
      "metrics": {"usage_increase_rate": 0.5}
    },
    "time_window": {
      "start": "2025-07-01 00:00:00",
      "end": "2025-07-07 23:59:59"
    },
    "rule_version": "v2.0",
    "operator": "repeat_test"
  }')
echo "$RESP2" | python3 -m json.tool

echo ""
echo "======================================"
echo "  验证：可追溯编号"
echo "======================================"

echo ""
echo "[6.1] 通过 trace_id 查询审计记录"
curl -s "$BASE_URL/api/audit/trace/$TRACE_ID" | python3 -m json.tool

echo ""
echo "[6.2] 通过 biz_no 查询历史记录"
curl -s "$BASE_URL/api/audit/biz/LD-SB-2025-000010" | python3 -m json.tool

echo ""
echo "======================================"
echo "  验证：边界条件"
echo "======================================"

echo ""
echo "[7.1] 阈值下界 0.399 (不触发R001)"
curl -s -X POST "$BASE_URL/api/abnormal/check" \
  -H "Content-Type: application/json" \
  -d '{
    "biz_no": "LD-SB-2025-000101",
    "object_status": {
      "building_id": "BLD-101",
      "metrics": {"usage_increase_rate": 0.399}
    },
    "time_window": {
      "start": "2025-07-01 00:00:00",
      "end": "2025-07-07 23:59:59"
    },
    "rule_version": "v2.0",
    "operator": "boundary_test"
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print('  结论:', d['data']['conclusion_cn']); print('  原因:', d['data']['reason'])"

echo ""
echo "[7.2] 阈值上界 0.401 (触发R001)"
curl -s -X POST "$BASE_URL/api/abnormal/check" \
  -H "Content-Type: application/json" \
  -d '{
    "biz_no": "LD-SB-2025-000102",
    "object_status": {
      "building_id": "BLD-102",
      "metrics": {"usage_increase_rate": 0.401}
    },
    "time_window": {
      "start": "2025-07-01 00:00:00",
      "end": "2025-07-07 23:59:59"
    },
    "rule_version": "v2.0",
    "operator": "boundary_test"
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print('  结论:', d['data']['conclusion_cn']); print('  原因:', d['data']['reason'])"

echo ""
echo "======================================"
echo "  验收测试完成"
echo "======================================"
