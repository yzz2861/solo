再验证几个关键 API 接口后完成任务：

        
            
toolName: run_command
            
status: success
          
command: echo "=== 测试缺材料拦截 ===" && \
curl -s -X POST http://localhost:8000/api/v1/allowance/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "business_id": "BIZ-API-002",
    "teacher": {
      "teacher_id": "T002", "name": "李老师", "status": "active",
      "course_hours": 80, "course_type": "lecture", "base_rate": 50.0,
      "materials_submitted": false
    },
    "time_window": {"start_date": "2026-05-01", "end_date": "2026-05-31"},
    "rule_version": "v1", "operator": "admin"
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print('final_action:', d['final_action']); print('task_status:', d['task_status']); print('reason:', d['readable_reason'])" 2>&1 && \
echo && echo "=== 测试高风险课时进入复核 ===" && \
curl -s -X POST http://localhost:8000/api/v1/allowance/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "business_id": "BIZ-API-003",
    "teacher": {
      "teacher_id": "T003", "name": "张老师", "status": "retired",
      "course_hours": 60, "course_type": "lecture", "base_rate": 50.0,
      "materials_submitted": true
    },
    "time_window": {"start_date": "2026-05-01", "end_date": "2026-05-31"},
    "rule_version": "v1", "operator": "admin"
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print('final_action:', d['final_action']); print('task_status:', d['task_status']); print('reason:', d['readable_reason'])" 2>&1 && \
echo && echo "=== 测试复核通过 ===" && \
curl -s -X POST http://localhost:8000/api/v1/allowance/review \
  -H "Content-Type: application/json" \
  -d '{"business_id":"BIZ-API-003","approved":true,"operator":"reviewer1","reason":"返聘教师，材料齐全"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('final_action:', d['final_action']); print('task_status:', d['task_status']); print('reason:', d['readable_reason'])" 2>&1 && \
echo && echo "=== 测试数据回放 ===" && \
curl -s http://localhost:8000/api/v1/allowance/replay/BIZ-API-003 \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('audit_records:', len(d[0]['audit_records'])); print('state_transitions:', len(d[0]['state_transitions']));" 2>&1 undefined
          
Shell 输出有些混乱，但第一个验证成功了。让我逐个测试其他 API：

        
            
toolName: run_command
            
status: success
          
command: curl -s -X POST http://localhost:8000/api/v1/allowance/calculate \
  -H "Content-Type: application/json" \
  -d '{"business_id":"BIZ-API-003","teacher":{"teacher_id":"T003","name":"张老师","status":"retired","course_hours":60,"course_type":"lecture","base_rate":50.0,"materials_submitted":true},"time_window":{"start_date":"2026-05-01","end_date":"2026-05-31"},"rule_version":"v1","operator":"admin"}' \
  | python3 -m json.tool 2>&1 undefined
          

        
            
toolName: run_command
            
status: success
          
command: echo "=== 复核通过 ===" && \
curl -s -X POST http://localhost:8000/api/v1/allowance/review \
  -H "Content-Type: application/json" \
  -d '{"business_id":"BIZ-API-003","approved":true,"operator":"reviewer1","reason":"返聘教师材料齐全"}' \
  | python3 -m json.tool 2>&1 && \
echo && echo "=== 重复提交拦截 ===" && \
curl -s -X POST http://localhost:8000/api/v1/allowance/calculate \
  -H "Content-Type: application/json" \
  -d '{"business_id":"BIZ-API-001","teacher":{"teacher_id":"T001","name":"王老师","status":"active","course_hours":80,"course_type":"lecture","base_rate":50.0,"materials_submitted":true},"time_window":{"start_date":"2026-05-01","end_date":"2026-05-31"},"rule_version":"v1","operator":"admin"}' \
  | python3 -m json.tool 2>&1 && \
echo && echo "=== 数据回放 ===" && \
curl -s http://localhost:8000/api/v1/allowance/replay/BIZ-API-003 \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('audit records:', len(d[0]['audit_records'])); print('state transitions:', len(d[0]['state_transitions'])); [print(f'  {t[\"from_status\"]} -> {t[\"to_status\"]}: {t[\"reason\"]}') for t in d[0]['state_transitions']]" 2>&1 undefined
          

        
            
toolName: check_command_status
            
status: success
          
          

        
            
toolName: run_command
            
status: success
          
command: curl -s -X POST http://localhost:8000/api/v1/allowance/review -H "Content-Type: application/json" -d '{"business_id":"BIZ-API-003","approved":true,"operator":"reviewer1","reason":"返聘教师材料齐全"}' undefined
          

        
            
