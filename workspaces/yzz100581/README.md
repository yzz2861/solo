# 工程照片命名整理器

工程助理每天收到监理和施工员发来的现场照片，文件名都是 IMG 开头，楼层和位置写在聊天里，周报找图很崩溃。这个工具帮你自动整理照片！

## 功能特性

- ✅ **自动命名**：按 项目_楼栋_楼层_部位_拍摄日期 格式重命名
- 📍 **位置映射**：支持 Excel/CSV 位置对照表，精确匹配 + 模糊匹配
- 📅 **EXIF 读取**：自动读取照片拍摄时间，无 EXIF 时用文件修改时间
- 👀 **预览模式**：先预览重命名结果，确认后再执行
- ⚠️ **待确认机制**：EXIF 缺失、照片太小、位置信息不完整时进入待确认目录
- 🚫 **未识别保护**：未识别位置的照片保留在源目录，不会丢失
- 🏢 **按楼栋筛选**：周报编辑可以只导出指定楼栋的照片
- 📄 **对照报告**：自动生成原名到新名的对照报告（Markdown/CSV/TXT）
- 📂 **目录归类**：自动按项目/楼栋/楼层/部位创建目录结构

## 安装

```bash
# 克隆或下载代码后，进入项目目录
cd photo-organizer

# 安装依赖
pip install -r requirements.txt

# 或者以开发模式安装
pip install -e .
```

## 快速开始

### 1. 准备位置对照表

创建一个 Excel 或 CSV 文件，包含以下列：

| 原始文件名 | 项目 | 楼栋 | 楼层 | 部位 |
|-----------|------|------|------|------|
| IMG_0001 | 幸福花园小区 | 1号楼 | 3层 | 客厅 |
| IMG_0002 | 幸福花园小区 | 1号楼 | 3层 | 主卧 |
| IMG_* | 滨江壹号 | 6号楼 | * | 剪力墙 |

