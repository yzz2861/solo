# 云账单标签巡查报告

- **巡查月份**: 2026-05
- **生成时间**: 2026-06-10 22:16:33
- **上次巡查时间**: 2026-06-10 22:16:08

## 一、概览统计

| 指标 | 数值 |
|------|------|
| 本月总费用 | ¥92,536.50 |
| 资源数量 | 22 |
| 有项目标签 | 18/22 |
| 有负责人标签 | 18/22 |
| 标签缺失异常 | 6 条 |
| 大小写不一致 | 2 组 |
| 资源名重复 | 1 组 |
| 新项目未映射 | 3 个 |
| 费用环比飙升 | 1 条 |
| 费用异常峰值 | 2 条 |
| 疑似闲置资源 | 2 条 |
| 待人工分摊 | 9 条 |

## 二、可直接追人的资源（标签完整且有部门映射）

| 资源ID | 资源名称 | 类型 | 区域 | 项目 | 负责人 | 费用 | 部门 | 联系邮箱 |
|--------|----------|------|------|------|--------|------|------|----------|
| i-2ze8a1b2c3 | web-prod-01 | ECS | 华东1 | Alpha | 张伟 | 3,310.20 CNY | 基础架构部 | zhangwei@example.com |
| i-2ze8a1b2c5 | db-prod-master | RDS | 华东1 | Alpha | 张伟 | 9,120.00 CNY | 基础架构部 | zhangwei@example.com |
| i-2ze8a1b2c6 | cache-prod | Redis | 华东1 | Alpha | 李娜 | 2,180.00 CNY | 基础架构部 | zhangwei@example.com |
| i-2ze8a1b2c7 | oss-data-lake | OSS | 华东1 | Beta | 王强 | 4,890.60 CNY | 数据平台部 | wangqiang@example.com |
| i-2ze8a1b2c8 | ml-training-gpu | ECS | 华北2 | Beta | 王强 | 22,400.00 CNY | 数据平台部 | wangqiang@example.com |
| i-2ze8a1b2c9 | test-api-server | ECS | 华东2 | Gamma | 赵敏 | 720.00 CNY | 业务研发部 | zhaomin@example.com |
| i-2ze8a1b2d1 | log-collector | ECS | 华东1 | Delta | 陈磊 | 465.00 CNY | 运维部 | chenlei@example.com |
| i-2ze8a1b2d2 | monitor-agent | ECS | 华东1 | Delta | 陈磊 | 390.00 CNY | 运维部 | chenlei@example.com |
| i-2ze8a1b2d3 | staging-db | RDS | 华东1 | Epsilon | 周杰 | 1,220.00 CNY | 测试部 | zhoujie@example.com |
| i-2ze8a1b2d6 | k8s-node-01 | ECS | 华东1 | Alpha | 张伟 | 2,920.00 CNY | 基础架构部 | zhangwei@example.com |
| i-2ze8a1b2d7 | k8s-node-02 | ECS | 华东1 | Alpha | 张伟 | 2,920.00 CNY | 基础架构部 | zhangwei@example.com |
| i-2ze8a1b2e3 | prod-api-gateway | APIGateway | 华东1 | Alpha | 张伟 | 560.00 USD | 基础架构部 | zhangwei@example.com |
| i-2ze8a1b2e4 | overseas-cdn | CDN | 美西 | Beta | 王强 | 1,280.00 USD | 数据平台部 | wangqiang@example.com |

## 三、疑似闲置资源（费用极低但仍在运行的计算实例）

| 资源ID | 资源名称 | 类型 | 区域 | 费用(CNY) | 项目 | 负责人 | 建议联系 | 部门 | 邮箱 |
|--------|----------|------|------|-----------|------|--------|----------|------|------|
| i-2ze8a1b2d4 | tmp-benchmark | ECS | 华东2 | ¥8.50 | (空) | 刘洋 | 刘洋 | 待确认(缺少标签) |  |
| i-2ze8a1b2e2 | forgotten-test | ECS | 华东2 | ¥15.00 | (空) | (空) | 待确认 | 待确认(缺少标签) |  |

## 四、待人工分摊费用（标签缺失/无映射/新项目）

