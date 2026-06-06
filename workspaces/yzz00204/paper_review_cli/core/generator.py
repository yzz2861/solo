"""分配生成模块 - 冲突检测与分配"""
from typing import List, Dict, Any, Tuple, Set
from ..models import (
    PaperRecord, ReviewerRecord, ConflictRule, AssignmentResult,
    ProcessResult, RecordStatus, ConflictType, TaskStatus, BatchInfo
)
from ..utils.config import load_rules
from .validator import validate_papers, validate_reviewers
import hashlib
import os


def _normalize_str(s: str) -> str:
    return s.strip().lower().replace(" ", "").replace("　", "")


def _hash_paper_key(paper: PaperRecord, rules: List[ConflictRule]) -> str:
    key_parts = [
        paper.paper_id,
        paper.author_name,
        paper.author_institution,
    ]
    for r in sorted(rules, key=lambda x: x.rule_type.value):
        key_parts.append(f"{r.rule_type.value}:{r.enabled}")
    raw = "|".join(key_parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def detect_conflicts(paper: PaperRecord, reviewer: ReviewerRecord,
                     rules: List[ConflictRule]) -> List[ConflictType]:
    conflicts = []
    paper_inst = _normalize_str(paper.author_institution)
    reviewer_inst = _normalize_str(reviewer.institution)

    for rule in rules:
        if not rule.enabled:
            continue

        if rule.rule_type == ConflictType.SAME_INSTITUTION:
            if paper_inst and paper_inst == reviewer_inst:
                conflicts.append(ConflictType.SAME_INSTITUTION)

        elif rule.rule_type == ConflictType.CO_AUTHOR:
            paper_author = _normalize_str(paper.author_name)
            reviewer_name = _normalize_str(reviewer.name)
            raw_lower = _normalize_str(paper.raw_data.get("co_authors", ""))
            if paper_author and reviewer_name and reviewer_name in raw_lower:
                conflicts.append(ConflictType.CO_AUTHOR)

        elif rule.rule_type == ConflictType.SUPERVISOR:
            supervisor = _normalize_str(paper.raw_data.get("supervisor", ""))
            reviewer_name = _normalize_str(reviewer.name)
            if supervisor and reviewer_name and supervisor == reviewer_name:
                conflicts.append(ConflictType.SUPERVISOR)

        elif rule.rule_type == ConflictType.RECENT_COLLABORATION:
            collaborators = _normalize_str(paper.raw_data.get("collaborators", ""))
            reviewer_name = _normalize_str(reviewer.name)
            if reviewer_name and reviewer_name in collaborators:
                conflicts.append(ConflictType.RECENT_COLLABORATION)

        elif rule.rule_type == ConflictType.CUSTOM:
            custom_field = rule.params.get("field", "")
            custom_value = rule.params.get("value", "")
            if custom_field and custom_value:
                paper_val = _normalize_str(paper.raw_data.get(custom_field, ""))
                reviewer_val = _normalize_str(reviewer.raw_data.get(custom_field, ""))
                if paper_val and paper_val == reviewer_val:
                    conflicts.append(ConflictType.CUSTOM)

    return conflicts


def assign_reviewers(papers: List[PaperRecord], reviewers: List[ReviewerRecord],
                     rules: List[ConflictRule], batch_id: str,
                     result: ProcessResult,
                     per_paper_count: int = 3,
                     allow_manual_review: bool = True) -> List[AssignmentResult]:
    assignments = []
    reviewer_pool = list(reviewers)

    for paper in papers:
        paper_conflicts: List[Tuple[ReviewerRecord, List[ConflictType]]] = []
        paper_safe: List[ReviewerRecord] = []

        for reviewer in reviewer_pool:
            conflicts = detect_conflicts(paper, reviewer, rules)
            if conflicts:
                paper_conflicts.append((reviewer, conflicts))
            else:
                paper_safe.append(reviewer)

        if len(paper_safe) >= per_paper_count:
            selected = paper_safe[:per_paper_count]
            for rev in selected:
                assign = AssignmentResult(
                    paper_id=paper.paper_id,
                    reviewer_id=rev.reviewer_id,
                    reviewer_name=rev.name,
                    reviewer_institution=rev.institution,
                    conflicts=[],
                    status=RecordStatus.SUCCESS,
                    error_message="",
                    batch_id=batch_id,
                    source_file=paper.source_file,
                    source_line=paper.source_line,
                )
                assignments.append(assign)

            result.add_log("info", f"论文 {paper.paper_id}: 成功分配 {per_paper_count} 位评审人")

        else:
            if allow_manual_review and paper_conflicts:
                selected_conflicts = paper_conflicts[:per_paper_count]
                for rev, conflicts in selected_conflicts:
                    assign = AssignmentResult(
                        paper_id=paper.paper_id,
                        reviewer_id=rev.reviewer_id,
                        reviewer_name=rev.name,
                        reviewer_institution=rev.institution,
                        conflicts=conflicts,
                        status=RecordStatus.MANUAL_REVIEW,
                        error_message=f"冲突类型: {', '.join(c.value for c in conflicts)}",
                        batch_id=batch_id,
                        source_file=paper.source_file,
                        source_line=paper.source_line,
                    )
                    assignments.append(assign)

                result.add_log(
                    "warn",
                    f"论文 {paper.paper_id}: 合格评审人不足({len(paper_safe)}/{per_paper_count})，标记 {len(selected_conflicts)} 位待人工复核"
                )
            else:
                result.add_log(
                    "error",
                    f"论文 {paper.paper_id}: 无法找到足够评审人，合格 {len(paper_safe)} 人，需要 {per_paper_count} 人"
                )

    return assignments


def run_generate_command(paper_file: str, reviewer_file: str, rules_file: str,
                         output_dir: str, snapshot_file: str = "",
                         per_paper_count: int = 3,
                         allow_manual_review: bool = True) -> ProcessResult:
    import time
    batch = BatchInfo(
        batch_id=BatchInfo.generate_id(),
        command="generate",
        input_file=paper_file,
        rules_file=rules_file,
        snapshot_file=snapshot_file,
        output_dir=output_dir,
        status=TaskStatus.GENERATING,
    )
    result = ProcessResult(batch=batch)
    result.add_log("info", f"批次 {batch.batch_id} 开始生成分配")
    result.add_log("info", f"论文清单: {paper_file}")
    result.add_log("info", f"评审人清单: {reviewer_file}")
    result.add_log("info", f"每篇论文分配 {per_paper_count} 位评审人")
    result.add_log("info", f"人工复核: {'开启' if allow_manual_review else '关闭'}")

    try:
        papers, paper_bad = validate_papers(paper_file, batch, result)
        reviewers, reviewer_bad = validate_reviewers(reviewer_file, batch, result)

        rules = load_rules(rules_file)
        result.add_log("info", f"加载冲突规则 {len(rules)} 条")

        assignments = assign_reviewers(
            papers, reviewers, rules, batch.batch_id, result,
            per_paper_count=per_paper_count,
            allow_manual_review=allow_manual_review,
        )

        success_paper_ids = set(a.paper_id for a in assignments if a.status == RecordStatus.SUCCESS)
        manual_paper_ids = set(a.paper_id for a in assignments if a.status == RecordStatus.MANUAL_REVIEW)
        failed_paper_ids = set()
        for paper in papers:
            if paper.paper_id not in success_paper_ids and paper.paper_id not in manual_paper_ids:
                failed_paper_ids.add(paper.paper_id)

        bad_count = len(paper_bad) + len(reviewer_bad)
        success_paper_count = len(success_paper_ids)
        manual_paper_count = len(manual_paper_ids)
        failed_paper_count = len(failed_paper_ids)

        result.assignments = assignments
        batch.total_count = len(papers)
        batch.success_count = success_paper_count
        batch.manual_review_count = manual_paper_count
        batch.failed_count = failed_paper_count
        batch.bad_count = bad_count
        batch.end_time = time.time()

        has_bad = bad_count > 0
        all_success = success_paper_count == len(papers) and not has_bad
        any_success = success_paper_count > 0
        all_failed = success_paper_count == 0 and manual_paper_count == 0 and len(papers) > 0
        all_manual = success_paper_count == 0 and manual_paper_count > 0 and failed_paper_count == 0

        if all_success:
            batch.status = TaskStatus.SUCCESS
        elif any_success:
            batch.status = TaskStatus.PARTIAL_SUCCESS
        elif all_manual:
            batch.status = TaskStatus.MANUAL_REVIEW
        elif all_failed:
            batch.status = TaskStatus.FAILED
        elif has_bad and len(papers) == 0:
            batch.status = TaskStatus.FAILED
        else:
            batch.status = TaskStatus.PARTIAL_SUCCESS if has_bad else TaskStatus.SUCCESS

        result.add_log("info", f"分配完成: 总论文 {len(papers)} 篇，成功 {success_paper_count} 篇，待复核 {manual_paper_count} 篇，失败 {failed_paper_count} 篇，坏行 {bad_count} 条")
        if failed_paper_count > 0:
            result.add_log("warn", f"有 {failed_paper_count} 篇论文未能分配到足够评审人")

    except Exception as e:
        batch.status = TaskStatus.FAILED
        batch.end_time = time.time()
        result.add_log("error", f"分配生成失败: {str(e)}")
        raise

    return result
