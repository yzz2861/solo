# 高校宿舍维修领料管理系统 API 文档

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库（创建表结构）
npm run init-db

# 3. 导入示例数据（测试账号、楼栋、材料等）
npm run seed

# 4. 启动服务
npm start
```

服务启动后访问: http://localhost:3000

---

## 认证

所有需要登录的接口需在请求头携带 `Authorization: Bearer <token>`

### POST /api/auth/login - 登录

请求体:
```json
{ "username": "student001", "password": "123456" }
```

### GET /api/auth/me - 获取当前用户信息

---

## 角色说明

| 角色 | role 值 | 说明 |
|------|---------|------|
| 学生 | student | 报修、查进度、确认完工、评价 |
| 维修师傅 | worker | 接单、领料、完工、查历史故障 |
| 库管 | storekeeper | 材料管理、出入库、派单、看流水 |
| 后勤主任 | admin | 全部权限、数据导出、看报表 |

---

## 基础数据接口

### GET /api/base/buildings - 楼栋列表

### GET /api/base/buildings/:id/rooms - 楼栋房间列表

### GET /api/base/repair-types - 维修类型列表

### GET /api/base/users/by-role?role=worker - 按角色查用户

---

## 工单模块

### POST /api/work-orders - 学生创建工单

请求体:
```json
{
  "building_id": 1,
  "room_id": 1,
  "repair_type_id": 1,
  "title": "灯管不亮",
  "description": "宿舍两根灯管都不亮",
  "priority": "normal",
  "force_create": false
}
```

**重复报修检测**: 如果同一房间近7天有同类未完成工单，返回重复提示，前端传 `force_create: true` 可强制创建。

### GET /api/work-orders - 工单列表

参数: `page`, `pageSize`, `status`, `building_id`, `worker_id`, `repair_type_id`, `keyword`

- 学生只看到自己的工单
- 维修师傅看到待接单和分配给自己的
- 库管/主任看到全部

### GET /api/work-orders/:id - 工单详情

包含领料记录、操作日志、满意度

### PUT /api/work-orders/:id/assign - 派单（库管/主任）

```json
{ "worker_id": 3 }
```

### PUT /api/work-orders/:id/start - 开始维修（维修师傅）

### PUT /api/work-orders/:id/complete - 完成维修（维修师傅）

**重要**: 返回未回填材料提醒，工单完成后不能再领料。

### PUT /api/work-orders/:id/confirm - 学生确认完工（学生）

### PUT /api/work-orders/:id/cancel - 取消工单

### GET /api/work-orders/:id/similar-history - 同类历史故障与推荐材料（维修师傅领料前查看）

---

## 材料模块

### GET /api/materials - 材料列表

参数: `page`, `pageSize`, `keyword`, `category`, `low_stock=1`（低于安全库存）

### GET /api/materials/:id - 材料详情

### POST /api/materials/:id/stock - 材料入库（库管/主任）

```json
{ "quantity": 50, "remark": "采购入库" }
```

### POST /api/materials/issue - 领料（维修师傅/库管）

```json
{
  "work_order_id": 1,
  "material_id": 1,
  "quantity": 2,
  "remark": "更换两根灯管"
}
```

**校验规则**:
- 已完工/已取消工单不能领料
- 库存不足时报错

### POST /api/materials/return - 退料回仓（库管/主任）

```json
{
  "issue_id": 1,
  "quantity": 1,
  "reason": "只用了一根"
}
```

自动更新库存与领料记录状态（partial_returned / full_returned）

### GET /api/materials/flows/list - 材料流水（库管/主任）

参数: `page`, `pageSize`, `material_id`, `work_order_id`, `worker_id`, `type=issue|return`, `start_date`, `end_date`

---

## 满意度

### POST /api/work-orders/:id/satisfaction - 学生评价（学生）

```json
{ "rating": 5, "comment": "师傅很专业，修得很快" }
```

### GET /api/satisfactions/stats - 满意度统计（主任/库管）

参数: `start_date`, `end_date`, `worker_id`

---

## 报表与导出（主任/库管）

所有报表支持 `format=json`（默认）和 `format=csv` 两种格式，传 `format=csv` 直接下载文件。

### GET /api/reports/overdue-orders - 超期工单

### GET /api/reports/material-consumption - 材料消耗统计

### GET /api/reports/unconfirmed-repairs - 未确认维修

### GET /api/reports/dashboard - 仪表盘概览

---

## 工单状态流转

```
pending (待接单)
  → assigned (已派单)
    → in_progress (维修中)
      → completed (已完工，待学生确认)
        → confirmed (已确认)
      [任何阶段可] → cancelled (已取消)
  [超过截止时间] → overdue (超期)
```

---

## 业务规则要点

1. **重复报修提示**: 同房间+同维修类型，近7天有未完成工单时提示
2. **完工禁领料**: status 为 completed/confirmed/cancelled 的工单禁止领料
3. **材料回仓提醒**: 维修师傅完工时系统列出未回填材料
4. **历史用料推荐**: 维修师傅领料前可查看同类故障历史用料，减少拿错型号
5. **库存安全预警**: 材料列表支持 `low_stock=1` 筛选低于安全库存的物料
