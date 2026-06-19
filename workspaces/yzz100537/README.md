# 影棚样品保险借用 API

珠宝、腕表、限量包等高价值样品的借用管理系统。

## 快速开始

```bash
npm install
npm start
```

服务启动在 `http://localhost:3000`

## 运行测试

```bash
npm test
```

## 运行提醒检查

```bash
npm run reminder
```

## 数据模型

### 样品 (samples)
- 字段: id, name, category(jewelry/watch/bag), brand, description, value, insurance_amount, insurance_expiry_date, status
- 状态: in_stock(在库), out_of_stock(出库中), maintenance(维护中), lost(遗失)

### 项目 (projects)
- 字段: id, name, client, shoot_date, status

### 借用记录 (borrow_records)
- 字段: id, sample_id, project_id, borrower_name, borrower_role, borrower_contact, planned_out_date, planned_return_date, actual_out_date, actual_return_date, status, out_verified_by, return_verified_by, has_defect, defect_description
- 状态: pending(待出库), out(已出库), returned(已归还), defect(有瑕疵), closed(已关闭)

### 照片 (photos)
- 字段: id, borrow_record_id, photo_type(out/return/defect), file_path, file_name

### 责任确认 (liability_confirmations)
- 字段: id, borrow_record_id, confirmer_name, confirmer_role, confirmed_at, signature

### 提醒 (reminders)
- 字段: id, type(overdue/insurance_expiry/insurance_insufficient), related_id, message, is_read

## API 接口

### 1. 样品管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/samples | 样品列表（支持 category/status/keyword 筛选） |
| GET | /api/samples/:id | 样品详情（含最近借用记录） |
| POST | /api/samples | 创建样品 |
| PUT | /api/samples/:id | 更新样品 |
| DELETE | /api/samples/:id | 删除样品 |
| GET | /api/samples/insurance/expiring-soon | 保险即将到期列表 |

**创建样品示例:**
```json
{
  "name": "钻石项链",
  "category": "jewelry",
  "brand": "Cartier",
  "description": "18K金镶钻项链",
  "value": 88000,
  "insurance_amount": 100000,
  "insurance_expiry_date": "2027-12-31"
}
```

### 2. 借用管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/borrows | 借用记录列表 |
| GET | /api/borrows/:id | 借用详情（含照片、责任确认） |
| POST | /api/borrows | 创建借用申请 |
| POST | /api/borrows/:id/out | 出库确认 |
| POST | /api/borrows/:id/return | 归还验收 |
| POST | /api/borrows/:id/close | 关闭瑕疵记录 |
| POST | /api/borrows/:id/photos | 上传照片（支持多张） |
| POST | /api/borrows/:id/confirm-liability | 签署责任确认 |
| GET | /api/borrows/overdue/list | 逾期未还列表 |

**创建借用示例:**
```json
{
  "sample_id": "Sxxx",
  "project_id": "PRJxxx",
  "borrower_name": "张摄影师",
  "borrower_role": "photographer",
  "borrower_contact": "13800138000",
  "planned_out_date": "2026-07-10",
  "planned_return_date": "2026-07-20"
}
```

**归还验收示例:**
```json
{
  "has_defect": true,
  "defect_description": "表面轻微划痕",
  "verified_by": "李制片"
}
```

### 3. 项目管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/projects | 项目列表 |
| GET | /api/projects/:id | 项目详情（含样品列表） |
| POST | /api/projects | 创建项目 |
| PUT | /api/projects/:id | 更新项目 |
| GET | /api/projects/:id/samples | 项目样品占用详情 |

### 4. 查询统计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/queries/samples/out | 当前在外样品列表 |
| GET | /api/queries/projects/:id/sample-usage | 项目样品占用时间线 |
| GET | /api/queries/samples/:id/timeline | 样品借用历史时间线 |
| GET | /api/queries/legal/borrow-chain/:sampleId | 法务-样品借用链路（含责任确认） |
| GET | /api/queries/reminders | 提醒列表 |
| POST | /api/queries/reminders/:id/read | 标记提醒为已读 |
| GET | /api/queries/dashboard/stats | 仪表盘统计数据 |

### 5. 导出

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/export/borrow-records.csv | 导出借用记录CSV |
| GET | /api/export/liability-chain/:sampleId.csv | 导出样品借用链路CSV（法务用） |
| GET | /api/export/samples-list.csv | 导出样品清单CSV |

## 业务规则

### 保险规则
- **保险不足不能出库**: 保险额度必须 ≥ 样品价值（默认比例 1.0，可配置）
- **保险过期不能出库**: 保险已过期的样品无法借用
- **保险到期提醒**: 到期前 30 天自动生成提醒（可配置）

### 项目占用规则
- **时间冲突检测**: 创建/修改借用时，自动检查样品在该时间段是否已被其他项目占用
- 时间不重叠判定：计划归还日 < 借出日 或 计划借出日 > 归还日

### 归还验收规则
- **有瑕疵不能直接关闭**: 归还验收发现瑕疵时，状态变为 `defect`，需单独处理后才能关闭
- 关闭瑕疵记录时必须填写处理结果

### 逾期规则
- **逾期自动提醒**: 超过计划归还日未归还自动生成提醒
- 每天运行提醒任务检查逾期状态

## 配置

配置文件: `src/config/index.js`

```js
{
  port: 3000,
  insurance: {
    minInsuranceRatio: 1.0,      // 保险/价值最低比例
    expiryWarningDays: 30,        // 保险到期预警天数
    overdueWarningDays: 1         // 逾期宽限天数
  }
}
```

## 角色说明

- **producer(制片)**: 查看在外样品、项目占用、创建借用
- **photographer(摄影师)**: 签署责任确认
- **stylist(造型师)**: 签署责任确认
- **client(客户方)**: 签署责任确认
- **legal(法务)**: 导出借用链路和责任确认

## 目录结构

```
studio-sample-borrow-api/
├── src/
│   ├── app.js              # 应用入口
│   ├── config/             # 配置
│   ├── db/                 # 数据库
│   ├── middleware/         # 中间件
│   ├── routes/             # 路由
│   │   ├── samples.js
│   │   ├── borrows.js
│   │   ├── projects.js
│   │   ├── queries.js
│   │   └── export.js
│   ├── utils/              # 工具函数
│   └── jobs/               # 定时任务
├── tests/                  # 测试
├── data/                   # 数据库文件
└── uploads/                # 上传文件
```
