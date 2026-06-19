#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成示例报销表和模拟发票数据
"""
import os
import sys
from datetime import datetime, timedelta
import random

try:
    import pandas as pd
except ImportError:
    print("请先安装依赖: pip install pandas openpyxl")
    sys.exit(1)


def generate_reimbursement_excel(output_path: str):
    """生成示例报销表"""
    data = [
        {
            '购方抬头': '北京科技有限公司',
            '金额': 12500.00,
            '项目备注': '2024年Q4服务器采购',
            '发票号码': '24118001',
            '申请人': '张三',
            '部门': 'IT部',
        },
        {
            '购方抬头': '北京科技有限公司',
            '金额': 3580.50,
            '项目备注': '办公设备购置',
            '发票号码': '24118002',
            '申请人': '李四',
            '部门': '行政部',
        },
        {
            '购方抬头': '北京科技有限公司',
            '金额': 15600.00,
            '项目备注': '差旅费用',
            '发票号码': '24118003',
            '申请人': '王五',
            '部门': '销售部',
        },
        {
            '购方抬头': '北京科技有限公司',
            '金额': 890.00,
            '项目备注': '办公用品采购',
            '发票号码': '24118004',
            '申请人': '赵六',
            '部门': '行政部',
        },
        {
            '购方抬头': '北京科技有限公司',
            '金额': 25800.00,
            '项目备注': '软件服务费',
            '发票号码': '24118005',
            '申请人': '孙七',
            '部门': '研发部',
        },
        {
            '购方抬头': '北京科技有限公司',
            '金额': 3580.50,
            '项目备注': '2024年Q4服务器采购',
            '发票号码': '24118002',
            '申请人': '周八',
            '部门': '财务部',
        },
        {
            '购方抬头': '上海贸易公司',
            '金额': 1200.00,
            '项目备注': '客户招待',
            '发票号码': '24118006',
            '申请人': '吴九',
            '部门': '销售部',
        },
        {
            '购方抬头': '北京科技有限公司',
            '金额': 8600.00,
            '项目备注': '培训费',
            '发票号码': '24118007',
            '申请人': '郑十',
            '部门': '人力资源部',
        },
    ]

    df = pd.DataFrame(data)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_excel(output_path, index=False, sheet_name='报销明细')
    print(f"已生成示例报销表: {output_path}")
    return output_path


def generate_sample_invoice_content(invoice_num: str, buyer_name: str, amount: float,
                                    is_red_flush: bool = False, is_scanned: bool = False) -> str:
    """生成模拟发票文本内容"""
    from datetime import datetime

    today = datetime.now()
    date_str = today.strftime('%Y年%m月%d日')
    amount_cn = number_to_chinese(amount)

    if is_red_flush:
        prefix = "（红字）"
        amount = -abs(amount)
    else:
        prefix = ""

    content = f"""
{prefix}增值税电子普通发票

发票代码：110012345678
发票号码：{invoice_num}
开票日期：{date_str}
校 验 码：12345 67890 12345

机器编号：4990001234567

购 买 方
名    称：{buyer_name}
纳税人识别号：91110108MA01ABCD12
地 址 电 话：北京市海淀区中关村大街1号 010-12345678
开户行及账号：中国工商银行北京分行 0200001234567890123

销 售 方
名    称：北京某某科技发展有限公司
纳税人识别号：91110105MA02EFGH45
地 址 电 话：北京市朝阳区建国路88号 010-87654321
开户行及账号：中国建设银行北京分行 11001234567890123456

货物或应税劳务、服务名称  规格型号  单位  数量  单价  金额  税率  税额
*信息技术服务*软件开发服务费  项  1  {amount:.2f}  {amount:.2f}  6%  {amount*0.06:.2f}

合  计   ¥{amount:.2f}   ¥{amount*0.06:.2f}
价税合计（大写）  {amount_cn} （小写）¥{amount:.2f}

销售方（章）
（发票专用章）

开票人：系统管理员
复核：
收款人：

