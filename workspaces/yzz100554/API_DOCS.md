# 农资赊销还款服务 API 文档

## 基础信息

- 服务地址: `http://localhost:3000`
- 接口前缀: `/api`
- 认证方式: Bearer Token (JWT)
- 数据格式: JSON

## 默认账号

| 角色 | 用户名 | 密码 | 权限 |
|------|--------|------|------|
| 老板 | boss | boss123456 | 全部权限 |
| 店员 | clerk | clerk123456 | 仅录入当天收款、查询基础数据 |

## 核心业务规则

1. **已结清订单锁定**: 状态为 `settled` 的销售单无法修改、退货、还款
2. **重复还款识别**: 同一农户、同一金额、同一日期、同一经办人会被判定为可能重复
3. **退货关联**: 退货必须关联原始销售单明细，退货数量不能超过已售数量
4. **权限控制**: 店员只能录入当天收款，修改/删除操作仅限老板
5. **审计追踪**: 所有关键操作均记录日志，可追溯经办人和操作时间

---

## 1. 认证接口

### 1.1 登录
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "boss",
  "password": "boss123456"
}
```

**响应:**
```json
{
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "boss",
      "name": "张老板",
      "role": "boss"
    }
  }
}
```

### 1.2 获取当前用户信息
```
GET /api/auth/me
Authorization: Bearer {token}
```

### 1.3 修改密码
```
POST /api/auth/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "oldPassword": "boss123456",
  "newPassword": "newpassword"
}
```

---

## 2. 农户管理

### 2.1 农户列表
```
GET /api/farmers?name=&village=&page=1&pageSize=20
Authorization: Bearer {token}
```

### 2.2 农户详情
```
GET /api/farmers/:id
Authorization: Bearer {token}
```

### 2.3 新增农户
```
POST /api/farmers
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "赵六",
  "phone": "13800138006",
  "id_card": "440101198506060006",
  "address": "幸福村3组",
  "village": "幸福村"
}
```

### 2.4 更新农户 (仅老板)
```
PUT /api/farmers/:id
Authorization: Bearer {token}
```

### 2.5 删除农户 (仅老板)
```
DELETE /api/farmers/:id
Authorization: Bearer {token}
```

### 2.6 农户汇总 (仅老板)
```
GET /api/farmers/:id/summary
Authorization: Bearer {token}
```

---

## 3. 作物季管理

### 3.1 作物季列表
```
GET /api/seasons?is_active=true&year=2026
Authorization: Bearer {token}
```

### 3.2 新增作物季 (仅老板)
```
POST /api/seasons
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "2026年晚稻",
  "year": 2026,
  "crop_type": "水稻",
  "start_date": "2026-07-10",
  "end_date": "2026-11-15",
  "due_date": "2026-12-30"
}
```

---

## 4. 商品管理

### 4.1 商品列表
```
GET /api/products?category=肥料&is_active=true
Authorization: Bearer {token}
```

### 4.2 商品分类
```
GET /api/products/categories
Authorization: Bearer {token}
```

### 4.3 新增商品 (仅老板)
```
POST /api/products
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "复合肥",
  "category": "肥料",
  "unit": "袋",
  "price": 180,
  "specification": "40kg/袋"
}
```

---

## 5. 销售单管理

### 5.1 销售单列表
```
GET /api/sales-orders?farmer_id=1&season_id=1&status=pending&page=1&pageSize=20
Authorization: Bearer {token}
```

### 5.2 销售单详情 (含还款、退货记录)
```
GET /api/sales-orders/:id
Authorization: Bearer {token}
```

### 5.3 创建赊销单
```
POST /api/sales-orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "farmer_id": 1,
  "season_id": 1,
  "sale_date": "2026-03-15",
  "remark": "春耕赊销",
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "unit_price": 60,
      "remark": "杂交水稻种子"
    },
    {
      "product_id": 3,
      "quantity": 5,
      "unit_price": 180,
      "remark": "复合肥"
    }
  ]
}
```

### 5.4 更新销售单 (仅老板，未结清才能改)
```
PUT /api/sales-orders/:id
Authorization: Bearer {token}
```

### 5.5 作废销售单 (仅老板，未结清才能作废)
```
POST /api/sales-orders/:id/void
Authorization: Bearer {token}
```

---

## 6. 还款管理

### 6.1 还款记录列表
```
GET /api/repayments?farmer_id=1&today=true
Authorization: Bearer {token}
```

### 6.2 当天收款 (店员只能看自己录的)
```
GET /api/repayments/today
Authorization: Bearer {token}
```

### 6.3 录入还款
```
POST /api/repayments
Authorization: Bearer {token}
Content-Type: application/json

