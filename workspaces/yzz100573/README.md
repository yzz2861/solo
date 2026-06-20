# 校园失物认领服务 API

为学校保卫处提供的失物登记、认领申请、核验归还、库存管理一体化 API 服务。

## 技术栈

- Node.js + Express
- SQLite (better-sqlite3)
- Multer (照片上传)
- json2csv (报表导出)

## 快速开始

```bash
npm install
npm start
```

服务默认运行在 `http://localhost:3000`

## 物品状态说明

| 状态 | 说明 |
|------|------|
| pending | 待认领（刚登记） |
| claimed | 已有人申请认领 |
| disputed | 多人申请，争议核验中 |
| returned | 已归还 |
| disposed | 超期待处置 |

## 认领申请状态

| 状态 | 说明 |
|------|------|
| pending | 待核验 |
| first_verified | 一次核验通过（贵重物品） |
| verified | 核验通过（可领取） |
| rejected | 已拒绝 |
| returned | 已归还 |
| closed | 已关闭（他人已领走） |

## API 接口

### 1. 失物登记

**POST /api/items**

表单字段：
- `type` - 物品类型（水杯、校园卡、耳机、钥匙、手机等）
- `brand` - 品牌
- `color` - 颜色
- `features` - 特征描述
- `location` - 拾获地点
- `found_time` - 拾获时间 (YYYY-MM-DD HH:mm:ss)
- `photo` - 照片文件
- `storage_location` - 保管位置（如：保卫处1号室）
- `locker_number` - 保管柜编号
- `is_valuable` - 是否贵重物品 (0/1)
- `storage_period_days` - 保管天数（默认30天）

### 2. 失物列表

**GET /api/items**

查询参数：
- `status` - 按状态筛选
- `type` - 按类型筛选
- `keyword` - 关键词搜索
- `page` - 页码（默认1）
- `limit` - 每页数量（默认20）

### 3. 失物详情

**GET /api/items/:id**

返回物品信息及所有认领申请。

### 4. 库存统计

**GET /api/items/stats**

返回各状态物品数量及按类型统计。

### 5. 更新失物信息

**PUT /api/items/:id**

### 6. 删除失物记录

**DELETE /api/items/:id**

### 7. 提交认领申请

**POST /api/claims**

请求体：
```json
{
  "item_id": 1,
  "applicant_name": "张三",
  "applicant_phone": "13800138000",
  "student_id": "2023001001",
  "id_last_four": "1234",
  "description": "蓝色水杯，有校徽贴纸，杯盖有划痕"
}
```

### 8. 认领申请列表

**GET /api/claims**

查询参数：
- `status` - 状态筛选
- `item_id` - 物品ID
- `applicant_phone` - 申请人手机号

### 9. 申请详情

**GET /api/claims/:id**

### 10. 学生查询申请状态

**GET /api/claims/by-phone/:phone**

### 11. 一次核验

**POST /api/claims/:id/verify/first**

请求体：
```json
{
  "verifier": "张保卫",
  "pass": true,
  "reject_reason": "描述不符"
}
```

### 12. 二次核验（贵重物品）

**POST /api/claims/:id/verify/second**

### 13. 物品归还

**POST /api/claims/:id/return**

请求体：
```json
{
  "handler": "张保卫",
  "receiver_name": "张三",
  "receiver_id_last_four": "1234"
}
```

### 14. 月底导出 - 已归还

**GET /api/export/returned?year=2024&month=6&format=csv**

### 15. 月底导出 - 无人认领

**GET /api/export/unclaimed?year=2024&month=6&format=csv**

### 16. 月底导出 - 争议认领

**GET /api/export/disputed?year=2024&month=6&format=csv**

### 17. 月度汇总

**GET /api/export/summary?year=2024&month=6**

## 核心业务规则

1. **多人申请同一物品**：自动进入争议核验状态（disputed）
2. **已归还物品**：不能再提交认领申请
3. **贵重物品**：必须经过二次核验后才能归还
4. **超期待处置**：超过保管期（默认30天）自动转为 disposed 状态
5. **归还记录**：必须记录领取人证件后四位和经办人
6. **保管信息**：每条失物记录包含保管位置和保管柜编号
