
# 海洋养殖场投喂异常分析工具

一个本地运行的数据分析工具，帮助养殖场复盘投喂执行情况，快速定位异常。

## 功能特点

- ✅ **多源数据整合**：按养殖池编号串联投喂计划（CSV）、实际投喂记录（JSON）、水质补录表（CSV）和复核状态
- ✅ **智能去重**：基于文件哈希 + 记录ID双重去重，重复导入不会重复统计
- ✅ **三类异常检测**：
  - 投喂量偏差（超出阈值百分比）
  - 水质超阈值（水温、溶氧、pH、盐度等）
  - 补录时间晚于投喂时间
- ✅ **丰富的输出**：
  - 可视化图表摘要（5张趋势/分布图）
  - 风险明细 CSV（可单独查看每类异常）
  - 场长能读懂的 Markdown 分析报告

## 快速开始

### 1. 安装依赖

```bash
cd aqua_feed_analyzer
pip install -r requirements.txt
```

### 2. 生成示例数据（可选）

```bash
python main.py sample
```

这会在 `data/` 目录下生成 14 天的示例数据，包含 10 个养殖池的计划、记录和水质数据。

### 3. 运行分析

```bash
python main.py run
```

### 4. 查看结果

输出文件在 `output/` 目录下：

```
output/
├── 投喂异常分析报告.md        # 场长可读的完整报告
├── 01_anomaly_types.png       # 异常类型分布
├── 02_risk_levels.png         # 风险等级分布
├── 03_pond_anomalies.png      # 各养殖池异常排行
├── 04_feed_trend.png          # 每日投喂量趋势
├── 05_water_temp_trend.png    # 水温变化趋势
└── csv/
    ├── risk_all_anomalies.csv      # 全部异常汇总
    ├── risk_feed_deviation.csv     # 投喂量偏差
    ├── risk_water_threshold.csv    # 水质超阈值
    └── risk_late_supplement.csv    # 补录时间异常
```

## 命令说明

| 命令 | 说明 |
|------|------|
| `python main.py run` | 运行分析（增量导入新数据） |
| `python main.py run --reset` | 重置状态后重新分析所有数据 |
| `python main.py sample` | 生成示例数据 |
| `python main.py info` | 查看当前数据导入状态 |
| `python main.py reset` | 仅重置导入状态 |

## 数据格式要求

### 1. 投喂计划（CSV，放 `data/plans/`）

必需字段：养殖池编号、计划日期、计划投喂量

可选字段：饲料类型、投喂时间、备注

```csv
养殖池编号,计划日期,饲料类型,计划投喂量,投喂时间
P001,2025-06-01,配合饲料A,50.5,08:00:00
```

### 2. 实际投喂记录（JSON，放 `data/records/`）

必需字段：record_id、养殖池编号、投喂日期、实际投喂量

可选字段：饲料类型、投喂时间、操作人员、复核状态、复核人、复核时间、备注

```json
[
  {
    "record_id": "REC000001",
    "养殖池编号": "P001",
    "投喂日期": "2025-06-01",
    "投喂时间": "08:15:00",
    "饲料类型": "配合饲料A",
    "实际投喂量": 52.3,
    "操作人员": "张三",
    "复核状态": "已复核",
    "复核人": "李场长",
    "复核时间": "2025-06-01 17:30:00"
  }
]
```

### 3. 水质补录表（CSV，放 `data/water/`）

必需字段：养殖池编号、检测日期

可选字段：水温、溶解氧、pH值、盐度、氨氮、亚硝酸盐、是否补录、补录时间、检测人

```csv
养殖池编号,检测日期,检测时间,水温,溶解氧,pH值,盐度,是否补录,补录时间
P001,2025-06-01,07:30:00,24.5,6.8,8.1,28.5,否,
```

## 配置说明

编辑 `config.yaml` 可调整阈值和路径：

```yaml
thresholds:
  feed_deviation_pct: 10.0      # 投喂量偏差阈值 (%)
  water_temp_min: 18.0          # 水温下限 (℃)
  water_temp_max: 28.0          # 水温上限 (℃)
  water_do_min: 5.0             # 溶解氧下限 (mg/L)
  water_ph_min: 7.5             # pH 下限
  water_ph_max: 8.5             # pH 上限
  water_salinity_min: 20.0      # 盐度下限 (‰)
  water_salinity_max: 35.0      # 盐度上限 (‰)
```

## 去重机制说明

工具采用**双重去重**确保数据不重复统计：

1. **文件级去重**：基于文件 SHA-256 哈希，同一文件（内容不变）不会重复导入
2. **记录级去重**：基于 record_id 字段，同一条记录不会重复计入统计

导入状态保存在 `.import_state.json` 文件中。如需重新分析，使用 `--reset` 参数。

## 风险等级说明

| 等级 | 颜色 | 判定标准 | 复核时限 |
|------|------|----------|----------|
| 高 | 🔴 红 | 投喂偏差≥30% / 水温超阈值±3℃以上 / 溶氧低于3.5mg/L | 24小时内 |
| 中 | 🟠 橙 | 投喂偏差15%-30% / 水温轻微超限 / 盐度异常 / 补录延迟 | 3个工作日 |
| 低 | 🟢 绿 | 投喂偏差10%-15% / pH轻微偏离 | 每周例行检查 |

## 目录结构

```
aqua_feed_analyzer/
├── config.yaml            # 配置文件
├── requirements.txt       # Python 依赖
├── main.py                # 主入口脚本
├── analyzer/              # 核心模块
│   ├── __init__.py
│   ├── cli.py             # 命令行接口
│   ├── importer.py        # 数据导入与去重
│   ├── linker.py          # 数据关联引擎
│   ├── detector.py        # 异常检测
│   ├── charts.py          # 图表生成
│   └── reporter.py        # 报告生成
├── data/                  # 输入数据目录
│   ├── plans/             # 投喂计划 CSV
│   ├── records/           # 投喂记录 JSON
│   └── water/             # 水质补录表 CSV
└── output/                # 输出目录（自动生成）
```
