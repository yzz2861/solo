# yaml-drift — YAML 配置漂移比对 CLI

面向运维场景的多环境 YAML 配置差异检测工具。同时支持**人工值班报告**、**机器可读 JSON** 和 **CI 高风险漂移判定**三种输出模式。

---

## ✨ 功能特性

| 能力 | 说明 |
|------|------|
| **多配置加载** | 读取目录里全部 `*.yaml` / `*.yml`，或手动指定多份文件 |
| **按服务分组** | 自动识别顶层 `services:` 结构，按服务输出差异 |
| **键路径深度比较** | 递归到叶子节点，精确标注 `新增 / 缺失 / 修改 / 类型不一致` |
| **空值 & 布尔规范化** | `"null"` / `~` / `""` → `null`；`"true"` / `"yes"` / `"on"` → `true` |
| **数组顺序忽略** | 默认排序后比较，避免 IP 白名单、节点列表顺序抖动造成误报（`--no-sort-arrays` 关闭） |
| **忽略表** | 支持精确路径 + glob 通配，三种方式叠加（CLI / ignore 文件 / 两者混合） |
| **敏感字段遮蔽** | 自动识别 `password / secret / token / api_key …`，值输出为 `ab********yz` |
| **风险分级** | 高 / 中 / 低 / 提示 四档，基于关键词（端口、限流阈值、开关、副本数…） |
| **三种报告** | 人工彩色报告 · JSON 结构化报告 · CI 精简报告 |
| **CI 退出码** | `--fail-on high|medium|any|none` 可接进流水线质量门禁 |

---

## 📦 安装

```bash
cd yaml-drift
pip install -e .
```

验证：

```bash
yaml-drift --version
# yaml-drift 1.0.0
```

或直接用模块方式运行（无需安装）：

```bash
PYTHONPATH=src python -m yaml_drift.cli --help
```

---

## 🚀 快速开始

仓库自带 3 份示例配置（test / staging / production），直接跑：

```bash
yaml-drift examples/configs
```

带忽略表：

```bash
yaml-drift examples/configs --ignore-file examples/ignore.yaml --show-ignored
```

输出 JSON 报告到文件：

```bash
yaml-drift examples/configs -o drift.json -f json
```

CI 模式 + 高风险即失败：

```bash
yaml-drift examples/configs --ci-mode --fail-on high
echo "退出码: $?"    # 2 = 有高风险, 0 = 无问题
```

人工 + JSON 双输出：

```bash
yaml-drift examples/configs -f human --json-output drift.json
```

---

## 📖 CLI 参数

```
yaml-drift PATHS... [选项]
```

### 输入

| 参数 | 说明 | 默认 |
|------|------|------|
| `PATHS` | YAML 文件或目录（可多个），必填 | — |
| `--pattern` | 目录下 glob 匹配 | `*.y*ml` |
| `--no-sort-arrays` | 严格比较数组顺序（默认排序后忽略顺序） | 关 |
| `--env-name NAME` | 按顺序为每个文件指定环境名，可重复指定 | 取文件 stem |

### 忽略

| 参数 | 说明 |
|------|------|
| `-i, --ignore PATH` | 忽略精确键路径或 glob 模式，可重复 |
| `--ignore-file FILE` | YAML 格式忽略表（见下方结构） |
| `--show-ignored` | 在报告末尾列出被忽略的路径 |

### 输出

| 参数 | 说明 |
|------|------|
| `-f, --format` | `human` / `json` / `ci` / `all` |
| `-o, --output FILE` | 主输出文件路径（stdout 不指定） |
| `--json-output FILE` | 额外写 JSON 到该文件（配合 human/ci 使用） |
| `--no-color` | 关闭彩色 |
| `--no-mask` | **不遮蔽**敏感字段值（谨慎使用） |

### CI

| 参数 | 说明 |
|------|------|
| `--ci-mode` | 等价于 `-f ci`，精简输出，只列中高风险 |
| `--fail-on` | 触发非零退出码的阈值：`high`（默认）/ `medium` / `any` / `none` |

---

## 🛑 退出码

| 码 | 含义 |
|----|------|
| `0` | 正常（按 `--fail-on` 规则未触发失败） |
| `2` | 检测到**高风险**漂移 |
| `3` | 检测到**中等**或任意风险漂移（取决于 `--fail-on`） |
| `1` | 运行时错误（文件不存在、YAML 解析失败…） |

GitLab CI 示例：

```yaml
yaml_drift_check:
  stage: verify
  image: python:3.11-slim
  script:
    - pip install -e .
    - yaml-drift k8s-configs/ --ci-mode --fail-on high --json-output drift-report.json
  artifacts:
    when: always
    paths: [drift-report.json]
  allow_failure:
    exit_codes: [2]     # 高风险仅告警不阻断，可去掉则改为阻断
```

---

## 📋 忽略表格式（YAML）

```yaml
paths:          # 精确键路径
  - "order-service.redis.db"

patterns:       # glob 通配，匹配键路径
  - "*.feature_flags.*"
  - "payment-service.timeout_*"

services:       # 忽略整个服务（顶层 key）
  - "legacy-batch-job"

ignore:         # 简写：含通配符自动归入 patterns，否则归入 paths
  - "*.log_level"
```

键路径格式：`服务名.一级键.二级键[数组索引]`，例如：

```
order-service.rate_limiting.max_requests
payment-service.providers[0]
```

---

## 🔒 敏感字段处理

下列关键词在键路径中出现即视为敏感：
`password, passwd, pwd, secret, token, apikey, api_key, access_key, private_key, cert, credential`

遮蔽规则：
- `≤2 字符`：全部 `*`
- `≤6 字符`：首 + 末保留，中间 `*`
- `更长`：首 2 + `********` + 末 2

示例：`ProdPass_Secure_789!@#` → `Pr********!@#`

**键名始终保留**，便于判断差异含义；**遮蔽仅影响输出值**，不影响差异比较逻辑。
可加 `--no-mask` 临时关闭（只建议本地排障）。

---

## 🧪 本地验证

```bash
# 1. 人类彩色报告
yaml-drift examples/configs

# 2. 人类报告 + 忽略表
yaml-drift examples/configs --ignore-file examples/ignore.yaml --show-ignored

# 3. JSON 输出（人工处理）
yaml-drift examples/configs -f json | python -m json.tool

# 4. CI 模式 + 显示退出码
yaml-drift examples/configs --ci-mode --fail-on high ; echo "exit=$?"

# 5. 三份配置指定环境名
yaml-drift examples/configs/test.yaml examples/configs/staging.yaml examples/configs/production.yaml \
    --env-name TEST --env-name STAG --env-name PROD
```

---

## 📁 代码结构

```
src/yaml_drift/
├── __init__.py
├── cli.py            # argparse + 主流程 + 退出码
├── loader.py         # YAML 加载 / 规范化 / 服务抽取 / 目录扫描
├── comparator.py     # 按键路径递归比较 / 风险分级 / 差异数据结构
├── ignore.py         # 忽略表加载 / 敏感值遮蔽算法
└── reporter.py       # 三种格式报告（human / json / ci）+ 彩色输出
```

- [loader.py](src/yaml_drift/loader.py) 处理 `_normalize_value` 的布尔与空值归一
- [comparator.py](src/yaml_drift/comparator.py) 的 `compare_configs` 是入口
- [reporter.py](src/yaml_drift/reporter.py) 负责三种报告
- [cli.py](src/yaml_drift/cli.py) 的 `_compute_exit_code` 定义退出码规则

---

## 📜 License

MIT
