# 企业访客WiFi开通服务 API

## 一、概述

本系统提供企业访客WiFi的申请、审批、开通、撤回全流程管理，支持前台登记、租户确认、夜班交接、行政报表等场景。

**技术栈**: Node.js + TypeScript + Express + TypeORM + SQLite + JWT

**服务地址**: `http://localhost:3000`

## 二、统一响应格式

```json
{
  "code": 0,
  "message": "ok",
  "data": { ... }
}
```
- `code=0` 表示成功，非0表示失败
- 失败时 `message` 说明错误原因

## 三、角色说明

| 角色 | 用户名 | 说明 |
|------|--------|------|
| admin | admin | 系统管理员，拥有全部权限 |
| reception | reception | 前台，可登记申请、手动撤回、提前离场 |
| tenant_admin | rd_admin / sales_admin / hr_admin | 租户审批员，可审批本部门申请 |
| night_shift | night | 夜班人员，可查看过期预警、未离场清单、执行撤回 |

## 四、认证接口

### 4.1 登录
```
POST /api/auth/login
Content-Type: application/json

Request:
{
  "username": "admin"
}

Response:
{
  "code": 0,
  "message": "ok",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "userId": "uuid",
      "username": "admin",
      "name": "系统管理员",
      "role": "admin"
    }
  }
}
```

### 4.2 获取当前登录信息
```
GET /api/auth/me
Authorization: Bearer {token}
```

### 4.3 所有接口都需在 Header 中携带
```
Authorization: Bearer {token}
```

## 五、租户管理接口

### 5.1 查询租户列表
```
GET /api/tenants
GET /api/tenants?keyword=研发
```

### 5.2 查询单个租户
```
GET /api/tenants/:id
```

### 5.3 创建租户（admin）
```
POST /api/tenants
{
  "code": "T006",
  "name": "客户成功部",
  "department": "客户中心",
  "contactPerson": "陈经理",
  "contactPhone": "13800000006"
}
```

## 六、WiFi 申请核心接口

### 6.1 创建申请（前台登记）
```
POST /api/applications
Content-Type: application/json

Request:
{
  "visitorName": "张三",
  "visitorPhone": "13900139000",
  "visitorCompany": "某科技有限公司",
  "visitorIdCard": "",
  "tenantId": "xxxx-uuid-T001",
  "visitReason": "client_meeting",
  "visitReasonDetail": "Q2季度项目复盘会",
  "startTime": "2024-06-19T09:00:00",
  "endTime": "2024-06-19T18:00:00"
}

visitReason 可选值:
- client_meeting   客户会议
- vendor_support   供应商调试
- interview        面试
- training         培训
- audit            审计
- other            其他

Response 说明:
- 若同一手机号已有未过期权限，则返回 duplicate=true 及现有信息，不重复创建
- 若 startTime <= 当前时间，则直接审批通过并生成账号（跳过待确认环节）
```

### 6.2 查询申请列表
```
GET /api/applications?status=pending,approved&page=1&pageSize=20
GET /api/applications?tenantId=xxx&visitorPhone=139
GET /api/applications?dateFrom=2024-06-01&dateTo=2024-06-30
```

### 6.3 查询申请详情
```
GET /api/applications/:id
```

### 6.4 查看申请操作日志
```
GET /api/applications/:id/logs
```

### 6.5 租户审批 - 通过
```
POST /api/applications/:id/approve
```
生成 wifiUsername + wifiPassword 并激活账号

### 6.6 租户审批 - 拒绝
```
POST /api/applications/:id/reject
{
  "reason": "本部门今日无此访客预约"
}
```

### 6.7 手动撤回权限（前台/夜班/管理员）
```
POST /api/applications/:id/revoke
{
  "remark": "访客提前离开，前台主动关闭"
}
```

### 6.8 提前离场登记（记录操作人，区别于普通撤回）
```
POST /api/applications/:id/early-leave
{
  "remark": "会议15:30提前结束，访客已确认离场"
}
```

## 七、场景化查询接口

### 7.1 前台 - 今日待开通列表
```
GET /api/applications/reception/today-pending
返回今天创建、状态为 pending 的所有申请
```

### 7.2 夜班交接 - 快过期 & 未确认离场
```
GET /api/applications/night-shift/summary
GET /api/applications/night-shift/summary?tenantId=xxx   (管理员可按部门筛选)

Response:
{
  "expiringCount": 5,
  "notCheckedOutCount": 2,
  "expiringSoon": [
    {
      "id": "...",
      "visitor": { "name": "李四", "phone": "..." },
      "tenant": { "name": "科技研发部" },
      "endTime": "2024-06-19T20:00:00",
      "status": "active"
    }
  ],
  "notCheckedOut": [ ... 已过期但未确认离场的权限 ]
}
```

## 八、报表与导出接口（admin / night_shift）

### 8.1 月度统计汇总
```
GET /api/reports/monthly?year=2024&month=6
GET /api/reports/monthly?year=2024&month=6&tenantId=xxx

Response:
{
  "period": "2024年6月",
  "total": 156,
  "approved": 142,
  "rejected": 14,
  "expired": 130,
  "revoked": 12,
  "overtime": 8,
  "approvalRate": "91.0%",
  "byTenant": [
    { "tenantId": "...", "tenantName": "科技研发部", "count": 58 },
    ...
  ],
  "byReason": [
    { "reason": "client_meeting", "count": 72 },
    ...
  ]
}
```

### 8.2 超时未撤回记录
```
GET /api/reports/overtime?from=2024-06-01&to=2024-06-30
```

### 8.3 被拒申请列表
```
GET /api/reports/rejected?from=2024-06-01&to=2024-06-30
```

### 8.4 导出 CSV
```
GET /api/reports/export?type=all&year=2024&month=6
GET /api/reports/export?type=overtime
GET /api/reports/export?type=rejected

type:
  all      - 完整访客记录
  overtime - 仅超时未撤回
  rejected - 仅被拒申请
```

## 九、状态流转

```
pending ──approve──► approved ──时间到达──► active ──过期/撤回──► expired/revoked_*
   │                    │
   └──reject──► rejected └────────────────────┘
                        提前离场: left_early (记录操作人、备注)
                        手动撤回: revoked_manual
                        系统自动: revoked_auto (cron 每5分钟检查)
```

## 十、核心业务规则

1. **同手机号去重**：创建申请时，若该手机号已有 approved/active/pending 状态且 endTime > now 的申请，直接返回现有记录
2. **有效期限制**：单次申请最长 72 小时
3. **即时开通**：若 startTime <= 当前时间且创建人有权限，自动审批并激活
4. **审计日志**：所有状态变更均记录操作人、时间、前后数据、详细备注
5. **自动回收**：Cron 每 5 分钟扫描 endTime <= now 的 active/approved 权限，自动置为 revoked_auto
6. **租户隔离**：tenant_admin 只能审批和查看本租户的申请
