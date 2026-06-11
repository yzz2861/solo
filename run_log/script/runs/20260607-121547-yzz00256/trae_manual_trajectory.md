让我先了解当前工作目录的状态，看看是否已有相关代码或项目结构。
        
            
toolName: view_folder
            
status: success
          
/Users/bill/Documents/solo/workspaces/yzz00256
          
目前工作目录是空的。我将从零开始构建"农田灌溉轮灌CLI"项目。让我先规划任务。
        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          
好的，目录是空的，我将从零构建这个农田灌溉轮灌 CLI 工具。我将使用 Python 实现，先建立项目结构和核心数据模型。

## 项目整体架构设计

**输入**：地块 CSV 清单 + 规则 YAML 配置 + 历史快照 JSON + 输出目录  
**输出**：明细 CSV、复核列表 CSV、控制台摘要、可发送报告 (Markdown/JSON)  
**核心命令**：`validate` / `generate` / `export` / `summary`  
**幂等保证**：基于输入内容哈希 + 批次号，重复提交生成完全一致的结果

让我开始创建项目文件：

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/pyproject.toml
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/__init__.py
          
changes: undefined
          
现在创建核心数据模型模块：


        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/models.py
          
changes: undefined
          
现在创建配置加载模块：




        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/config_loader.py
          
changes: undefined
          
现在实现轮灌调度核心算法：





        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/scheduler.py
          
changes: undefined
          
现在实现幂等机制和历史快照模块：


        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/idempotent.py
          
changes: undefined
          
现在实现导出模块（明细、复核列表、报告）：



        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/exporter.py
          
changes: undefined
          
现在实现控制台摘要模块和 CLI：





        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/console_summary.py
          
changes: undefined
          
现在创建主 CLI 入口：





        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/cli.py
          
changes: undefined
          
现在创建示例数据和测试场景：








        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/examples/single_success/plots.csv
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/examples/single_success/rules.yaml
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/examples/batch_partial_failure/plots.csv
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/examples/batch_partial_failure/rules.yaml
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/examples/manual_review/plots.csv
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/examples/manual_review/rules.yaml
          
changes: undefined
          
现在创建历史快照示例文件和一个综合测试脚本：




        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/examples/historical_snapshot/snapshot.json
          
changes: undefined
          
现在创建一个测试演示脚本和 README 文档：





        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/examples/run_demo.sh
          
changes: undefined
          

        
            
toolName: run_command
            
status: success
          
command: chmod +x /Users/bill/Documents/solo/workspaces/yzz00256/examples/run_demo.sh undefined
          
现在安装项目并运行测试：





        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00256 && pip install -e . undefined
          

        
            
toolName: check_command_status
            
status: success
          
          
让我直接测试命令是否可用：


        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00256 && python -m irrigation_scheduler.cli --help undefined
          

        
            
toolName: check_command_status
            
status: success
          
          
让我用不同的方式测试，直接运行一个 Python 测试脚本：







        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/test_core.py
          
changes: undefined
          

        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00256 && python test_core.py undefined
          

        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00256 && python3 test_core.py undefined
          

        
            
toolName: check_command_status
            
status: success
          
          
让我将输出重定向到文件来验证：







        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00256 && python3 test_core.py > test_output.txt 2>&1 ; echo "Exit code: $?" undefined
          
退出码为1，说明有错误。让我查看输出：




        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/test_output.txt
          
Python 3.9 不支持 `X | None` 类型语法，需要用 `Optional[X]`。让我修复所有相关文件：




        
            
toolName: search_by_regex
            
status: success
          
query: \w+ \| None|None \| \w+
          
让我逐个修复这些文件：





        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/config_loader.py
          
让我用 `from __future__ import annotations` 来修复 Python 3.9 的兼容性问题，这样可以保留现代语法：




        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/config_loader.py
          

        
            
toolName: search_by_regex
            
status: success
          
query: \| None|Optional
          
让我给每个文件添加 `from __future__ import annotations` 来解决兼容性：






        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/config_loader.py
          
changes: undefined
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/scheduler.py
          
changes: undefined
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/idempotent.py
          
changes: undefined
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/models.py
          
changes: undefined
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/console_summary.py
          
`console_summary.py` 已经用了 `Optional`，应该没问题。让我重新运行测试：







        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00256 && python3 test_core.py > test_output2.txt 2>&1 ; echo "Exit: $?" undefined
          
退出码是0，成功了！让我查看输出：









        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/test_output2.txt
          
核心功能全部通过！让我检查一下导出的明细文件是否包含批次和来源标识，然后再调整一下"批量部分失败"场景使其有真正的失败案例：







        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/output/test_batch/detail.csv
          
明细文件包含了批次号和批次名称，很好。但目前只有 review 没有真正的 failed 案例。我需要调整算法，让"所有适用规则均已超限"的情况真正产生失败。让我给规则加上最大组数限制：





        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/models.py
          
