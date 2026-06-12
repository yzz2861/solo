# 日志压缩脱敏脚本

运维每周归档应用日志的一站式工具：扫描目录 → 按日期/服务分组 → 脱敏敏感字段 → 压缩打包 → 校验 → 出报告。

## 文件清单

| 文件 | 说明 |
|------|------|
| [log_sanitize.py](file:///Users/bill/Documents/solo/workspaces/yzz100460/log_sanitize.py) | 主脚本 |
| [sanitize_config.yaml](file:///Users/bill/Documents/solo/workspaces/yzz100460/sanitize_config.yaml) | 配置文件（脱敏规则、分组策略、阈值等） |
| [generate_test_data.py](file:///Users/bill/Documents/solo/workspaces/yzz100460/generate_test_data.py) | 生成测试用日志样本（可选） |

## 环境要求

- Python 3.8+
- 依赖：`pip install pyyaml`

## 快速上手

```bash
# 1. 修改 sanitize_config.yaml 里的输入输出目录（scan.input_dir / output_dir）
# 或通过命令行参数覆盖：

python3 log_sanitize.py -i /path/to/raw_logs -o /path/to/archives -v
```

## 命令行参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-c / --config` | 配置文件路径 | 脚本同目录下的 `sanitize_config.yaml` |
| `-i / --input` | 输入日志目录（覆盖配置） | 配置文件中 `scan.input_dir` |
| `-o / --output` | 输出归档目录（覆盖配置） | 配置文件中 `scan.output_dir` |
| `-v / --verbose` | 逐文件详细输出 | 关闭 |

## 输出产物结构

```
archives/
├── 2026-06-10_user-service_b4630454dbef.tar.gz   # 按 日期_服务_内容哈希 命名
├── 2026-06-10_user-service_b4630454dbef.tar.gz.sha256  # 对应校验文件
├── 2026-06-10_order-service_5138a895aa40.tar.gz
├── 2026-06-10_order-service_5138a895aa40.tar.gz.sha256
└── sanitize_report_YYYYMMDD_HHMMSS.json   # 完整处理报告（JSON）

audit_samples/  # 安全同事抽查用的脱敏前后对照（只保留命中行）
└── 2026-06-10_user-service_b4630454dbef.audit.json
```

校验归档包完整性：
```bash
cd archives
sha256sum -c *.sha256
```

## 核心能力说明

### 1. 按日期和服务自动分组
- 先尝试从**文件名**中提取日期（支持 `2024-01-15` / `20240115` 等格式）
- 文件名没日期时，扫前 50 行日志寻找日期标记
- 服务名从文件名前缀提取，失败则用父目录名兜底
- 可在 `sanitize_config.yaml` → `grouping` 自定义正则

### 2. 内置 13 条脱敏规则（可扩展）
覆盖主流敏感信息：

| 规则 | 命中示例 |
|------|---------|
| 手机号-中国大陆 | `13812345678` / `+86 15011112222` |
| Bearer / Authorization Token | `Authorization: Bearer eyJ...` |
| JWT Token | `eyJhbGci...xxxxx.yyyyy.zzzzz` |
| API Key / Secret | `apiKey=STRIPE_SECRET_KEY_EXAMPLE` |
| Cookie / Session ID | `sessionId=a1b2c3d4e5f6` |
| 身份证号（18位） | `110101199001011234` |
| 银行卡号 | `6222 0202 0202 0202` |
| 邮箱地址 | `user@example.com` |
| URL 敏感参数 | `?token=xxx&secret=yyy` |
| JSON 敏感字段 | `"password":"..."` / `"token":"..."` |
| 日志格式 token | `token=xxxxx` / `authToken:xxxxx` |
| password 字段 | `password=MySecret123` |

**新增规则**：在 `sanitize_config.yaml` → `sanitize.rules` 末尾追加即可，支持自定义 replacement。

### 3. 四类异常检测（全部会出现在报告里）

| 异常类型 | 触发条件 |
|---------|---------|
| **LONG_LINE** | 单行长度 > `anomaly.max_line_length`（默认 5000 字符） |
| **BROKEN_JSON** | 行中 JSON 片段解析失败，且错误位置靠近末尾（疑似写日志时截断） |
| **DUPLICATE** | 同一分组内两个文件内容 MD5 完全相同，后者会被跳过不打包 |
| **NO_MATCH** | 整个文件无一脱敏规则命中（提醒人工确认是否漏了规则；白名单服务不告警） |

### 4. 重复运行不生成重复包
- 每个分组在压缩前，对**所有已脱敏文件**+**相对路径**做哈希
- 归档包名含内容哈希 `{date}_{service}_{hash}.tar.gz`，若已存在则直接跳过
- 日志行、文件名不变的情况下，无限重复执行也不会堆重复包

### 5. 安全抽查审计样本
- 每个分组最多取 `audit.samples_per_group` 条（默认 20）
- 只保存**命中脱敏规则**的行（避免审计文件二次泄密）
- 每条记录包含 `line_no`、`matched_rules`、`before`、`after` 四个字段
- 安全同事可快速核对：手机号、token 确实被替换，但时间戳、错误码等排障字段未受影响

### 6. 处理报告
每次运行都会在 archives 目录生成 `sanitize_report_*.json`，含以下核心字段：

```json
{
  "statistics": {
    "groups": 6,
    "files_processed": 8,
    "files_failed": 0,
    "lines_total": 24,
    "lines_masked": 14,
    "rules_hit_total": { "手机号-中国大陆": 6, ... },
    "anomaly_summary": { "BROKEN_JSON": 2, "DUPLICATE": 1, "LONG_LINE": 1, "NO_MATCH": 1 }
  },
  "failed_files": [],
  "anomalies": [ ... 每条异常的具体文件、行号、详情 ... ],
  "deliverable_packages": [ ... 每个可交付包的路径、校验值、审计样本路径 ... ]
}
```

## 典型使用流程

```bash
# 1. 生成测试数据（可选，验证环境）
python3 generate_test_data.py

# 2. 执行脱敏归档
python3 log_sanitize.py -i ./logs_raw -o ./archives -v

# 3. 校验归档完整性
cd archives && sha256sum -c *.sha256 && cd ..

# 4. 人工抽查：打开 audit_samples/*.audit.json，查看脱敏前后对照

# 5. 查看异常：报告 anomalies 字段列出所有异常行
#    NO_MATCH → 要么服务确实没敏感信息，要么漏了规则 → 加入白名单或补规则
#    BROKEN_JSON / LONG_LINE → 查看行内容，判断是否有泄漏风险

# 6. 交付：archives/ 里的 *.tar.gz + 对应 *.sha256 + 报告 JSON 一起发给外部团队
```

## 自定义扩展建议

- **新增脱敏规则**：`sanitize_config.yaml` → `sanitize.rules` 追加即可，不需要改代码
- **特殊日期/服务格式**：修改 `grouping.date_patterns` / `service_pattern` 正则
- **需要 ZIP 格式**：将 `archive.format` 改为 `zip`
- **MD5 校验（兼容老系统）**：将 `archive.checksum_algorithm` 改为 `md5`
- **排障时保留原始脱敏文件**：将 `archive.keep_temp` 设为 `true`，会在 `archives/_sanitized/` 保存

## 安全边界提醒

1. 本脚本**不修改原始日志**，所有脱敏结果均为新文件写入临时目录再压缩
2. `audit_samples/` 中的 `before` 字段是原始敏感数据行，**请勿随归档包外发**，仅供内部抽查
3. 若新增自定义正则规则，建议先用 `generate_test_data.py` 造几组样本验证无过度脱敏
