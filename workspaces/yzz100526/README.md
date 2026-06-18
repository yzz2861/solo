# 城市书报亭补刊服务 API

发行公司城市书报亭的刊号/期次/销量/退刊/补货/配送一体化管理系统。解决亭主群里喊补刊容易漏、退刊期混乱、配送无追踪、数据无报表等问题。

## 功能特性

| 角色 | 核心功能 |
|------|---------|
| **亭主** | 上报销量、申请退刊、申请补货、查看申请进度、发起投诉 |
| **发行员** | 查看今日各线路的补刊/退刊网点与明细清单 |
| **配送员** | 按配送单装车，打印补刊/退刊清单（TXT/HTML），逐单更新配送状态 |
| **主管** | 导出缺刊投诉表、退刊率表、补货响应时间表、月度滞销核算表 |

### 业务规则

- ✅ **退刊期校验**：超过 `return_deadline` 不可申请退刊（拒绝原因可查）
- ✅ **重复补货合并**：同一网点 4 小时内重复提交补货申请自动合并，累加数量
- ✅ **库存不足必填原因**：仓库库存 / 网点库存不足必须说明，流程可追溯
- ✅ **配送失败必填原因**：整单或单品配送失败必须留下原因
- ✅ **审批留痕**：处理人、处理时间、拒绝原因全部记录

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 初始化数据库（含示例数据）

```bash
python -m scripts.seed_data
```

输出示例：
```
✅ 示例数据初始化完成！
   用户: 9  |  网点: 7  |  刊物: 8  |  刊期: 40
   退刊: 42  |  补货申请: 15  |  配送单: 4
   投诉: 8  |  销量: 80
```

### 3. 启动服务

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- API 文档（Swagger UI）：http://localhost:8000/docs
- 健康检查：http://localhost:8000/health

## 目录结构

```
.
├── main.py                  # FastAPI 入口
├── requirements.txt
├── app/
│   ├── config.py            # 配置（退刊期、合并小时数等）
│   ├── database.py          # SQLAlchemy 连接与会话
│   ├── models/models.py     # ORM 模型（12 张表）
│   ├── schemas/schemas.py   # Pydantic 请求/响应模型
│   ├── services/business.py # 核心业务逻辑层
│   └── api/v1/
│       ├── routes.py          # 通用 CRUD 接口
│       └── special_routes.py  # 发行员/主管/司机/亭主专用接口
└── scripts/
    └── seed_data.py         # 示例数据初始化脚本
```

## API 速查

> 所有接口前缀：`/api/v1`

### 用户 & 网点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/users` | 创建用户（亭主/发行员/主管/司机） |
| GET  | `/users` | 用户列表，可按 `role` 过滤 |
| POST | `/outlets` | 登记网点（编号、线路、亭主） |
| GET  | `/outlets` | 网点列表（可按区/线路/亭主过滤） |
| PUT  | `/outlets/{id}` | 更新网点信息 |

### 刊物 & 刊期 & 库存

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/publications` | 新建刊物（ISSN、刊名、定价、是否热门） |
| GET  | `/publications` | 刊物列表 |
| POST | `/issues` | 新建刊期（含退刊截止日、印量、仓库库存） |
| GET  | `/issues` | 刊期列表（可按刊物、出版日期过滤） |
| GET  | `/inventories` | 网点库存（支持 `low_stock=true` 查低库存） |

### 销量 & 退刊

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/sales` | 上报销量（自动扣减网点库存） |
| GET  | `/sales` | 销量列表 |
| POST | `/returns` | **申请退刊（自动校验退刊期 + 库存）** |
| POST | `/returns/{id}/process` | 主管审批退刊 |
| GET  | `/returns` | 退刊列表（可按状态/网点过滤） |

### 补货申请

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/restocks` | **提交补货（4 小时内自动合并）** |
| GET  | `/restocks` | 补货申请列表 |
| GET  | `/restocks/{id}` | 补货详情（含明细） |
| POST | `/restocks/{id}/process` | **主管审批（不足需填原因）** |

### 配送管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/deliveries` | 按线路+网点创建配送计划 |
| GET  | `/deliveries` | 配送单列表 |
| GET  | `/deliveries/{id}` | 配送单详情 |
| PUT  | `/deliveries/{id}/status` | 更新整单状态（完成/失败…） |
| PUT  | `/delivery-items/{id}` | 更新单品配送状态（失败需填原因） |

### 投诉处理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/complaints` | 亭主发起投诉 |
| GET  | `/complaints` | 投诉列表（支持类型/状态过滤） |
| PUT  | `/complaints/{id}` | 主管处理投诉、写解决方案 |

