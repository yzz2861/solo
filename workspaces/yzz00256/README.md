# 🌾 农田灌溉轮灌 CLI

农田灌溉轮灌调度命令行工具，支持**校验**、**生成**、**导出**和**查看摘要**等命令。

## ✨ 功能特性

- ✅ **数据校验**：校验地块清单和规则配置的完整性与合法性
- 🔄 **轮灌生成**：基于贪心算法，按优先级、片区、作物类型自动分配轮灌组
- 📊 **结果导出**：明细 CSV、人工复核列表、可发送报告（Markdown / JSON）
- ⏱ **幂等保证**：同一输入重复执行，结果内容完全一致，无新增差异
- 🗂 **批次管理**：保留处理批次号和来源标识，支持数据回放与业务复盘
- 📋 **人工复核**：无法自动分配的地块进入复核清单，带建议字段
- 📺 **控制台摘要**：使用 rich 美化的终端输出，一目了然

## 📁 项目结构

```
.
├── pyproject.toml
├── src/irrigation_scheduler/
│   ├── __init__.py
│   ├── cli.py               # CLI 入口 (validate / generate / export / summary / history)
│   ├── models.py            # 数据模型 (Plot, Rule, Group, Result, Batch, Snapshot)
│   ├── config_loader.py     # CSV/YAML 加载与数据校验
│   ├── scheduler.py         # 轮灌调度核心算法
│   ├── idempotent.py        # 幂等机制与历史快照
│   ├── exporter.py          # 结果导出（明细/复核/报告）
│   └── console_summary.py   # 控制台摘要展示
├── examples/
│   ├── single_success/      # 场景一：单条成功
│   ├── batch_partial_failure/  # 场景二：批量部分失败
│   ├── manual_review/       # 场景三：人工复核
│   ├── historical_snapshot/ # 历史快照示例
│   └── run_demo.sh          # 端到端演示脚本
└── test_core.py             # 核心功能测试脚本
```

## 🚀 快速开始

### 安装

```bash
pip install -e .
```

### 查看帮助

```bash
irrigation --help
```

## 📖 命令说明

### 1. `validate` - 数据校验

校验输入的地块清单和规则配置是否合法。

```bash
irrigation validate \
  --csv path/to/plots.csv \
  --rules path/to/rules.yaml
```

**校验项**：
- CSV 必要列是否完整
- 地块 ID 是否重复
- 面积、需水量、优先级等数值合法性
- 规则组名是否重复
- 规则各项限制是否为正值
- 筛选列表是否为空

### 2. `generate` - 生成轮灌计划

根据地块清单和规则配置生成轮灌计划，并自动导出所有结果文件。

```bash
irrigation generate \
  --csv path/to/plots.csv \
  --rules path/to/rules.yaml \
  --output path/to/output \
  --batch-name "2026年夏季轮灌"
```

**常用选项**：
- `--snapshot`：指定历史快照文件，用于幂等比对
- `--force`：忽略幂等检查，强制重新生成
- `--batch-name`：自定义批次名称

### 3. `export` - 导出结果

等同于 `generate`，语义上更强调导出动作。

```bash
irrigation export \
  --csv path/to/plots.csv \
  --rules path/to/rules.yaml \
  --output path/to/output
```

### 4. `summary` - 查看摘要

查看指定批次的摘要，或列出所有历史批次。

```bash
# 列出所有历史批次
irrigation summary --output path/to/output

# 查看指定批次详情
irrigation summary --batch B20260601000001 --output path/to/output
```

### 5. `history` - 历史记录

查看历史批次记录（与 `summary` 功能类似，语义不同）。

```bash
irrigation history --output path/to/output
irrigation history --batch B20260601000001 --output path/to/output
```

## 📝 输入格式

### 地块清单 CSV

| 列名 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| plot_id | string | ✅ | 地块唯一标识 |
| plot_name | string | ✅ | 地块名称 |
| area | float | ✅ | 面积（亩），必须 > 0 |
| crop_type | string | ✅ | 作物类型 |
| district | string | ✅ | 片区/管理区 |
| water_requirement | float | ✅ | 每亩需水量（m³），必须 > 0 |
| priority | int | ❌ | 优先级 1-5，默认 3，1 最高 |

### 规则配置 YAML

