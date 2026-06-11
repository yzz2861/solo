你指出的两个问题很关键。让我先读取相关文件，然后逐一修复这两个阻断性缺陷。
        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00231/fhr_archive/batch.py
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00231/fhr_archive/cli.py
          
清楚了，有两个阻断性缺陷需要修复：

1. **checksum 只包含记录ID，不包含字段值** —— 内容变化但ID不变会被误判为相同批次
2. **历史加载只看JSON，但generate默认生成CSV** —— 幂等链路断裂

让我逐个修复。

### 修复1：完善 checksum 计算，包含所有字段值

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00231/fhr_archive/batch.py
          
changes: undefined
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          
### 修复2：确保无论选择什么格式，都强制生成 JSON 明细作为权威存档；并让历史加载同时支持 CSV/JSON


        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00231/fhr_archive/cli.py
          
changes: undefined
          
现在修复 `_load_existing_results` 函数，让它同时支持 JSON 和 CSV 加载，优先 JSON，回退到 CSV：




        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00231/fhr_archive/cli.py
          
changes: undefined
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          
现在开始测试验证所有修复效果。我们分4步验证：

1. 用默认格式（csv）首次生成
2. 重复执行验证幂等性（应检测到历史批次）
3. 修改数据内容（ID不变但字段变），验证能识别为新批次
4. 验证历史回放和摘要功能正常




        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00231 && rm -rf output/test_fix && echo "=== 步骤1: 首次生成 (默认CSV格式) ===" && python3 -m fhr_archive generate --main data/samples/compliant/main_list.csv --supplement data/samples/compliant/supplement.csv --rules data/rules/validation_rules.csv --output output/test_fix --source-id 修复验证 --format csv 2>&1 | grep -E "(批次ID|生成完成|总记录数|正常记录|需复核记录|权威存档|CSV格式明细)" undefined
          
首次生成成功，自动生成了权威存档。现在测试幂等性（重复执行应检测到历史批次）：






        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00231 && echo "=== 步骤2: 重复执行 (验证幂等性) ===" && python3 -m fhr_archive generate --main data/samples/compliant/main_list.csv --supplement data/samples/compliant/supplement.csv --rules data/rules/validation_rules.csv --output output/test_fix --source-id 修复验证 --format csv 2>&1 | head -10 undefined
          
幂等性检测正常！现在测试关键修复：**同一批记录ID，但字段值变化时，应识别为新批次**。




        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00231 && mkdir -p /tmp/test_modified && cat data/samples/compliant/main_list.csv | head -1 > /tmp/test_modified/main_list.csv && cat data/samples/compliant/main_list.csv | tail -n +2 | sed 's/142/175/' >> /tmp/test_modified/main_list.csv && echo "=== 步骤3: 修改数据内容 (ID不变, 胎心基线从142改175) ===" && python3 -m fhr_archive generate --main /tmp/test_modified/main_list.csv --supplement data/samples/compliant/supplement.csv --rules data/rules/validation_rules.csv --output output/test_fix --source-id 修改后数据 --format csv 2>&1 | head -12 undefined
          
**关键修复验证通过！** 同一批记录ID，但胎心基线从142改成175后，系统正确识别为**新批次**（FHR-20260606225300），而不是复用历史批次。新风险（胎心过高）也被正确检测出来（1条存在问题，需复核1条）。

现在验证历史回放和摘要功能：







        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00231 && echo "=== 步骤4: 查看历史批次 ===" && python3 -m fhr_archive history --output output/test_fix --limit 5 2>&1 | grep -v "^$" | head -20 && echo "" && echo "=== 步骤5: 通过--batch-id查看摘要 ===" && FIRST_BATCH=$(python3 -m fhr_archive history --output output/test_fix --limit 5 2>&1 | grep "FHR-" | head -1 | awk '{print $1}') && echo "查看批次: $FIRST_BATCH" && python3 -m fhr_archive summary --batch-id "$FIRST_BATCH" --output output/test_fix --show-review 2>&1 | grep -E "(批次ID|总记录数|正常记录|需复核|风险等级分布|危重|高风险|正常.*█|暂无需要复核)" undefined
          
历史查询工作正常。让我直接用已知批次ID测试摘要查看：









        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00231 && echo "=== 步骤5: 通过批次ID查看历史摘要 ===" && python3 -m fhr_archive summary --batch-id FHR-20260606225236 --output output/test_fix --show-review 2>&1 | grep -E "(批次ID|总记录数|正常记录|需复核记录|暂无需要复核|来源标识)" undefined
          