我来给规则添加 `max_groups`（最大组数）限制，这样就可以产生真正的失败案例：







        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/models.py
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/models.py
          
changes: undefined
          
现在更新调度算法，加入 max_groups 限制：







        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/scheduler.py
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/scheduler.py
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/scheduler.py
          
changes: undefined
          
现在更新配置加载器，支持 `max_groups` 字段：








        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/config_loader.py
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/config_loader.py
          
changes: undefined
          
现在更新规则校验，加上 max_groups 校验：








        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/config_loader.py
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/config_loader.py
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/config_loader.py
          
changes: undefined
          
现在更新"批量部分失败"场景的规则，让它有真正的失败案例：










        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/examples/batch_partial_failure/rules.yaml
          
changes: undefined
          
现在重新运行测试来验证失败案例：








        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00256 && python3 test_core.py > test_output3.txt 2>&1 ; echo "Exit: $?" undefined
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/test_output3.txt
          
现在场景二是：成功14、失败3、复核3 - 完美！让我看看失败的明细：










        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/output/test_batch/detail.csv
          
非常好！失败3个（max_groups限制导致）、复核3个（无匹配规则）。让我也检查一下报告和复核列表：













        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/output/test_batch/review_list.csv
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/output/test_batch/report.md
          
报告内容非常完整！现在让我更新待办事项并编写 README：

















        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/README.md
          
changes: undefined
          
现在让我验证一下 CLI 命令是否可以正常使用：

















        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00256 && python3 -m irrigation_scheduler.cli --help > cli_help.txt 2>&1 ; echo "Exit: $?" undefined
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/cli_help.txt
          
这是因为没有设置 PYTHONPATH。让我使用 `pip install -e .` 后测试，或者设置 PYTHONPATH：

















        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00256 && PYTHONPATH=src python3 -m irrigation_scheduler.cli --help > cli_help2.txt 2>&1 ; echo "Exit: $?" undefined
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/cli_help2.txt
          
CLI 命令全部就绪！让我再测试一下 validate 命令：



















        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00256 && PYTHONPATH=src python3 -m irrigation_scheduler.cli validate --csv examples/single_success/plots.csv --rules examples/single_success/rules.yaml > validate_test.txt 2>&1 ; echo "Exit: $?" undefined
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/validate_test.txt
          
等一下，validate 命令显示了警告，但我记得代码里好像没写。让我检查一下 CLI 代码，确保 validate 命令完整正确：

















        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/cli.py
          
validate 命令是完整的。让我再测试一下 generate 命令：


















        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00256 && rm -rf output_cli_test && PYTHONPATH=src python3 -m irrigation_scheduler.cli generate --csv examples/single_success/plots.csv --rules examples/single_success/rules.yaml --output output_cli_test --batch-name CLI测试批次 > generate_test.txt 2>&1 ; echo "Exit: $?" undefined
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/generate_test.txt
          
非常好！CLI 输出很精美。让我再验证一下幂等性 - 运行第二次同样的命令：



















        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00256 && PYTHONPATH=src python3 -m irrigation_scheduler.cli generate --csv examples/single_success/plots.csv --rules examples/single_success/rules.yaml --output output_cli_test --batch-name CLI测试批次2 > generate_test2.txt 2>&1 ; echo "Exit: $?" undefined
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/generate_test2.txt
          
完美！第二次运行成功命中幂等缓存。让我也测试一下 summary 命令：

























        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00256 && PYTHONPATH=src python3 -m irrigation_scheduler.cli summary --output output_cli_test > summary_test.txt 2>&1 ; echo "Exit: $?" undefined
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/summary_test.txt
          
历史批次列表也正常。现在让我更新 demo 脚本，使其更可靠（使用 PYTHONPATH），然后清理测试文件：

























        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/examples/run_demo.sh
          
changes: undefined
          
现在让我运行完整的 demo 脚本来端到端验证：

























        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00256 && bash examples/run_demo.sh > demo_output.txt 2>&1 ; echo "Exit: $?" undefined
          
Demo 运行成功！让我看看输出内容，确认所有场景都正常：

























        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00256 && wc -l demo_output.txt && head -100 demo_output.txt undefined
          
一切正常！让我看看 demo 输出的后半部分（幂等和历史记录部分）：


























        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00256 && tail -150 demo_output.txt undefined
          
所有场景都完美通过！让我清理一下临时测试文件，然后完成任务：

























        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          
让我清理一下临时测试文件，保留项目的核心结构：

















        
            
toolName: delete_file
            
status: success
          
deleteFilesPlural
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/test_core.py
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/test_output.txt
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/test_output2.txt
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/test_output3.txt
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/cli_help.txt
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/cli_help2.txt
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/validate_test.txt
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/generate_test.txt
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/generate_test2.txt
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/summary_test.txt
filePath: /Users/bill/Documents/solo/workspaces/yzz00256/demo_output.txt
          
