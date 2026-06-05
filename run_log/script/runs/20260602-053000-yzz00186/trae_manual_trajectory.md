我先来了解工作区的现有结构和代码，然后规划实现方案。
        
            
toolName: view_folder
            
status: success
          
/Users/bill/Documents/solo/workspaces/yzz00186
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/tea_grading_cli/exporter.py
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/tea_grading_cli/models.py
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/tea_grading_cli/grader.py
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/tea_grading_cli/reader.py
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/tea_grading_cli/validator.py
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/tea_grading_cli/__init__.py
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/setup.py
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/requirements.txt
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/tea_grading_cli/cli.py
          
changes: undefined
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          
现在创建测试数据目录和所有样例文件。我将并行创建这些文件。
        
            
toolName: run_command
            
status: success
          
command: mkdir -p /Users/bill/Documents/solo/workspaces/yzz00186/tests/data/compliant /Users/bill/Documents/solo/workspaces/yzz00186/tests/data/over_threshold /Users/bill/Documents/solo/workspaces/yzz00186/tests/data/missing_material /Users/bill/Documents/solo/workspaces/yzz00186/tests/data/history_replay undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/tests/data/compliant/main_list.csv
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/tests/data/compliant/supplement.csv
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/tests/data/compliant/validation_rules.json
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/tests/data/compliant/grading_criteria.json
          
changes: undefined
          
现在创建超阈值、材料缺失和历史回放样例数据：
        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/tests/data/over_threshold/main_list.csv
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/tests/data/over_threshold/supplement.csv
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/tests/data/missing_material/main_list.csv
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/tests/data/missing_material/supplement.csv
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/tests/data/history_replay/main_list.csv
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/tests/data/history_replay/supplement.csv
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/tests/data/history_replay/history.csv
          
changes: undefined
          
超阈值和材料缺失场景也需要复用相同的校验规则和定级标准（使用软链接或复制），同时为 history_replay 准备独立的规则。让我把共享的规则和标准复制到各目录：
        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00186/tests/data && for dir in over_threshold missing_material history_replay; do cp compliant/validation_rules.json "$dir/" && cp compliant/grading_criteria.json "$dir/"; done undefined
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/tests/test_acceptance.py
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/tests/__init__.py
          
changes: undefined
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          

        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00186 && python -m pytest tests/test_acceptance.py -v 2>&1 | head -120 undefined
          
有一个测试失败了：合规样例没有坏行时，坏行记录文件被创建了但为空，pandas 无法读取空 CSV。我修复测试中的处理逻辑：
        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/tests/test_acceptance.py
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00186/tests/test_acceptance.py
          
changes: undefined
          

        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00186 && python -m pytest tests/test_acceptance.py -v 2>&1 | tail -40 undefined
          
全部 33 个验收测试通过。让我更新任务状态：
        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          
全部任务完成，33 个验收测试全部通过。以下是实现概览：

---

## 创建的文件

### 1. [cli.py](file:///Users/bill/Documents/solo/workspaces/yzz00186/tea_grading_cli/cli.py) — CLI 命令入口

三个子命令，使用 Click + Rich 构建：

| 命令 | 功能 |
|------|------|
| `tea-grading run` | 执行定级全流程：读取→校验→定级→导出 |
| `tea-grading review` | 复核坏行记录 |
| `tea-grading history-check` | 检查历史回放差异 |

**`run` 命令的核心开关：**

- `--main` / `--supplement` / `--rules` / `--criteria` — 四个必选输入
- `--history` — 历史记录文件（用于回放比对）
- `--dry-run` — 仅预览，**不落正式结果文件**
- `--use-actual` / `--no-use-actual` — 是否用补充表实际检测值定级
- `--strict` — 严格模式：缺补充记录即标记坏行
- `--output-dir` — 输出目录

**输出对应关系：**
- 成功记录 → `定级成功结果_*.csv`
- 坏行记录 → `坏行记录_*.csv`（含坏行原因列）
- 差异记录 → `差异表_*.csv`（主清单 vs 实际 / 历史 vs 当前）
- 操作日志 → `操作日志_*.log`
- 处理汇总 → `处理汇总_*.json`
- 复核入口 → `review_{id}_*.json`（每条坏行一份）

### 2. 测试数据

| 场景 | 目录 | 内容 |
|------|------|------|
| 合规样例 | `tests/data/compliant/` | 5条全部通过 |
| 超阈值样例 | `tests/data/over_threshold/` | 水分超标、单价超标、数量为负 |
| 材料缺失样例 | `tests/data/missing_material/` | 无补充记录、关键字段缺失 |
| 历史回放样例 | `tests/data/history_replay/` | 含历史CSV，3条记录中有2条与历史存在差异 |

### 3. [test_acceptance.py](file:///Users/bill/Documents/solo/workspaces/yzz00186/tests/test_acceptance.py) — 33 项验收测试

覆盖 7 大类检查：

| 测试类 | 测试数 | 检查内容 |
|--------|--------|----------|
| `CompliantSampleTest` | 7 | 全量定级成功、结果文件存在、汇总正确、控制台输出 |
| `OverThresholdSampleTest` | 6 | 坏行检测、H001水分隔离、坏行文件有内容、原因列存在 |
| `MissingMaterialSampleTest` | 6 | 缺补充记录检测、字段缺失隔离、严格模式、复核入口、review 命令 |
| `HistoryReplaySampleTest` | 5 | 历史差异检测、差异表导出、稳定记录无差异、history-check 命令 |
| `DryRunTest` | 2 | 无结果文件、仍有预览输出 |
| `ParameterValidationTest` | 3 | 缺文件报错、无参数报错、正常参数通过 |
| `ExportCorrespondenceTest` | 3 | 坏行ID ↔ 复核文件对应、坏行数 ↔ 汇总一致、日志覆盖全部记录 |