{
  "farmer_id": 1,
  "sales_order_id": 1,
  "amount": 500,
  "repayment_date": "2026-06-19",
  "payment_method": "现金",
  "remark": "收割后还款"
}
```

**注意**: 店员只能录入当天日期的还款。如果检测到可能的重复还款，会返回409状态码和重复记录信息。

### 6.4 确认非重复还款
```
POST /api/repayments/:id/confirm-duplicate
Authorization: Bearer {token}
```
当收到409重复提示后，确认是不同还款时使用此接口。

### 6.5 修改/删除还款 (仅老板，关联订单未结清)

---

## 7. 退货管理

### 7.1 退货记录列表
```
GET /api/returns?sales_order_id=1
Authorization: Bearer {token}
```

### 7.2 录入退货
```
POST /api/returns
Authorization: Bearer {token}
Content-Type: application/json

{
  "sales_order_id": 1,
  "sales_order_item_id": 1,
  "quantity": 1,
  "return_date": "2026-03-20",
  "reason": "种子发芽率低",
  "remark": "退回1袋种子"
}
```

**注意**: 必须关联原销售单明细，退货数量不能超过已售-已退数量。已结清订单不能退货。

### 7.3 撤销退货 (仅老板，关联订单未结清)
```
DELETE /api/returns/:id
Authorization: Bearer {token}
```

---

## 8. 查询接口 (仅老板)

### 8.1 农户完整账单
```
GET /api/queries/farmer/:farmerId/ledger?season_id=1
Authorization: Bearer {token}
```
返回该农户所有订单、还款、退货记录及汇总。

### 8.2 农户交易流水
```
GET /api/queries/farmer/:farmerId/transactions?start_date=2026-01-01
Authorization: Bearer {token}
```
按时间顺序显示赊销、还款、退货的流水，包含实时余额。

### 8.3 当天收款汇总
```
GET /api/queries/today/collections
Authorization: Bearer {token}
```

### 8.4 农户搜索
```
GET /api/queries/farmer/autocomplete?q=王
Authorization: Bearer {token}
```

---

## 9. 报表接口 (仅老板)

### 9.1 欠款表
```
GET /api/reports/outstanding?season_id=1&village=幸福村
Authorization: Bearer {token}
```

### 9.2 逾期表
```
GET /api/reports/overdue?season_id=1
Authorization: Bearer {token}
```
按逾期天数分级：<30天, 30-60天, 60-90天, >90天

### 9.3 已核销表
```
GET /api/reports/settled?year=2026&month=6
Authorization: Bearer {token}
```

### 9.4 导出欠款表CSV
```
GET /api/reports/export/outstanding
Authorization: Bearer {token}
```

### 9.5 导出逾期表CSV
```
GET /api/reports/export/overdue
Authorization: Bearer {token}
```

### 9.6 导出已核销表CSV
```
GET /api/reports/export/settled?year=2026&month=6
Authorization: Bearer {token}
```

### 9.7 下载导出文件
```
GET /api/reports/download/:filename
Authorization: Bearer {token}
```

### 9.8 月度经营统计
```
GET /api/reports/monthly?year=2026&month=6
Authorization: Bearer {token}
```

---

## 10. 审计日志 (仅老板)

### 10.1 操作日志列表
```
GET /api/audit-logs?user_id=1&action=create&table_name=sales_orders
Authorization: Bearer {token}
```

### 10.2 单条记录操作历史
```
GET /api/audit-logs/record/sales_orders/1
Authorization: Bearer {token}
```

### 10.3 操作统计
```
GET /api/audit-logs/statistics
Authorization: Bearer {token}
```

---

## 状态说明

### 销售单状态
| 状态 | 说明 | 可操作 |
|------|------|--------|
| pending | 待结清 | 还款、退货、修改、作废 |
| settled | 已结清 | 仅查询 |
| voided | 已作废 | 仅查询 |

### 角色权限
| 操作 | 老板 | 店员 |
|------|------|------|
| 登录 | ✓ | ✓ |
| 查询农户/商品/作物季 | ✓ | ✓ |
| 新增农户 | ✓ | ✓ |
| 编辑/删除农户 | ✓ | ✗ |
| 新增/编辑/删除商品 | ✓ | ✗ |
| 新增/编辑/删除作物季 | ✓ | ✗ |
| 创建销售单 | ✓ | ✓ |
| 编辑/作废销售单 | ✓ | ✗ |
| 录入还款 | ✓ | ✓(仅当天) |
| 编辑/删除还款 | ✓ | ✗ |
| 录入退货 | ✓ | ✓ |
| 撤销退货 | ✓ | ✗ |
| 查询农户账单 | ✓ | ✗ |
| 导出报表 | ✓ | ✗ |
| 查看审计日志 | ✓ | ✗ |

---

## 错误码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 参数错误 |
| 401 | 未认证 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 重复录入检测 |
| 500 | 服务器错误 |
