明白了，让我先查看相关代码来定位和分析这些问题。
        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00204/paper_review_cli/core/generator.py
          
我清楚地看到了问题所在。让我分析一下：

1. **人工复核统计错误**：用 `manual_count // per_paper_count` 假设每篇待复核论文都恰好有 `per_paper_count` 条记录，但实际可能不足
2. **状态判断逻辑严重错误**：当 `success_count == 0` 但没有坏行时，仍然返回 `SUCCESS`
3. **CLI退出码**：只判断 `status == "success"` 就返回 0

让我逐一修复：

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00204/paper_review_cli/core/generator.py
          
changes: undefined
          
现在修复 CLI 中的退出码判断逻辑：


        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00204/paper_review_cli/cli.py
          
现在 CLI 的退出码逻辑本身是合理的（`status == "success"` 返回 0，否则返回 1），关键问题是 generator.py 中状态判断错误。现在让我们运行测试来验证修复效果：



        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          
首先让我写一个快速测试来验证这几个关键 bug 是否修复：




        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00204 && python3 -c "
import sys
sys.path.insert(0, '.')
from paper_review_cli.core.generator import run_generate_command
from paper_review_cli.core.exporter import export_summary

print('=== 测试1: 人工复核场景（3篇论文，合格评审人不足） ===')
result = run_generate_command(
    paper_file='examples/papers_manual_review.csv',
    reviewer_file='examples/reviewers_manual_review.csv',
    rules_file='examples/rules.json',
    output_dir='/tmp/test_fix',
    per_paper_count=3,
    allow_manual_review=True,
)
summary = export_summary(result)
print(f'状态: {summary[\"status\"]}')
print(f'总论文数: {summary[\"total_count\"]}')
print(f'成功数: {summary[\"success_count\"]}')
print(f'待人工复核数: {summary[\"manual_review_count\"]}')
print(f'失败数: {summary[\"failed_count\"]}')
print(f'分配记录数: {summary[\"assignments_count\"]}')
print()

print('=== 测试2: 关闭人工复核（全部失败的情况） ===')
result2 = run_generate_command(
    paper_file='examples/papers_manual_review.csv',
    reviewer_file='examples/reviewers_manual_review.csv',
    rules_file='examples/rules.json',
    output_dir='/tmp/test_fix',
    per_paper_count=3,
    allow_manual_review=False,
)
summary2 = export_summary(result2)
print(f'状态: {summary2[\"status\"]}')
print(f'总论文数: {summary2[\"total_count\"]}')
print(f'成功数: {summary2[\"success_count\"]}')
print(f'待人工复核数: {summary2[\"manual_review_count\"]}')
print(f'失败数: {summary2[\"failed_count\"]}')
print(f'分配记录数: {summary2[\"assignments_count\"]}')
print()

print('=== 测试3: 单条成功场景 ===')
result3 = run_generate_command(
    paper_file='examples/papers_single_success.csv',
    reviewer_file='examples/reviewers.csv',
    rules_file='examples/rules.json',
    output_dir='/tmp/test_fix',
    per_paper_count=3,
)
summary3 = export_summary(result3)
print(f'状态: {summary3[\"status\"]}')
print(f'总论文数: {summary3[\"total_count\"]}')
print(f'成功数: {summary3[\"success_count\"]}')
print(f'待人工复核数: {summary3[\"manual_review_count\"]}')
print(f'失败数: {summary3[\"failed_count\"]}')
"
 undefined
          
有两个问题需要进一步修复：

1. `export_summary` 缺少 `failed_count` 字段
2. 全部待复核的场景状态判断还需要优化 - 应该是 `MANUAL_REVIEW` 而不是 `FAILED`

让我先看一下现有的 `TaskStatus` 枚举和 `export_summary`：

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00204/paper_review_cli/core/exporter.py
          
好，我来修复这两个问题。首先添加 `failed_count` 到 `export_summary`，然后优化状态判断逻辑：



        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00204/paper_review_cli/core/exporter.py
          
changes: undefined
          
现在优化状态判断逻辑，正确区分 `MANUAL_REVIEW`、`PARTIAL_SUCCESS` 和 `FAILED`：





        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00204/paper_review_cli/core/generator.py
          
