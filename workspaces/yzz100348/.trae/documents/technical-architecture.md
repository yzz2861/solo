## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "React + TypeScript + Tailwind CSS"
        "Zustand 状态管理"
        "LocalStorage 持久化"
    end
    subgraph "核心计算层"
        "剂量换算引擎"
        "单位转换模块"
        "安全校验模块"
    end
    subgraph "输出层"
        "换算步骤渲染"
        "打印模板"
        "质控记录导出"
    end
    "前端层" --> "核心计算层"
    "核心计算层" --> "输出层"
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Tailwind CSS + Vite
- 初始化工具：vite-init
- 后端：无（纯前端应用）
- 数据持久化：浏览器 LocalStorage
- 状态管理：Zustand
- 图标库：lucide-react
- 等宽字体：JetBrains Mono（数值显示）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 剂量换算页面，参数输入与计算结果 |
| /records | 记录管理页面，历史核对记录列表 |

## 4. 核心计算逻辑

### 4.1 换算公式

**场景一：已知医嘱剂量（mg/kg/min）→ 计算 mL/h**

1. 体重剂量率 = 医嘱剂量 (mg/kg/min)
2. 绝对剂量率 = 体重剂量率 × 体重 (kg) = mg/min
3. 绝对剂量率 × 60 = mg/h
4. 泵速 = mg/h ÷ 浓度 (mg/mL) = mL/h

**场景二：已知医嘱总量 (mg) 和计划时间 (h) → 计算 mL/h**

1. 绝对剂量率 = 总量 (mg) ÷ 时间 (h) = mg/h
2. 泵速 = mg/h ÷ 浓度 (mg/mL) = mL/h
3. 体重剂量率 (mg/kg/min) = 绝对剂量率 ÷ 体重 ÷ 60

### 4.2 单位转换常量

- 1 mg = 1000 μg
- 1 g = 1000 mg
- 1 h = 60 min

### 4.3 安全校验规则

| 校验项 | 条件 | 提示级别 |
|--------|------|----------|
| 体重缺失 | 体重为空或为零 | 🔴 错误：无法计算体重剂量 |
| 浓度为零 | 药液浓度为空或为零 | 🔴 错误：无法计算泵速 |
| 泵速超范围 | mL/h > 999 或 mL/h < 0.1 | 🟠 警告：超出科室常用范围 |
| 体重剂量超范围 | 视药物类型 | 🟠 警告：请核实剂量 |

## 5. 数据模型

### 5.1 数据模型定义

```mermaid
erDiagram
    "CalculationRecord" {
        "string id PK"
        "string drugName"
        "number doseValue"
        "string doseUnit"
        "number concentration"
        "string concentrationUnit"
        "number totalVolume"
        "string volumeUnit"
        "number weight"
        "string weightUnit"
        "number plannedTime"
        "string timeUnit"
        "number resultPumpRate"
        "number resultWeightDose"
        "string resultWeightDoseUnit"
        "string[] steps"
        "string[] warnings"
        "string confirmedBy"
        "string confirmedAt"
        "string createdAt"
    }
```

### 5.2 数据存储

使用 LocalStorage 存储计算记录，键名 `infusion-pump-records`，值为 JSON 数组。
