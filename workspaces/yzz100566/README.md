# 园区污水化验送样服务 API

用于园区污水站每日采样→送检→实验室接收→(退样补采)→结果回填的全流程管理。

## 技术栈

- Node.js + TypeScript
- Express 4
- SQLite (better-sqlite3)
- json2csv 导出

## 启动

```bash
# 1. 安装依赖
npm install

# 2. 初始化基础数据（排口/样瓶条码/用户）
npm run seed

# 3. 启动开发服务器
npm run dev
# 或编译后启动
npm run build && npm start
```

默认端口：`3000`，可通过环境变量 `PORT` 修改。

## 业务时间规则（可在 src/types.ts 调整）

| 项目 | 时长 | 说明 |
| --- | --- | --- |
| 样品保存时限 | 24h | 超时 → 保存超期提醒 critical |
| 采样后送检时限 | 4h | 超时 → 送检超期提醒 warning |
| 实验室结果出具时限 | 48h | 接收后开始算，超时 → 报告超期 warning |
| 退样默认补采时限 | 24h | 退样时间+24h，可在退样时自定义 |

## 角色

| 角色 key | 说明 |
| --- | --- |
| env_officer | 环保员 |
| lab | 实验室人员 |
| station_master | 站长 |

默认用户（seed后）：张环保(env001/1) / 李环保(env002/2) / 王化验(lab001/3) / 赵化验(lab002/4) / 刘站长(master001/5)

## 接口清单

所有响应统一结构：
```json
{ "code": 0, "message": "ok", "data": ... }
```
`code=0` 成功，非 0 失败，`message` 中文说明。

### 1. 基础数据

| Method | Path | 说明 |
| --- | --- | --- |
| GET  | `/api/outlets` | 排口列表（支持 keyword 搜索 + 分页） |
| GET  | `/api/outlets/:id` | 排口详情 |
| POST | `/api/outlets` | 新增排口 `{code,name,description?}` |
| PUT  | `/api/outlets/:id` | 修改排口 |
| DELETE | `/api/outlets/:id` | 删除排口 |
| GET  | `/api/bottles` | 样瓶列表（status/keyword 过滤） |
| GET  | `/api/bottles/:id` | 样瓶详情 |
| POST | `/api/bottles` | 单条码入库 `{barcode}` 重复直接 409 |
| POST | `/api/bottles/batch` | 批量入库，支持 `{barcodes:[]}` 或 `{prefix,start,end,padding?}` 自动生成 |
| PUT  | `/api/bottles/:id` | 修改样瓶条码/状态 |
| GET  | `/api/users` | 用户列表（按 role 过滤） |
| POST | `/api/users` | 新增用户 `{username,display_name,role}` |
| GET  | `/api/users/current` | 当前用户（用 X-User-Id 头；无则默认张环保） |

### 2. 采样主流程

| Method | Path | 说明 |
| --- | --- | --- |
| GET    | `/api/sampling` | 采样记录列表（支持 status/outlet_id/barcode/sampler_id/start_date/end_date/is_overdue/is_re_sample + 分页） |
| GET    | `/api/sampling/:id` | 详情，含 timeline 时间轴、父子关系 |
| POST   | `/api/sampling` | 创建采样 `{barcode, outlet_id, sampled_at, sampler_id, parent_sampling_id?, re_sample_reason?}` 条码重复使用禁止 |
| POST   | `/api/sampling/:id/dispatch` | 送检 `{dispatcher_id, dispatched_at?}` |
| POST   | `/api/sampling/batch-dispatch` | 批量送检 `{ids:[], dispatcher_id, dispatched_at?}` |
| POST   | `/api/sampling/:id/receive` | 实验室接收 `{lab_operator_id, lab_received_at?}` |
| POST   | `/api/sampling/:id/reject` | 退样（必填补采要求） `{lab_operator_id, reject_reason, re_sample_requirement, re_sample_deadline?, rejected_at?}` |
| POST   | `/api/sampling/:id/result` | 回填结果 `{reporter_id, result_cod?, result_nh3n?, result_tp?, result_tn?, result_ph?, result_ss?, result_remark?, reported_at?}` |
| POST   | `/api/sampling/:id/close` | 归档（补采完成的记录归档前会校验） |

### 3. 提醒

| Method | Path | 说明 |
| --- | --- | --- |
| GET  | `/api/alerts` | 提醒列表（alert_type/alert_level/acknowledged/sampling_id 过滤） |
| GET  | `/api/alerts/summary` | 未确认提醒汇总 |
| POST | `/api/alerts/:id/ack` | 单条确认 `{acknowledged_by?}` |
| POST | `/api/alerts/ack-all` | 全部确认（可选 alert_type 过滤） |

提醒类型：`preservation` 保存超期 / `dispatch` 送检超期 / `lab_sla` 报告超期 / `re_sample` 补采超期。
提醒级别：`warning` / `critical`。

