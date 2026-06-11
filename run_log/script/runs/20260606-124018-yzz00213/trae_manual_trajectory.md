我来帮你设计这个"环卫车辆油耗异常API"。首先让我查看一下当前工作目录的情况，了解项目现状。
        
            
toolName: view_folder
            
status: success
          
/Users/bill/Documents/solo/workspaces/yzz00213
          
当前目录为空，我来为你设计完整的"环卫车辆油耗异常API"。这是一个涉及多场景、多状态流转的复杂业务接口，让我先规划好整体设计方案。
        
            
toolName: todo_write
            
status: success
          
Todos updated: 5 items
          
好的，我来为你设计并实现这套"环卫车辆油耗异常API"。我将使用 Node.js + Express 构建，包含完整的数据模型、业务逻辑和多场景处理。

让我先创建项目结构和核心数据模型：


        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00213/package.json
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00213/src/models/dataModels.js
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00213/src/stores/memoryStore.js
          
changes: undefined
          
数据模型与存储层已就绪。现在实现核心业务处理逻辑，包括规则命中、重复提交、缺字段、规则冲突等场景的独立处理：

        
            
toolName: todo_write
            
status: success
          
Todos updated: 5 items
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00213/src/services/fuelAbnormalService.js
          
changes: undefined
          
核心业务逻辑已实现，包含规则命中、人工复核、重复提交、缺字段、规则冲突五种场景的独立处理。现在继续实现批量处理、状态检查等接口：



        
            
toolName: todo_write
            
status: success
          
Todos updated: 5 items
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00213/src/services/batchService.js
          
changes: undefined
          
现在实现导出结果与历史轨迹查询功能，然后创建API路由层：




        
            
toolName: todo_write
            
status: success
          
Todos updated: 5 items
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00213/src/services/exportService.js
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00213/src/routes/fuelAbnormalRoutes.js
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00213/src/app.js
          
changes: undefined
          
核心API已全部完成。现在安装依赖并编写测试用例来验证各场景：






        
            
toolName: todo_write
            
status: success
          
Todos updated: 5 items
          

        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00213 && npm install undefined
          
依赖安装成功。现在编写完整的测试用例，覆盖所有验收场景：正常记录、缺字段、规则冲突、重复处理：






        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00213/test/api.test.js
          
changes: undefined
          
现在启动API服务，然后运行测试验证所有场景：






        
            
toolName: run_command
            
status: running
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00213 && node src/app.js undefined
          
服务已启动。现在运行综合测试验证所有场景：






        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00213 && node test/api.test.js undefined
          
让我检查一下测试输出：









        
            
toolName: check_command_status
            
status: success
          
          
测试似乎没有输出，可能是Node.js版本的fetch问题。让我检查一下并修改测试脚本：









        
            
toolName: run_command
            
status: success
          
command: node --version undefined
          
让我用Node.js内置的http模块重写测试脚本，确保兼容性：










        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00213/test/api.test.js
          
changes: undefined
          
现在运行测试：



        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00213 && node test/api.test.js undefined
          
9/10 通过！人工复核测试失败了。让我检查并修复问题——应该是模块导入的问题：




        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00213/src/services/batchService.js
          
找到问题了！`PROCESS_STATUS` 导入路径错误。让我修复：







        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00213/src/services/batchService.js
          
changes: undefined
          
现在检查一下 `createHistoryEntry` 的使用方式，因为之前是直接导入的，现在需要通过 `fuelAbnormalService` 调用：







        
            
toolName: search_by_regex
            
status: success
          
query: createHistoryEntry
          
好的，`createHistoryEntry` 调用方式是正确的。现在重启服务并重新测试：









        
            
toolName: StopCommand
            
status: success
          
          

        
            
toolName: run_command
            
status: running
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00213 && node src/app.js undefined
          
服务已重启。现在重新运行测试：









        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00213 && node test/api.test.js undefined
          
全部 **10/10** 测试通过！现在更新任务状态并编写API文档：








        
            
