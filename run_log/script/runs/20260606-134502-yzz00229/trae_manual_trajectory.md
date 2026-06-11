我来帮你设计并实现"消防通道占用取证API"。首先让我了解一下当前工作目录的情况。
        
            
toolName: view_folder
            
status: success
          
/Users/bill/Documents/solo/workspaces/yzz00229
          
目录是空的，我来从零搭建这个消防通道占用取证API。让我先规划一下整体方案。


        
            
toolName: todo_write
            
status: success
          
Todos updated: 7 items
          
好的，我来设计并实现这个消防通道占用取证API。我会使用 Node.js + Express 来构建，包含完整的规则引擎、状态分流、幂等性处理和审计记录。

首先创建项目基础文件：

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/package.json
          
changes: undefined
          
现在创建核心常量配置文件：

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/src/config/constants.js
          
changes: undefined
          
现在创建风险判定规则引擎：



        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/src/rules/riskEngine.js
          
changes: undefined
          
现在创建状态分流服务：



        
            
toolName: todo_write
            
status: success
          
Todos updated: 7 items
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/src/services/statusRouter.js
          
changes: undefined
          
现在创建幂等性处理与审计记录服务：



        
            
toolName: todo_write
            
status: success
          
Todos updated: 7 items
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/src/services/auditService.js
          
changes: undefined
          
现在创建数据校验中间件：


        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/src/middleware/validator.js
          
changes: undefined
          
现在创建API控制器：





        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/src/controllers/evidenceController.js
          
changes: undefined
          
现在创建主应用入口：







        
            
toolName: todo_write
            
status: success
          
Todos updated: 7 items
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/src/app.js
          
changes: undefined
          
现在创建测试用例，覆盖所有验收标准：









        
            
toolName: todo_write
            
status: success
          
Todos updated: 7 items
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/test/run-tests.js
          
changes: undefined
          
现在安装依赖并运行测试验证：







        
            
toolName: todo_write
            
status: success
          
Todos updated: 7 items
          

        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00229 && npm install undefined
          
依赖安装成功。现在运行测试套件验证所有验收标准：


        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00229 && npm test undefined
          
有3个测试失败了，让我分析并修复：

1. **"发生时间超过3天"测试** - 描述字符数不够导致证据不足
2. **"初次提交但证据不足"测试** - 逻辑问题：无证据应该是"需补充"而不是"失败"

让我修复状态分流逻辑和测试用例：


        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/src/services/statusRouter.js
          
问题分析清楚了：
1. **失败 vs 需补充的边界**：只有核心标识（itemId）缺失才算"失败"，业务信息不足应该走"需补充"
2. **测试用例描述字符数不够**：导致证据不足判定为无法判定

让我修复状态分流逻辑：




        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/src/services/statusRouter.js
          
changes: undefined
          
现在修复测试用例中的问题。首先，更新"低风险 - 发生时间超过3天"的描述字符数：





        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/test/run-tests.js
          
让我找到那个测试用例：







        
            
toolName: search_by_regex
            
status: success
          
query: 发生时间超过3天
          
修复测试用例中的描述长度问题，同时更新数据校验测试的预期：







        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/test/run-tests.js
          
changes: undefined
          
现在找到并更新"无证据材料 - 校验失败"的测试，因为我们调整了失败边界：







        
            
toolName: search_by_regex
            
status: success
          
query: 无证据材料
          
更新这个测试，改为验证"无证据材料走需补充状态"：









        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/test/run-tests.js
          
changes: undefined
          
现在重新运行测试，验证修复结果：







        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00229 && npm test undefined
          
只剩一个测试失败了。这个测试名称叫"空批次号"但实际测的是明细项校验，测试名与内容不符。让我修复它：









        
            
toolName: search_by_regex
            
status: success
          
query: 空批次号
          
修复这个测试，改成正确的明细项校验测试：












        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/test/run-tests.js
          
changes: undefined
          
再运行一次测试验证：










        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00229 && npm test undefined
          
全部40项测试通过！现在启动API服务，用实际HTTP请求验证接口：










        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00229 && npm start undefined
          
让我检查一下服务启动状态：










        
            
toolName: check_command_status
            
status: success
          
          
服务似乎没有正常启动，让我直接用node启动并查看输出：












        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00229 && node src/app.js undefined
          
让我检查一下终端状态：
















        
            
toolName: check_command_status
            
