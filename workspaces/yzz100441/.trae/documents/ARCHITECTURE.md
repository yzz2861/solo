# 房间混响估算器 - 技术架构文档

## 1. 技术栈选择

| 层级 | 选型 | 理由 |
|------|------|------|
| 语言 | 原生 HTML5 + CSS3 + ES2022 JavaScript | 无构建依赖、离线可用、部署简单 |
| 图表 | Chart.js 4.x (CDN) | 轻量、支持多数据集叠加、响应式好 |
| 样式 | CSS Grid + Flexbox + CSS 变量 | 现代浏览器原生支持，无需预处理器 |
| 存储 | localStorage API | 零依赖方案持久化 |
| 字体 | Google Fonts (Orbitron + Noto Sans SC) | 科技感标题 + 清晰中文正文 |

---

## 2. 目录结构

```
/
├── index.html              # 入口页面
├── css/
│   └── styles.css          # 主样式文件
├── js/
│   ├── materials.js        # 材料吸声系数数据库
│   ├── acoustics.js        # 声学计算核心 (Sabine/Eyring/空气吸声)
│   ├── validator.js        # 输入校验与异常提示
│   ├── storage.js          # localStorage 方案管理
│   ├── report.js           # 双版本报告生成
│   ├── ui.js               # UI 渲染、事件绑定、图表控制
│   └── main.js             # 初始化入口
└── assets/                 # (可选) 图标/占位图，如无则用 CSS + emoji
```

---

## 3. 核心模块设计

### 3.1 材料数据库 (materials.js)
```js
// 结构：材料名 → 6 频段系数 + 预设单价
{
  "gypsum_board": {
    name: "石膏板 (12mm)",
    alpha: { 125: 0.05, 250: 0.10, 500: 0.15, 1000: 0.20, 2000: 0.15, 4000: 0.10 },
    price: 45,  // 元/㎡
    source: "GB/T 20247-2006"
  },
  // ... 15+ 种常见材料
}
```
**频段**：严格使用倍频程中心频率 `[125, 250, 500, 1000, 2000, 4000]` Hz。

### 3.2 声学计算模块 (acoustics.js)

#### 导出函数
| 函数 | 输入 | 输出 |
|------|------|------|
| `calcRoomMetrics(L, W, H)` | 长宽高（米） | `{ volume, totalArea, wallAreas: {north, south, east, west, floor, ceiling} }` |
| `calcSabineRT(A, V)` | 总吸声量 A (m²)，体积 V (m³) | 单频段 RT₆₀ (s) |
| `calcEyringRT(A, V, S)` | 总吸声量、体积、总面积 | 小房间修正 RT₆₀ |
| `calcAirAbsorption(V, freq, temp=20, hum=50)` | 体积、频率、温湿度 | 空气吸声 4mV 项 |
| `estimateFurnitureAbsorption(items)` | 家具列表 | 各频段吸声量增量 |
| `runFullCalculation(scheme)` | 完整方案对象 | 各频段 RT₆₀ + 诊断信息 + 材料面积预算 |

#### 公式实现要点
**Sabine**:  
`RT60 = 0.161 × V / A`，其中 `A = Σ(Sᵢ × αᵢ)`

**Eyring-Norris** (V < 50m³):  
`RT60 = 0.161 × V / [ -S × ln(1 - ᾱ) + 4mV ]`  
其中 `ᾱ = A / S`（平均吸声系数）

**空气吸声修正** (ISO 9613-1):  
4mV 项，20°C 50% 相对湿度下，近似值：
- 125/250/500Hz: m ≈ 0
- 1kHz: m ≈ 0.002
- 2kHz: m ≈ 0.007
- 4kHz: m ≈ 0.022

### 3.3 方案数据结构 (storage.js)
```js
Scheme = {
  id: "uuid_v4",
  name: "方案 A - 经济版",
  createdAt: 1710000000000,
  units: "metric",         // "metric" | "imperial"
  room: { L: 5, W: 4, H: 2.8 },   // 已统一转换为米
  surfaces: {
    north:   { materialId, customAlpha?: {...}, coverage: 1.0 }, // coverage = 贴满比例
    south:   { ... },
    east:    { ... },
    west:    { ... },
    floor:   { ... },
    ceiling: { ... }
  },
  curtains: [ { widthM: 2, heightM: 2.5, type: "heavy" } ],
  furniture: [ { type: "sofa_large", count: 1 } ],
  purpose: "voice_studio",
  customTargetRT: null     // 当 purpose = "custom" 时生效
}
```

### 3.4 校验模块 (validator.js)
返回数组：`[ {level: "warning"|"error", code, message, field?, suggestion?}, ... ]`

| 校验项 | 触发条件 |
|--------|----------|
| UNIT_MIX_MISMATCH | 公制下长>30m 或英制下长<3ft（提示可能填错） |
| VOLUME_TOO_SMALL | V < 10 m³，模型可信度低 |
| MISSING_ALPHA | 某材料某频段 α = 0 或 undefined |
| FURNITURE_EXCESS | 附加吸声体等效面积 > 最大墙面面积 × 0.8 |
| RT_ABNORMAL | 任频段 RT60 > 3s 或 < 0.1s |
| NEGATIVE_DIMENSION | 任一尺寸 ≤ 0 |
| COVERAGE_OVERFLOW | 某面 coverage × S > 该面面积（材料贴太多） |

### 3.5 报告与 UI 模块
- **老板版**：DOM 生成 + 打印样式 `@media print`
- **声学师版**：含公式 (使用 `<code>` 块展示，避免 MathJax 依赖)
- **图表**：Chart.js 的 `line` + `bar` + `doughnut` 三个 canvas 实例
- **主题切换**：CSS 变量驱动，支持深色/浅色切换（默认深色专业风）

---

## 4. 数据流

```
用户输入 (input/change 事件)
      ↓
  ui.js 收集 + 单位转换
      ↓
  validator.js 校验 → 提示气泡
      ↓
  storage.js 保存到 localStorage
      ↓
  acoustics.js 计算 → 结果对象
      ↓
  ui.js 渲染 (频段表 + 图表 + 建议)
      ↓
report.js 导出 (老板版 / 声学师版 / JSON)
```

---

## 5. 性能与容错策略

- **防抖**：input 事件 200ms 防抖后才重算，避免打字卡顿
- **容错默认值**：缺失的 α 用 0.05 填充，并触发 MISSING_ALPHA 警告
- **数值上下限**：RT₆₀ 显示时夹取到 [0.05, 5.0]s，极端值标红
- **方案导入**：JSON.parse 包裹 try/catch，损坏文件不崩溃

---

## 6. 部署方式

纯静态文件，可直接：
1. 本地双击 `index.html` 打开
2. 放入任意静态服务器 (Nginx / GitHub Pages / OSS 静态托管)
3. 无需构建流程，修改 JS 即生效