toolName: todo_write
            
status: success
          
Todos updated: 5 items
          
现在让我完成最后的任务，并为你呈现完整的API设计总结：




        
            
toolName: todo_write
            
status: success
          
Todos updated: 5 items
          
---

## 环卫车辆油耗异常API - 设计完成 ✅

**10/10 测试场景全部通过**，API服务已在 `http://localhost:3000` 运行。

---

### 📁 项目结构

```
yzz00213/
├── package.json
├── src/
│   ├── app.js                         # 服务入口
│   ├── models/
│   │   └── dataModels.js              # 数据模型与枚举
│   ├── stores/
│   │   └── memoryStore.js             # 内存存储
│   ├── services/
│   │   ├── fuelAbnormalService.js     # 核心业务逻辑
│   │   ├── batchService.js            # 批量与状态管理
│   │   └── exportService.js           # 导出与统计
│   └── routes/
│       └── fuelAbnormalRoutes.js      # API路由
└── test/
    └── api.test.js                    # 综合测试用例
```

---

### 🔌 核心API接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/fuel-abnormal/batch/process` | 批量提交油耗异常记录处理 |
| GET | `/api/fuel-abnormal/record/:id/status` | 按记录ID查询状态 |
| GET | `/api/fuel-abnormal/record/audit/:auditNo` | 按审计编号查询 |
| GET | `/api/fuel-abnormal/record/:id/detail` | 查询记录详情（含历史） |
| POST | `/api/fuel-abnormal/record/:id/review` | 人工复核 |
| POST | `/api/fuel-abnormal/record/:id/supplement` | 补充字段信息 |
| POST | `/api/fuel-abnormal/record/:id/resolve-conflict` | 解决规则冲突 |
| POST | `/api/fuel-abnormal/record/:id/merge-duplicate` | 处理重复记录 |
| GET | `/api/fuel-abnormal/batch/:no/records` | 查询批次记录列表 |
| GET | `/api/fuel-abnormal/batch/:no/export` | 导出批次结果（JSON/CSV） |
| GET | `/api/fuel-abnormal/batch/:no/statistics` | 批次统计 |
| GET | `/api/fuel-abnormal/record/:id/trajectory` | 历史轨迹查询 |

---

### 📥 请求数据结构

**批量提交请求体：**

```json
{
  "batchNo": "BATCH-20250601",
  "operator": "张运营",
  "thresholdConfig": {
    "maxFuelConsumptionPerKm": 3.5,
    "minMileage": 50,
    "maxIdleFuelRate": 3,
    "fuelLeakThreshold": 0.3
  },
  "records": [
    {
      "masterData": {
        "vehicleId": "VH001",
        "vehiclePlate": "京A12345",
        "vehicleType": "洒水车"
      },
      "application": {
        "reportDate": "2025-01-15",
        "fuelConsumption": 25,
        "mileage": 100,
        "idleFuel": 2,
        "idleDuration": 1
      },
      "evidence": [
        { "evidenceType": "FUEL_RECEIPT", "evidenceUrl": "...", "uploadTime": "..." }
      ],
      "historicalStatus": [
        { "date": "2025-01-10", "status": "NORMAL" }
      ]
    }
  ]
}
```

---

### 📤 响应数据结构

**单条记录处理结果：**

| 字段 | 说明 |
|------|------|
| `recordId` | 记录唯一ID |
| `auditNo` | 审计编号（如 `FUEL-20250606-XXXXXX`） |
| `processStatus` | 处理状态（8种状态独立区分） |
| `riskLevel` | 风险等级：`HIGH` / `MEDIUM` / `LOW` |
| `riskTags` | 风险标签数组（含风险等级、命中规则） |
| `nextAction` | 下一步动作 |
| `conclusion` | 业务结论（含类型、摘要、详情、建议） |
| `hitRules` | 命中的规则列表 |
| `ruleConflicts` | 规则冲突列表 |
| `missingFields` | 缺失字段列表 |
| `duplicateRecordId` | 重复记录ID |