---

## 角色专用接口

### 发行员 - 今日路线

```
GET /api/v1/dispatcher/routes/{route_code}?plan_date=2026-06-18
```

返回该线路当日所有网点的补刊清单 + 退刊清单（含已配送状态）。

### 主管 - 报表导出（支持 json / xlsx / csv）

```
# 缺刊投诉报表
GET /api/v1/manager/reports/complaints?start_date=2026-06-01&end_date=2026-06-30&format=xlsx

# 退刊率报表
GET /api/v1/manager/reports/return-rate?start_date=2026-01-01&end_date=2026-06-30&format=csv

# 补货响应时间报表（含平均响应分钟数）
GET /api/v1/manager/reports/response-time?start_date=2026-06-01&end_date=2026-06-30&format=xlsx

# 月度滞销刊核算（数量+金额）
GET /api/v1/manager/reports/monthly-unsold?year=2026&month=6&format=xlsx
```

### 配送员 - 打印补刊/退刊单

```
GET /api/v1/driver/print/{delivery_id}?format=html   # 浏览器直接打印
GET /api/v1/driver/print/{delivery_id}?format=txt    # 纯文本针打
GET /api/v1/driver/print/{delivery_id}?format=json   # 结构化数据
```

HTML 版排版精美，每个网点配独立补刊/退刊表格和签收栏，适合 A4 打印。

### 亭主 - 申请进度总览

```
GET /api/v1/owner/progress/{owner_id}
```

返回该亭主名下所有网点、近 50 条补货/退刊/投诉记录及状态。

## 典型业务流程

```
亭主 POS 扫码上报销量
  ↓ POST /api/v1/sales（自动扣库存）
库存低 → 亭主 POST /api/v1/restocks（4小时内重复提交自动合并）
  ↓
主管 POST /api/v1/restocks/{id}/process（逐本审批，不足留原因）
  ↓
发行员 POST /api/v1/deliveries（按线路打包生成配送单）
  ↓
司机 GET /api/v1/driver/print/{id}?format=html → 装车清单
  ↓ 到达网点
司机 PUT /api/v1/delivery-items/{id} → 逐单签收/失败留原因
  ↓
系统自动：网点库存+ / 仓库库存- / 退刊仓库库存+
  ↓ 月底
主管 GET /api/v1/manager/reports/monthly-unsold → 滞销核算
```

## 关键配置（app/config.py）

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `RETURN_DEADLINE_DAYS` | 15 | 示例用，刊期表中 `return_deadline` 以实际录入为准 |
| `MERGE_PENDING_HOURS` | 4 | 待处理补货申请在此时间内同网点自动合并 |
| `DATABASE_URL` | `sqlite:///./newsstand.db` | 数据库地址，可改为 PostgreSQL/MySQL |

## 数据表关系

```
users 1──N outlets
outlets 1──N inventories / sales / returns / restocks / complaints
publications 1──N issues
issues 1──N inventories / sales / returns / restock_items / delivery_items
restocks 1──N restock_items
deliveries 1──N delivery_items (item_type: restock/return)
```

## 数据模型枚举

- `UserRole`: `owner`（亭主）/ `dispatcher`（发行员）/ `manager`（主管）/ `driver`（司机）
- `ReturnStatus`: `pending` / `approved` / `rejected` / `delivered`
- `RestockStatus`: `pending` / `merged` / `processing` / `shipped` / `delivered` / `rejected`
- `DeliveryStatus`: `planned` / `loading` / `in_transit` / `completed` / `partial` / `failed`
- `ComplaintStatus`: `open` / `in_progress` / `resolved` / `closed`

## 常见场景 cURL 示例

```bash
# 1. 亭主提交补货申请
curl -X POST http://localhost:8000/api/v1/restocks \
  -H "Content-Type: application/json" \
  -d '{
    "outlet_id": 1,
    "items": [
      {"issue_id": 33, "request_qty": 20},
      {"issue_id": 34, "request_qty": 15}
    ],
    "urgency": "urgent",
    "owner_remark": "读者和青年文摘上午就卖空了"
  }'

# 2. 4 小时内再次提交同一网点 → 自动合并（响应 _merged=true）
curl -X POST http://localhost:8000/api/v1/restocks \
  -H "Content-Type: application/json" \
  -d '{"outlet_id":1,"items":[{"issue_id":33,"request_qty":5}]}'

# 3. 导出 6 月退刊率为 Excel
curl -o return-rate.xlsx "http://localhost:8000/api/v1/manager/reports/return-rate?start_date=2026-06-01&end_date=2026-06-30&format=xlsx"
```
