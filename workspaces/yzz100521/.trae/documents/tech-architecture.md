## 1. 架构设计

```mermaid
graph TB
    subgraph "前端应用层"
        A["React 应用入口"] --> B["路由管理 (React Router)"]
        B --> C["计算器页面"]
        B --> D["配方管理页面"]
        B --> E["试吃反馈页面"]
        C --> F["研发版视图"]
        C --> G["后厨版视图"]
    end
    
    subgraph "状态管理层"
        H["Zustand Store"]
        H1["配方状态"]
        H2["计算结果状态"]
        H3["UI状态"]
        H --> H1 & H2 & H3
    end
    
    subgraph "核心算法层"
        I["冰淇淋计算引擎"]
        I1["单位换算模块"]
        I2["果泥含糖估算模块"]
        I3["凝固点计算模块"]
        I4["固形物计算模块"]
        I5["风险评估模块"]
        I --> I1 & I2 & I3 & I4 & I5
    end
    
    subgraph "数据持久层"
        J["localStorage"]
        J1["配方数据库"]
        J2["试吃反馈数据库"]
        J --> J1 & J2
    end
    
    subgraph "组件库"
        K["基础组件"]
        K1["数字输入框(带单位)"]
        K2["环形进度图"]
        K3["星级评分"]
        K4["时间线步骤"]
        K5["配方卡片"]
        K --> K1 & K2 & K3 & K4 & K5
    end
    
    F & G --> H
    H --> I
    H --> J
    F & G --> K
```

## 2. 技术描述

- **前端框架**：React@18 + TypeScript@5
- **构建工具**：Vite@5
- **样式方案**：TailwindCSS@3 + CSS Variables
- **路由管理**：React Router@6
- **状态管理**：Zustand@4（轻量级状态管理，适合中小型应用）
- **图表可视化**：Recharts@2（用于固形物比例、口感评分等数据展示）
- **图标库**：Lucide React（现代、轻量的图标库）
- **数据持久化**：localStorage（无需后端，数据保存在浏览器本地）
- **开发规范**：ESLint + Prettier

## 3. 目录结构

```
src/
├── assets/              # 静态资源（字体、图片等）
├── components/          # 可复用组件
│   ├── ui/             # 基础UI组件（Button、Input、Card等）
│   ├── calculator/     # 计算器相关组件
│   ├── recipe/         # 配方管理相关组件
│   └── feedback/       # 试吃反馈相关组件
├── pages/              # 页面组件
│   ├── Calculator.tsx
│   ├── RecipeList.tsx
│   ├── RecipeDetail.tsx
│   └── Feedback.tsx
├── store/              # Zustand状态管理
│   ├── useRecipeStore.ts
│   └── useUIStore.ts
├── engine/             # 核心计算引擎
│   ├── types.ts        # 类型定义
│   ├── constants.ts    # 常量（食材密度、含糖量等）
│   ├── unitConverter.ts
│   ├── sugarEstimator.ts
│   ├── freezingPoint.ts
│   ├── solidsCalculator.ts
│   ├── riskAssessor.ts
│   └── index.ts        # 统一入口
├── utils/              # 工具函数
│   ├── storage.ts      # localStorage封装
│   └── formatters.ts   # 格式化函数
├── hooks/              # 自定义Hooks
│   ├── useCalculator.ts
│   └── useRecipe.ts
├── App.tsx
├── main.tsx
└── index.css
```

## 4. 路由定义

| 路由路径 | 页面名称 | 说明 |
|----------|----------|------|
| `/` | 计算器首页 | 默认页面，包含研发版/后厨版模式切换 |
| `/recipes` | 配方列表 | 展示所有保存的配方，支持搜索筛选 |
| `/recipes/:id` | 配方详情 | 展示配方详情、版本历史、试吃反馈 |
| `/recipes/:id/feedback` | 试吃反馈录入 | 为指定配方版本录入试吃反馈 |

## 5. 核心数据模型

### 5.1 数据模型ER图