历史摘要查看正常！现在做一次完整的全量验证，确保所有4类样例都能正常工作，并且导出功能也正常：










        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00231 && rm -rf output && echo "===== 全量验证: 4类样例 =====" && echo "" && echo "--- 1. 合规样例 ---" && python3 -m fhr_archive generate --main data/samples/compliant/main_list.csv --supplement data/samples/compliant/supplement.csv --rules data/rules/validation_rules.csv --output output/compliant --source-id 合规样例 2>&1 | tail -10 | head -8 && echo "" && echo "--- 2. 超阈值样例 ---" && python3 -m fhr_archive generate --main data/samples/over_threshold/main_list.csv --supplement data/samples/over_threshold/supplement.csv --rules data/rules/validation_rules.csv --output output/over_threshold --source-id 超阈值样例 2>&1 | tail -12 | head -10 && echo "" && echo "--- 3. 材料缺失样例 ---" && python3 -m fhr_archive generate --main data/samples/missing_material/main_list.csv --supplement data/samples/missing_material/supplement.csv --rules data/rules/validation_rules.csv --output output/missing --source-id 材料缺失样例 2>&1 | tail -12 | head -10 && echo "" && echo "--- 4. 历史回放样例 ---" && python3 -m fhr_archive generate --main data/samples/historical/main_list.csv --supplement data/samples/historical/supplement.csv --rules data/rules/validation_rules.csv --output output/historical --source-id 历史回放样例 2>&1 | tail -12 | head -10 undefined
          
所有4类样例都生成正常。现在再验证一下**重复执行幂等**和**export从历史加载**的完整链路：













        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00231 && echo "=== 验证: 重复执行(第二次) -> 应检测到历史批次 ===" && python3 -m fhr_archive generate --main data/samples/historical/main_list.csv --supplement data/samples/historical/supplement.csv --rules data/rules/validation_rules.csv --output output/historical --source-id 历史回放样例 2>&1 | head -6 && echo "" && echo "=== 验证: export从历史批次加载并导出 ===" && python3 -m fhr_archive export --main data/samples/historical/main_list.csv --supplement data/samples/historical/supplement.csv --rules data/rules/validation_rules.csv --output output/historical --source-id 历史回放样例 --format txt 2>&1 | grep -E "(检测到|导出完成|批次ID|报告文件)" && echo "" && echo "=== 验证: 生成的文件结构 ===" && ls -la output/historical/details/ output/historical/review/ output/historical/summary/ undefined
          
所有验证通过！让我更新任务状态：










        
            
toolName: todo_write
            
status: success
          
Todos updated: 4 items
          
## 修复完成总结

两个阻断性缺陷已全部修复并通过验证。

### 修复1：checksum 计算包含完整字段值
**文件：** [batch.py](file:///Users/bill/Documents/solo/workspaces/yzz00231/fhr_archive/batch.py#L20-L72)

**问题：** `compute_checksum` 只包含记录数量、记录ID和规则哈希，不包含主清单/补充表的实际字段值。同一批记录ID下胎心基线等内容变化仍会被判定为历史相同批次。

**修复：** 现在 checksum 包含每条记录的**所有字段**（胎心基线、变异、加速/减速次数、晚期减速、变异减速、监护时长、医生、结论等），以及补充表的所有字段（孕妇年龄、孕周、孕产次、高危因素、分娩结局、Apgar评分等）。确保**任何数据内容变化都会生成不同的校验和**。

### 修复2：幂等链路完整性修复
**文件：** [cli.py](file:///Users/bill/Documents/solo/workspaces/yzz00231/fhr_archive/cli.py#L169-L191)

**问题：** `generate` 默认格式是CSV，但 `_load_existing_results` 只从JSON明细加载历史结果。默认链路下重复执行会丢失明细和复核列表。

**修复：**
- **生成时强制输出权威存档**：无论用户选什么格式（csv/json/both），都始终生成 `JSON明细 + CSV复核列表 + JSON摘要` 作为权威存档
- **历史加载双链路**：优先从JSON加载（数据最全，含校验详情），JSON不存在时从CSV加载（兼容旧批次）
- **复核列表双保险**：优先从明细派生，明细也没有时从独立的review CSV加载

### 验证结果

| 测试场景 | 结果 |
|---------|------|
| 首次生成（默认CSV格式） | ✅ 正常，同时生成JSON权威存档 |
| 重复执行（相同数据） | ✅ 正确检测到历史批次，幂等生效 |
| 数据内容变化（ID不变，胎心基线改值） | ✅ 正确识别为**新批次**，新风险正确检出 |
| 通过 --batch-id 查看历史摘要 | ✅ 正常加载并显示 |
| 4类样例全量生成 | ✅ 全部正常，数据正确 |
| export 从历史批次加载并导出 | ✅ 正常工作 |

项目仍可安装、可运行、可验证，所有原有功能完整保留。
