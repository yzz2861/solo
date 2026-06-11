你说得对！当前 `generate` 命令只使用本轮原始文件里的有效记录来生成排期，导致 store 中已修复的坏行、已复核通过的记录无法被纳入排期。

让我查看当前逻辑并修复：
        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00278/gym_scheduler/cli.py
          
问题很清楚：当前只拿本轮文件里的有效记录生成排期，但 store 里可能有之前修复好的坏行、复核通过的记录（状态是 valid），它们应该也被纳入排期。

正确逻辑应该是：**把本轮数据导入 store 后，用 store 中所有 ready 状态的记录来生成排期**。


        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00278/gym_scheduler/cli.py
          
changes: undefined
          
等等，还需要调整 `import_all_records` 的逻辑。当前逻辑是"如果已有 valid/scheduled 记录就不覆盖"，但实际上本轮提交的数据应该代表最新状态，需要更新。

让我修正一下：



        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00278/gym_scheduler/generator.py
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00278/gym_scheduler/generator.py
          
changes: undefined
          
现在测试修复后的逻辑 - 验证修复坏行 + 复核通过后，再次 generate 能把这些记录纳入排期：


        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00278 && rm -rf output && echo "========== 第1步：首次提交混合数据 ==========" && python3 -m gym_scheduler.cli generate examples/sample_mixed.csv -m examples/field_mapping.json -o ./output --operator tester --remark "首次提交" 2>&1 undefined
          
我发现问题了！`import_all_records` 先把 valid 记录存入 store，然后 `generate_schedules` 又把 valid 状态的记录算作"已存在"的，所以第一次提交显示 0 新增。

差异对比应该只对比 **已排期**（scheduled/exported）的记录，而 valid 状态是"待排期"。让我修复：




        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00278/gym_scheduler/generator.py
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00278/gym_scheduler/generator.py
          
changes: undefined
          
现在重新测试完整流程：






        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00278 && rm -rf output && echo "========== 第1步：首次提交混合数据 ==========" && python3 -m gym_scheduler.cli generate examples/sample_mixed.csv -m examples/field_mapping.json -o ./output --operator tester --remark "首次提交" 2>&1 undefined
          
**第1步正确！** 新增1条排期。现在测试修复坏行和复核通过后，再次 generate 能否把这些记录也纳入排期：








        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00278 && echo "========== 第2步：修复孙八的坏行 + 通过吴十的复核 ==========" && python3 -m gym_scheduler.cli review fix 9ad94db4f78d -o ./output -f member_phone=13987654321 -c "电话更正" 2>&1 && echo "" && python3 -m gym_scheduler.cli review approve 12c7c3902a29 -o ./output -c "客户确认可上晚课" 2>&1 && echo "" && echo "========== 第3步：查看当前状态 ==========" && python3 -m gym_scheduler.cli summary -o ./output 2>&1 undefined
          
现在 store 里有 **2条 valid 状态但还没排期** 的记录（修复的孙八 + 复核通过的吴十）。再次执行 generate 应该能把它们也排期：









        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00278 && echo "========== 第4步：再次执行 generate（不提交新文件，只处理已就绪的） ==========" && python3 -m gym_scheduler.cli generate examples/sample_mixed.csv -m examples/field_mapping.json -o ./output --operator tester --remark "再次生成" 2>&1 undefined
          
问题找到了！`import_all_records` 把本轮文件里的原始状态（孙八还是 invalid，吴十还是 review）覆盖了之前修复/复核后的状态。

**正确逻辑**：如果内容没变，就保留之前的状态（包括修复/复核后的结果）；只有内容变化了才重新校验覆盖。

让我修复 `import_all_records`：







        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00278/gym_scheduler/generator.py
          
changes: undefined
          
