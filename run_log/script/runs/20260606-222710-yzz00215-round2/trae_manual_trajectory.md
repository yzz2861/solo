明白了，幂等重放时任务状态显示为 `pending` 是不对的。让我查看并修复这个问题。
        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00215/notary_checklist/engine/generator.py
          
问题找到了！幂等重放时，新创建的 `batch` 对象的 `task_status` 默认是 `"pending"`。让我修复这个问题。


        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00215/notary_checklist/engine/generator.py
          
changes: undefined
          
现在验证修复效果：


        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00215 && python3 -m notary_checklist.cli generate tests/test_data/ledger_normal.csv examples/params.json --operator test_user --source-system TEST_SYS --previous output/处理结果_BATCH20260606133857D0222C5D.json 2>&1 | grep -E "(任务状态|幂等)" undefined
          
修复完成 ✅

**问题原因**：幂等重放时，新创建的 `batch` 对象的 `task_status` 默认是 `"pending"`，但没有被正确设置为 `"completed"`。

**修复位置**：[generator.py](file:///Users/bill/Documents/solo/workspaces/yzz00215/notary_checklist/engine/generator.py#L32-L39) 第 36 行

在幂等分支中新增了 `batch.task_status = "completed"`，确保重放时任务状态也显示为已完成，与"核对任务状态"的目标一致。

**验证结果**：
```
  任务状态:   completed  ✓ （之前是 pending）
  幂等状态:   ★ 本次为相同输入重复执行，结果无差异
✓ 幂等校验通过：相同输入产生完全一致的结果，无新增差异
```