status: success
          
          
让我先检查代码是否有语法问题：











        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00229 && node --check src/app.js undefined
          
语法没问题。让我用后台模式启动服务并测试：


















        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00229 && nohup node src/app.js > server.log 2>&1 & echo $! ; sleep 2 ; cat server.log undefined
          
太好了！端口3000已被占用，说明服务已经在运行了。让我直接测试API接口：

















        
            
toolName: run_command
            
status: success
          
command: curl -s http://localhost:3000/health | head -20 undefined
          
服务正常运行！现在测试核心取证API：

















        
            
toolName: run_command
            
status: success
          
command: curl -s -X POST http://localhost:3000/api/v1/evidence/process \
  -H "Content-Type: application/json" \
  -d '{
    "batchNo": "BATCH-2026-0001",
    "sourceChannel": "视频巡检",
    "action": "初次提交",
    "reviewOpinion": "",
    "operator": "张执法员",
    "items": [
      {
        "itemId": "ITEM-001",
        "occupationDuration": "3小时",
        "locationType": "消防车通道",
        "locationDetail": "小区主消防车通道，完全堵塞",
        "occurTime": "2026-06-06T04:30:00Z",
        "evidenceImages": ["img1.jpg", "img2.jpg", "img3.jpg"],
        "evidenceVideo": ["video1.mp4"],
        "description": "大型货车停放在消防车通道上，完全堵塞通行，情况严重",
        "hazardLevel": "严重",
        "witnessInfo": [{"name": "李物业", "phone": "13800138000"}]
      },
      {
        "itemId": "ITEM-002",
        "locationDetail": "2楼楼道",
        "occurTime": "2026-06-06T05:00:00Z"
      },
      {
        "itemId": "ITEM-003",
        "occupationDuration": "15分钟",
        "locationType": "小区通道",
        "locationDetail": "1号楼门口",
        "occurTime": "2026-06-06T05:45:00Z",
        "evidenceImages": ["bike1.jpg"],
        "description": "电动车临时停放在通道边",
        "hazardLevel": "一般"
      }
    ]
  }' | python3 -m json.tool 2>/dev/null || cat undefined
          
命令行引号处理有问题，让我把测试数据写入文件再发送：


















        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/test-data.json
          
changes: undefined
          

        
            
toolName: run_command
            
status: success
          
command: curl -s -X POST http://localhost:3000/api/v1/evidence/process \
  -H "Content-Type: application/json" \
  -d @/Users/bill/Documents/solo/workspaces/yzz00229/test-data.json undefined
          
API运行正常！返回了三条不同状态的明细：高风险可办理、证据不足需补充、中风险可办理。

现在测试幂等性——相同批次号重复提交：




















        
            
toolName: run_command
            
status: success
          
command: curl -s -X POST http://localhost:3000/api/v1/evidence/process \
  -H "Content-Type: application/json" \
  -d @/Users/bill/Documents/solo/workspaces/yzz00229/test-data.json undefined
          
幂等性验证通过！相同批次号第二次提交返回 `DUPLICATE_BATCH`，追溯号和结果完全一致。

再测试一下数据校验失败（缺少必要参数）：





















        
            
toolName: run_command
            
status: success
          
command: curl -s -X POST http://localhost:3000/api/v1/evidence/process \
  -H "Content-Type: application/json" \
  -d '{"batchNo": "", "items": [], "sourceChannel": "无效渠道", "action": "无效动作", "operator": ""}' undefined
          
数据校验也很完善！5项错误都有明确的字段、原因和修复建议。

再测试一下统计信息和审计日志查询：






















        
            
toolName: run_command
            
status: success
          
command: curl -s http://localhost:3000/api/v1/stats && echo "" && echo "---" && curl -s "http://localhost:3000/api/v1/audit/logs?limit=3" undefined
          
统计和审计日志都正常。再测试一下"复核通过"场景，验证已锁定状态：

























        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/test-review.json
          
changes: undefined
          

        
            
toolName: run_command
            
status: success
          
command: curl -s -X POST http://localhost:3000/api/v1/evidence/process \
  -H "Content-Type: application/json" \
  -d @/Users/bill/Documents/solo/workspaces/yzz00229/test-review.json undefined
          
复核通过场景正常工作，状态为"已锁定"，并保留了复核意见和风险等级。

让我删除测试数据文件，然后完成最终的验收总结：

























        
            
toolName: delete_file
            
status: success
          