现在重新测试完整流程：










        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00278 && rm -rf output && echo "========== [1/6] 首次提交混合数据 ==========" && python3 -m gym_scheduler.cli generate examples/sample_mixed.csv -m examples/field_mapping.json -o ./output --operator tester --remark "首次提交" 2>&1 && echo "" && echo "========== [2/6] 修复坏行 + 复核通过 ==========" && python3 -m gym_scheduler.cli review fix 9ad94db4f78d -o ./output -f member_phone=13987654321 -c "电话更正" 2>&1 && python3 -m gym_scheduler.cli review approve 12c7c3902a29 -o ./output -c "客户确认可上晚课" 2>&1 && echo "" && echo "========== [3/6] 查看状态 ==========" && python3 -m gym_scheduler.cli summary -o ./output 2>&1 undefined
          
状态正确。现在再次执行 generate，应该能把那 2 条 valid 状态的记录也生成排期：












        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00278 && echo "========== [4/6] 再次 generate（应该新增2条） ==========" && python3 -m gym_scheduler.cli generate examples/sample_mixed.csv -m examples/field_mapping.json -o ./output --operator tester --remark "再次生成" 2>&1 && echo "" && echo "========== [5/6] 再次执行 generate（幂等性：应0新增） ==========" && python3 -m gym_scheduler.cli generate examples/sample_mixed.csv -m examples/field_mapping.json -o ./output --operator tester --remark "重复提交" 2>&1 && echo "" && echo "========== [6/6] 查看最终状态 ==========" && python3 -m gym_scheduler.cli summary -o ./output 2>&1 undefined
          
我发现问题了。`import_all_records` 会把本轮文件里的内容和 store 里的对比，如果内容变了就覆盖。但 `review fix` 修改了 store 里的内容，导致再次 import 时被判定为"内容变了"，然后被原始文件覆盖回去。

**正确设计**：import 时对于同一来源的记录，**只新增、不更新**（重复提交完全幂等）。人工修复/复核的结果保留在 store 里，不会被原始文件覆盖。







        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00278/gym_scheduler/generator.py
          
changes: undefined
          
现在重新测试完整流程：
















        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00278 && rm -rf output && echo "========== [1/6] 首次提交混合数据 ==========" && python3 -m gym_scheduler.cli generate examples/sample_mixed.csv -m examples/field_mapping.json -o ./output --operator tester --remark "首次提交" 2>&1 && echo "" && echo "========== [2/6] 修复坏行 + 复核通过 ==========" && python3 -m gym_scheduler.cli review fix 9ad94db4f78d -o ./output -f member_phone=13987654321 -c "电话更正" 2>&1 && python3 -m gym_scheduler.cli review approve 12c7c3902a29 -o ./output -c "客户确认可上晚课" 2>&1 && echo "" && echo "========== [3/6] 查看状态（应该2条valid） ==========" && python3 -m gym_scheduler.cli summary -o ./output 2>&1 undefined
          
状态正确：**2条 valid**。现在再次 generate，应该能把这 2 条也排期：


















        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00278 && echo "========== [4/6] 再次 generate（应该新增2条） ==========" && python3 -m gym_scheduler.cli generate examples/sample_mixed.csv -m examples/field_mapping.json -o ./output --operator tester --remark "再次生成" 2>&1 && echo "" && echo "========== [5/6] 再执行一次（幂等：0新增） ==========" && python3 -m gym_scheduler.cli generate examples/sample_mixed.csv -m examples/field_mapping.json -o ./output --operator tester --remark "重复提交" 2>&1 && echo "" && echo "========== [6/6] 最终状态 ==========" && python3 -m gym_scheduler.cli summary -o ./output 2>&1 undefined
          
**完美！** 修复成功。让我验证一下输出文件的内容，确保批次和来源标识都正确：


















        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00278 && echo "=== 坏行文件 ===" && cat output/bad_records_*.csv && echo "" && echo "=== 差异表（第二次生成的） ===" && ls -t output/diff_*.csv | head -1 | xargs cat && echo "" && echo "=== 排期结果（最新的） ===" && ls -t output/schedules_*.csv | head -1 | xargs cat undefined
          
