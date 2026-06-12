## 1. 架构设计

```mermaid
flowchart TB
    subgraph Frontend["前端 (React + TypeScript + Vite)"]
        A["反馈录入页"] --> S["Zustand Store"]
        B["部位分组页"] --> S
        C["修改单导出页"] --> S
        D["高频问题页"] --> S
        S --> LS["localStorage 持久化"]
    end
    subgraph Utils["工具层"]
        V["数据校验引擎"]
        E["导出引擎 (HTML Print)"]
        F["冲突检测引擎"]
    end
    S --> V
    S --> E
    S --> F
```

纯前端架构，无后端服务。数据持久化使用 localStorage，确保刷新后数据不丢失。

## 2. 技术说明

- **前端**：React@18 + TypeScript + Tailwind CSS@3 + Vite
- **初始化工具**：vite-init (react-ts 模板)
- **状态管理**：Zustand（含 persist 中间件实现 localStorage 持久化）
- **路由**：react-router-dom@6
- **后端**：无（纯前端，数据存储在 localStorage）
- **导出**：使用浏览器原生 window.print() + 自定义打印样式表
- **图标**：lucide-react

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 反馈录入页，默认首页 |
| /grouped | 部位分组查看页，按领口/肩宽/腰围/袖长分组 |
| /export | 修改单导出页，版师导出修改清单 |
| /analytics | 高频问题统计页，设计总监查看高频问题 |

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    StyleNumber ||--o{ Feedback : "has"
    StyleNumber ||--o{ SizeChart : "has"
    Feedback ||--|{ Photo : "contains"
    Feedback ||--|{ DiscomfortItem : "contains"

    StyleNumber {
        string id PK
        string code "款号"
        string name "款名"
        string[] versions "版本列表"
    }

    SizeChart {
        string id PK
        string styleId FK
        string version "版本号"
        string size "尺码"
        number neckline "领口"
        number shoulder "肩宽"
        number chest "胸围"
        number waist "腰围"
        number hip "臀围"
        number sleeveLength "袖长"
        number pantsLength "裤长"
    }

    Feedback {
        string id PK
        string styleId FK
        string version "版本号"
        string wearerName "试穿人"
        number height "身高cm"
        number weight "体重kg"
        string size "尺码"
        string[] movements "活动动作"
        string overallComment "总体评价"
        number createdAt "创建时间戳"
    }

    Photo {
        string id PK
        string feedbackId FK
        string url "照片链接"
        string side "正面/反面/侧面"
    }

    DiscomfortItem {
        string id PK
        string feedbackId FK
        string bodyPart "身体部位"
        string description "不适描述"
        string originalWords "原话"
        number severity "严重程度1-5"
    }
```

### 4.2 数据定义（TypeScript 类型）

```typescript
type BodyPart = 'neckline' | 'shoulder' | 'chest' | 'waist' | 'hip' | 'sleeveLength' | 'pantsLength' | 'armhole' | 'backWidth'

type PhotoSide = 'front' | 'back' | 'side'

type Movement = 'raiseArms' | 'bendOver' | 'sit' | 'walk' | 'crossLegs' | 'squat' | 'reachForward' | 'turnAround'

interface StyleNumber {
  id: string
  code: string
  name: string
  versions: string[]
}

interface SizeChart {
  id: string
  styleId: string
  version: string
  size: string
  neckline: number | null
  shoulder: number | null
  chest: number | null
  waist: number | null
  hip: number | null
  sleeveLength: number | null
  pantsLength: number | null
}

interface Feedback {
  id: string
  styleId: string
  version: string
  wearerName: string
  height: number
  weight: number
  size: string
  movements: Movement[]
  overallComment: string
  createdAt: number
}

interface Photo {
  id: string
  feedbackId: string
  url: string
  side: PhotoSide
}

interface DiscomfortItem {
  id: string
  feedbackId: string
  bodyPart: BodyPart
  description: string
  originalWords: string
  severity: number
}

interface Alert {
  id: string
  type: 'missingSize' | 'multipleVersions' | 'photoNoSide' | 'conflict'
  message: string
  relatedIds: string[]
}
```

## 5. 智能提示逻辑

| 提示类型 | 触发条件 | 提示级别 |
|----------|----------|----------|
| 尺码表缺项 | 该款号+版本+尺码的尺寸数据有空值 | ⚠️ 警告（黄色） |
| 同款多版本 | 同一款号存在多个版本未选择 | ℹ️ 提示（蓝色） |
| 照片未标正反面 | 照片链接存在但 side 字段为空 | ⚠️ 警告（黄色） |
| 意见冲突 | 同款号同部位出现相反描述（如"腰紧"vs"腰松"） | 🔴 严重（红色） |

## 6. 导出修改单格式

修改单按严重程度降序排列，每项包含：
- 部位名称
- 严重程度（1-5，用色条表示）
- 试穿人原话引用
- 不适描述摘要
- 关联照片缩略图

## 7. 高频问题统计逻辑

- 统计各部位反馈频次，按降序排列
- 同款号同部位出现 ≥3 次标记为"高频"
- 支持按版本对比同一部位的问题变化
- 设计总监可标记"下轮优先改"，标记后该部位显示旗帜图标
