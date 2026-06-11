我来分析一下当前的风险分级口径问题，并进行修正。让我先检查当前的实现：
        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/core.py
          
我发现了问题。当前的风险分级存在两个核心问题：

1. **"无法判定"等级定义不清**：只有日期为空时才判定为无法判定，且低风险没有上界（超过180天也算低风险）
2. **口径一致性需加强**：去重策略、分级逻辑、导出规则需要更明确地统一

让我进行修正：


        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          
首先更新配置文件，明确口径规则：





        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/config/config.yaml
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/config/config.yaml
          
changes: undefined
          
现在更新核心模块，修正风险分级逻辑并统一直通口径：







        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/core.py
          
现在我来全面更新核心模块，确保风险分级四口径清晰且全链路口径一致：



        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/core.py
          
changes: undefined
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          
现在更新报告生成模块，确保导出口径与处理口径完全一致：







        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/report_generator.py
          
changes: undefined
          
现在更新主入口脚本：










        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/main.py
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/main.py
          
changes: undefined
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/main.py
          
changes: undefined
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/main.py
          
changes: undefined
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          
现在运行脚本验证修改：












        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker && python3 main.py -v undefined
          
现在四个风险等级都有数据了。让我检查生成的报告：


















        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/output/文本摘要.txt
          
再检查汇总报告和明细表：


















        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/output/汇总报告.csv
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/output/明细表.csv
          
数据完全正确！让我完成任务：





















        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          
已完成风险分级口径的修正，主要改动如下：

---

## 核心改动

### 1. 四级风险体系明确化

新增 [RiskClassifier](file:///Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/core.py#L47-L82) 统一分级类，四个等级边界清晰：

| 风险等级 | 判定标准 |
|---------|---------|
| **高风险** | 已过期 或 距离到期 ≤ 30 天 |
| **中风险** | 30 天 < 距离到期 ≤ 90 天 |
| **低风险** | 90 天 < 距离到期 ≤ 180 天 |
| **无法判定** | 距离到期 > 180 天 或 无法计算 |

### 2. 四口径一致性保障

| 口径 | 统一机制 | 文件 |
|------|---------|------|
| **解析口径** | 统一从 `consistency_rules.parse_date_formats` 读取日期格式列表 | [core.py](file:///Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/core.py#L92-L114) |
| **去重口径** | 统一从 `deduplication` 配置读取键、策略、排序字段；保留采集时间最新的记录 | [core.py](file:///Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/core.py#L178-L233) |
| **分级口径** | 统一使用 `RiskClassifier` 类，所有模块共用同一套分级逻辑 | [core.py](file:///Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/core.py#L47-L82) |
| **导出口径** | 统一从 `consistency_rules` 读取编码格式和风险等级顺序 | [report_generator.py](file:///Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/report_generator.py#L9-L25) |

### 3. 配置文件增强

[config.yaml](file:///Users/bill/Documents/solo/workspaces/yzz00224/gas_cylinder_checker/config/config.yaml) 新增：
- `risk_levels.rules`：各级别规则描述
- `deduplication`：去重键、策略、排序方式
- `consistency_rules`：解析格式、导出编码、风险等级顺序

### 4. 验证结果（示例数据）

```
高风险: 4    (3个已过期 + 1个14天内到期)
中风险: 3    (34~75天)
低风险: 4    (96~178天)
无法判定: 1  (202天，超出180天阈值)
```

所有报告文件（明细表、汇总报告、问题清单、文本摘要）均已更新，完整包含四个风险等级。