toolName: run_command
            
status: success
          
command: curl -s -X POST http://localhost:8000/api/v1/allowance/calculate -H "Content-Type: application/json" -d '{"business_id":"BIZ-API-001","teacher":{"teacher_id":"T001","name":"王老师","status":"active","course_hours":80,"course_type":"lecture","base_rate":50.0,"materials_submitted":true},"time_window":{"start_date":"2026-05-01","end_date":"2026-05-31"},"rule_version":"v1","operator":"admin"}' undefined
          

        
            
toolName: run_command
            
status: success
          
command: curl -s http://localhost:8000/api/v1/allowance/replay/BIZ-API-003 undefined
          

        
            
toolName: StopCommand
            
status: success
          
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 7 items
          
## "教师课时津贴核算API" 建设完成

### 四层架构设计

| 层级 | 职责 | 核心文件 |
|------|------|----------|
| **对象层 Object** | 教师、课程、时间窗口等业务对象建模 | [object.py](file:///Users/bill/Documents/solo/workspaces/yzz00154/app/models/object.py) |
| **规则层 Rule** | 风险判定、材料校验、核算公式、规则版本管理 | [rule.py](file:///Users/bill/Documents/solo/workspaces/yzz00154/app/models/rule.py) |
| **状态层 State** | 任务状态机、状态流转校验、生命周期管理 | [state.py](file:///Users/bill/Documents/solo/workspaces/yzz00154/app/models/state.py) |
| **记录层 Record** | 审计日志、核算结果、数据回放 | [record.py](file:///Users/bill/Documents/solo/workspaces/yzz00154/app/models/record.py) |

### 核心实现

**核算口径**（见 [calculate_allowance](file:///Users/bill/Documents/solo/workspaces/yzz00154/app/models/rule.py#L120-L132)）：
```
津贴 = 课时 × 基础费率 × 课程类型系数 × 教师状态系数
```
- 课程类型系数：lecture 1.0 / lab 1.2 / seminar 1.1 / practice 1.3
- 状态系数：active 1.0 / retired 0.5 / on_leave 0.3 / suspended 0.0
- 月度上限 200 课时，超过触发复核

**风险拦截逻辑**（见 [_evaluate_rules](file:///Users/bill/Documents/solo/workspaces/yzz00154/app/engine/calculator.py#L67-L104)）：
- `materials_submitted=false` → **直接拦截**（BLOCK）
- 课时 > 200 或 教师非在职 → **进入复核**（PENDING_REVIEW），不允许直接通过
- 同时满足多个条件时，BLOCK 优先级高于 PENDING_REVIEW

**状态流转**（见 [TaskState](file:///Users/bill/Documents/solo/workspaces/yzz00154/app/models/state.py#L41-L81)）：
```
SUBMITTED → PROCESSING → PASSED / BLOCKED / PENDING_REVIEW
PENDING_REVIEW → REVIEW_APPROVED / REVIEW_REJECTED
BLOCKED / REVIEW_REJECTED → PROCESSING（可重新提交）
```

### API 接口

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/v1/allowance/calculate` | 单条核算 |
| POST | `/api/v1/allowance/batch-calculate` | 批量核算 |
| POST | `/api/v1/allowance/review` | 人工复核 |
| GET | `/api/v1/allowance/replay/{business_id}` | 数据回放 |
| GET | `/api/v1/allowance/status/{business_id}` | 任务状态查询 |

### 测试覆盖（35个测试，全部通过）

| 测试类 | 场景 | 数量 |
|--------|------|------|
| `TestSingleSuccess` | 单条成功（普通课时、各课程类型、自定义费率） | 4 |
| `TestBatchPartialFailure` | 批量部分失败（通过/拦截/复核混合） | 1 |
| `TestManualReview` | 人工复核（状态异常、超课时、复核通过/驳回、缺材料拦截） | 7 |
| `TestDuplicateSubmission` | 重复提交（终态拦截、拦截后重提、驳回后重提） | 3 |
| `TestCalculationCaliber` | 计算口径验证（因子拆解、各状态金额、规则版本差异） | 5 |
| `TestExceptionExplanation` | 异常解释可读性 | 3 |
| `TestTaskStatus` | 状态机流转、非法转移校验 | 4 |
| `TestDataReplay` | 数据回放（审计记录、流程回放、空记录处理） | 3 |
| `TestCalculateAllowanceFunction` | 金额函数单元测试 | 5 |

### 运行方式

```bash
# 启动服务
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# 运行测试
python3 -m pytest tests/test_allowance.py -v
```
