# 环卫压缩站转运排队系统 API

## 项目简介

基于 Node.js + Express + MongoDB + TypeScript + Mongoose 构建的环卫压缩站转运排队 RESTful API 后端系统。实现车辆登记、排队管理、设备状态监控、数据统计和排队预测等功能。

## 技术栈

- **运行时**: Node.js 18+
- **Web 框架**: Express 4.18+
- **数据库**: MongoDB 4.4+
- **ODM**: Mongoose 7.6+
- **语言**: TypeScript 5.2+
- **校验**: express-validator 7.0+
- **安全**: helmet 7.0+, cors 2.8+
- **日志**: morgan 1.10+

## 项目结构

```
src/
├── models/                 # 数据模型
│   ├── Vehicle.ts         # 车辆模型
│   ├── QueueRecord.ts     # 排队记录模型
│   ├── Device.ts          # 设备模型
│   └── Notification.ts    # 通知模型
├── routes/                 # 路由模块
│   ├── vehicles.ts        # 车辆管理路由
│   ├── queue.ts           # 排队流程路由
│   ├── devices.ts         # 设备管理路由
│   ├── stats.ts           # 统计分析路由
│   ├── prediction.ts      # 排队预测路由
│   └── notifications.ts   # 通知管理路由
├── middleware/             # 中间件
│   ├── validation.ts      # 参数校验与业务规则校验
│   └── errorHandler.ts    # 错误处理
├── utils/                  # 工具函数
│   └── prediction.ts      # 排队预测算法
├── app.ts                 # Express 应用配置
└── server.ts              # 服务器入口
```

## 数据模型

### Vehicle (车辆)
- `plateNumber`: 车牌号（唯一）
- `route`: 所属线路
- `driverName`: 司机姓名
- `createdAt`: 创建时间

### QueueRecord (排队记录)
- `vehicleId`: 车辆ID
- `status`: 状态 (WAITING/WEIGHING/COMPRESSING/COMPLETED/ABNORMAL/SKIPPED)
- `arrivalTime`: 进场时间
- `weighTime`: 称重时间
- `weight`: 重量
- `compressStartTime`: 压缩开始时间
- `compressEndTime`: 压缩结束时间
- `exitTime`: 出场时间
- `skipReason`: 跳队原因
- `abnormalExitReason`: 异常退场原因
- `queuePosition`: 排队位置
- `waitDuration`: 等待时长（分钟）
- `compressDuration`: 压缩时长（分钟）
- `totalDuration`: 总时长（分钟）

### Device (设备)
- `name`: 设备名称（唯一）
- `status`: 状态 (NORMAL/MAINTENANCE/FAULT)
- `lastMaintenanceTime`: 最后维护时间
- `description`: 设备描述

### Notification (通知)
- `vehicleId`: 车辆ID
- `message`: 通知内容
- `delayMinutes`: 晚点分钟数
- `sentAt`: 发送时间
- `read`: 是否已读
- `readAt`: 阅读时间

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- MongoDB >= 4.4
- npm 或 yarn

### 安装步骤

1. 克隆项目
```bash
cd /Users/bill/Documents/solo/workspaces/yzz100505
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
cp .env.example .env
```

编辑 `.env` 文件：
```
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/sanitation-queue
```

4. 启动 MongoDB
```bash
# 使用本地 MongoDB
mongod

# 或使用 Docker
docker run -d -p 27017:27017 mongo:4.4
```

5. 启动开发服务器
```bash
npm run dev
```

6. 构建生产版本
```bash
npm run build
npm start
```

### 健康检查

访问 `http://localhost:3000/health` 确认服务正常运行。

## API 文档

### 基础路径

所有 API 端点都以 `/api` 为前缀。

### 车辆管理

#### 登记车辆
```http
POST /api/vehicles
Content-Type: application/json

{
  "plateNumber": "京A12345",
  "route": "1号线",
  "driverName": "张三"
}
```

#### 查询车辆列表
```http
GET /api/vehicles
GET /api/vehicles?route=1号线&page=1&limit=20
```

#### 查询单辆车
```http
GET /api/vehicles/:id
```

#### 更新车辆信息
```http
PUT /api/vehicles/:id
Content-Type: application/json

{
  "plateNumber": "京A12345",
  "route": "2号线",
  "driverName": "李四"
}
```