changes: undefined
          
现在运行快速测试验证：






        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00204 && python3 -c "
import sys
sys.path.insert(0, '.')
from paper_review_cli.core.generator import run_generate_command
from paper_review_cli.core.exporter import export_summary

print('=== 测试1: 人工复核场景（3篇论文全部待复核） ===')
result = run_generate_command(
    paper_file='examples/papers_manual_review.csv',
    reviewer_file='examples/reviewers_manual_review.csv',
    rules_file='examples/rules.json',
    output_dir='/tmp/test_fix',
    per_paper_count=3,
    allow_manual_review=True,
)
summary = export_summary(result)
print(f'状态: {summary[\"status\"]}')
print(f'总论文数: {summary[\"total_count\"]}')
print(f'成功数: {summary[\"success_count\"]}')
print(f'待人工复核数: {summary[\"manual_review_count\"]}')
print(f'失败数: {summary[\"failed_count\"]}')
print(f'分配记录数: {summary[\"assignments_count\"]}')
print(f'CLI退出码应为: {0 if summary[\"status\"] == \"success\" else 1}')
print()

print('=== 测试2: 关闭人工复核（全部失败） ===')
result2 = run_generate_command(
    paper_file='examples/papers_manual_review.csv',
    reviewer_file='examples/reviewers_manual_review.csv',
    rules_file='examples/rules.json',
    output_dir='/tmp/test_fix',
    per_paper_count=3,
    allow_manual_review=False,
)
summary2 = export_summary(result2)
print(f'状态: {summary2[\"status\"]}')
print(f'总论文数: {summary2[\"total_count\"]}')
print(f'成功数: {summary2[\"success_count\"]}')
print(f'待人工复核数: {summary2[\"manual_review_count\"]}')
print(f'失败数: {summary2[\"failed_count\"]}')
print(f'分配记录数: {summary2[\"assignments_count\"]}')
print(f'CLI退出码应为: {0 if summary2[\"status\"] == \"success\" else 1}')
print()

print('=== 测试3: 单条成功场景（全部成功） ===')
result3 = run_generate_command(
    paper_file='examples/papers_single_success.csv',
    reviewer_file='examples/reviewers.csv',
    rules_file='examples/rules.json',
    output_dir='/tmp/test_fix',
    per_paper_count=3,
)
summary3 = export_summary(result3)
print(f'状态: {summary3[\"status\"]}')
print(f'总论文数: {summary3[\"total_count\"]}')
print(f'成功数: {summary3[\"success_count\"]}')
print(f'待人工复核数: {summary3[\"manual_review_count\"]}')
print(f'失败数: {summary3[\"failed_count\"]}')
print(f'CLI退出码应为: {0 if summary3[\"status\"] == \"success\" else 1}')
print()

print('=== 测试4: 批量部分失败（有坏行+有成功） ===')
result4 = run_generate_command(
    paper_file='examples/papers_partial_failure.csv',
    reviewer_file='examples/reviewers.csv',
    rules_file='examples/rules.json',
    output_dir='/tmp/test_fix',
    per_paper_count=3,
)
summary4 = export_summary(result4)
print(f'状态: {summary4[\"status\"]}')
print(f'总论文数: {summary4[\"total_count\"]}')
print(f'成功数: {summary4[\"success_count\"]}')
print(f'待人工复核数: {summary4[\"manual_review_count\"]}')
print(f'失败数: {summary4[\"failed_count\"]}')
print(f'坏行数: {summary4[\"bad_count\"]}')
print(f'CLI退出码应为: {0 if summary4[\"status\"] == \"success\" else 1}')
"
 undefined
          
修复效果非常好！现在让我运行完整的测试套件来确保所有测试仍然通过，必要时更新测试断言：







        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00204 && python3 test_scenarios.py 2>&1 undefined
          

        
            
toolName: check_command_status
            
status: success
          
          
让我用重定向到文件的方式来查看测试结果：




        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00204 && python3 test_scenarios.py > /tmp/test_result.txt 2>&1 ; echo "Exit code: $?" ; cat /tmp/test_result.txt undefined
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /tmp/test_result.txt
          
