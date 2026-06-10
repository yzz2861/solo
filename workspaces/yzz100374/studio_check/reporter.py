from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Optional

from .models import ScanResult, ConfirmationState, IssueLevel


class Reporter:
    def __init__(self, client_dir: Path, metadata_dir_name: str = ".studio-check"):
        self.client_dir = client_dir.resolve()
        self.meta_dir = self.client_dir / metadata_dir_name

    def generate_text(self, result: ScanResult, confirm_state: Optional[ConfirmationState] = None) -> str:
        lines: list[str] = []
        lines.append("=" * 60)
        lines.append("  摄影棚交付包检查报告")
        lines.append("=" * 60)
        lines.append(f"客户目录: {result.client_dir}")
        lines.append("")

        lines.append("── 照片统计 ──")
        retouched_ids = {p.photo_id for p in result.retouched}
        original_ids = {p.photo_id for p in result.originals}
        lines.append(f"  精修图: {len(result.retouched)} 个文件 / {len(retouched_ids)} 个编号")
        lines.append(f"  原片:   {len(result.originals)} 个文件 / {len(original_ids)} 个编号")
        lines.append("")

        lines.append("── 文档检查 ──")
        lines.append(f"  授权书:   {'✓ ' + ', '.join(p.name for p in result.auth_letters) if result.auth_letters else '✗ 未找到'}")
        lines.append(f"  挑片表:   {'✓ ' + ', '.join(p.name for p in result.selection_sheets) if result.selection_sheets else '✗ 未找到'}")
        lines.append(f"  交付说明: {'✓ ' + ', '.join(p.name for p in result.delivery_notes) if result.delivery_notes else '✗ 未找到'}")
        lines.append("")

        if result.issues:
            by_level = defaultdict(list)
            for issue in result.issues:
                by_level[issue.level].append(issue)

            lines.append("── 问题列表 ──")
            for level in [IssueLevel.ERROR, IssueLevel.WARNING, IssueLevel.INFO]:
                items = by_level.get(level, [])
                if not items:
                    continue
                level_label = {"ERROR": "错误", "WARNING": "警告", "INFO": "提示"}[level.value]
                lines.append(f"")
                lines.append(f"  [{level_label}] ({len(items)} 项)")
                for item in items:
                    lines.append(f"    [{item.code.value}] {item.message}")
                    if item.detail:
                        lines.append(f"         {item.detail}")
                    if item.photo_ids:
                        ids_str = ", ".join(item.photo_ids[:20])
                        if len(item.photo_ids) > 20:
                            ids_str += f" ... 共 {len(item.photo_ids)} 个"
                        lines.append(f"         涉及编号: {ids_str}")
            lines.append("")
        else:
            lines.append("── 问题列表 ──")
            lines.append("  无问题，交付包完整 ✓")
            lines.append("")

        if confirm_state and confirm_state.entries:
            lines.append("── 客户确认状态 ──")
            if confirm_state.locked:
                lines.append(f"  交付已锁定 (锁定时间: {confirm_state.locked_at})")
            confirmed_ids = sorted(confirm_state.entries.keys())
            lines.append(f"  已确认照片: {len(confirmed_ids)} 张")
            for pid in confirmed_ids:
                entry = confirm_state.entries[pid]
                ver_str = f" v{entry.confirmed_version}" if entry.confirmed_version else ""
                lines.append(f"    {pid}{ver_str}  ← 已确认")
            unconfirmed = retouched_ids - set(confirmed_ids)
            if unconfirmed and not confirm_state.locked:
                lines.append(f"  待确认照片: {len(unconfirmed)} 张")
                for pid in sorted(unconfirmed):
                    lines.append(f"    {pid}")
            lines.append("")

        lines.append("── 精修图清单 (前台确认用) ──")
        by_id = defaultdict(list)
        for p in result.retouched:
            by_id[p.photo_id].append(p)
        for photo_id in sorted(by_id.keys()):
            items = by_id[photo_id]
            versions_info = []
            for it in items:
                ver = f" v{it.version}" if it.version else ""
                confirmed = ""
                if confirm_state and photo_id in confirm_state.entries:
                    ce = confirm_state.entries[photo_id]
                    if ce.confirmed_version == it.version or (
                        ce.confirmed_version is None and it.version is None
                    ):
                        confirmed = " ★已确认"
                versions_info.append(f"{it.suffix}{ver}{confirmed}")
            lines.append(f"  {photo_id}: {', '.join(versions_info)}")
        lines.append("")

        error_count = sum(1 for i in result.issues if i.level == IssueLevel.ERROR)
        warn_count = sum(1 for i in result.issues if i.level == IssueLevel.WARNING)
        lines.append(f"── 总结: {error_count} 错误 / {warn_count} 警告 ──")
        if error_count == 0 and warn_count == 0:
            lines.append("  ✓ 交付包检查通过，可以交付")
        elif error_count == 0:
            lines.append("  ⚠ 无阻塞性错误，但有警告项需关注")
        else:
            lines.append("  ✗ 存在错误，交付包不完整，请修正后重新检查")

        return "\n".join(lines)

    def generate_json(self, result: ScanResult, confirm_state: Optional[ConfirmationState] = None) -> str:
        data = result.to_dict()
        if confirm_state:
            data["confirmation"] = confirm_state.to_dict()
        return json.dumps(data, ensure_ascii=False, indent=2)

    def save_report(self, result: ScanResult, confirm_state: Optional[ConfirmationState] = None) -> Path:
        self.meta_dir.mkdir(exist_ok=True)

        text_path = self.meta_dir / "report.txt"
        text_content = self.generate_text(result, confirm_state)
        text_path.write_text(text_content, encoding="utf-8")

        json_path = self.meta_dir / "report.json"
        json_content = self.generate_json(result, confirm_state)
        json_path.write_text(json_content, encoding="utf-8")

        checklist_path = self.meta_dir / "checklist.txt"
        checklist_content = self._generate_checklist(result, confirm_state)
        checklist_path.write_text(checklist_content, encoding="utf-8")

        return text_path

    def _generate_checklist(self, result: ScanResult, confirm_state: Optional[ConfirmationState] = None) -> str:
        lines: list[str] = []
        lines.append("摄影棚交付清单")
        lines.append(f"客户目录: {result.client_dir.name}")
        lines.append("")

        by_id = defaultdict(list)
        for p in result.retouched:
            by_id[p.photo_id].append(p)

        lines.append(f"精修照片 ({len(by_id)} 个编号):")
        idx = 1
        for photo_id in sorted(by_id.keys()):
            items = by_id[photo_id]
            main = items[0]
            confirmed_mark = ""
            if confirm_state and photo_id in confirm_state.entries:
                confirmed_mark = " ★"
            lines.append(f"  {idx:3d}. {photo_id} ({main.suffix}){confirmed_mark}")
            for extra in items[1:]:
                ver = f" v{extra.version}" if extra.version else ""
                lines.append(f"       备选{ver}: {extra.suffix}")
            idx += 1

        lines.append("")
        lines.append("文档:")
        lines.append(f"  授权书: {'有' if result.auth_letters else '无'}")
        lines.append(f"  挑片表: {'有' if result.selection_sheets else '无'}")
        lines.append(f"  交付说明: {'有' if result.delivery_notes else '无'}")

        lines.append("")
        lines.append("客户签字: ________________  日期: ________________")

        return "\n".join(lines)
