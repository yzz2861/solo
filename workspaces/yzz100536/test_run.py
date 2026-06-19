#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import traceback

def test():
    print("开始测试...\n")

    print("1. 测试报销表读取...")
    try:
        from invoice_checker.reimbursement_reader import ReimbursementReader
        reader = ReimbursementReader()
        entries = reader.read('samples/报销表示例.xlsx')
        print(f"   ✓ 成功读取 {len(entries)} 条报销记录")
        for e in entries[:3]:
            print(f"     - {e.buyer_name} | ¥{e.amount:.2f} | {e.project_remark}")
    except Exception as e:
        print(f"   ✗ 失败: {e}")
        traceback.print_exc()
        return False

    print("\n2. 测试PDF解析...")
    try:
        from invoice_checker.pdf_parser import PDFInvoiceParser
        parser = PDFInvoiceParser()
        import os
        pdf_files = [f for f in os.listdir('samples/invoices') if f.endswith('.pdf')]
        print(f"   找到 {len(pdf_files)} 个PDF文件")
        if pdf_files:
            first_pdf = os.path.join('samples/invoices', pdf_files[0])
            invoice = parser.parse(first_pdf)
            print(f"   ✓ 解析成功: {first_pdf}")
            print(f"     发票号: {invoice.invoice_number or '未识别'}")
            print(f"     购方: {invoice.buyer_name or '未识别'}")
            print(f"     金额: ¥{invoice.total_amount or 0:.2f}")
            print(f"     可信度: {invoice.parse_confidence:.0%}")
    except Exception as e:
        print(f"   ✗ 失败: {e}")
        traceback.print_exc()
        return False

    print("\n3. 测试完整核验流程...")
    try:
        from invoice_checker import InvoiceVerifier, Config
        from invoice_checker.report_generator import ReportGenerator

        config = Config()
        verifier = InvoiceVerifier(config)

        print("   正在解析和核验发票...")
        report = verifier.verify_batch('samples/invoices', 'samples/报销表示例.xlsx', 'output')

        print(f"   ✓ 核验完成")
        print(f"     总计: {report.total_invoices} 张")
        print(f"     可报销: {report.approved_count} 张")
        print(f"     需人工核验: {report.need_review_count} 张")
        print(f"     疑似重复: {report.duplicate_count} 张")

        print("\n   生成报告...")
        report_generator = ReportGenerator(config)
        output_files = report_generator.generate(report, 'output', ['xlsx', 'txt', 'md'])

        print(f"   ✓ 报告已生成:")
        for fmt, path in output_files.items():
            print(f"     {fmt.upper()}: {path}")

        report_generator.print_console_summary(report)

    except Exception as e:
        print(f"   ✗ 失败: {e}")
        traceback.print_exc()
        return False

    print("\n✅ 所有测试通过！")
    return True

if __name__ == '__main__':
    success = test()
    sys.exit(0 if success else 1)