全国统一发票监制章
北京 市 税 务 局
发票监制章
"""

    if is_scanned:
        content = content.replace('\n', '\n').lower()

    return content


def number_to_chinese(amount: float) -> str:
    """将数字金额转换为中文大写"""
    if amount < 0:
        return "负" + number_to_chinese(-amount)

    cn_nums = "零壹贰叁肆伍陆柒捌玖"
    cn_units = ["", "拾", "佰", "仟", "万", "拾", "佰", "仟", "亿"]
    dec_units = ["角", "分"]

    int_part = int(amount)
    dec_part = int(round((amount - int_part) * 100))

    result = ""
    if int_part == 0:
        result = "零"
    else:
        int_str = str(int_part)
        length = len(int_str)
        zero_flag = False

        for i, digit in enumerate(int_str):
            d = int(digit)
            unit_pos = length - 1 - i

            if d == 0:
                zero_flag = True
                if unit_pos == 4:
                    result += "万"
                    zero_flag = False
                elif unit_pos == 8:
                    result += "亿"
                    zero_flag = False
            else:
                if zero_flag:
                    result += "零"
                    zero_flag = False
                result += cn_nums[d] + cn_units[unit_pos]

    result += "元"

    if dec_part == 0:
        result += "整"
    else:
        jiao = dec_part // 10
        fen = dec_part % 10
        if jiao > 0:
            result += cn_nums[jiao] + "角"
        if fen > 0:
            result += cn_nums[fen] + "分"

    return result


def generate_mock_pdfs(output_dir: str, reimbursement_path: str):
    """生成模拟的发票PDF文件（用于测试）"""
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.cidfonts import UnicodeCIDFont
    except ImportError:
        print("未安装 reportlab，跳过生成模拟PDF")
        print("请运行: pip install reportlab")
        return []

    try:
        pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
    except:
        pass

    os.makedirs(output_dir, exist_ok=True)
    df = pd.read_excel(reimbursement_path)

    generated_files = []

    for idx, row in df.iterrows():
        invoice_num = str(row['发票号码'])
        buyer_name = row['购方抬头']
        amount = row['金额']

        is_red_flush = (idx == 5)
        is_scanned = (idx == 6)

        content = generate_sample_invoice_content(invoice_num, buyer_name, amount, is_red_flush, is_scanned)

        pdf_path = os.path.join(output_dir, f"发票_{invoice_num}.pdf")
        c = canvas.Canvas(pdf_path, pagesize=A4)

        try:
            c.setFont('STSong-Light', 10)
        except:
            c.setFont("Helvetica", 10)

        y_position = 800
        for line in content.split('\n'):
            if y_position < 50:
                c.showPage()
                try:
                    c.setFont('STSong-Light', 10)
                except:
                    pass
                y_position = 800

            c.drawString(50, y_position, line)
            y_position -= 15

        c.save()
        generated_files.append(pdf_path)
        print(f"  已生成: {pdf_path}")

    return generated_files


def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    samples_dir = os.path.join(base_dir, 'samples')
    invoices_dir = os.path.join(samples_dir, 'invoices')

    print("正在生成示例数据...\n")

    reimbursement_path = os.path.join(samples_dir, '报销表示例.xlsx')
    generate_reimbursement_excel(reimbursement_path)

    print(f"\n正在生成模拟发票PDF到: {invoices_dir}")
    pdfs = generate_mock_pdfs(invoices_dir, reimbursement_path)

    if pdfs:
        print(f"\n✅ 成功生成 {len(pdfs)} 个示例发票PDF")
    else:
        print("\n⚠️  未生成PDF，你可以将真实发票PDF放入 samples/invoices/ 目录")

    print("\n示例数据说明:")
    print("  - 第6行：发票号24118002 重复出现（模拟跨项目重复报销）")
    print("  - 第7行：购方抬头为上海贸易公司（模拟购方不匹配）")
    print("  - 发票24118002：模拟红冲发票")
    print("  - 发票24118006：模拟扫描版发票")

    print("\n使用方法:")
    print(f"  python main.py verify -i {invoices_dir} -r {reimbursement_path} -o ./output")

    return 0


if __name__ == '__main__':
    sys.exit(main())