```yaml
rules:
  - group_name: "小麦东区轮灌组"
    max_plots: 10          # 每组最多地块数
    max_area: 500.0        # 每组最大面积（亩）
    max_water: 20000.0     # 每组最大用水量（m³）
    max_groups: 100        # 最多创建多少组（资源限制）
    duration_hours: 6.0    # 单次灌溉时长（小时）
    start_date: "2026-06-10"  # 开始日期
    interval_days: 7       # 轮灌间隔（天）
    crop_filter: ["小麦"]  # 适用作物（可选，None=全部）
    district_filter: ["东区"]  # 适用片区（可选，None=全部）
```

## 📤 输出内容

### 1. 明细文件 (`detail.csv`)

包含每个地块的分配结果，以及**批次号、批次名称**等溯源信息。

### 2. 复核列表 (`review_list.csv`)

仅包含待人工复核的地块，附带建议、复核人、复核时间等可填写字段。

### 3. 可发送报告

- **Markdown 版** (`report.md`)：适合邮件、文档分享
- **JSON 版** (`report.json`)：适合系统对接

报告包含：执行摘要、轮灌组统计、失败明细、复核明细、警告信息、数据溯源说明。

### 4. 历史快照 (`snapshots/`)

每个批次的完整结果快照，用于：
- 幂等校验（相同输入不重复计算）
- 数据回放（根据批次号恢复历史结果）
- 差异比对（对比不同批次的分配差异）

## 🎯 计算口径说明

1. **排序规则**：按优先级（从高到低）→ 片区 → 作物类型 → 地块ID 排序
2. **匹配规则**：依次尝试所有适用规则，优先匹配限制更严格的规则
3. **入组条件**：加入后不超过组的最大地块数、最大面积、最大用水量
4. **新建组**：当前组满时，新建组（受 max_groups 限制）
5. **失败判定**：所有适用规则都已达最大组数，无法新建
6. **复核判定**：无任何匹配的轮灌规则（可能是新作物、新片区，需人工确认）

## 🔄 幂等机制

### 原理

基于**输入内容哈希**实现幂等：

1. 对地块列表和规则列表做排序后序列化
2. 计算 SHA-256 哈希（取前 16 位）
3. 生成时先检查输出目录下是否有相同哈希的快照
4. 命中则直接复用历史结果，生成新的批次号但内容一致

### 验证

同一输入重复执行：
- 新批次会有新的 `batch_id`（因为是新的提交）
- 但 `input_hash` 相同
- 结果内容（成功/失败/复核的地块及分配的组）完全一致
- 标记 `is_idempotent = true`，并记录 `source_batch_id`

## 🔍 数据溯源

每条处理结果都保留完整的溯源链路：

- **batch_id / batch_name**：处理批次标识
- **source_file / source_line**：原始数据来源（文件名 + 行号）
- **input_hash**：输入内容指纹，用于校验数据一致性
- **历史快照**：随时可通过批次号回放完整结果

## 🧪 测试场景

项目包含 4 个典型场景的示例数据：

| 场景 | 说明 | 预期结果 |
|-----|------|---------|
| 单条成功 | 1 个地块，1 条宽松规则 | 全部成功分配 |
| 批量部分失败 | 20 个地块，5 条严格规则 | 部分成功 + 部分失败 + 部分复核 |
| 人工复核 | 8 个地块，2 条规则（未覆盖全部作物/片区） | 部分成功 + 部分待复核 |
| 重复提交 | 相同输入执行两次 | 第二次命中幂等缓存，结果一致 |

运行演示脚本：

```bash
bash examples/run_demo.sh
```

## 📜 任务状态

| 状态 | 说明 |
|-----|------|
| pending | 待处理 |
| success | 已成功分配轮灌组 |
| failed | 分配失败（所有适用规则均超限） |
| review | 待人工复核（无匹配规则，需业务确认） |

## 🤝 业务复盘建议

1. **找原始数据**：根据明细中的 `source_file` 和 `source_line` 回到 CSV 定位
2. **核对计算口径**：查看报告中的「数据口径说明」章节
3. **差异分析**：对比两个批次的 `input_hash`，判断是输入变了还是规则变了
4. **数据回放**：使用 `irrigation summary --batch <批次号>` 查看历史结果
5. **人工复核流程**：业务人员填写 `review_list.csv` 中的建议和复核人字段
