import json
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from datetime import datetime
from collections import defaultdict

from config import config
from models import (
    ScanResult, PackageFile, IssueSeverity, IssueType,
    PublishablePackage, RejectionNotice
)


ISSUE_TYPE_SUGGESTIONS = {
    IssueType.BETA_VERSION.value: [
        "请确认是否需要发布此测试版本",
        "如需发布正式版，请重新打包时移除 beta/rc 等预发布标签",
        "如确需发布测试版，请在发布说明中明确标注"
    ],
    IssueType.DUPLICATE_PACKAGE.value: [
        "请确认哪个是正确的发布包",
        "删除重复或过时的安装包文件",
        "建议保留最新修改时间且文件大小合理的版本"
    ],
    IssueType.MISSING_CHANGELOG.value: [
        "请补充 CHANGELOG.md 文件",
        "在发布说明中列出此版本的变更内容"
    ],
    IssueType.CHECKSUM_EXPIRED.value: [
        "请重新生成校验和文件",
        "确保校验和文件的修改时间晚于安装包",
        "使用命令: sha256sum <package> > <package>.sha256"
    ],
    IssueType.VERSION_MISMATCH.value: [
        "请检查文件名中的版本号是否正确",
        "确保安装包、校验和、发布说明三者版本一致"
    ],
    IssueType.PLATFORM_MISMATCH.value: [
        "请在文件名中明确标注平台信息",
        "建议格式: <产品名>-<版本>-<平台>.<后缀>"
    ],
    IssueType.MISSING_CHECKSUM.value: [
        "请为此安装包生成校验和文件",
        "使用命令: sha256sum <package> > <package>.sha256",
        "校验和文件应与安装包放在同一目录"
    ],
    IssueType.INVALID_CHECKSUM.value: [
        "安装包可能已损坏或被篡改",
        "请重新生成校验和文件",
        "请重新上传/下载安装包后再次校验"
    ],
    IssueType.MISSING_RELEASE_NOTE.value: [
        "请在发布说明中添加此版本的记录",
        "确保发布说明中包含所有要发布的版本"
    ],
    IssueType.INCOMPLETE_RELEASE_NOTE.value: [
        "请在发布说明中添加 Bug 修复章节",
        "列出此版本修复的具体问题",
        "建议使用 '修复:' 或 'Bug Fixes:' 作为章节标题"
    ],
    IssueType.UNKNOWN_PLATFORM.value: [
        "请在文件名中添加平台标识",
        "建议使用: win/macos/linux/android/ios"
    ],
}


