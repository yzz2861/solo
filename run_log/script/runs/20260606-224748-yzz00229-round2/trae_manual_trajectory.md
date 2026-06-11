你发现了一个重要的问题！已锁定的明细不应该通过换批次号就能绕过锁定状态。同一个 `itemId` 一旦被锁定（复核通过/撤销申请），后续无论用哪个批次提交，都应该保持"已锁定"。

让我修复这个问题：
        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/src/controllers/evidenceController.js
          
问题找到了！在处理批次时，每个明细的 `existingRecord` 被硬编码为 `null`，没有检查同一个 `itemId` 是否已被锁定。

让我修复这个问题：


        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/src/controllers/evidenceController.js
          
changes: undefined
          
现在还需要修改 `saveBatchResult`，对于已锁定的明细不应该覆盖原有记录。让我检查并修改审计服务：





        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/src/services/auditService.js
          
现在需要修改 `saveBatchResult`，确保已锁定的明细记录不会被新批次覆盖。同时在返回结果中明确标记哪些明细是已锁定的历史记录：







        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/src/services/auditService.js
          
changes: undefined
          
现在修改 `saveBatchResult` 函数的核心逻辑：









        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/src/services/auditService.js
          
changes: undefined
          
现在添加对应的测试用例来验证这个修复：











        
            
toolName: search_by_regex
            
status: success
          
query: 重复请求结论稳定
          

        
            
toolName: search_by_regex
            
status: success
          
query: 六、可追溯编号测试
          
在重复处理测试中添加"已锁定明细跨批次保护"的测试：










        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/test/run-tests.js
          
changes: undefined
          
需要在测试文件顶部引入 `getItemRecord`：










        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/test/run-tests.js
          
changes: undefined
          
现在运行测试验证修复：












        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00229 && npm test undefined
          
找到问题了！测试用例里的 description 只有9个字符，导致证据不足。让我修复测试数据：












        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/test/run-tests.js
          
changes: undefined
          
再运行一次测试：











        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00229 && npm test undefined
          
全部 **42项测试全部通过！

现在让我重启服务并验证HTTP接口上的修复效果：</think_never_used_51bce0c785ca2f68081bfa7d91973934>全部42项测试通过！现在重启服务验证HTTP接口：









        
            
toolName: run_command
            
status: success
          
command: pkill -f "node src/app.js" 2>/dev/null ; sleep 1 ; cd /Users/bill/Documents/solo/workspaces/yzz00229 && nohup node src/app.js > server.log 2>&1 & sleep 2 ; curl -s http://localhost:3000/health undefined
          
服务已重启。现在验证你描述的场景：先以"复核通过"处理（返回"已锁定"），再换新批次用相同 `itemId` "初次提交"，验证是否保持锁定状态：










        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/test-lock-1.json
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/test-lock-2.json
          
changes: undefined
          
依次发送两个请求验证修复效果：














        
            
toolName: run_command
            
status: success
          
command: echo "=== 第一批：复核通过（应返回已锁定）===" && \
curl -s -X POST http://localhost:3000/api/v1/evidence/process \
  -H "Content-Type: application/json" \
  -d @/Users/bill/Documents/solo/workspaces/yzz00229/test-lock-1.json | python3 -m json.tool 2>/dev/null | head -30 && \
echo "" && echo "=== 第二批：换批次号，相同itemId，初次提交 ===" && \
curl -s -X POST http://localhost:3000/api/v1/evidence/process \
  -H "Content-Type: application/json" \
  -d @/Users/bill/Documents/solo/workspaces/yzz00229/test-lock-2.json | python3 -m json.tool 2>/dev/null | head -35 undefined
          
修复成功！验证结果：

- **第一批**（复核通过）→ `"status": "已锁定"`, 高风险
- **第二批**（换批次号、相同itemId、初次提交）→ `"status": "已锁定"` ✅（而不是之前的"可办理"）

第二批返回中还包含：
- `isLockedReuse: true` — 标记为历史锁定复用
- `originalBatchNo: "BATCH-VERIFY-LOCKED-001"` — 原始锁定批次
- 同一个 `traceId` — 可追溯号保持不变
- 同样的风险等级和分数 — 结论稳定

让我清理测试文件：










        
            
toolName: delete_file
            
status: success
          
deleteFilesPlural
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/test-lock-1.json
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/test-lock-2.json
filePath: /Users/bill/Documents/solo/workspaces/yzz00229/server.log
          
---

## ✅ Bug 修复完成

**问题：** 同一明细先以"复核通过"处理成"已锁定"后，换批次号用相同 `itemId` 再次"初次提交"，又返回了"可办理"。

**根因：** 批次处理时没有检查同一个 `itemId` 是否已存在且为锁定状态，`existingRecord` 被硬编码为 `null`。同时 `saveBatchResult` 也会直接覆盖已有记录。

**修复内容：**

| 文件 | 修改点 |
|------|--------|
| [evidenceController.js](file:///Users/bill/Documents/solo/workspaces/yzz00229/src/controllers/evidenceController.js#L27-L30) | 处理每个明细前先查 `getItemRecord`，将历史记录传入 `routeStatus` |
| [auditService.js](file:///Users/bill/Documents/solo/workspaces/yzz00229/src/services/auditService.js#L41-L84) | `saveBatchResult` 中对已锁定的明细不覆盖，保留原 `traceId`，标记 `isLockedReuse`、`originalBatchNo`、`lockedHint` |
| [run-tests.js](file:///Users/bill/Documents/solo/workspaces/yzz00229/test/run-tests.js#L450-L517) | 新增2项测试：已锁定明细跨批次保护、未锁定明细跨批次可正常更新 |

**修复后的行为：**

- ✅ 已锁定的明细（复核通过/撤销申请）→ 换任何批次号提交都保持"已锁定"，追溯号不变
- ✅ 未锁定的明细（可办理/需补充）→ 换批次号提交可正常流转状态，并保留变更历史
- ✅ 锁定明细返回时带有 `isLockedReuse`、`originalBatchNo`、`lockedHint` 等明确标识

**测试结果：** 全部 **42项** 测试通过 ✅