#### 删除车辆
```http
DELETE /api/vehicles/:id
```

### 排队流程

#### 车辆进场
```http
POST /api/queue/arrive
Content-Type: application/json

{
  "vehicleId": "5f8d04a5b8f4b32f1c8d4a5b"
}
```

**校验规则**:
- 车辆不存在则拒绝
- 车辆已有未完成记录则拒绝
- 设备故障/检修时拒绝

#### 称重
```http
POST /api/queue/:id/weigh
Content-Type: application/json

{
  "weight": 12500
}
```

**校验规则**:
- 只能对 WAITING 状态的车辆称重
- 重量必须在 0-50000kg 之间

#### 开始压缩
```http
POST /api/queue/:id/compress-start
```

**校验规则**:
- 只能对 WAITING 或 WEIGHING 状态的车辆操作
- 必须已有称重记录

#### 结束压缩
```http
POST /api/queue/:id/compress-end
```

**校验规则**:
- 只能对 COMPRESSING 状态的车辆操作

#### 正常出场
```http
POST /api/queue/:id/exit
```

**校验规则**:
- 只能对 COMPRESSING 状态的车辆操作
- 必须已有称重记录
- 必须已完成压缩

#### 跳队处理
```http
POST /api/queue/:id/skip
Content-Type: application/json

{
  "skipReason": "车辆故障需要紧急维修"
}
```

**校验规则**:
- 只能对 WAITING 或 WEIGHING 状态的车辆操作
- 必须提供跳队原因（至少5个字符）

#### 异常退场
```http
POST /api/queue/:id/abnormal-exit
Content-Type: application/json

{
  "abnormalExitReason": "司机突发疾病需要送医"
}
```

**校验规则**:
- 只能对处理中的车辆操作
- 必须提供异常退场原因（至少5个字符）

#### 查询实时队列
```http
GET /api/queue
GET /api/queue?route=1号线
GET /api/queue?status=WAITING,COMPRESSING
GET /api/queue?includeHistory=true
```

### 设备管理

#### 创建设备
```http
POST /api/devices
Content-Type: application/json

{
  "name": "主压缩设备",
  "status": "NORMAL",
  "description": "压缩站主要压缩处理设备"
}
```

#### 查询设备列表
```http
GET /api/devices
GET /api/devices?status=NORMAL
```

#### 查询单个设备
```http
GET /api/devices/:id
```

#### 更新设备状态
```http
PUT /api/devices/:id/status
Content-Type: application/json

{
  "status": "MAINTENANCE"
}
```

**状态说明**:
- `NORMAL`: 正常运行
- `MAINTENANCE`: 检修中（暂停进站）
- `FAULT`: 故障（暂停进站）

#### 更新设备信息
```http
PUT /api/devices/:id
Content-Type: application/json

{
  "name": "主压缩设备A",
  "description": "更新后的描述"
}
```

#### 删除设备
```http
DELETE /api/devices/:id
```

### 统计分析

#### 等待时长统计
```http
GET /api/stats/wait-time
GET /api/stats/wait-time?startDate=2024-01-01&endDate=2024-01-31
GET /api/stats/wait-time?route=1号线
```

**响应数据**:
- 按线路分组的平均等待时长、压缩时长
- 时间段分布统计
- 最大/最小等待时间

#### 线路拥堵统计
```http
GET /api/stats/route-congestion
GET /api/stats/route-congestion?startDate=2024-01-01&endDate=2024-01-31
GET /api/stats/route-congestion?route=1号线
```

**响应数据**:
- 各线路车流量统计
- 高峰时段分析
- 拥堵等级评定 (LOW/MEDIUM/HIGH)

#### 异常退场统计
```http
GET /api/stats/abnormal-exits
GET /api/stats/abnormal-exits?startDate=2024-01-01&endDate=2024-01-31
GET /api/stats/abnormal-exits?route=1号线
```

**响应数据**:
- 异常退场原因分布
- 跳队原因分布
- 异常率统计

### 排队预测

#### 线路排队压力预测
```http
GET /api/prediction/route-pressure
GET /api/prediction/route-pressure?route=1号线
GET /api/prediction/route-pressure?lookbackHours=48&compressCapacity=2
```

