我来帮你实现这个"煤矿瓦斯巡检CLI"工具。首先让我了解一下当前工作目录的情况，然后规划实现方案。
        
            
toolName: view_folder
            
status: success
          
/Users/bill/Documents/solo/workspaces/yzz00227
          
工作目录是空的，我将从头构建这个CLI工具。让我先规划整体方案。
        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          
让我开始构建项目结构。首先创建核心模块和CLI入口。

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00227/coal_gas_inspection/__init__.py
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00227/coal_gas_inspection/validator.py
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00227/coal_gas_inspection/reader.py
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00227/coal_gas_inspection/processor.py
          
changes: undefined
          
现在创建导出模块、日志模块和CLI入口。

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00227/coal_gas_inspection/exporter.py
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00227/coal_gas_inspection/logger.py
          
changes: undefined
          
现在创建CLI主入口文件。


        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00227/coal_gas_inspection/cli.py
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00227/requirements.txt
          
changes: undefined
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          
现在创建测试数据和验收测试。先创建字段映射配置和测试数据文件。



        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00227/tests/data/mapping.json
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00227/tests/data/mapping_alt.json
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00227/tests/data/source_a.csv
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00227/tests/data/source_b.csv
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00227/tests/data/source_with_errors.csv
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00227/tests/data/source_alt_fields.csv
          
changes: undefined
          
现在创建CLI入口脚本和完整的验收测试脚本。




        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00227/gas_inspect.py
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00227/tests/acceptance_test.py
          
changes: undefined
          
现在安装依赖并运行验收测试来验证功能。


        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          

        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00227 && pip install -r requirements.txt undefined
          
让我用 python -m pip 来安装依赖。




        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00227 && python -m pip install -r requirements.txt undefined
          
让我检查一下可用的 Python 命令。





        
            
toolName: run_command
            
status: success
          
command: which python3 && python3 --version undefined
          
好的，有 python3。让我安装依赖。






        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00227 && python3 -m pip install -r requirements.txt undefined
          
依赖已就绪。现在运行验收测试。





        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00227 && python3 tests/acceptance_test.py undefined
          
有2个测试失败，让我修复它们。一个是测试代码逻辑错误，另一个是控制台输出的坏行复核提示需要调整。






        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00227/tests/acceptance_test.py
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00227/coal_gas_inspection/cli.py
          
让我看看场景3中出错的具体代码行。






        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00227/tests/acceptance_test.py
          
找到问题了。让我修复测试代码的逻辑错误，并在CLI输出中增加坏行复核入口提示。







        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00227/tests/acceptance_test.py
          
changes: undefined
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00227/coal_gas_inspection/cli.py
          
现在在CLI的标准输出中增加坏行复核入口提示。









        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00227/coal_gas_inspection/cli.py
          
changes: undefined
          
现在重新运行验收测试。








        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00227 && python3 tests/acceptance_test.py undefined
          
所有10个验收测试全部通过！让我快速验证一下帮助信息，然后完成收尾。











        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00227 && python3 gas_inspect.py --help undefined
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 8 items
          
## 煤矿瓦斯巡检 CLI - 实现完成

### 项目结构

```
coal_gas_inspection/
├── __init__.py
├── cli.py          # CLI 入口
├── validator.py    # 参数校验
├── reader.py       # 文件读取
├── processor.py    # 数据处理 + 差异表生成
├── exporter.py     # 多格式导出
└── logger.py       # 操作日志
tests/
├── data/           # 测试数据
│   ├── mapping.json / mapping_alt.json
│   ├── source_a.csv / source_b.csv
│   ├── source_with_errors.csv  # 含各种错误的测试数据
│   └── source_alt_fields.csv
└── acceptance_test.py
gas_inspect.py      # 可执行入口
requirements.txt
```

### 核心功能模块

| 模块 | 文件 | 职责 |
|------|------|------|
| 参数校验 | [validator.py](file:///Users/bill/Documents/solo/workspaces/yzz00227/coal_gas_inspection/validator.py) | 文件存在性、日期格式/范围、映射配置完整性、导出格式 |
| 文件读取 | [reader.py](file:///Users/bill/Documents/solo/workspaces/yzz00227/coal_gas_inspection/reader.py) | CSV/Excel 读取、多文件合并、来源/批次标识注入 |
| 数据处理 | [processor.py](file:///Users/bill/Documents/solo/workspaces/yzz00227/coal_gas_inspection/processor.py) | 日期过滤、坏行检测、差异表（同地点按时间序列差） |
| 导出模块 | [exporter.py](file:///Users/bill/Documents/solo/workspaces/yzz00227/coal_gas_inspection/exporter.py) | CSV/Excel/JSON 三种格式导出成功/坏行/差异/摘要 |
| 操作日志 | [logger.py](file:///Users/bill/Documents/solo/workspaces/yzz00227/coal_gas_inspection/logger.py) | 控制台 + 文件双输出日志，dry-run 专用日志 |
| CLI 入口 | [cli.py](file:///Users/bill/Documents/solo/workspaces/yzz00227/coal_gas_inspection/cli.py) | Click 命令行、批次号生成、流程编排 |

### 使用方法

```bash
# 基本使用
python3 gas_inspect.py \
  -f tests/data/source_a.csv \
  -f tests/data/source_b.csv \
  -m tests/data/mapping.json \
  -s 2025-06-01 \
  -e 2025-06-05 \
  -F csv \
  -o ./output

# Dry-run 预览（只统计，不写正式结果）
python3 gas_inspect.py -f ... -m ... -s ... -e ... --dry-run

# 指定批次号
python3 gas_inspect.py -f ... -m ... -s ... -e ... -b BATCH-001
```

### 输出产物（一一对应）

| 输出文件 | 说明 |
|----------|------|
| `success_{batch}.{fmt}` | 成功结果，含 `_source_file`、`_batch_id`、`_row_number` |
| `bad_rows_{batch}.{fmt}` | 坏行隔离，含 `_bad_reason` 及追溯字段 |
| `diff_{batch}.{fmt}` | 差异表，同地点按时间序列的瓦斯浓度差值/百分比 |
| `summary_{batch}.json` | 处理摘要（统计 + 配置） |
| `operation_{batch}.log` | 操作日志（dry-run 带 `_dryrun` 后缀） |

### 坏行检测规则

- **巡检编号**：空值、含特殊字符、长度不足/超限
- **巡检时间**：格式无法解析、早于起始日期、晚于结束日期
- **瓦斯浓度**：非数字、负数、>100
- **巡检地点**：空值

所有坏行保留原始字段 + 错误原因 + 来源追溯信息，方便业务人员回到原始数据复盘。

### 验收测试结果

运行 `python3 tests/acceptance_test.py`，**10/10 全部通过**：

| 场景 | 验证内容 | 结果 |
|------|----------|------|
| 场景1 | 完整数据正常处理 | ✅ PASS |
| 场景2 | 时间越界数据隔离 | ✅ PASS |
| 场景3 | 编号错误/浓度错误/地点空/时间格式错 | ✅ PASS |
| 场景4 | 映射缺失/文件缺失/日期错/格式错 | ✅ PASS |
| 场景5 | dry-run 只预览不落盘 | ✅ PASS |
| 场景6 | 坏行复核入口 + 来源追溯 | ✅ PASS |
| 场景7 | 批次号 + 来源文件标识 | ✅ PASS |
| 场景8 | 差异表生成（含差值/百分比） | ✅ PASS |
| 场景9 | CSV/Excel/JSON 三种格式导出 | ✅ PASS |
| 场景10 | 不同字段名映射适配 | ✅ PASS |