deleteFilesPlural
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/test-data.json
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/test-review.json
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/server.log
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 7 items
          
---

## 🎯 消防通道占用取证API - 验收完成

全部 **40项测试通过**，API服务已在 `http://localhost:3000` 运行。

---

### 📁 项目结构

```
src/
├── config/constants.js          # 常量定义（状态、风险等级、来源渠道等）
├── rules/riskEngine.js          # 风险判定规则引擎
├── services/
│   ├── statusRouter.js          # 状态分流服务
│   └── auditService.js          # 幂等性 + 审计记录服务
├── middleware/validator.js      # 请求数据校验中间件
├── controllers/evidenceController.js  # API控制器
└── app.js                       # 应用入口
test/run-tests.js                # 验收测试套件（40项）
```

---

### ✅ 验收标准对照

| 验收项 | 状态 | 说明 |
|--------|------|------|
| **低风险** | ✅ | 短时间占用、一般位置、发生已久 |
| **中风险** | ✅ | 中等时长、重要位置 |
| **高风险** | ✅ | 长时间占用、关键位置（消防车通道/安全出口/疏散楼梯间） |
| **无法判定** | ✅ | 证据不足、缺少关键信息 |
| **可办理** | ✅ | 信息完整、风险等级明确 |
| **需补充** | ✅ | 证据不足，列出具体缺失字段 |
| **已锁定** | ✅ | 复核通过/撤销申请后锁定 |
| **失败** | ✅ | 核心标识缺失（如无itemId） |
| **边界条件** | ✅ | 7项边界测试全覆盖，四状态互斥 |
| **失败提示** | ✅ | 每项错误都有字段+原因+建议 |
| **重复处理** | ✅ | 相同批次号返回首次结果，追溯号一致 |
| **可追溯编号** | ✅ | 批次/明细/审计各有独立traceId |
| **规则版本** | ✅ | v2.1.0，每条结果都附带 |
| **操作人** | ✅ | 批次+审计记录都留存 |
| **审计记录** | ✅ | 可按批次/操作人/类型筛选 |

---

### 🔌 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/evidence/process` | 取证批次处理（核心接口） |
| GET | `/api/v1/evidence/batch/:batchNo` | 查询批次结果 |
| GET | `/api/v1/evidence/item/:itemId` | 查询单条明细 |
| GET | `/api/v1/audit/logs` | 审计日志查询 |
| GET | `/api/v1/stats` | 统计信息 |
| GET | `/health` | 健康检查 |

---

### 📝 请求体结构

```json
{
  "batchNo": "批次号",
  "items": [{"itemId": "...", "..."}],
  "sourceChannel": "群众举报|视频巡检|现场执法|第三方平台|内部巡查",
  "action": "初次提交|补充材料|复核通过|复核驳回|撤销申请",
  "reviewOpinion": "复核意见",
  "operator": "操作人"
}
```

### 📊 响应体结构

```json
{
  "success": true,
  "code": "SUCCESS|DUPLICATE_BATCH|VALIDATION_ERROR",
  "data": {
    "batchNo": "...",
    "ruleVersion": "v2.1.0",
    "operator": "...",
    "traceId": "BATCH-XXX-XXX",
    "statusSummary": {"可办理": n, "需补充": n, "已锁定": n, "失败": n},
    "riskSummary": {"低风险": n, "中风险": n, "高风险": n, "无法判定": n},
    "items": [{
      "itemId": "...",
      "status": "可办理|需补充|已锁定|失败",
      "riskLevel": "低风险|中风险|高风险|无法判定",
      "explanation": "...",
      "missingFields": [...],
      "traceId": "ITEM-XXX-XXX",
      "ruleVersion": "v2.1.0"
    }]
  }
}
```

---

### 🧪 运行测试

```bash
npm test    # 运行40项验收测试
npm start   # 启动服务
```

---

**关键文件链接：**
- 核心规则引擎：[riskEngine.js](file:///Users/bill/Documents/solo/workspaces/yzz00229/src/rules/riskEngine.js)
- 状态分流服务：[statusRouter.js](file:///Users/bill/Documents/solo/workspaces/yzz00229/src/services/statusRouter.js)
- 审计与幂等服务：[auditService.js](file:///Users/bill/Documents/solo/workspaces/yzz00229/src/services/auditService.js)
- 完整测试套件：[run-tests.js](file:///Users/bill/Documents/solo/workspaces/yzz00229/test/run-tests.js)
