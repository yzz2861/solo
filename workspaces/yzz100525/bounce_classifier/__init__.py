"""邮件退信分类脚本。

模块：
    models       - 数据结构定义
    config       - 分类规则与常量
    parser       - 邮件文件解析 (.eml / .mbox / 纯文本)
    extractor    - 退信字段抽取
    classifier   - 分类与去重合并
    reporter     - 运营/客户经理报告生成 (CSV / Excel)
    contact_sync - 联系人清单回写
"""

__version__ = "1.0.0"