| 资源ID | 资源名称 | 类型 | 区域 | 项目 | 负责人 | 费用 | 原因 | 建议联系 | 部门 | 邮箱 |
|--------|----------|------|------|------|--------|------|------|----------|------|------|
| i-2ze8a1b2c4 | web-prod-01 | ECS | 华东1 | ALPHA | 张伟 | 3,310.20 CNY | 项目'ALPHA'未在映射表中 | 张伟 | 待确认(项目未映射) |  |
| i-2ze8a1b2d0 | dev-sandbox | ECS | 华东2 | (空) | 赵敏 | 125.00 CNY | 缺少项目标签 | 赵敏 | 待确认(缺少标签) |  |
| i-2ze8a1b2d4 | tmp-benchmark | ECS | 华东2 | (空) | 刘洋 | 8.50 CNY | 缺少项目标签 | 刘洋 | 待确认(缺少标签) |  |
| i-2ze8a1b2d5 | cdn-accelerate | CDN | 华东1 | Beta | (空) | 2,250.00 CNY | 缺少负责人标签 | 王强 | 数据平台部 | wangqiang@example.com |
| i-2ze8a1b2d8 | lambda-etl | FunctionCompute | 华东1 | Gamma | (空) | 60.00 CNY | 缺少负责人标签 | 赵敏 | 业务研发部 | zhaomin@example.com |
| i-2ze8a1b2d9 | unassigned-backup | OSS | 华东1 | (空) | (空) | 92.00 CNY | 缺少项目标签; 缺少负责人标签 | 待确认 | 待确认(缺少标签) |  |
| i-2ze8a1b2e0 | new-ai-inference | ECS | 华北2 | Omega | 孙鹏 | 18,600.00 CNY | 项目'Omega'未在映射表中 | 孙鹏 | 待确认(项目未映射) |  |
| i-2ze8a1b2e1 | experiment-v2 | ECS | 华东2 | omega | 孙鹏 | 4,200.00 CNY | 项目'omega'未在映射表中 | 孙鹏 | 待确认(项目未映射) |  |
| i-2ze8a1b2e2 | forgotten-test | ECS | 华东2 | (空) | (空) | 15.00 CNY | 缺少项目标签; 缺少负责人标签 | 待确认 | 待确认(缺少标签) |  |

> **待人工分摊费用合计**: ¥28,660.70

## 五、费用环比飙升（较上月涨幅超过阈值）

| 资源ID | 资源名称 | 项目 | 负责人 | 上月(CNY) | 本月(CNY) | 涨幅 | 建议联系 | 部门 | 邮箱 |
|--------|----------|------|--------|-----------|-----------|------|----------|------|------|
| i-2ze8a1b2c8 | ml-training-gpu | Beta | 王强 | ¥15,800.00 | ¥22,400.00 | +41.8% | 王强 | 数据平台部 | wangqiang@example.com |

## 六、费用异常峰值（单资源费用超过阈值）

| 资源ID | 资源名称 | 类型 | 项目 | 负责人 | 费用(CNY) | 明细 |
|--------|----------|------|------|--------|-----------|------|
| i-2ze8a1b2c8 | ml-training-gpu | ECS | Beta | 王强 | ¥22,400.00 | 22,400.00 CNY |
| i-2ze8a1b2e0 | new-ai-inference | ECS | Omega | 孙鹏 | ¥18,600.00 | 18,600.00 CNY |

## 七、标签问题明细

### 7.1 大小写不一致

- **alpha**: 存在变体 `ALPHA`, `Alpha`
- **omega**: 存在变体 `Omega`, `omega`

### 7.2 资源名重复（不同资源ID但名称相同）

- **web-prod-01**: 2 个不同资源ID (i-2ze8a1b2c3, i-2ze8a1b2c4)

### 7.3 新项目未映射

- **ALPHA**: 负责人提示=张伟, 示例资源ID=i-2ze8a1b2c4
- **Omega**: 负责人提示=孙鹏, 示例资源ID=i-2ze8a1b2e0
- **omega**: 负责人提示=孙鹏, 示例资源ID=i-2ze8a1b2e1

---

*报告由云账单标签巡查脚本自动生成，如有疑问请联系财务部。*