### 4. 角色视图

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/api/views/env/pending-dispatch` | 环保员：待送检列表（超期排在前） |
| GET | `/api/views/env/re-sampling` | 环保员：补采任务清单（含超期状态） |
| GET | `/api/views/lab/pending-receive` | 实验室：待接收清单 |
| GET | `/api/views/lab/pending-result` | 实验室：待回填结果清单 |
| GET | `/api/views/master/dashboard` | 站长：首页仪表盘（按状态统计/超期统计/退样补采统计/缺结果统计/今日采样数） |

### 5. 复盘分析

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/api/review/overtime-breakdown` | 超时拆解：区分采样保存 / 送检 / 实验室出结果三段，返回每段耗时 + 平均耗时（start_date/end_date 过滤） |
| GET | `/api/review/by-outlet` | 按排口汇总（超期数/退样数/补采数/结果数） |
| GET | `/api/review/by-sampler` | 按采样人汇总 |
| GET | `/api/review/by-lab` | 按实验室人员汇总 |
| GET | `/api/review/timeline` | 时间轴列表，每笔标注 stages 和 root_cause（可直接用于复盘展示） |

### 6. 站长导出（CSV，带 UTF-8 BOM，Excel 直接打开不乱码）

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/api/export/full` | 全部记录导出（start_date/end_date/outlet_id 过滤） |
| GET | `/api/export/overtime` | 超期记录导出 |
| GET | `/api/export/rejections` | 退样与补采导出（含新条码、新采样信息） |
| GET | `/api/export/missing-results` | 缺结果导出 |
| GET | `/api/export/resample-completed` | 补采完成情况导出（含新化验结果） |

## 示例调用

```bash
# 健康检查
curl http://localhost:3000/health

# 初始化后查看默认用户
curl http://localhost:3000/api/users

# 环保员采样（样瓶 SW000001，排口 1，用户 1=张环保）
curl -X POST http://localhost:3000/api/sampling \
  -H 'Content-Type: application/json' \
  -d '{"barcode":"SW000001","outlet_id":1,"sampled_at":"2026-06-20 08:30:00","sampler_id":1}'

# 送检（用户 1）
curl -X POST http://localhost:3000/api/sampling/1/dispatch \
  -H 'Content-Type: application/json' -d '{"dispatcher_id":1}'

# 实验室接收（用户 3=王化验）
curl -X POST http://localhost:3000/api/sampling/1/receive \
  -H 'Content-Type: application/json' -d '{"lab_operator_id":3}'

# 结果回填
curl -X POST http://localhost:3000/api/sampling/1/result \
  -H 'Content-Type: application/json' \
  -d '{"reporter_id":3,"result_cod":45.2,"result_nh3n":2.3,"result_tp":0.35,"result_tn":12.1,"result_ph":7.2,"result_ss":18}'

# 退样 + 补采要求
curl -X POST http://localhost:3000/api/sampling/1/reject \
  -H 'Content-Type: application/json' \
  -d '{"lab_operator_id":3,"reject_reason":"样品浑浊异常","re_sample_requirement":"重新采集平行样，采样时现场过滤","re_sample_deadline":"2026-06-21 18:00:00"}'

# 补采（使用新条码 SW000002，挂 parent_sampling_id=1）
curl -X POST http://localhost:3000/api/sampling \
  -H 'Content-Type: application/json' \
  -d '{"barcode":"SW000002","outlet_id":1,"sampled_at":"2026-06-20 14:00:00","sampler_id":1,"parent_sampling_id":1,"re_sample_reason":"样品浑浊重采"}'

# 站长仪表盘
curl http://localhost:3000/api/views/master/dashboard

# 导出全量 CSV
curl -o full.csv 'http://localhost:3000/api/export/full?start_date=2026-06-01&end_date=2026-06-30'
```

## 关键业务约束

1. **条码重复不能入库**：`POST /api/bottles` 做数据库唯一约束 + 应用层检查。
2. **条码重复不能用于多笔采样**：创建采样前校验 `sample_bottles.status='unused'` 且 `sampling_records` 中无在用记录。
3. **退样必须给补采要求**：`reject_reason` 与 `re_sample_requirement` 必填，否则接口 400。
4. **补采完成自动更新退样记录**：创建采样时传 `parent_sampling_id`，事务内将 `rejection_records.re_sample_completed=1` 并写入新记录ID。
5. **归档检查**：状态为 `re_sampling` 的记录归档前校验补采已完成。
6. **超时自动扫描**：每次请求前 + 每 60 秒后台刷新一次超时标记与提醒。
7. **复盘时责任清晰**：每条记录都有三个独立超期标记 `is_sample_overdue / is_dispatch_overdue / is_lab_overdue`，分别对应保存、送检、实验室报告三阶段。