最新的文件是第三次（幂等那次）的，所以排期文件是空的。让我看第二次生成的：



















        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00278 && ls -la output/diff_*.csv && echo "---" && ls -la output/schedules_*.csv undefined
          

        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00278 && echo "=== 第2次差异表（2条新增） ===" && cat output/diff_20260607_224201.csv && echo "" && echo "=== 第2次排期结果（3条） ===" && cat output/schedules_20260607_224201.csv undefined
          
等等，我发现另一个问题：第二次排期结果里只有 2 条，但实际上已经有 3 条排期了（钱七+孙八+吴十）。这是因为导出的只是本轮 diff 里的记录，而不是完整的排期结果。

让我修复：**成功结果文件应该包含所有已排期的记录**（全量快照）：

















        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00278/gym_scheduler/cli.py
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00278/gym_scheduler/cli.py
          
changes: undefined
          
现在重新跑完整测试，验证最终效果：




















        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00278 && rm -rf output && echo "========== [1/5] 首次提交混合数据 ==========" && python3 -m gym_scheduler.cli generate examples/sample_mixed.csv -m examples/field_mapping.json -o ./output --operator tester --remark "首次提交" 2>&1 && echo "" && echo "========== [2/5] 修复坏行 + 复核通过 ==========" && python3 -m gym_scheduler.cli review fix 9ad94db4f78d -o ./output -f member_phone=13987654321 -c "电话更正" 2>&1 && python3 -m gym_scheduler.cli review approve 12c7c3902a29 -o ./output -c "客户确认可上晚课" 2>&1 && echo "" && echo "========== [3/5] 再次 generate ==========" && python3 -m gym_scheduler.cli generate examples/sample_mixed.csv -m examples/field_mapping.json -o ./output --operator tester --remark "再次生成" 2>&1 undefined
          
现在验证第二次 generate 后的排期文件是否是全量 3 条：


















        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00278 && echo "=== 第2次排期结果（应该3条全量） ===" && ls -t output/schedules_*.csv | head -1 | xargs cat && echo "" && echo "=== 历史批次 ===" && python3 -m gym_scheduler.cli summary -o ./output --all-batches 2>&1 undefined
          
**完美！** 修改完成，所有功能正常。让我给你总结一下修改内容：

---

## ✅ 修改完成

### 🔧 核心修改

针对 `generate` 命令"只用本轮原始数据里的有效记录生成排期"的问题，做了以下调整：

**1. [cli.py](file:///Users/bill/Documents/solo/workspaces/yzz00278/gym_scheduler/cli.py#L180-L198) - 调整生成逻辑**

- 先将本轮数据导入 store（只新增、不更新已有记录）
- 然后从 store 中取**所有 valid 状态**的记录来生成排期（包括历史批次中修复的坏行、复核通过的记录）
- 成功结果文件导出**全量已排期记录**（不是只导出本轮 diff 的）

**2. [generator.py](file:///Users/bill/Documents/solo/workspaces/yzz00278/gym_scheduler/generator.py#L195-L209) - import 只新增不更新**

- `import_all_records` 改为**只新增、不覆盖**已有记录
- 保证重复提交完全幂等，同时保留人工修复/复核的结果
- 差异对比只和 `scheduled/exported` 状态的记录对比（valid 状态是"待排期"）

### 📊 验证结果

| 场景 | 结果 |
|------|------|
| 首次提交混合数据 | ✅ 1 条新增排期 + 2 条坏行 + 2 条待复核 |
| 修复 1 条坏行 + 复核通过 1 条 | ✅ 2 条记录状态变为 valid |
| 再次 generate | ✅ 新增 2 条排期（处理了 store 里所有 valid 记录） |
| 重复提交 | ✅ 0 新增，完全幂等 |
| 排期结果文件 | ✅ 全量 3 条，均含批次号 + 来源文件 + 来源行号 |
| 坏行文件 | ✅ 含批次号 + 来源标识，可追溯到原始数据 |
| 历史批次 | ✅ 每批次的校验统计、差异统计完整记录 |
