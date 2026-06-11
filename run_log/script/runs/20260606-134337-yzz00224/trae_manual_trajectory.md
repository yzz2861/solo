我来帮你编写这个实验室气瓶到期脚本。首先让我了解一下当前工作目录的情况，然后规划脚本的整体结构。
        
            
toolName: view_folder
            
status: success
          
/Users/bill/Documents/solo/workspaces/yzz00224
          
工作目录是空的，我来为你创建一个完整的实验室气瓶到期脚本。让我先规划一下任务。

        
            
toolName: todo_write
            
status: success
          
Todos updated: 6 items
          
现在开始创建脚本。我会按照模块化的方式设计，确保解析、去重、分级口径一致。

        
            
toolName: todo_write
            
status: success
          
Todos updated: 6 items
          
让我先创建目录结构和配置文件、示例数据。

        
            
toolName: run_command
            
status: success
          
command: mkdir -p /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/data /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/config /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/output undefined
          
目录已创建，现在创建配置文件和示例数据。

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/config/config.yaml
          
changes: undefined
          
现在创建示例气瓶数据文件：


        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/data/cylinder_data.csv
          
changes: undefined
          
现在创建责任映射文件：



        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/data/responsibility_map.csv
          
changes: undefined
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 6 items
          
现在编写核心数据处理模块。我先创建核心类，确保解析、去重、分级口径一致。


        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/core.py
          
changes: undefined
          
现在编写报告生成模块：





        
            
toolName: todo_write
            
status: success
          
Todos updated: 6 items
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/report_generator.py
          
changes: undefined
          
现在编写主入口脚本：




        
            
toolName: todo_write
            
status: success
          
Todos updated: 6 items
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/main.py
          
changes: undefined
          
现在让我运行脚本验证功能：






        
            
toolName: todo_write
            
status: success
          
Todos updated: 6 items
          

        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker && python3 main.py -v undefined
          
路径计算有问题，让我修复一下。我将修改核心模块，让路径由主脚本传入基准目录。




        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/core.py
          
我需要修改路径处理逻辑。让我更新核心模块，接受基准目录参数：





        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/core.py
          
changes: undefined
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/core.py
          
changes: undefined
          
现在更新 ResponsibilityMapper 类的路径处理：







        
            
toolName: search_by_regex
            
status: success
          
query: class ResponsibilityMapper
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/core.py
          
changes: undefined
          
现在更新主脚本，传递 base_dir 参数：







        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/main.py
          
changes: undefined
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/main.py
          
changes: undefined
          
现在再次运行脚本验证：







        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker && python3 main.py -v undefined
          
脚本运行成功！让我检查一下生成的报告文件：









        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/output/文本摘要.txt
          
让我查看问题清单和明细表的内容：










        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/output/问题清单.csv
          
让我也检查一下汇总报告：














        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/output/汇总报告.csv
          
所有报告都正确生成了。让我完成任务列表：









        
            
toolName: todo_write
            
status: success
          
Todos updated: 6 items
          
脚本已开发完成并验证通过！以下是完整的项目说明：

## 项目结构

```
gas_cylinder_checker/
├── config/
│   └── config.yaml          # 配置文件
├── data/
│   ├── cylinder_data.csv    # 气瓶采集数据（示例）
│   └── responsibility_map.csv # 责任映射表（示例）
├── output/                  # 输出目录（自动生成）
├── core.py                  # 核心数据处理模块
├── report_generator.py      # 报告生成模块
└── main.py                  # 主入口脚本
```

## 核心模块说明

### [core.py](file:///Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/core.py)
- **DataParser**: 数据解析器，支持多种日期格式，字段校验
- **DataProcessor**: 数据处理器，统一口径的去重、风险分级、时间过滤
- **ResponsibilityMapper**: 责任映射加载与数据补全
- 数据类：`CylinderRecord`、`ProblemRecord`、`ProcessResult`

### [report_generator.py](file:///Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/report_generator.py)
- 明细表：按风险等级排序，含处理批次和来源标识
- 汇总报告：按实验室、责任人、气瓶类型多维度分组
- 问题清单：坏数据独立存放，含原始数据便于回放
- 文本摘要：整体概览、风险分布、高风险 Top 10

## 关键特性

| 特性 | 说明 |
|------|------|
| **口径一致** | 解析、去重、分级、导出使用同一套规则配置 |
| **坏数据隔离** | 问题数据仅进入问题清单，不污染汇总统计 |
| **风险分级** | 高风险(≤30天)、中风险(31~90天)、低风险(91~180天)、无法判定 |
| **可追溯** | 每条记录带处理批次和来源标识 |
| **可回放** | 问题清单保留原始行号和数据内容 |

## 使用方法

```bash
cd gas_cylinder_checker

# 使用默认配置运行
python3 main.py

# 详细输出模式
python3 main.py -v

# 自定义参数
python3 main.py --batch-id BATCH-2026-002 --check-date 2026-07-01
python3 main.py --high-risk-days 15 --medium-risk-days 60
```

## 命令行参数

| 参数 | 说明 |
|------|------|
| `-c, --config` | 配置文件路径 |
| `--batch-id` | 覆盖处理批次号 |
| `--check-date` | 覆盖检查基准日期 |
| `--start-date / --end-date` | 覆盖统计时间范围 |
| `--high-risk-days / --medium-risk-days / --low-risk-days` | 覆盖风险阈值 |
| `-v, --verbose` | 详细输出 |

## 验收检查清单

- ✓ **计算口径一致**: 解析、去重、分级、导出使用同一套规则
- ✓ **异常解释完整**: 问题清单包含问题类型、描述和原始数据
- ✓ **任务状态可追溯**: 每条记录包含处理批次和来源标识
- ✓ **数据可回放**: 问题清单保留原始数据行号和内容
- ✓ **坏数据隔离**: 问题数据仅进入问题清单，不污染汇总统计
