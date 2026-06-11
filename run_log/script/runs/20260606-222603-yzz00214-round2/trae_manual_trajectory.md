明白了，你指出了核心问题：原始提示词要求"高风险**或**缺材料时进入复核，不允许直接通过"，但目前缺少必备材料时直接返回了"需补充"且不需要复核。让我修改这个问题。
        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          
先看一下当前的状态管理器代码：

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00214/src/status/status-manager.ts
          
现在我来修改状态管理器，确保"缺材料时进入复核，不允许直接通过"：

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00214/src/status/status-manager.ts
          
changes: undefined
          
现在更新测试用例，使其与"缺材料时进入复核"的要求一致：



        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          
先看一下API层代码，确认输出逻辑是否需要调整：


        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00214/src/api/anomaly-card-api.ts
          
API层会从状态管理器获取结果，所以状态管理器改了之后API输出会自动调整。现在来修正测试用例：





        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          
先看一下当前的测试文件，找到需要修改的地方：



        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00214/tests/anomaly-card-api.test.ts
          
现在修改测试用例，使其与"缺材料时进入复核"的要求一致，同时保留"需补充"状态的功能测试：




        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00214/tests/anomaly-card-api.test.ts
          
changes: undefined
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00214/tests/anomaly-card-api.test.ts
          
changes: undefined
          
现在加强"高风险或缺材料时必须进入复核"的测试，并添加"需补充"状态保留功能的测试：







        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00214/tests/anomaly-card-api.test.ts
          
changes: undefined
          
现在运行测试验证修改是否正确：







        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          

        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00214 && npm run build && npm test undefined
          
完美！所有 **18 个测试全部通过**，TypeScript 编译也成功。让我完成任务：





        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          
## 修改完成

已根据原始提示词要求修正了核心状态流转逻辑，确保**"高风险或缺材料时进入复核，不允许直接通过"**。

### 主要修改

#### 1. 状态层 - [status-manager.ts](file:///Users/bill/Documents/solo/workspaces/yzz00214/src/status/status-manager.ts#L82-L161)

修改了 `determineStatus` 方法的判定逻辑：
- **修改前**：缺少必备材料 → 直接返回 `supplement_required`（需补充），`requireReview: false`
- **修改后**：缺少必备材料 → 返回 `under_review`（复核中），`requireReview: true`

核心逻辑调整（第 101-119 行）：
```typescript
const materialIncomplete = !materialComplete || hasCriticalMissing;

if (materialIncomplete) {
  return {
    targetStatus: 'under_review',      // 改为复核中
    statusLabel: '复核中',
    statusReason: '缺少必备佐证材料，需人工复核',
    requireReview: true,                // 需要复核
    reviewReason: '材料不完整或缺材料，不允许直接通过，需人工复核确认',
    canDirectApprove: false
  };
}
```

同时中风险和低风险分支中，材料不齐的情况也统一进入复核，不再直接返回"需补充"。

#### 2. 测试用例 - [anomaly-card-api.test.ts](file:///Users/bill/Documents/solo/workspaces/yzz00214/tests/anomaly-card-api.test.ts)

- 将"中风险但材料不齐应输出'需补充'状态" → "中风险且材料不齐应进入复核，不允许直接通过"
- 将"缺少关键材料应输出'需补充'状态" → "缺少关键材料应进入复核，不允许直接通过"
- 新增独立测试："高风险时必须进入复核"和"缺材料时必须进入复核"
- 新增测试："需补充状态可通过状态转换从复核中转出（保留已有功能）"

### 保留的功能

- `supplement_required`（需补充）状态仍然完整保留
- 状态转换规则中，`under_review` → `reject` → `supplement_required` 路径仍然有效
- 复核人员可以将缺材料的申请从"复核中"转为"需补充"，通知申请人补充材料

### 验证结果

- ✅ TypeScript 编译成功（`npm run build`）
- ✅ **18 个测试全部通过**（`npm test`）
- ✅ 项目可安装、可运行、可验证