---

### 🔄 处理状态与流转

**8种独立状态，不用笼统失败替代具体原因：**

| 状态 | 场景 | 下一步动作 |
|------|------|------------|
| `PROCESSED` | 正常记录，未命中规则 | 归档 |
| `RULE_HIT` | 命中异常规则 | `MANUAL_REVIEW`（人工复核） |
| `RULE_CONFLICT` | 多规则冲突 | `RESOLVE_CONFLICT`（解决冲突） |
| `FIELD_MISSING` | 字段缺失 | `SUPPLEMENT_INFO`（补充信息） |
| `DUPLICATE_SUBMISSION` | 重复提交 | `MERGE_RECORD`（合并记录） |
| `MANUAL_REVIEW` | 人工复核中 | 人工处理 |
| `PENDING` | 待处理 | 等待处理 |
| `REJECTED` | 已驳回 | 归档 |

---

### 🎯 5条内置规则

定义在 [fuelAbnormalService.js](file:///Users/bill/Documents/solo/workspaces/yzz00213/src/services/fuelAbnormalService.js#L57-L120) 的 `executeRules` 函数中：

1. **百公里油耗超标** (`FUEL_CONSUMPTION_EXCEED`) - 高风险
2. **里程异常偏低** (`MILEAGE_ABNORMAL`) - 中风险
3. **怠速油耗过高** (`IDLE_FUEL_WASTE`) - 中风险
4. **疑似油品泄漏** (`FUEL_LEAK_SUSPECTED`) - 高风险（基于佐证材料）
5. **历史异常频繁** (`ROUTE_DEVIATION`) - 高风险（基于历史状态）

---

### 🧪 验收测试结果

运行 `node test/api.test.js` 验证全部10个场景：

| # | 测试场景 | 结果 | 关键验证点 |
|---|----------|------|------------|
| 1 | 正常记录 | ✅ 通过 | `PROCESSED` 状态 + `NORMAL` 结论 + 审计号 |
| 2 | 缺字段 | ✅ 通过 | `FIELD_MISSING` + 4个缺失字段 + `SUPPLEMENT_INFO` |
| 3 | 规则命中 | ✅ 通过 | `RULE_HIT` + 2条规则 + `HIGH` 风险 + 风险标签 |
| 4 | 规则冲突 | ✅ 通过 | 2个冲突点 + `RESOLVE_CONFLICT` 动作 |
| 5 | 重复提交 | ✅ 通过 | `DUPLICATE_SUBMISSION` + 关联原记录ID + `MERGE_RECORD` |
| 6 | 批量处理 | ✅ 通过 | 3条记录 + 3种不同状态 + 状态汇总 |
| 7 | 状态查询 | ✅ 通过 | 按ID查询 + 按审计号查询 |
| 8 | 人工复核 | ✅ 通过 | 状态从 `RULE_HIT` → `PROCESSED` + 2条历史记录 |
| 9 | 导出统计 | ✅ 通过 | JSON导出 + 统计数据 + 异常率33.3% |
| 10 | 历史轨迹 | ✅ 通过 | 时间线 + traceId 追溯链 |

---

### 📊 审计追溯设计

每条记录的每次状态变更都生成历史轨迹，包含：
- **historyId** - 历史记录ID
- **fromStatus / toStatus** - 状态前后变化
- **operator** - 操作人（SYSTEM 或 人工）
- **reason** - 操作原因
- **remark** - 备注详情
- **operateTime** - 操作时间
- **traceId** - 链路追踪ID

可以通过 `/record/:id/trajectory` 查看完整操作轨迹，满足审计追溯要求。

---

### 🚀 启动方式

```bash
cd /Users/bill/Documents/solo/workspaces/yzz00213
npm install
npm start
# 服务地址: http://localhost:3000
# 健康检查: http://localhost:3000/health
# 运行测试: node test/api.test.js
```
