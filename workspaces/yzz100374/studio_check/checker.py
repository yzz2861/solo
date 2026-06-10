from __future__ import annotations

import re
from collections import defaultdict
from pathlib import Path
from typing import Optional

from .config import DEFAULT_CONFIG, match_filename
from .models import CheckIssue, IssueLevel, IssueCode, PhotoItem, ScanResult


class Checker:
    def __init__(self, config: Optional[dict] = None):
        self.cfg = config or DEFAULT_CONFIG

    def check(self, result: ScanResult) -> ScanResult:
        self._check_documents(result)
        self._check_retouched_vs_originals(result)
        self._check_duplicates_and_versions(result)
        self._check_auth_signature(result)
        return result

    def _check_documents(self, result: ScanResult) -> None:
        if not result.auth_letters:
            result.issues.append(
                CheckIssue(
                    level=IssueLevel.ERROR,
                    code=IssueCode.MISSING_AUTH_LETTER,
                    message="缺少授权书",
                    detail='客户目录中未找到包含「授权书」关键词的文件',
                )
            )
        if not result.selection_sheets:
            result.issues.append(
                CheckIssue(
                    level=IssueLevel.ERROR,
                    code=IssueCode.MISSING_SELECTION_SHEET,
                    message="缺少挑片表",
                    detail='客户目录中未找到包含「挑片表」关键词的文件',
                )
            )
        if not result.delivery_notes:
            result.issues.append(
                CheckIssue(
                    level=IssueLevel.WARNING,
                    code=IssueCode.MISSING_DELIVERY_NOTE,
                    message="缺少交付说明",
                    detail='客户目录中未找到包含「交付说明」关键词的文件',
                )
            )

    def _check_retouched_vs_originals(self, result: ScanResult) -> None:
        retouched_ids = {p.photo_id for p in result.retouched}
        original_ids = {p.photo_id for p in result.originals}

        missing_originals = retouched_ids - original_ids
        if missing_originals:
            result.issues.append(
                CheckIssue(
                    level=IssueLevel.ERROR,
                    code=IssueCode.MISSING_ORIGINAL,
                    message=f"精修图缺少对应原片 ({len(missing_originals)} 张)",
                    detail="以下精修照片在原片目录中找不到对应的原片文件",
                    photo_ids=sorted(missing_originals),
                    paths=[
                        str(p.path)
                        for p in result.retouched
                        if p.photo_id in missing_originals
                    ],
                )
            )

        extra_retouched = original_ids - retouched_ids
        if extra_retouched:
            result.issues.append(
                CheckIssue(
                    level=IssueLevel.INFO,
                    code=IssueCode.ORPHAN_ORIGINAL,
                    message=f"原片无对应精修 ({len(extra_retouched)} 张)",
                    detail="以下原片没有精修版本，可能是未选中的照片",
                    photo_ids=sorted(extra_retouched),
                )
            )

    def _check_duplicates_and_versions(self, result: ScanResult) -> None:
        by_id: dict[str, list[PhotoItem]] = defaultdict(list)
        for p in result.retouched:
            by_id[p.photo_id].append(p)

        for photo_id, items in by_id.items():
            versions = [i for i in items if i.version is not None]
            non_versioned = [i for i in items if i.version is None]

            if len(items) > 1:
                if versions:
                    version_nums = sorted(v.version for v in versions if v.version is not None)
                    result.issues.append(
                        CheckIssue(
                            level=IssueLevel.WARNING,
                            code=IssueCode.MULTI_VERSION,
                            message=f"照片 {photo_id} 存在多版本导出",
                            detail=f"发现版本: {version_nums}，请确认交付使用哪个版本",
                            photo_ids=[photo_id],
                            paths=[str(i.path) for i in items],
                        )
                    )
                else:
                    result.issues.append(
                        CheckIssue(
                            level=IssueLevel.WARNING,
                            code=IssueCode.DUPLICATE_RETOUCHED,
                            message=f"照片 {photo_id} 存在重复精修文件",
                            detail=f"发现 {len(items)} 个文件，文件名未标注版本号，无法区分",
                            photo_ids=[photo_id],
                            paths=[str(i.path) for i in items],
                        )
                    )

    def _check_auth_signature(self, result: ScanResult) -> None:
        sig_pat = self.cfg["files"].get("signature_page", "")
        if not sig_pat or not result.auth_letters:
            return

        has_signature_file = False
        for auth_path in result.auth_letters:
            if match_filename(auth_path.name, sig_pat):
                has_signature_file = True
                break

        if not has_signature_file:
            auth_names = [p.name for p in result.auth_letters]
            result.issues.append(
                CheckIssue(
                    level=IssueLevel.WARNING,
                    code=IssueCode.AUTH_NO_SIGNATURE,
                    message="授权书可能缺少签名页",
                    detail=f'已找到授权书: {", ".join(auth_names)}，但未发现包含「签名/签字/签署」关键词的文件，请人工确认签名页是否完整',
                    paths=[str(p) for p in result.auth_letters],
                )
            )