**压力等级**:
- `LOW`: 低压力（等待<15分钟）
- `MEDIUM`: 中等压力（等待15-30分钟）
- `HIGH`: 高压力（等待30-60分钟）
- `CRITICAL`: 严重压力（等待>60分钟）

**响应数据**:
- 各线路当前排队长度
- 预计等待时间
- 历史平均处理时间
- 建议措施

#### 排队时间估算
```http
GET /api/prediction/queue-estimate
GET /api/prediction/queue-estimate?route=1号线
```

#### 推荐晚点时间
```http
GET /api/prediction/recommended-delay
GET /api/prediction/recommended-delay?route=1号线
```

### 通知管理

#### 发送晚点通知
```http
POST /api/notifications/delay
Content-Type: application/json

{
  "vehicleId": "5f8d04a5b8f4b32f1c8d4a5b",
  "delayMinutes": 30,
  "message": "因道路拥堵，预计晚点30分钟"
}
```

#### 批量发送晚点通知
```http
POST /api/notifications/batch-delay
Content-Type: application/json

{
  "route": "1号线",
  "delayMinutes": 30,
  "message": "因道路拥堵，1号线车辆预计晚点30分钟"
}
```

#### 查询通知列表
```http
GET /api/notifications
GET /api/notifications?vehicleId=5f8d04a5b8f4b32f1c8d4a5b
GET /api/notifications?read=false
GET /api/notifications?page=1&limit=20
```

#### 标记通知已读
```http
PUT /api/notifications/:id/read
```

#### 全部标记已读
```http
PUT /api/notifications/read-all
```

#### 删除通知
```http
DELETE /api/notifications/:id
```

## 业务规则

### 排队规则
1. **进场校验**: 同一车辆未出场不能再次进场
2. **出场校验**: 缺少称重记录不能出场
3. **跳队规则**: 必须记录跳队原因
4. **异常退场**: 必须记录异常退场原因
5. **设备状态**: 设备故障/检修时暂停进站

### 角色功能

#### 调度员
- 查看实时队列
- 按线路筛选排队车辆
- 发送晚点通知
- 执行跳队操作
- 执行异常退场操作

#### 站长
- 导出等待时长统计报告
- 查看线路拥堵统计
- 查看异常退场统计
- 更新设备状态（检修/故障/正常）
- 查看排队压力预测

## 测试示例

使用 curl 进行测试：

```bash
# 1. 登记车辆
curl -X POST http://localhost:3000/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{"plateNumber":"京A12345","route":"1号线","driverName":"张三"}'

# 2. 车辆进场（请替换 vehicleId）
curl -X POST http://localhost:3000/api/queue/arrive \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"替换为上一步返回的_id"}'

# 3. 查询实时队列
curl http://localhost:3000/api/queue

# 4. 称重（请替换 queueId）
curl -X POST http://localhost:3000/api/queue/替换为queueId/weigh \
  -H "Content-Type: application/json" \
  -d '{"weight":12500}'

# 5. 开始压缩
curl -X POST http://localhost:3000/api/queue/替换为queueId/compress-start

# 6. 结束压缩
curl -X POST http://localhost:3000/api/queue/替换为queueId/compress-end

# 7. 出场
curl -X POST http://localhost:3000/api/queue/替换为queueId/exit

# 8. 查看等待时长统计
curl http://localhost:3000/api/stats/wait-time

# 9. 查看排队压力预测
curl http://localhost:3000/api/prediction/route-pressure

# 10. 设置设备为检修状态（请替换 deviceId）
curl -X PUT http://localhost:3000/api/devices/替换为deviceId/status \
  -H "Content-Type: application/json" \
  -d '{"status":"MAINTENANCE"}'
```

## 错误响应格式

```json
{
  "status": "fail",
  "message": "错误描述信息"
}
```

## 开发说明

### 代码规范
- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 使用 camelCase 命名变量和函数
- 使用 PascalCase 命名类和接口

### 数据库索引
已为以下字段创建索引以优化查询性能：
- Vehicle: plateNumber (唯一), route
- QueueRecord: vehicleId+status, status+arrivalTime, status+queuePosition, arrivalTime, exitTime
- Device: name (唯一), status
- Notification: vehicleId+sentAt, read+sentAt, sentAt

## License

MIT
