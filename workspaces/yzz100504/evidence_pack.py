#!/usr/bin/env python3
"""电子签名证据包整理工具 - 主入口

用法:
    python evidence_pack.py <扫描目录> [选项]

示例:
    python evidence_pack.py ./raw_evidence --output ./evidence_packages
    python evidence_pack.py ./raw_evidence --case AJ2025001 --copy
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path


def print_banner():
    print("=" * 60)
    print("  电子签名证据包整理工具 v1.0.0")
    print("  Electronic Signature Evidence Packager")
    print("=" * 60)
    print()


def main():
    parser = argparse.ArgumentParser(
        description="电子签名证据包整理工具：扫描目录、按合同和签署人分类、检查完整性、生成归档目录和报告。",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s ./raw_evidence
  %(prog)s ./raw_evidence -o ./evidence_packages
  %(prog)s ./raw_evidence --case AJ2025001 --copy
  %(prog)s ./raw_evidence --config ./my_config.yaml --dry-run
        """,
    )

    parser.add_argument(
        "scan_dir",
        metavar="扫描目录",
        help="存放原始证据文件的目录路径",
    )
    parser.add_argument(
        "-o", "--output",
        metavar="输出目录",
        default=None,
        help="输出归档目录（默认：<扫描目录>/_证据包输出）",
    )
    parser.add_argument(
        "-c", "--config",
        metavar="配置文件",
        default=None,
        help="自定义配置文件路径（默认使用内置 config.yaml）",
    )
    parser.add_argument(
        "--case",
        metavar="案件编号",
        default=None,
        help="案件台账编号，将写入交接清单和报告（可选）",
    )
    parser.add_argument(
        "--copy",
        action="store_true",
        default=False,
        help="复制文件到归档目录（默认使用符号链接，不复制原件）",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="仅扫描和检查，不生成归档目录和报告",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        default=False,
        help="显示详细处理信息",
    )

    args = parser.parse_args()

    print_banner()

    scan_dir = os.path.abspath(args.scan_dir)
    if not os.path.isdir(scan_dir):
        print(f"[错误] 扫描目录不存在: {scan_dir}", file=sys.stderr)
        sys.exit(1)

    if args.output:
        output_dir = os.path.abspath(args.output)
    else:
        output_dir = os.path.join(scan_dir, "_证据包输出")

    try:
        from evi_pack.config import load_config
        from evi_pack.scanner import DirectoryScanner
        from evi_pack.validator import EvidenceValidator, Severity
        from evi_pack.archiver import PackageArchiver
        from evi_pack.reporter import ReportGenerator
    except ImportError as e:
        print(f"[错误] 模块加载失败: {e}", file=sys.stderr)
        print("请确保在项目根目录运行此脚本。", file=sys.stderr)
        sys.exit(1)

    try:
        cfg = load_config(args.config)
    except Exception as e:
        print(f"[错误] 配置文件加载失败: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"[信息] 扫描目录: {scan_dir}")
    if not args.dry_run:
        print(f"[信息] 输出目录: {output_dir}")
    if args.case:
        print(f"[信息] 案件编号: {args.case}")
    print(f"[信息] 文件操作: {'复制原件' if args.copy else '创建符号链接（不修改原件）'}")
    if args.dry_run:
        print("[信息] 试运行模式：不生成归档文件")
    print()

    print("[1/4] 扫描目录并识别证据文件...")
    scanner = DirectoryScanner(cfg)

    exclude_dirs = set()
    if not args.dry_run:
        exclude_dirs.add(output_dir)

    scan_result = scanner.scan(scan_dir, exclude_dirs=exclude_dirs)

    print(f"      共扫描 {scan_result.total_files} 个文件")
    print(f"      识别到 {len(scan_result.contracts)} 份合同")
    for cid in sorted(scan_result.contracts.keys()):
        contract = scan_result.contracts[cid]
        signer_count = len(contract.signers)
        file_count = len(contract.all_files)
        print(f"        - {cid}: {signer_count} 位签署人, {file_count} 个文件")
    if scan_result.unclassified_files:
        print(f"      ⚠ 未分类文件: {len(scan_result.unclassified_files)} 个")
    print()

    print("[2/4] 检查证据完整性和合规性...")
    validator = EvidenceValidator(cfg)
    validation_result = validator.validate(scan_result)

    errors = len(validation_result.errors)
    warnings = len(validation_result.warnings)
    infos = len(validation_result.infos)
    print(f"      发现问题: 🔴 {errors} 严重  🟡 {warnings} 警告  🔵 {infos} 提示")

    if args.verbose:
        for issue in validation_result.issues:
            icon = {"error": "🔴", "warning": "🟡", "info": "🔵"}.get(
                issue.severity.value, "•"
            )
            parts = []
            if issue.contract_id:
                parts.append(f"合同:{issue.contract_id}")
            if issue.signer_name:
                parts.append(f"签署人:{issue.signer_name}")
            ctx = f"[{', '.join(parts)}]" if parts else ""
            print(f"        {icon} {ctx} {issue.message}")
    print()

    if args.dry_run:
        print("[信息] 试运行模式结束，未生成归档文件。")
        print()
        if errors > 0:
            print("[警告] 存在严重错误，建议修正后再正式归档。")
        return

    print("[3/4] 生成归档目录和证据包编号...")
    archiver = PackageArchiver(cfg)
    archive_result = archiver.archive(
        scan_result, output_dir, copy_files=args.copy
    )

    print(f"      生成 {archive_result.total_packages} 个证据包")
    print(f"      归档 {archive_result.total_files_archived} 个文件")
    for pkg in archive_result.packages:
        print(f"        - {pkg.package_id} (合同: {pkg.contract_id})")
    print()

    print("[4/4] 生成交接清单和检查报告...")
    reporter = ReportGenerator(cfg)
    outputs = reporter.generate_all(
        output_dir, scan_result, validation_result, archive_result, args.case
    )

    print(f"      检查报告: {outputs.get('report', '')}")
    print(f"      交接清单: {outputs.get('manifest', '')}")
    if archive_result.index_path:
        print(f"      索引文件: {archive_result.index_path}")
    print()

    print("=" * 60)
    print("处理完成!")
    print(f"输出目录: {output_dir}")
    if errors > 0:
        print(f"⚠ 仍有 {errors} 个严重错误，请查看报告详情。")
    if warnings > 0:
        print(f"⚠ 有 {warnings} 个警告项需要关注。")
    print("=" * 60)


if __name__ == "__main__":
    main()
