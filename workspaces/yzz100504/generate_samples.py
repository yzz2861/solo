#!/usr/bin/env python3
"""生成示例测试数据，用于验证电子签名证据包工具功能"""

import os
import sys
from datetime import datetime, timedelta


def generate_sample_data(output_dir: str):
    """生成模拟的原始证据文件目录结构"""
    output_dir = os.path.abspath(output_dir)
    os.makedirs(output_dir, exist_ok=True)

    contracts = {
        "HT2025010001": {
            "签署人": ["张三", "李四"],
            "日期": "2025-01-15",
        },
        "HT2025020003": {
            "签署人": ["王五"],
            "日期": "2025-02-20",
        },
    }

    file_templates = {
        "contract_pdf": [
            "{contract_id}_合同_签署版_{signer}.pdf",
            "{contract_id}_contract_signed.pdf",
        ],
        "sign_log": [
            "{contract_id}_签署日志_{signer}_{date}.csv",
            "sign_log_{contract_id}_{signer}.json",
        ],
        "sms_verify": [
            "{contract_id}_短信验证记录_{signer}.csv",
            "sms_verify_{signer}_{date}.txt",
        ],
        "cert_chain": [
            "{contract_id}_证书链_根证书.cer",
            "{contract_id}_证书链_中间CA.crt",
            "{signer}_用户证书_{date}.pem",
        ],
        "page_screenshot": [
            "{contract_id}_{signer}_签署完成截图.png",
            "{signer}_签署成功页面.jpg",
            "{contract_id}_时间戳验证截图.png",
        ],
        "attachment": [
            "{contract_id}_附件_补充协议.pdf",
        ],
    }

    created_count = 0
    for contract_id, info in contracts.items():
        signers = info["签署人"]
        date_str = info["日期"]

        for signer in signers:
            for evi_type, templates in file_templates.items():
                for template in templates:
                    filename = template.format(
                        contract_id=contract_id,
                        signer=signer,
                        date=date_str,
                    )
                    filepath = os.path.join(output_dir, filename)
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(f"模拟文件内容\n")
                        f.write(f"合同编号: {contract_id}\n")
                        f.write(f"签署人: {signer}\n")
                        f.write(f"日期: {date_str}\n")
                        f.write(f"证据类型: {evi_type}\n")
                        f.write(f"文件创建时间: {datetime.now().isoformat()}\n")
                    created_count += 1

    extra_files = [
        "HT2025010001_张三_合同_签署版_重签1_2025-01-16_1430.pdf",
        "HT2025010001_李四_截图_缺少关键字的文件.png",
        "HT2025020003_王五_证书链_缺少中间证书.cer",
        "未知来源的文件_乱命名_12345.pdf",
        "HT2025030007_赵六_签署日志_2025-03-01_UTC.csv",
    ]
    for filename in extra_files:
        filepath = os.path.join(output_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"模拟文件内容: {filename}\n")
            f.write(f"此文件用于测试边缘情况识别。\n")
        created_count += 1

    print(f"已在 {output_dir} 生成 {created_count} 个示例文件。")
    print()
    print("其中包含:")
    print("  ✓ 2 份合同（HT2025010001、HT2025020003）")
    print("  ✓ 多位签署人（张三、李四、王五）")
    print("  ✓ 完整证据类型（合同PDF、日志、短信、证书、截图、附件）")
    print("  ⚠ 故意缺失中间证书的合同（用于测试证书链检查）")
    print("  ⚠ 截图文件名缺少关键字（用于测试截图检查）")
    print("  ⚠ 存在重签记录（用于测试时间线和重签检查）")
    print("  ⚠ 含UTC时区的日志（用于测试时区不一致检查）")
    print("  ⚠ 无法识别的乱命名文件（用于测试未分类文件处理）")
    print()
    print(f"运行验证命令:")
    print(f"  python evidence_pack.py {output_dir} --dry-run -v")


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "./sample_raw_evidence"
    generate_sample_data(target)
