## 1. 架构设计

```mermaid
graph TD
    subgraph 前端层 [React 前端应用]
        A1[预约登记模块]
        A2[排班看板模块]
        A3[维修管理模块]
        A4[改期取消模块]
        A5[数据导出模块]
        A6[司机视图模块]
    end
    
    subgraph 状态管理层 [Zustand + Persist]
        B1[预约状态 Store]
        B2[农机/司机 Store]
        B3[维修记录 Store]
        B4[农户地块记忆 Store]
    end
    
    subgraph 持久化层 [LocalStorage]
        C1[预约数据 JSON]
        C2[农机/司机数据 JSON]
        C3[维修记录 JSON]
        C4[历史记忆数据 JSON]
    end
    
    subgraph 导出层 [纯前端导出]
        D1[CSV 导出工具]
        D2[表格格式化]
    end
    
    A1 & A2 & A3 & A4 & A5 & A6 --> B1 & B2 & B3 & B4
    B1 & B2 & B3 & B4 --> C1 & C2 & C3 & C4
    A5 --> D1 & D2
```

## 2. 技术选型说明
- **前端框架**：React@18 + TypeScript + Vite（构建快、TS 类型安全）
- **样式方案**：TailwindCSS@3（原子化CSS，快速构建UI）
- **状态管理**：Zustand + persist 中间件（轻量、简单，自动持久化到LocalStorage）
- **UI组件**：HeadlessUI（无样式组件，配合Tailwind自定义）+ Lucide React图标
- **日期处理**：date-fns（轻量日期库，处理排班/改期计算）
- **导出**：自定义CSV导出工具（纯前端，无后端依赖）
- **无后端**：全部数据保存在浏览器 LocalStorage，合作社内网单电脑使用场景，无需部署服务器

## 3. 路由定义
| 路由路径 | 页面用途 |
|---------|---------|
| / | 首页 - 今日排班看板概览 + 快捷操作入口 |
| /reservation | 预约登记页面 - 完整预约表单 |
| /schedule | 排班看板 - 时间轴全览 + 筛选 + 操作 |
| /maintenance | 维修管理 - 维修登记/解除列表 |
| /driver | 司机视图 - 按司机查看当日作业 |
| /export | 导出中心 - 三种导出功能入口 |

## 4. 数据模型

### 4.1 实体关系图

```mermaid
erDiagram
    FARMER ||--o{ RESERVATION : "发起"
    PLOT ||--o{ RESERVATION : "作业于"
    MACHINE ||--o{ RESERVATION : "使用"
    DRIVER ||--o{ RESERVATION : "操作"
    MACHINE ||--o{ MAINTENANCE : "有"
    RESERVATION ||--o{ CHANGE_LOG : "产生"
    
    FARMER {
        string id PK
        string name "农户姓名"
        string phone "联系电话"
        string village "所在村组"
        date createdAt
    }
    
    PLOT {
        string id PK
        string name "地块名称/编号"
        string farmerId FK
        number acres "亩数"
        string location "位置描述"
    }
    
    MACHINE {
        string id PK
        string name "机器名称/编号"
        string type "类型:拖拉机/插秧机/收割机"
        string status "状态:正常/维修中"
        string plateNumber "车牌号"
    }
    
    DRIVER {
        string id PK
        string name "姓名"
        string phone "电话"
        string machineIds "可驾驶机器ID列表"
        boolean active
    }
    
    RESERVATION {
        string id PK
        string farmerId FK
        string plotId FK
        string machineId FK
        string driverId FK
        date workDate "作业日期"
        string startTime "开始时间 HH:mm"
        number durationHours "预计时长(小时)"
        string workType "作业类型"
        number estimatedFuel "预计油费"
        string status "待作业/进行中/已完成/已取消/已改期"
        string cancelReason
        string rescheduleFrom
        string driverChangeReason
        date createdAt
        date updatedAt
    }
    
    MAINTENANCE {
        string id PK
        string machineId FK
        date startDate
        date endDate
        string reason "维修原因"
        string status "维修中/已完成"
        date createdAt
    }
    
    CHANGE_LOG {
        string id PK
        string reservationId FK
        string changeType "改期/取消/改派司机"
        string oldValue
        string newValue
        string reason
        date createdAt
    }
```

