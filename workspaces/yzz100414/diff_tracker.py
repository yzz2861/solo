import json
import os
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from collections import defaultdict

from config import config
from models import ScanResult, Issue, IssueSeverity


class DiffTracker:
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir).resolve()
        self.history_file = self.root_dir / config.HISTORY_FILE
        self.history: List[Dict] = self._load_history()

    def _load_history(self) -> List[Dict]:
        if not self.history_file.exists():
            return []
        try:
            with open(self.history_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('runs', [])
        except Exception:
            return []

    def _save_history(self) -> None:
        try:
            data = {
                'runs': self.history[-10:],
                'last_updated': datetime.now().isoformat()
            }
            with open(self.history_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"保存历史记录失败: {e}")

    def record_run(self, scan_result: ScanResult) -> None:
        run_data = {
            'scan_time': scan_result.scan_time.isoformat(),
            'packages': [
                {
                    'file_name': p.file_name,
                    'version': str(p.version) if p.version else None,
                    'platform': p.platform,
                    'issues': [i.to_dict() for i in p.issues],
                    'issue_count': len(p.issues),
                    'has_blocker': any(
                        i.severity == IssueSeverity.BLOCKER for i in p.issues
                    ),
                    'can_publish': not p.issues
                }
                for p in scan_result.packages
            ],
            'statistics': {
                'total_packages': len(scan_result.packages),
                'total_issues': len(scan_result.all_issues),
                'can_publish': sum(1 for p in scan_result.packages if not p.issues),
                'blocker_count': sum(
                    1 for p in scan_result.packages
                    if any(i.severity == IssueSeverity.BLOCKER for i in p.issues)
                ),
                'warning_count': sum(
                    1 for p in scan_result.packages
                    if any(i.severity == IssueSeverity.WARNING for i in p.issues)
                    and not any(i.severity == IssueSeverity.BLOCKER for i in p.issues)
                ),
            }
        }
        self.history.append(run_data)
        self._save_history()

    def get_previous_run(self) -> Optional[Dict]:
        if len(self.history) >= 1:
            return self.history[-1]
        return None

    def compare_with_previous(self, scan_result: ScanResult) -> Dict:
        previous = self.get_previous_run()
        if not previous:
            return {
                'has_previous': False,
                'message': '首次运行，无历史数据可对比',
                'added_packages': [],
                'removed_packages': [],
                'fixed_issues': [],
                'new_issues': [],
                'status_changes': []
            }

        current_pkgs = {p['file_name']: p for p in [
            {
                'file_name': p.file_name,
                'version': str(p.version) if p.version else None,
                'platform': p.platform,
                'issues': [i.to_dict() for i in p.issues],
                'can_publish': not p.issues
            }
            for p in scan_result.packages
        ]}

        previous_pkgs = {p['file_name']: p for p in previous['packages']}

        added = [
            {'file_name': name, 'pkg': pkg}
            for name, pkg in current_pkgs.items()
            if name not in previous_pkgs
        ]

        removed = [
            {'file_name': name, 'pkg': pkg}
            for name, pkg in previous_pkgs.items()
            if name not in current_pkgs
        ]

        fixed_issues = []
        new_issues = []
        status_changes = []

        for name in set(current_pkgs.keys()) & set(previous_pkgs.keys()):
            curr = current_pkgs[name]
            prev = previous_pkgs[name]

            curr_issue_keys = {
                (i['type'], i['message']) for i in curr['issues']
            }
            prev_issue_keys = {
                (i['type'], i['message']) for i in prev['issues']
            }

            fixed = [
                i for i in prev['issues']
                if (i['type'], i['message']) not in curr_issue_keys
            ]
            new = [
                i for i in curr['issues']
                if (i['type'], i['message']) not in prev_issue_keys
            ]

            if fixed:
                fixed_issues.append({
                    'package': name,
                    'fixed_issues': fixed
                })

            if new:
                new_issues.append({
                    'package': name,
                    'new_issues': new
                })

            if prev['can_publish'] != curr['can_publish']:
                status_changes.append({
                    'package': name,
                    'previous_status': '可发布' if prev['can_publish'] else '不可发布',
                    'current_status': '可发布' if curr['can_publish'] else '不可发布',
                    'changed_to': curr['can_publish']
                })

        prev_stats = previous['statistics']
        curr_stats = {
            'total_packages': len(scan_result.packages),
            'total_issues': len(scan_result.all_issues),
            'can_publish': sum(1 for p in scan_result.packages if not p.issues),
        }

        return {
            'has_previous': True,
            'previous_run_time': previous['scan_time'],
            'current_run_time': scan_result.scan_time.isoformat(),
            'added_packages': added,
            'removed_packages': removed,
            'fixed_issues': fixed_issues,
            'new_issues': new_issues,
            'status_changes': status_changes,
            'statistics_diff': {
                'total_packages_change': curr_stats['total_packages'] - prev_stats['total_packages'],
                'total_issues_change': curr_stats['total_issues'] - prev_stats['total_issues'],
                'can_publish_change': curr_stats['can_publish'] - prev_stats['can_publish'],
            },
            'summary': self._generate_diff_summary(
                added, removed, fixed_issues, new_issues, status_changes
            )
        }

    def _generate_diff_summary(
        self,
        added: List,
        removed: List,
        fixed: List,
        new: List,
        changes: List
    ) -> str:
        parts = []
        if added:
            parts.append(f"新增 {len(added)} 个安装包")
        if removed:
            parts.append(f"移除 {len(removed)} 个安装包")
        if fixed:
            fixed_count = sum(len(f['fixed_issues']) for f in fixed)
            parts.append(f"修复 {fixed_count} 个问题")
        if new:
            new_count = sum(len(n['new_issues']) for n in new)
            parts.append(f"新增 {new_count} 个问题")

        improved = sum(1 for c in changes if c['changed_to'])
        regressed = sum(1 for c in changes if not c['changed_to'])
        if improved:
            parts.append(f"{improved} 个包变为可发布")
        if regressed:
            parts.append(f"{regressed} 个包变为不可发布")

        if not parts:
            return "与上次运行相比无明显变化"
        return "；".join(parts)

    def get_history_summary(self, limit: int = 5) -> List[Dict]:
        summary = []
        for run in self.history[-limit:]:
            stats = run.get('statistics', {})
            summary.append({
                'scan_time': run['scan_time'],
                'total_packages': stats.get('total_packages', 0),
                'total_issues': stats.get('total_issues', 0),
                'can_publish': stats.get('can_publish', 0),
                'blocker_count': stats.get('blocker_count', 0),
                'warning_count': stats.get('warning_count', 0),
            })
        return summary