```mermaid
erDiagram
    RECIPE ||--o{ RECIPE_VERSION : has
    RECIPE_VERSION ||--o{ FEEDBACK : has
    
    RECIPE {
        string id PK
        string name
        string description
        datetime createdAt
        datetime updatedAt
    }
    
    RECIPE_VERSION {
        string id PK
        string recipeId FK
        int versionNumber
        object ingredients
        object calculationResult
        string notes
        datetime createdAt
    }
    
    FEEDBACK {
        string id PK
        string recipeVersionId FK
        int iceCrystalScore
        int creaminessScore
        int sweetnessScore
        int flavorScore
        string notes
        datetime createdAt
    }
```

### 5.2 TypeScript 类型定义

```typescript
// 食材类型
interface Ingredient {
  milk: { amount: number; unit: 'g' | 'ml' | '%' };
  cream: { amount: number; unit: 'g' | 'ml' | '%' };
  sugar: { amount: number; unit: 'g' | 'ml' | '%' };
  fruitPuree: { 
    amount: number; 
    unit: 'g' | 'ml' | '%';
    sugarContent?: 'low' | 'medium' | 'high'; // 果泥甜度估测
  };
  alcohol: { amount: number; unit: 'g' | 'ml' | '%'; abv: number }; // abv: 酒精度数
  stabilizer: { amount: number; unit: 'g' | 'ml' | '%' };
  targetYield: { amount: number; unit: 'g' | 'ml' };
}

// 计算结果
interface CalculationResult {
  freezingPoint: number; // 凝固点（摄氏度）
  solidsRatio: number; // 固形物比例（百分比）
  fatContent: number; // 脂肪含量（百分比）
  sugarContent: number; // 总糖含量（百分比）
  alcoholContent: number; // 酒精含量（百分比）
  risks: Risk[];
  calculationSteps: CalculationStep[]; // 研发版：计算过程
  kitchenInstructions: KitchenInstruction[]; // 后厨版：操作指引
}

interface Risk {
  type: 'alcohol_high' | 'fat_low' | 'sugar_high' | 'stabilizer_high';
  level: 'warning' | 'danger';
  message: string;
}

interface CalculationStep {
  name: string;
  formula: string;
  variables: Record<string, number>;
  result: number;
}

interface KitchenInstruction {
  step: number;
  title: string;
  description: string;
  observationPoint: string;
  timing?: string;
}
```

## 6. 核心算法说明

### 6.1 凝固点计算公式
基于拉乌尔定律（Raoult's Law）和冰淇淋行业经验公式：
```
凝固点(°C) = -1.86 × (总糖摩尔浓度 + 盐摩尔浓度) - 酒精影响系数
```

### 6.2 果泥含糖量估算
根据果泥类型估算含糖量：
- 低糖水果（草莓、覆盆子等）：8-10%
- 中糖水果（桃子、芒果等）：12-15%
- 高糖水果（葡萄、荔枝等）：18-22%

### 6.3 固形物比例计算
```
固形物比例 = (非水分成分总重量 / 总重量) × 100%
```
理想范围：35%-45%

### 6.4 风险评估阈值
- 酒精过高：酒精含量 > 5% 警告，> 8% 危险（难以凝固）
- 脂肪过低：脂肪含量 < 6% 警告，< 4% 危险（口感差，冰渣多）
- 糖过高：总糖含量 > 25% 警告
- 稳定剂过高：稳定剂 > 0.5% 警告

## 7. 数据持久化方案

使用 localStorage 存储，键名设计：
- `icecream_recipes`：配方基本信息列表
- `icecream_recipe_versions`：配方版本列表（按recipeId分组）
- `icecream_feedbacks`：试吃反馈列表（按recipeVersionId分组）

封装工具函数：
- `getRecipes()` / `saveRecipe(recipe)`
- `getVersions(recipeId)` / `saveVersion(version)`
- `getFeedbacks(versionId)` / `saveFeedback(feedback)`