> 💡 **提示**：原始文件名列支持模糊匹配，使用 `*` 代表任意字符。
>
> 示例对照表请参考 [examples/位置对照表示例.csv](file:///Users/bill/Documents/solo/workspaces/yzz100581/examples/位置对照表示例.csv)

### 2. 查看帮助

```bash
photo-organizer --help
```

### 3. 预览整理结果（推荐！）

在实际整理前，先预览会发生什么：

```bash
photo-organizer preview ./照片目录 ./对照表.xlsx -o ./整理后
```

### 4. 执行整理

```bash
photo-organizer organize ./照片目录 ./对照表.xlsx -o ./整理后
```

### 5. 按楼栋筛选整理

周报编辑可以只整理指定楼栋的照片：

```bash
# 先查看对照表中有哪些楼栋
photo-organizer list-buildings ./对照表.xlsx

# 只整理1号楼的照片
photo-organizer organize ./照片目录 ./对照表.xlsx -o ./整理后 -b "1号楼"
```

## 命令详解

### `organize` - 整理照片

```bash
photo-organizer organize [OPTIONS] PHOTO_DIR MAP_FILE
```

**参数：**

| 参数 | 说明 |
|------|------|
| `PHOTO_DIR` | 照片所在目录（扫描 IMG 开头的图片） |
| `MAP_FILE` | 位置对照表文件（.xlsx 或 .csv） |
| `--output, -o` | **必填** 整理后的输出目录 |
| `--building, -b` | 按楼栋筛选，只处理指定楼栋 |
| `--min-size, -m` | 最小照片大小(KB)，默认 100KB |
| `--name-template` | 自定义命名模板，默认 `{project}_{building}_{floor}_{position}_{shoot_time}` |
| `--copy` | 复制模式，不移动原文件 |
| `--preview-only` | 仅预览，不执行实际整理 |
| `--yes, -y` | 自动确认，跳过交互提示 |
| `--report-format` | 报告格式：md/csv/txt，默认 md |
| `--no-report` | 不生成报告 |

### `preview` - 仅预览

```bash
photo-organizer preview [OPTIONS] PHOTO_DIR MAP_FILE
```

参数同 `organize`，但只预览不执行。

### `list-buildings` - 列出所有楼栋

```bash
photo-organizer list-buildings MAP_FILE
```

查看位置对照表中有哪些楼栋，方便筛选。

### `template` - 查看对照表模板

```bash
photo-organizer template
```

显示位置对照表的格式说明和示例。

## 目录结构说明

整理后的目录结构：

```
整理后/
├── 幸福花园小区/
│   ├── 1号楼/
│   │   ├── 3层/
│   │   │   ├── 客厅/
│   │   │   │   └── 幸福花园小区_1号楼_3层_客厅_20240115_143022.jpg
│   │   │   ├── 主卧/
│   │   │   └── 卫生间/
│   │   └── 5层/
│   └── 2号楼/
├── 滨江壹号/
│   └── 5号楼/
├── _待确认/          # EXIF缺失、照片太小、位置不完整的照片
│   └── 幸福花园小区_1号楼_3层_20240115_143022_[IMG_0099].jpg
├── _未识别位置/       # （已取消，未识别照片保留在源目录）
└── 照片整理报告_20240115_150000.md
```

> ⚠️ **重要**：未识别位置的照片**不会被移动**，保留在原始照片目录中，不会丢失！

## 待确认规则

以下情况的照片会进入 `_待确认` 目录：

1. ❌ **EXIF 拍摄时间缺失**：照片没有 EXIF 信息，使用文件修改时间作为备用
2. 📏 **照片太小**：小于指定大小（默认 100KB），可能是缩略图或截图
3. 📍 **位置信息不完整**：对照表中缺少项目/楼栋/楼层/部位中的某些字段
4. 🔄 **文件名冲突**：多张照片生成相同的新文件名

## 周报编辑工作流

```bash
# 1. 查看对照表中的楼栋
photo-organizer list-buildings ./对照表.xlsx

# 2. 预览1号楼的照片整理结果
photo-organizer preview ./照片 ./对照表.xlsx -o ./周报_1号楼 -b "1号楼"

# 3. 确认无误后执行整理（自动确认+复制模式）
photo-organizer organize ./照片 ./对照表.xlsx -o ./周报_1号楼 -b "1号楼" --copy -y

# 4. 查看生成的报告
cat ./周报_1号楼/照片整理报告_*.md
```

## 示例对照表格式

### CSV 格式

```csv
原始文件名,项目,楼栋,楼层,部位
IMG_0001,幸福花园小区,1号楼,3层,客厅
IMG_0002,幸福花园小区,1号楼,3层,主卧
IMG_*,滨江壹号,6号楼,*,剪力墙
```

### Excel 格式

| 原始文件名 | 项目 | 楼栋 | 楼层 | 部位 |
|-----------|------|------|------|------|
| IMG_0001 | 幸福花园小区 | 1号楼 | 3层 | 客厅 |
| IMG_0002 | 幸福花园小区 | 1号楼 | 3层 | 主卧 |
| IMG_* | 滨江壹号 | 6号楼 | * | 剪力墙 |

## 常见问题

**Q: 未识别位置的照片会被删除吗？**
A: 不会！未识别位置的照片会保留在原始目录中，不会被移动或删除。

**Q: 可以撤销整理操作吗？**
A: 默认使用移动模式，文件会被移动到新位置。如果担心，可以使用 `--copy` 复制模式，原文件保留。

**Q: 支持哪些图片格式？**
A: 支持 JPG、PNG、GIF、BMP、TIFF、HEIC、WebP 等常见格式。

**Q: 如何自定义命名格式？**
A: 使用 `--name-template` 参数，例如：`--name-template "{building}-{floor}-{position}-{shoot_time}"`

## 项目结构

```
photo_organizer/
├── __init__.py
├── cli.py              # CLI 入口
├── location_mapper.py  # 位置对照表解析器
├── metadata_reader.py  # 照片元数据读取器
├── naming_engine.py    # 命名规则引擎
├── conflict_detector.py # 冲突检测器
├── preview_manager.py  # 预览管理器
├── file_organizer.py   # 文件整理执行器
└── report_generator.py # 报告生成器
```

## License

MIT
