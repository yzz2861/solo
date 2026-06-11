让我先查看这段代码，确认问题所在。
        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/scheduler.py
          
你说得对，这是一个重要的 bug。新建组时没有检查**单个地块本身**是否超过规则的 `max_area`、`max_water` 等限制。如果一个地块的面积本身就比 `max_area` 还大，那它永远无法被分配，应该直接标记为失败。

让我修复这个问题：

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/scheduler.py
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/scheduler.py
          
changes: undefined
          
现在在新建组之前加入校验：



        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/scheduler.py
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/scheduler.py
          
changes: undefined
          
现在让我写一个快速测试来验证修复是否正确：



        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/test_fix.py
          
changes: undefined
          

        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00256 && python3 test_fix.py undefined
          
修复验证通过！现在再运行一下完整 demo 确保没有回归问题：





        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00256 && rm -rf output && bash examples/run_demo.sh > /dev/null 2>&1 ; echo "Demo exit: $?" undefined
          

        
            
toolName: check_command_status
            
status: success
          
          
Demo 全部通过（退出码 0）。让我清理测试文件：






        
            
toolName: delete_file
            
status: success
          
deleteFilesSingular
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/test_fix.py
          
---

## ✅ Bug 已修复

你指出的问题完全正确：新建轮灌组时没有校验单个地块是否超过规则的 `max_area`、`max_water` 等限制。如果一个地块本身就比规则的组容量还大，它会错误地创建新组而不是被标记为失败。

### 修复内容

**文件**：[scheduler.py](file:///Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/scheduler.py)

**1. 新增 `_plot_fits_rule` 函数**（[第 41-49 行](file:///Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/scheduler.py#L41-L49)）

用于判断单个地块本身是否符合规则的基本限制：

```python
def _plot_fits_rule(plot: Plot, rule: IrrigationRule) -> bool:
    """判断单个地块本身是否符合规则限制（新建组时使用）"""
    if 1 > rule.max_plots:
        return False
    if plot.area > rule.max_area:
        return False
    if plot.total_water > rule.max_water:
        return False
    return True
```

**2. 新建组前加入校验**（[第 126-128 行](file:///Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/scheduler.py#L126-L128)）

```python
if not assigned:
    if not _plot_fits_rule(plot, rule):
        continue  # 地块本身超限，跳过这条规则

    current_group_count = rule_sequence[rule.group_name]
    if current_group_count >= rule.max_groups:
        continue
    ...
```

### 验证结果

| 场景 | 修复前 | 修复后 |
|-----|-------|-------|
| 地块面积 > max_area | 错误地创建新组 → "成功" | 正确标记为 failed |
| 地块需水量 > max_water | 错误地创建新组 → "成功" | 正确标记为 failed |
| 正常地块 | 正常分配 | 正常分配（无回归） |
| 无匹配规则地块 | 标记为 review | 标记为 review（无变化） |

修复后，单个地块超限时会正确走到 `所有适用规则均已超限` 的失败分支，而不是创建一个本身就违规的组。
