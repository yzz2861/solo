你说得对，有两个问题需要修复：

1. **状态机是全局共享的** - 每条记录应该有自己独立的状态机
2. **状态流转不完整** - 从 `draft` 不能直接跳到 `pending_review`，应该经过 `submitted` → `auto_inspection` 的流程

让我修复这个问题：



        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          
先看一下当前的服务层实现：





        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00217/app/services/inspection_service.py
          
现在修复 `InspectionService`，让每条记录使用独立的状态机，并按正确顺序流转：







        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00217/app/services/inspection_service.py
          
现在修改 `InspectionService`，让每条记录有独立状态机，并且状态流转正确：










        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00217/app/services/inspection_service.py
          
changes: undefined
          
现在修改 `get_review_entry_info` 方法，因为它之前依赖 `self.state_machine`：











        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00217/app/services/inspection_service.py
          
修改 `get_review_entry_info` 方法：











        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00217/app/services/inspection_service.py
          
changes: undefined
          
现在更新状态机，添加从 `auto_inspection` 到 `completed` 的直接流转路径（用于通过和拒绝的场景），然后更新测试：












        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          
状态机本身已经支持从 `AUTO_INSPECTION` 到 `COMPLETED` 的流转。现在让我更新测试，增加对独立状态机和流转顺序的验证：













        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          
先在测试文件中添加对独立状态机和流转顺序的验证测试：














        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00217/tests/test_inspection_api.py
          
添加独立状态机和流转顺序的测试：















        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00217/tests/test_inspection_api.py
          
changes: undefined
          
现在运行所有测试验证修改是否正确：

















        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          
运行测试：





















        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00217 && python3 -m pytest tests/test_inspection_api.py -v --tb=short undefined
          
全部 **66个测试通过**！再运行一下完整演示确认效果：


















        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00217 && python3 run_full_demo.py 2>&1 | tail -30 undefined
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          
## 修改完成 ✓

你指出的问题已修复，共做了两处关键改动：

### 1. 每条记录使用独立的状态机

**之前：** `InspectionService` 有一个全局共享的 `self.state_machine`，多条记录处理会互相干扰。

**现在：** 每次 `process_single` 时通过 `_create_state_machine_for_record()` 创建独立的状态机实例，各记录状态互不影响。

代码位置：[inspection_service.py](file:///Users/bill/Documents/solo/workspaces/yzz00217/app/services/inspection_service.py#L50-L64)

### 2. 状态流转顺序正确

**之前：** 从 `draft` 直接跳到 `pending_review`，不符合状态机定义。

**现在：** 按正确流程流转：
```
draft → submitted → auto_inspection → pending_review (需复核)
                                      → completed (通过/拒绝)
```

初始化时自动完成前两步，进入 `auto_inspection` 状态后根据业务结论决定下一步：
- **高风险 / 材料缺失** → `auto_inspection` → `pending_review`（复核入口）
- **通过 / 拒绝** → `auto_inspection` → `completed`

### 3. 新增测试验证

新增 4 个测试用例，全部通过：
- `test_each_record_has_own_state_machine` — 验证记录间状态机独立
- `test_state_transition_sequence_for_pass` — 验证通过场景流转顺序
- `test_state_transition_sequence_for_review` — 验证复核场景流转顺序
- `test_state_machine_starts_from_draft_not_shared` — 验证初始状态和独立性

**总计：66 个测试全部通过 ✓**