所有测试都通过了！而且关键问题都已修复：

- 场景3（人工复核）：从之前的 `manual_review_count=1, status=success` 变成了 `manual_review_count=3, status=manual_review` ✅

让我再验证一下 CLI 退出码的正确性，特别是失败场景：







        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00204 && rm -rf cli_fix_test && echo "=== 测试1: 全部成功 -> 退出码0 ===" && python3 main.py generate -p examples/papers_single_success.csv -r examples/reviewers.csv -R examples/rules.json -o cli_fix_test -c 3 > /dev/null 2>&1 ; echo "Exit code: $?" && echo "" && echo "=== 测试2: 关闭人工复核全部失败 -> 退出码1 ===" && python3 main.py generate -p examples/papers_manual_review.csv -r examples/reviewers_manual_review.csv -R examples/rules.json -o cli_fix_test --no-manual-review > /dev/null 2>&1 ; echo "Exit code: $?" && echo "" && echo "=== 测试3: 有坏行部分成功 -> 退出码1 ===" && python3 main.py generate -p examples/papers_partial_failure.csv -r examples/reviewers.csv -R examples/rules.json -o cli_fix_test -c 3 > /dev/null 2>&1 ; echo "Exit code: $?" && echo "" && echo "=== 测试4: 人工复核状态 -> 退出码1 ===" && python3 main.py generate -p examples/papers_manual_review.csv -r examples/reviewers_manual_review.csv -R examples/rules.json -o cli_fix_test -c 3 > /dev/null 2>&1 ; echo "Exit code: $?" undefined
          
让我逐个测试并记录结果：









        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00204 && rm -rf cli_fix_test && echo "Test 1 (all success):" && python3 main.py generate -p examples/papers_single_success.csv -r examples/reviewers.csv -o cli_fix_test/t1 > /tmp/t1.out 2>&1 ; echo "exit=$?" undefined
          

        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00204 && echo "Test 2 (all failed, no manual review):" && python3 main.py generate -p examples/papers_manual_review.csv -r examples/reviewers_manual_review.csv -o cli_fix_test/t2 --no-manual-review > /tmp/t2.out 2>&1 ; echo "exit=$?" && echo "Test 3 (manual review status):" && python3 main.py generate -p examples/papers_manual_review.csv -r examples/reviewers_manual_review.csv -o cli_fix_test/t3 > /tmp/t3.out 2>&1 ; echo "exit=$?" && echo "Test 4 (partial success with bad records):" && python3 main.py generate -p examples/papers_partial_failure.csv -r examples/reviewers.csv -o cli_fix_test/t4 > /tmp/t4.out 2>&1 ; echo "exit=$?" undefined
          
所有退出码都正确：
- 全部成功 → exit=0 ✅
- 全部失败（关闭人工复核）→ exit=1 ✅
- 人工复核状态 → exit=1 ✅
- 有坏行部分成功 → exit=1 ✅

现在让我也检查并修复 `validate` 命令的退出码逻辑，确保一致性：





        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00204/paper_review_cli/cli.py
          
`validate` 命令的退出码逻辑是合理的。现在让我增强测试脚本，添加对这些 bug 修复的专项验证，确保修复的问题不会再回归：





        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00204/test_scenarios.py
          
让我添加两个专项测试来验证 bug 修复的正确性：









        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00204/test_scenarios.py
          
changes: undefined
          
现在运行完整的测试套件：









        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00204 && python3 test_scenarios.py > /tmp/full_test.txt 2>&1 ; echo "Exit code: $?" ; echo "" ; tail -20 /tmp/full_test.txt undefined
          
所有 8 个测试场景全部通过！

现在让我再确认一下 CLI 输出中也显示失败数，让信息更完整：








        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00204/paper_review_cli/cli.py
          
让我在 CLI 输出中添加失败数，让信息更完整：







        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00204/paper_review_cli/cli.py
          
changes: undefined
          
现在让我们做最终验证，确保 CLI 完整可用：










        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          
