"""生成测试数据：模拟真实招投标场景中的各种问题."""
from __future__ import annotations

import os
from pathlib import Path

from pypdf import PdfWriter, PdfReader
from pypdf.generic import NameObject, TextStringObject
from io import BytesIO

try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False


ROOT = Path(__file__).parent / "test-data"


def _make_pdf_content(text_lines, pages=1) -> bytes:
    """用 reportlab 生成带文字的PDF."""
    if not HAS_REPORTLAB:
        buf = BytesIO()
        w = PdfWriter()
        for _ in range(pages):
            w.add_blank_page(width=595, height=842)
        w.write(buf)
        return buf.getvalue()

    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4
    for _ in range(pages):
        y = height - 50
        for line in text_lines:
            if y < 50:
                break
            try:
                c.drawString(50, y, line)
            except Exception:
                c.drawString(50, y, line.encode("utf-8").decode("utf-8", "ignore"))
            y -= 22
        c.showPage()
    c.save()
    return buf.getvalue()


def _write_pdf(path: Path, content: bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    print(f"  ✅ {path.relative_to(ROOT)}")


def main():
    if ROOT.exists():
        import shutil
        shutil.rmtree(ROOT)
    ROOT.mkdir(parents=True)
    print(f"📦 生成测试数据到: {ROOT}\n")

    # ===== 一、企业资质 =====
    print("📁 一、企业资质:")
    # 1. 营业执照（正常版本 - 最终版，有盖章关键字）
    _write_pdf(
        ROOT / "资料-营业执照" / "营业执照_正本_最终版.pdf",
        _make_pdf_content([
            "营业执照",
            "统一社会信用代码: 91110000XXXXXXXX",
            "公司名称：XX建筑工程有限公司",
            "成立日期：2010-05-01",
            "营业期限：2010年05月01日 至 2028年06月30日",
            "（公章）",
            "公司盖章处",
        ], pages=1),
    )
    # 旧版营业执照（已过期 - 用于验证过期检查, 不应被选中因为有最终版）
    _write_pdf(
        ROOT / "资料-营业执照" / "营业执照_2023旧版.pdf",
        _make_pdf_content([
            "营业执照",
            "统一社会信用代码: 91110000XXXXXXXX",
            "营业期限：至 2020年12月31日",
            "公章",
        ], pages=1),
    )

    # 2. 授权书（授权人姓名对不上 + 缺盖章页 + 页数异常）
    _write_pdf(
        ROOT / "资料-营业执照" / "授权委托书_李小红.pdf",
        _make_pdf_content([
            "法定代表人授权委托书",
            "致：XX招标代理有限公司",
            "本授权书声明：XX建筑工程有限公司",
            "法定代表人：张大鹏",
            "授权 李小红 为我司代理人",
            "代理人在本次投标活动中签署的文件我司均承认",
            "（注意：没有盖章关键字，页数1，但要求2页）",
        ], pages=1),
    )
    # 草稿版授权书（授权人姓名正确但是是草稿）
    _write_pdf(
        ROOT / "资料-营业执照" / "授权委托书_王小明_draft.pdf",
        _make_pdf_content([
            "法定代表人授权委托书（草稿）",
            "授权人：王小明",
            "单位公章",
        ], pages=2),
    )

    # ===== 二、人员证书 =====
    print("\n📁 二、人员证书:")
    # 项目经理建造师（正常）
    _write_pdf(
        ROOT / "资料-人员证书" / "王大锤_一级建造师证_最终版.pdf",
        _make_pdf_content([
            "中华人民共和国一级建造师注册证书",
            "姓名：王大锤",
            "注册编号：JZ000001",
            "专业：建筑工程",
            "有效期至：2027年12月31日",
            "签章",
        ], pages=2),
    )

    # 安全员B证（即将过期 - 警告场景）
    _write_pdf(
        ROOT / "资料-人员证书" / "王大锤_安全B证.pdf",
        _make_pdf_content([
            "安全生产考核合格证书",
            "姓名：王大锤",
            "证书类别：B类",
            "证书编号：AQ-B-0001",
            "有效期至 2026-08-31",
            "公章",
        ], pages=1),
    )

    # 高工证（缺！目录下只有扫描件版本-非PDF，故意不提供）
    _write_pdf(
        ROOT / "资料-人员证书" / "技术负责人_高工证_扫描件.jpg_误命名.pdf",
        _make_pdf_content([
            "这是个误命名的非高工证书",
            "安全员C证",
        ], pages=1),
    )

    # ===== 三、业绩合同 =====
    print("\n📁 三、业绩合同:")
    # XX广场合同 - 页数不足（缺页，10页但要求20-60）+ 缺盖章
    _write_pdf(
        ROOT / "资料-业绩合同" / "XX广场施工合同_未盖章版.pdf",
        _make_pdf_content([
            "建设工程施工合同",
            "工程名称：XX广场商业综合体",
            "发包人：XX地产集团",
            "承包人：XX建筑工程有限公司",
            "合同金额：人民币8000万元",
            "签约日期：2023年3月15日",
        ] + [f"第{i}条 工程内容..." for i in range(1, 6)], pages=10),
    )
    # YY大厦合同 - 正常
    _write_pdf(
        ROOT / "资料-业绩合同" / "YY大厦_合同_最终版_盖公章.pdf",
        _make_pdf_content([
            "YY大厦总承包合同",
            "发包人：YY置业有限公司",
            "承包人：XX建筑工程有限公司",
            "合同总价：1.2亿元",
            "合同工期：730天",
            "公章位置",
            "双方签章",
        ] + [f"附件{i}" for i in range(1, 20)], pages=20),
    )

    # ===== 四、盖章版标书 =====
    print("\n📁 四、盖章版标书:")
    # 技术标-页数不够（70页，但要求80-120）
    _write_pdf(
        ROOT / "资料-盖章版标书" / "技术标_盖章_最终版.pdf",
        _make_pdf_content(
            ["技术标 - XX项目", "施工组织设计", "项目管理机构", "公章"] +
            [f"第{i}章内容..." for i in range(1, 68)],
            pages=70,
        ),
    )
    # 商务标-正常但故意放一份无盖章的
    _write_pdf(
        ROOT / "资料-盖章版标书" / "商务标_最终版_无盖章字样.pdf",
        _make_pdf_content(
            ["商务标 - XX项目", "投标报价表", "唱标单", "价格汇总"] +
            [f"第{i}项明细..." for i in range(1, 100)],
            pages=95,
        ),
    )

    print(f"\n✅ 测试数据生成完成！共 11 个文件")
    print(f"   目录：{ROOT}")
    print()
    print("预期会检查出的问题：")
    print("  ❌ 授权书：授权人姓名李小红≠王小明；缺盖章；页数1≠2页")
    print("  ❌ 安全员B证：即将过期告警（剩余<60天）")
    print("  ❌ 高工证：未匹配到（误命名文件）")
    print("  ❌ XX广场合同：页数10<要求20-60；缺盖章")
    print("  ❌ 技术标：页数70<要求80-120")
    print("  ❌ 商务标：未检测到盖章关键字")
    print("  ⚠️  存在多个相似文件的警告（营业执照多版本）")


if __name__ == "__main__":
    main()
