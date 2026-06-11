你指出的问题非常关键！当前幂等键设计过于粗糙，导致同一批次下不同明细数据被错误缓存。让我修复这个缺陷。
        
            
toolName: todo_write
            
status: success
          
Todos updated: 5 items
          
让我先确认当前代码状态：
        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00272/src/store/auditStore.js
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00272/src/services/bridgeSafetyService.js
          
问题确认：幂等键仅用 `batchNo+action+sourceChannel` 三个字段，忽略了明细内容，导致同一批次下不同明细的请求被错误缓存。

修复思路：幂等键应基于**完整请求体的内容哈希**生成，确保只有完全相同的请求才会命中幂等，同时保证"重复请求稳定结论"的要求。

开始修复：



        
            
toolName: todo_write
            
status: success
          
Todos updated: 5 items
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00272/src/store/auditStore.js
          
changes: undefined
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 5 items
          
现在修改 `bridgeSafetyService.js` 中幂等键的生成调用方式：

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00272/src/services/bridgeSafetyService.js
          
changes: undefined
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 5 items
          
现在在验收测试中新增针对这个缺陷的验证场景。先读取测试文件找到插入位置：


        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00272/test/acceptance.test.js
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00272/test/acceptance.test.js
          

        
            
toolName: search_by_regex
            
status: success
          
query: async function main|场景六|场景七
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00272/test/acceptance.test.js
          
现在添加新的测试场景。先在 main 函数中插入场景八的调用：




        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00272/test/acceptance.test.js
          
changes: undefined
          
现在找到文件末尾，添加新的测试函数：







        
            
toolName: search_by_regex
            
status: success
          
query: main\(\).catch
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00272/test/acceptance.test.js
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00272/test/acceptance.test.js
          
changes: undefined
          
现在重启服务并运行所有测试验证：





        
            
toolName: todo_write
            
status: success
          
Todos updated: 5 items
          
先停止当前服务，然后重启：




        
            
toolName: StopCommand
            
status: success
          
          

        
            
toolName: run_command
            
status: success
          
command: node src/app.js undefined
          
端口还被占用，让我先杀掉占用进程：







        
            
toolName: run_command
            
status: success
          
command: lsof -ti:3000 | xargs kill -9 2>/dev/null; sleep 1; echo "done" undefined
          

        
            
toolName: run_command
            
status: running
          
command: node src/app.js undefined
          
服务已启动。现在运行完整的验收测试：









        
            
toolName: run_command
            
status: success
          
command: node test/acceptance.test.js undefined
          

        
            
toolName: check_command_status
            
status: success
          
          
让我用另一个终端来运行测试：










        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00272 && node test/acceptance.test.js 2>&1 undefined
          
让我先验证API是否正常，然后手动测试一下修复效果：












        
            
toolName: run_command
            
status: success
          
command: curl -s http://localhost:3000/api/v1/health && echo "" && curl -s -X POST http://localhost:3000/api/v1/admin/clear undefined
          
服务似乎有问题，让我检查一下：













        
            
toolName: check_command_status
            
status: success
          
          
从服务日志可以看到测试实际上运行了，关键日志证明了修复有效：

1. 同批次号 `BATCH-20260607-0888` 提交不同明细时，生成了**不同的审计编号**（`AUD-MQ3VZHD3-1F18D2CF` vs `AUD-MQ3VZHD4-B4293EDE`）
2. 完全相同的请求再次提交时，**幂等命中**，idempotencyKey 包含了内容哈希

服务被意外中断了。让我重新启动并运行完整测试：







        
            
toolName: run_command
            
status: running
          
command: node src/app.js undefined
          
服务已启动。现在运行验收测试：












        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00272 && node test/acceptance.test.js > /tmp/test_output.txt 2>&1 ; echo "EXIT_CODE=$?" ; cat /tmp/test_output.txt undefined
          
全部 **92 个测试用例通过**！（原 71 个 + 新增 21 个）






        
            
toolName: todo_write
            
status: success
          
Todos updated: 5 items
          
---

## ✅ 缺陷修复完成 - 幂等键问题已解决

### 🔴 问题根因

原实现中 `generateIdempotencyKey()` 仅使用 `batchNo + action + sourceChannel` 三个字段生成幂等键，导致**同一批次下提交不同明细的请求被错误命中缓存**，明细数据、风险标签、业务结论全部失真。

### 🟢 修复方案

**修改文件 1:** [auditStore.js](file:///Users/bill/Documents/solo/workspaces/yzz00272/src/store/auditStore.js#L11-L29)

- 新增 `stableStringify()` 函数：对对象进行排序后稳定序列化，确保字段顺序不同但内容相同的请求生成相同哈希
- 重写 `generateIdempotencyKey()`：基于**完整请求体内容**计算 SHA-256 哈希（取前32位），拼接 batchNo/action/sourceChannel 作为可读前缀
- 幂等键格式：`{batchNo}::{action}::{sourceChannel}::{sha256hash}`

**修改文件 2:** [bridgeSafetyService.js](file:///Users/bill/Documents/solo/workspaces/yzz00272/src/services/bridgeSafetyService.js#L20-L21)

- 调用方式从 `generateIdempotencyKey(batchNo, action, sourceChannel)` 改为 `generateIdempotencyKey(reqBody)`

### 📊 新增验证场景

**场景八：同批次不同明细 - 不应幂等命中**（21个断言）

| 验证点 | 结果 |
|--------|------|
| 第一次提交正常明细，PASS，0风险 | ✅ |
| 第二次提交不同明细（含高风险），生成新审计编号 | ✅ |
| 第二次业务结论非PASS，风险标签不为空 | ✅ |
| 第二次明细数量、风险数量与第一次不同 | ✅ |
| 审计记录共2条（同批次不同明细各一条） | ✅ |
| 完全相同请求再次提交，命中缓存 | ✅ |
| 重复提交相同请求不新增审计记录 | ✅ |

### 🧪 最终测试结果

```
总用例: 92
通过: 92
失败: 0
✅ 所有验收测试通过!
```

服务当前运行在 `http://localhost:3000`，可直接调用验证。
