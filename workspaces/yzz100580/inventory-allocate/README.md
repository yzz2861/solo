# 库存调拨单生成器 (Inventory Allocate)

连锁小店每周补货前的智能调拨工具，避免手工凑单导致的"同一箱货分给两家"问题。

## 功能特性

- 📥 **数据导入**：支持缺货表、库存表、运输天数、安全库存配置
- 🧠 **智能匹配**：考虑运输天数、安全库存、优先级的调拨算法
- 🛡️ **边界处理**：SKU别名标准化、库存不足预警、门店自调拨检测、幂等运行
- 📊 **报告生成**：清晰展示可调拨建议和无法满足的缺货原因
- ✏️ **回填功能**：仓管回填实际调拨量，记录未执行原因
- 📈 **复盘分析**：运营查看建议未执行的原因（如运输不划算）

## 安装

```bash
pip install -e .
```

## 快速开始

### 1. 生成调拨单
```bash
allocate generate \
  --shortage examples/shortage.csv \
  --stock examples/stock.csv \
  --transport examples/transport_days.csv \
  --safety examples/safety_stock.csv \
  --sku-alias examples/sku_alias.csv \
  --output output/
```

### 2. 查看调拨单
```bash
allocate show output/allocation_20240101_120000/
```

### 3. 仓管回填实际调拨量
```bash
allocate fill output/allocation_20240101_120000/ \
  --actual examples/actual_allocation.csv
```

### 4. 运营复盘
```bash
allocate review output/allocation_20240101_120000/
```

## 输入文件格式

### 缺货表 (shortage.csv)
| store_id | store_name | sku | sku_name | shortage_qty |
|----------|------------|-----|----------|--------------|
| S001     | 东门店铺   | P001| 可乐330ml| 50           |

### 库存表 (stock.csv)
| store_id | store_name | sku | sku_name | stock_qty |
|----------|------------|-----|----------|-----------|
| S002     | 西门店铺   | P001| 可乐330ml| 120       |

### 运输天数 (transport_days.csv)
| from_store | to_store | transport_days |
|------------|----------|----------------|
| S002       | S001     | 1              |

### 安全库存 (safety_stock.csv)
| sku  | safety_qty |
|------|------------|
| P001 | 20         |

### SKU别名 (sku_alias.csv) - 可选
| sku      | canonical_sku |
|----------|---------------|
| 可乐330  | P001          |
| 可口可乐 | P001          |

## 输出文件

- `allocation_plan.csv` - 调拨建议单（给仓管复核）
- `shortage_report.csv` - 缺货满足情况报告
- `unmet_report.csv` - 无法满足的缺货明细及原因
- `batch_info.json` - 批次信息（用于回填和复盘）