让我做一个最终的端到端验证：









        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00204 && rm -rf final_verify && python3 main.py --help > /tmp/help.txt 2>&1 && echo "=== --help 退出码: $? ===" && head -20 /tmp/help.txt && echo "..." && echo "" && echo "=== 测试成功场景 ===" && python3 main.py generate -p examples/papers_single_success.csv -r examples/reviewers.csv -R examples/rules.json -o final_verify/success -c 3 && echo "退出码: $?" && echo "" && echo "=== 测试失败场景（关闭人工复核） ===" && python3 main.py generate -p examples/papers_manual_review.csv -r examples/reviewers_manual_review.csv -o final_verify/fail --no-manual-review && echo "退出码: $?" undefined
          
完美！所有修复都已验证通过。让我再快速验证一下 `summary` 和 `export` 命令也正常工作：










        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00204 && echo "=== summary 列表 ===" && python3 main.py summary -o final_verify/success && echo "" && echo "=== export 命令 ===" && SNAP=$(ls final_verify/success/snapshots/*.json 2>/dev/null | head -1) && python3 main.py export -s "$SNAP" -o final_verify/exported && echo "导出完成" && ls final_verify/exported/*/ undefined
          
所有功能都正常工作。让我来总结一下这次修复的内容。

---

## 修复总结

已成功修复第一轮发现的核心阻断性错误，**保留所有已有功能**，修复后项目可安装、可运行、可验证。

### 🔧 修复的问题

| 问题 | 位置 | 修复方案 |
|------|------|----------|
| 人工复核论文数统计错误（3篇实际只统计出1篇） | [generator.py#L177-L184](file:///Users/bill/Documents/solo/workspaces/yzz00204/paper_review_cli/core/generator.py#L177-L184) | 从 `manual_count // per_paper_count` 改为用 `set(paper_id)` 统计实际不同的论文数 |
| 关闭人工复核且全部失败时仍返回 `status=success` | [generator.py#L188-L193](file:///Users/bill/Documents/solo/workspaces/yzz00204/paper_review_cli/core/generator.py#L188-L193) | 重新设计状态判断逻辑，区分 SUCCESS / PARTIAL_SUCCESS / MANUAL_REVIEW / FAILED 四种状态 |
| CLI 退出码误判（失败分配返回0） | [cli.py#L75](file:///Users/bill/Documents/solo/workspaces/yzz00204/paper_review_cli/cli.py#L75) | 因状态判断已修复，`status == "success"` 的判断现在正确返回非零退出码 |

### 📊 状态判断逻辑（修复后）

| 场景 | 状态 | CLI退出码 |
|------|------|-----------|
| 所有论文都成功分配，无坏行 | `success` | 0 |
| 有部分成功，部分失败/待复核/有坏行 | `partial_success` | 1 |
| 没有成功论文，但有待复核论文 | `manual_review` | 1 |
| 没有成功论文，也没有待复核论文（全失败） | `failed` | 1 |

### ✅ 验证结果

所有 **8 个测试场景**全部通过：

1. ✅ 单条成功（全量成功分配）
2. ✅ 批量部分失败（有坏行）
3. ✅ 人工复核场景
4. ✅ 重复提交（幂等性验证）
5. ✅ 摘要查看与数据回放
6. ✅ 数据溯源验证
7. ✅ **关闭人工复核全部失败状态正确**（新增，验证 bug 修复）
8. ✅ **人工复核论文数统计准确**（新增，验证 bug 修复）

### 📁 修改的文件

- [paper_review_cli/core/generator.py](file:///Users/bill/Documents/solo/workspaces/yzz00204/paper_review_cli/core/generator.py) — 统计逻辑与状态判断
- [paper_review_cli/core/exporter.py](file:///Users/bill/Documents/solo/workspaces/yzz00204/paper_review_cli/core/exporter.py) — 增加 `failed_count` 到摘要
- [paper_review_cli/cli.py](file:///Users/bill/Documents/solo/workspaces/yzz00204/paper_review_cli/cli.py) — 输出中增加失败数显示
- [test_scenarios.py](file:///Users/bill/Documents/solo/workspaces/yzz00204/test_scenarios.py) — 新增 2 个专项测试场景

运行验证：
```bash
python3 test_scenarios.py   # 8个场景全部通过
python3 main.py --help      # CLI正常可用
```
