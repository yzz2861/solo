toolName: todo_write
            
status: success
          
Todos updated: 6 items
          

        
            
toolName: view_folder
            
status: success
          
/Users/bill/Documents/solo/workspaces/yzz00223
          
工作区为空，我将从头构建这个空气微站校准提醒脚本。让我先规划整体架构，然后逐步实现。

        
            
toolName: todo_write
            
status: success
          
Todos updated: 6 items
          
我将设计并实现一个完整的空气微站校准提醒管理系统。架构设计如下：

**模块划分：**
- `models.py` - 数据模型定义
- `config.py` - 配置与阈值管理
- `validator.py` - 数据校验逻辑
- `triage.py` - 状态分流与闭环管理
- `statistics.py` - 统计与趋势分析
- `exporter.py` - 文件导出
- `sample_data.py` - 测试样例数据
- `main.py` - 主入口与CLI

开始实现：

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00223/models.py
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00223/config.py
          
changes: undefined
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 6 items
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00223/validator.py
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00223/triage.py
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00223/statistics.py
          
changes: undefined
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 6 items
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00223/exporter.py
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00223/sample_data.py
          
changes: undefined
          

        
            
toolName: Write
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00223/main.py
          
changes: undefined
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 6 items
          

        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00223 && python3 main.py --verify --show-abnormal --show-trend undefined
          
所有验证通过！让我再检查一下导出的文件内容，确保数据正确：


        
            
toolName: view_folder
            
status: success
          
/Users/bill/Documents/solo/workspaces/yzz00223/output
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00223/output/statistics_20260606_134741.json
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/bill/Documents/solo/workspaces/yzz00223/output/abnormal_samples_20260606_134741.csv
          
导出文件内容完整。让我再做一下代码语法检查和整理，确保代码质量：




        
            
toolName: run_command
            
status: success
          
command: cd /Users/bill/Documents/solo/workspaces/yzz00223 && python3 -m py_compile models.py config.py validator.py triage.py statistics.py exporter.py sample_data.py main.py && echo "All files compile successfully" undefined
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 6 items
          
空气微站校准提醒脚本已实现完成。以下是整体架构和功能说明：

## 📁 项目结构

| 文件 | 说明 |
|------|------|
| [models.py](file:///Users/bill/Documents/solo/workspaces/yzz00223/models.py) | 数据模型定义（校准记录、责任映射、校验结果等） |
| [config.py](file:///Users/bill/Documents/solo/workspaces/yzz00223/config.py) | 阈值配置、材料清单、分组维度标签 |
| [validator.py](file:///Users/bill/Documents/solo/workspaces/yzz00223/validator.py) | 数据校验核心逻辑（阈值检查、材料检查、可解释性说明） |
| [triage.py](file:///Users/bill/Documents/solo/workspaces/yzz00223/triage.py) | 状态分流、闭环管理、历史轨迹回放 |
| [statistics.py](file:///Users/bill/Documents/solo/workspaces/yzz00223/statistics.py) | 统计分析、趋势摘要、异常站点排行 |
| [exporter.py](file:///Users/bill/Documents/solo/workspaces/yzz00223/exporter.py) | CSV/JSON 文件导出 |
| [sample_data.py](file:///Users/bill/Documents/solo/workspaces/yzz00223/sample_data.py) | 四类测试样例生成器 |
| [main.py](file:///Users/bill/Documents/solo/workspaces/yzz00223/main.py) | 主入口 + 5 项一致性验证 |

## ✨ 核心功能

### 1. 数据校验（[validator.py](file:///Users/bill/Documents/solo/workspaces/yzz00223/validator.py)）
- **阈值校验**：支持 PM2.5、PM10、NO₂、SO₂、CO、O₃、温度、湿度 8 项参数的上下限检查
- **材料校验**：5 类必备校准材料的完整性检查
- **可解释性**：每条记录附带时间窗口说明 + 分组维度说明

### 2. 状态分流（[triage.py](file:///Users/bill/Documents/solo/workspaces/yzz00223/triage.py)）
5 种状态流转：
- **合规 (compliant)** — 参数正常、材料齐全
- **超阈值 (over_threshold)** — 参数超标
- **材料缺失 (missing_material)** — 校准材料不全
- **待审核 (pending_review)** — 同时有超阈值和材料缺失
- **已闭环 (closed_loop)** — 整改完成

### 3. 统计与趋势（[statistics.py](file:///Users/bill/Documents/solo/workspaces/yzz00223/statistics.py)）
- 合规率、各状态计数
- 多维度分组统计（站点/区域/部门/校准类型/状态）
- 时间趋势（日/周/月粒度自适应）
- 异常站点 TOP5 排行

### 4. 文件导出（[exporter.py](file:///Users/bill/Documents/solo/workspaces/yzz00223/exporter.py)）
- 全部校准记录 CSV
- 异常样本 CSV
- 校准提醒清单 CSV
- 统计数据 JSON

## 🧪 四类验证样例

| 样例类型 | 数量 | 状态预期 |
|----------|------|----------|
| 合规范例 (REC-C-*) | 10 条 | compliant |
| 超阈值范例 (REC-O-*) | 5 条 | over_threshold |
| 材料缺失范例 (REC-M-*) | 3 条 | missing_material |
| 混合范例 (REC-X-*) | 2 条 | pending_review |
| 历史回放场景 | 3 个 | 闭环轨迹验证 |

## ✅ 5 项一致性验证（全部通过）

1. **状态与原因一致性** — 状态判定与异常原因数量匹配
2. **状态与导出结果一致性** — 异常数/总数与导出文件行数一致
3. **分流结果与统计数据一致性** — 各状态计数与统计汇总一致
4. **历史回放轨迹一致性** — 3 个闭环场景轨迹正确
5. **样例分类验证** — 4 类样例均被正确分类

## 🚀 使用方式

```bash
# 基本运行
python3 main.py

# 指定时间范围和分组维度
python3 main.py --time-start 2026-05-01 --time-end 2026-05-31 --group-by station,region

# 显示异常详情和趋势
python3 main.py --show-abnormal --show-trend

# 运行全部验证
python3 main.py --verify
```