让我看一下最终的项目结构：

















        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00256 && find . -type f -not -path '*/\.*' -not -path './output/*' -not -path './output_cli_test/*' | sort undefined
          
让我也清理一下测试输出目录，然后给出最终总结：




















        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00256 && rm -rf output_cli_test && ls -la undefined
          
---

## ✅ 农田灌溉轮灌 CLI 已完成

我已经从零构建了完整的农田灌溉轮灌调度 CLI 工具，所有功能均通过端到端验证。

### 📂 项目结构

```
yzz00256/
├── pyproject.toml                    # 项目配置
├── README.md                         # 使用说明
├── src/irrigation_scheduler/
│   ├── cli.py                        # CLI 入口（5个命令）
│   ├── models.py                     # 核心数据模型
│   ├── config_loader.py              # CSV/YAML 加载 + 校验
│   ├── scheduler.py                  # 轮灌调度算法
│   ├── idempotent.py                 # 幂等机制 + 快照管理
│   ├── exporter.py                   # 结果导出
│   └── console_summary.py            # 控制台美化输出
└── examples/
    ├── run_demo.sh                   # 端到端演示脚本
    ├── single_success/               # 场景1：单条成功
    ├── batch_partial_failure/        # 场景2：批量部分失败
    ├── manual_review/                # 场景3：人工复核
    └── historical_snapshot/          # 历史快照示例
```

### 🎯 核心功能

| 命令 | 功能 | 关键文件 |
|-----|------|---------|
| `validate` | 数据校验（格式+业务规则） | [cli.py](file:///Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/cli.py#L36-L62) · [config_loader.py](file:///Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/config_loader.py#L116-L172) |
| `generate` | 生成轮灌计划 + 自动导出 | [cli.py](file:///Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/cli.py#L65-L114) · [scheduler.py](file:///Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/scheduler.py#L55-L168) |
| `export` | 导出所有结果文件 | [cli.py](file:///Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/cli.py#L138-L173) · [exporter.py](file:///Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/exporter.py) |
| `summary` | 查看批次/历史摘要 | [cli.py](file:///Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/cli.py#L117-L135) · [console_summary.py](file:///Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/console_summary.py) |
| `history` | 历史批次记录 | [cli.py](file:///Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/cli.py#L176-L190) · [idempotent.py](file:///Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/idempotent.py) |

### 📤 输出产物

| 输出文件 | 说明 | 溯源字段 |
|---------|------|---------|
| `detail.csv` | 全量明细 | `batch_id`、`batch_name`、状态、分配结果 |
| `review_list.csv` | 人工复核清单 | `review_reason`、建议、复核人、复核时间 |
| `report.md` | 可发送报告（Markdown） | 执行摘要 + 失败/复核明细 + 数据口径说明 |
| `report.json` | 可发送报告（JSON） | 结构化数据，方便系统对接 |
| `snapshots/*.json` | 历史快照 | 完整结果 + 输入哈希，用于幂等和数据回放 |

### 🔄 幂等机制

**原理**：基于输入内容 SHA-256 哈希做幂等校验
- 相同输入重复执行 → 命中缓存，结果内容完全一致
- 新批次有新的 `batch_id`，但 `input_hash` 相同
- 标记 `is_idempotent=true` 并记录 `source_batch_id`

详见 [idempotent.py](file:///Users/bill/Documents/solo/workspaces/yzz00256/src/irrigation_scheduler/idempotent.py)

### 🔍 数据溯源

每条结果都保留完整溯源链路：
- **批次标识**：`batch_id` + `batch_name`
- **来源标识**：`source_file`（原始CSV文件名）+ `source_line`（行号）
- **数据指纹**：`input_hash`（输入内容哈希）
- **历史回放**：通过 `irrigation summary --batch <批次号>` 查看任意历史批次

### 🧪 四个测试场景

| 场景 | 输入规模 | 预期结果 |
|-----|---------|---------|
| 单条成功 | 1个地块 + 1条宽松规则 | 100% 成功分配 |
| 批量部分失败 | 20个地块 + 5条严格规则 | 14成功 / 3失败 / 3复核 |
| 人工复核 | 8个地块 + 2条规则（未覆盖全部作物） | 4成功 / 4待复核 |
| 重复提交 | 相同输入执行2次 | 第二次命中缓存，结果一致 |

运行演示：
```bash
bash examples/run_demo.sh
```

### 📐 计算口径

1. **排序**：按优先级（高→低）→ 片区 → 作物类型 → 地块ID
2. **匹配**：依次尝试所有适用规则，贪心分配
3. **入组条件**：不超过最大地块数、最大面积、最大用水量
4. **失败**：所有适用规则均达 `max_groups` 上限，无法新建组
5. **复核**：无任何匹配规则（可能是新作物/新片区，需业务确认）

详见 [README.md](file:///Users/bill/Documents/solo/workspaces/yzz00256/README.md) 中的完整文档。
