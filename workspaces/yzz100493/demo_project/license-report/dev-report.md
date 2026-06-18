# 研发依赖许可证修复报告

- 扫描时间：2026-06-18 00:25:19
- 扫描文件：2 个
- 总依赖数：12
- 风险依赖数：6
- 合规依赖数：6

## ⚠️  相比上一次扫描新增的风险

- `npm:some-gpl-lib@1.0.0` — 限制许可证（GPL-3.0）
- `npm:unknown-license@0.1.0` — 缺失许可证（未声明）
- `npm:dual-risk@1.0.0` — 双许可-部分合规（GPL-3.0 OR MIT）
- `npm:weird-pkg@0.0.1` — 存疑/未知（MySecretLicense）
- `pip:requests@2.31.0` — 缺失许可证（未声明）
- `pip:flask@2.3.3` — 缺失许可证（未声明）

## 🚨 风险依赖明细与修复建议

### 高风险（1 个）

#### `npm:some-gpl-lib@1.0.0`

- 许可证分类：**限制许可证**
- 许可证原文：`GPL-3.0`
- 标准化标识符：GPL-3.0
- 依赖类型：生产依赖
- 进入构建产物：否
- 说明：许可证 GPL-3.0 属于限制类
- 修复建议：
  - 评估是否可替换为白名单许可证的等价库
  - 联系法务评审 GPL/AGPL/SSPL 等传染型许可证的合规边界
  - 如必须使用，启动法务审批并在 package_exceptions 中登记例外

### 中风险（5 个）

#### `npm:unknown-license@0.1.0`

- 许可证分类：**缺失许可证**
- 许可证原文：`(缺失)`
- 标准化标识符：UNKNOWN
- 依赖类型：生产依赖
- 进入构建产物：否
- 说明：未声明许可证
- 修复建议：
  - 在 package.json / pyproject.toml 中显式声明 license 字段
  - 检查 LICENSE 文件并在元数据中同步
  - 确认项目是否有 LICENSE 文件，补入对应 SPDX 标识符

#### `npm:dual-risk@1.0.0`

- 许可证分类：**双许可-部分合规**
- 许可证原文：`GPL-3.0 OR MIT`
- 标准化标识符：GPL-3.0, MIT
- 依赖类型：生产依赖
- 进入构建产物：否
- 说明：双许可存在合规分支但含限制/存疑项: GPL-3.0, MIT，需法务确认是否选用合规分支
- 修复建议：
  - 明确项目采用双许可证中的哪一个分支（通常 OR 任取其一）
  - 优先选择合规分支并在文档/配置中记录
  - 向法务确认双许可的可接受方案
  - 查阅官方仓库 LICENSE 文件确认准确的 SPDX 标识符
  - 在 issue/邮件中向维护者确认许可证
  - 无法确认时向法务提交需确认包名单

#### `npm:weird-pkg@0.0.1`

- 许可证分类：**存疑/未知**
- 许可证原文：`MySecretLicense`
- 标准化标识符：MySecretLicense
- 依赖类型：生产依赖
- 进入构建产物：否
- 说明：许可证 MySecretLicense 未在白名单中，需法务确认
- 修复建议：
  - 查阅官方仓库 LICENSE 文件确认准确的 SPDX 标识符
  - 在 issue/邮件中向维护者确认许可证
  - 无法确认时向法务提交需确认包名单

#### `pip:requests@2.31.0`

- 许可证分类：**缺失许可证**
- 许可证原文：`(缺失)`
- 标准化标识符：UNKNOWN
- 依赖类型：生产依赖
- 进入构建产物：否
- 说明：未声明许可证
- 修复建议：
  - 在 package.json / pyproject.toml 中显式声明 license 字段
  - 检查 LICENSE 文件并在元数据中同步
  - 确认项目是否有 LICENSE 文件，补入对应 SPDX 标识符

#### `pip:flask@2.3.3`

- 许可证分类：**缺失许可证**
- 许可证原文：`(缺失)`
- 标准化标识符：UNKNOWN
- 依赖类型：生产依赖
- 进入构建产物：否
- 说明：未声明许可证
- 修复建议：
  - 在 package.json / pyproject.toml 中显式声明 license 字段
  - 检查 LICENSE 文件并在元数据中同步
  - 确认项目是否有 LICENSE 文件，补入对应 SPDX 标识符

## 🧪 开发依赖进入构建产物

- `npm:jest@29.7.0`

修复建议：
- 检查打包配置（webpack/vite/rollup/tree-shaking）是否错误包含 devDependency
- 把构建期仅用的工具（如 babel、eslint、jest）限定为 devDependencies
- 验证产物内容确认不再包含开发依赖

## 🔀 双许可证包

- `npm:dual-risk@1.0.0` — GPL-3.0, MIT — **双许可-部分合规**