### 4.2 初始Mock数据（示例）

```typescript
// 农机示例
const initialMachines = [
  { id: 'm1', name: '东方红-001', type: '拖拉机', status: '正常', plateNumber: '豫A·12345' },
  { id: 'm2', name: '东方红-002', type: '拖拉机', status: '正常', plateNumber: '豫A·12346' },
  { id: 'm3', name: '久保田-001', type: '插秧机', status: '正常', plateNumber: '豫A·12347' },
  { id: 'm4', name: '久保田-002', type: '插秧机', status: '维修中', plateNumber: '豫A·12348' },
  { id: 'm5', name: '雷沃-001', type: '收割机', status: '正常', plateNumber: '豫A·12349' },
];

// 司机示例
const initialDrivers = [
  { id: 'd1', name: '张师傅', phone: '138****1001', machineIds: ['m1', 'm2'], active: true },
  { id: 'd2', name: '李师傅', phone: '138****1002', machineIds: ['m3', 'm4'], active: true },
  { id: 'd3', name: '王师傅', phone: '138****1003', machineIds: ['m1', 'm5'], active: true },
  { id: 'd4', name: '赵师傅', phone: '138****1004', machineIds: ['m2', 'm3'], active: true },
];

// 农户与地块示例
const initialFarmers = [
  { id: 'f1', name: '王大柱', phone: '139****2001', village: '东河村一组' },
  { id: 'f2', name: '刘二强', phone: '139****2002', village: '东河村二组' },
  { id: 'f3', name: '陈三贵', phone: '139****2003', village: '西坡村一组' },
];
```

## 5. 业务规则校验逻辑

### 5.1 同一地块重复预约检测
```typescript
function checkDuplicatePlot(plotId: string, workDate: string): Reservation[] {
  // 查找同一地块同一日期的所有有效预约（排除已取消）
  return reservations.filter(r => 
    r.plotId === plotId && 
    r.workDate === workDate && 
    r.status !== '已取消'
  );
}
```

### 5.2 机器维修中校验
```typescript
function isMachineUnderMaintenance(machineId: string, date: string): boolean {
  return maintenances.some(m => 
    m.machineId === machineId &&
    m.status === '维修中' &&
    date >= m.startDate && 
    date <= m.endDate
  );
}
```

### 5.3 司机时间冲突校验
```typescript
function checkDriverConflict(driverId: string, date: string, startTime: string, duration: number): Reservation | null {
  // 计算新预约的时间区间，检查司机是否有重叠预约
  return reservations.find(r => 
    r.driverId === driverId &&
    r.workDate === date &&
    r.status !== '已取消' &&
    hasTimeOverlap(r.startTime, r.durationHours, startTime, duration)
  );
}
```

## 6. 导出功能定义

### 6.1 明日作业单导出（合作社主任）
CSV列：序号 | 作业日期 | 农户姓名 | 联系电话 | 村组 | 地块名称 | 亩数 | 作业类型 | 农机编号 | 司机姓名 | 开始时间 | 预计时长 | 预计油费

### 6.2 油费工时与取消汇总导出（财务）
Sheet1-油费工时：日期 | 农机编号 | 司机 | 作业次数 | 总工时 | 总油费  
Sheet2-已取消预约：取消日期 | 原作业日期 | 农户 | 地块 | 取消原因 | 操作人

### 6.3 司机作业单导出
按司机分组，按开始时间排序：序号 | 作业日期 | 顺序 | 地块名称 | 位置描述 | 农户姓名 | 联系电话 | 作业类型 | 农机 | 预计时长