class ReportGenerator:
    def __init__(self, scan_result: ScanResult, diff_result: Optional[Dict] = None):
        self.scan_result = scan_result
        self.diff_result = diff_result

    def classify_packages(self) -> Tuple[List[PublishablePackage], List[PublishablePackage], List[PublishablePackage]]:
        can_publish = []
        needs_review = []
        must_reject = []

        for pkg in self.scan_result.packages:
            has_blocker = any(
                i.severity == IssueSeverity.BLOCKER for i in pkg.issues
            )
            has_warning = any(
                i.severity == IssueSeverity.WARNING for i in pkg.issues
            )

            reasons = [issue.message for issue in pkg.issues]

            if has_blocker:
                must_reject.append(PublishablePackage(
                    package=pkg,
                    status="退回",
                    reasons=reasons,
                    can_publish=False
                ))
            elif has_warning:
                needs_review.append(PublishablePackage(
                    package=pkg,
                    status="需审核",
                    reasons=reasons,
                    can_publish=False
                ))
            else:
                can_publish.append(PublishablePackage(
                    package=pkg,
                    status="可发布",
                    reasons=reasons,
                    can_publish=True
                ))

        return can_publish, needs_review, must_reject

    def generate_rejection_notices(self, must_reject: List[PublishablePackage]) -> List[RejectionNotice]:
        notices = []
        for item in must_reject:
            pkg = item.package
            suggestions = []
            for issue in pkg.issues:
                if issue.severity == IssueSeverity.BLOCKER:
                    issue_type = issue.type.value
                    if issue_type in ISSUE_TYPE_SUGGESTIONS:
                        suggestions.extend(ISSUE_TYPE_SUGGESTIONS[issue_type])
                    if 'suggestion' in issue.details:
                        suggestions.append(issue.details['suggestion'])

            suggestions = list(dict.fromkeys(suggestions))[:5]

            notices.append(RejectionNotice(
                package_name=pkg.file_name,
                version=pkg.version_str or "未知版本",
                platform=pkg.platform or "未知平台",
                reasons=item.reasons,
                suggestions=suggestions
            ))
        return notices

    def generate_text_report(self, output_dir: str) -> str:
        can_publish, needs_review, must_reject = self.classify_packages()
        rejection_notices = self.generate_rejection_notices(must_reject)

        lines = []
        lines.append("=" * 80)
        lines.append("安装包版本清单对齐报告")
        lines.append(f"扫描时间: {self.scan_result.scan_time:%Y-%m-%d %H:%M:%S}")
        lines.append("=" * 80)
        lines.append("")

        lines.append("一、总体概览")
        lines.append("-" * 40)
        lines.append(f"  总安装包数: {len(self.scan_result.packages)}")
        lines.append(f"  校验和文件: {len(self.scan_result.checksums)}")
        lines.append(f"  发布说明文件: {len(self.scan_result.release_notes)}")
        lines.append(f"  问题总数: {len(self.scan_result.all_issues)}")
        lines.append(f"  可发布: {len(can_publish)}")
        lines.append(f"  需审核: {len(needs_review)}")
        lines.append(f"  需退回: {len(must_reject)}")
        lines.append("")

        if self.diff_result and self.diff_result.get('has_previous'):
            lines.append("二、与上次运行对比")
            lines.append("-" * 40)
            lines.append(f"  上次扫描: {self.diff_result['previous_run_time']}")
            lines.append(f"  变化总结: {self.diff_result['summary']}")

            stats_diff = self.diff_result.get('statistics_diff', {})
            if stats_diff.get('can_publish_change', 0) != 0:
                change = stats_diff['can_publish_change']
                arrow = "↑" if change > 0 else "↓"
                lines.append(f"  可发布数量: {arrow} {abs(change)} 个")
            if stats_diff.get('total_issues_change', 0) != 0:
                change = stats_diff['total_issues_change']
                arrow = "↑" if change > 0 else "↓"
                lines.append(f"  问题总数: {arrow} {abs(change)} 个")

            if self.diff_result.get('fixed_issues'):
                lines.append(f"  已修复问题: {sum(len(f['fixed_issues']) for f in self.diff_result['fixed_issues'])} 个")
            if self.diff_result.get('new_issues'):
                lines.append(f"  新增问题: {sum(len(n['new_issues']) for n in self.diff_result['new_issues'])} 个")
            lines.append("")

        lines.append("三、可发布清单")
        lines.append("-" * 40)
        if can_publish:
            for i, item in enumerate(can_publish, 1):
                pkg = item.package
                lines.append(f"  {i}. {pkg.file_name}")
                lines.append(f"     版本: {pkg.version_str} | 平台: {pkg.platform}")
                lines.append(f"     大小: {self._format_size(pkg.file_size)} | 修改时间: {pkg.modified_time:%Y-%m-%d %H:%M}")
                if pkg.checksum:
                    lines.append(f"     校验和 ({pkg.checksum_file.split('.')[-1] if pkg.checksum_file else 'sha256'}): {pkg.checksum[:16]}...")
                lines.append("")
        else:
            lines.append("  （无）")
            lines.append("")

        lines.append("四、需审核清单 (有警告但无阻断问题)")
        lines.append("-" * 40)
        if needs_review:
            for i, item in enumerate(needs_review, 1):
                pkg = item.package
                lines.append(f"  {i}. {pkg.file_name}")
                lines.append(f"     版本: {pkg.version_str} | 平台: {pkg.platform}")
                lines.append(f"     警告原因:")
                for reason in item.reasons:
                    lines.append(f"       - {reason}")
                lines.append("")
        else:
            lines.append("  （无）")
            lines.append("")

        lines.append("五、需退回清单 (有阻断问题)")
        lines.append("-" * 40)
        if must_reject:
            for i, item in enumerate(must_reject, 1):
                pkg = item.package
                lines.append(f"  {i}. {pkg.file_name}")
                lines.append(f"     版本: {pkg.version_str} | 平台: {pkg.platform}")
                lines.append(f"     退回原因:")
                for reason in item.reasons:
                    lines.append(f"       ✗ {reason}")
                lines.append("")
        else:
            lines.append("  （无）")
            lines.append("")

        if rejection_notices:
            lines.append("六、给打包同事的详细退回通知")
            lines.append("-" * 40)
            lines.append("")
            for i, notice in enumerate(rejection_notices, 1):
                lines.append(f"【通知 {i}】@{notice.assignee}")
                lines.append(f"  安装包: {notice.package_name}")
                lines.append(f"  版本: {notice.version} | 平台: {notice.platform}")
                lines.append(f"  不能发布的原因:")
                for j, reason in enumerate(notice.reasons, 1):
                    lines.append(f"    {j}. {reason}")
                if notice.suggestions:
                    lines.append(f"  建议处理方式:")
                    for j, suggestion in enumerate(notice.suggestions, 1):
                        lines.append(f"    {j}. {suggestion}")
                lines.append("")

        lines.append("七、问题分类统计")
        lines.append("-" * 40)
        issue_stats = defaultdict(lambda: {'count': 0, 'severity': ''})
        for issue in self.scan_result.all_issues:
            key = issue.type.value
            issue_stats[key]['count'] += 1
            issue_stats[key]['severity'] = issue.severity.value

        for issue_type, data in sorted(issue_stats.items(), key=lambda x: -x[1]['count']):
            severity_marker = {
                'blocker': '✗',
                'warning': '⚠',
                'info': 'ℹ'
            }.get(data['severity'], '?')
            lines.append(f"  {severity_marker} {issue_type}: {data['count']} 个 ({data['severity']})")

        report_path = Path(output_dir) / f"version_alignment_report_{datetime.now():%Y%m%d_%H%M%S}.txt"
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))

        print('\n'.join(lines))
        return str(report_path)

    def generate_json_report(self, output_dir: str) -> str:
        can_publish, needs_review, must_reject = self.classify_packages()
        rejection_notices = self.generate_rejection_notices(must_reject)

        report = {
            'scan_time': self.scan_result.scan_time.isoformat(),
            'summary': {
                'total_packages': len(self.scan_result.packages),
                'total_checksums': len(self.scan_result.checksums),
                'total_release_notes': len(self.scan_result.release_notes),
                'total_issues': len(self.scan_result.all_issues),
                'can_publish': len(can_publish),
                'needs_review': len(needs_review),
                'must_reject': len(must_reject),
            },
            'diff': self.diff_result,
            'packages': {
                'can_publish': [p.to_dict() for p in can_publish],
                'needs_review': [p.to_dict() for p in needs_review],
                'must_reject': [p.to_dict() for p in must_reject],
            },
            'rejection_notices': [n.to_dict() for n in rejection_notices],
            'scan_result': self.scan_result.to_dict(),
        }

        report_path = Path(output_dir) / f"version_alignment_report_{datetime.now():%Y%m%d_%H%M%S}.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        return str(report_path)

    def generate_rejection_email_content(self) -> str:
        _, _, must_reject = self.classify_packages()
        rejection_notices = self.generate_rejection_notices(must_reject)

        if not rejection_notices:
            return "所有安装包检查通过，无需退回。"

        lines = []
        lines.append("各位打包同事好：")
        lines.append("")
        lines.append(f"版本对齐检查发现以下 {len(rejection_notices)} 个安装包存在阻断性问题，需要重新打包或修正：")
        lines.append("")

        for i, notice in enumerate(rejection_notices, 1):
            lines.append(f"---")
            lines.append(f"【{i}】{notice.package_name} (v{notice.version}, {notice.platform})")
            lines.append("")
            lines.append("问题原因：")
            for j, reason in enumerate(notice.reasons, 1):
                lines.append(f"  {j}. {reason}")
            lines.append("")
            lines.append("建议处理：")
            for j, suggestion in enumerate(notice.suggestions, 1):
                lines.append(f"  {j}. {suggestion}")
            lines.append("")

        lines.append("---")
        lines.append("请修复后重新提交，如有疑问请联系测试负责人。")
        lines.append("")
        lines.append(f"扫描时间: {self.scan_result.scan_time:%Y-%m-%d %H:%M:%S}")

        return '\n'.join(lines)

    def _format_size(self, size_bytes: int) -> str:
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} TB"
