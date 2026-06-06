"""数据校验模块"""
from typing import List, Dict, Any, Tuple
from ..models import (
    PaperRecord, ReviewerRecord, ConflictRule, AssignmentResult,
    BatchInfo, ProcessResult, RecordStatus, ConflictType, TaskStatus
)
from ..utils.csv_io import (
    read_csv, validate_headers, parse_paper_records, parse_reviewer_records,
    PAPER_REQUIRED_FIELDS, REVIEWER_REQUIRED_FIELDS
)
from ..utils.config import load_rules
import os


def validate_papers(paper_file: str, batch: BatchInfo, result: ProcessResult) -> Tuple[List[PaperRecord], List[Dict[str, Any]]]:
    result.add_log("info", f"开始校验论文清单: {paper_file}")

    try:
        records, headers = read_csv(paper_file)
    except Exception as e:
        result.add_log("error", f"读取论文清单失败: {str(e)}")
        raise

    result.add_log("info", f"读取论文记录 {len(records)} 条，字段 {len(headers)} 个")

    missing = validate_headers(headers, PAPER_REQUIRED_FIELDS)
    if missing:
        result.add_log("error", f"论文清单缺少必要字段: {', '.join(missing)}")
        raise ValueError(f"论文清单缺少必要字段: {', '.join(missing)}")

    source_file = os.path.basename(paper_file)
    papers, bad_records = parse_paper_records(records, source_file)

    result.add_log("info", f"论文校验完成: 有效 {len(papers)} 条，坏行 {len(bad_records)} 条")

    for br in bad_records:
        result.bad_records.append(br)
        result.add_log("warn", f"坏行 (第{br['source_line']}行): {'; '.join(br['errors'])}")

    return papers, bad_records


def validate_reviewers(reviewer_file: str, batch: BatchInfo, result: ProcessResult) -> Tuple[List[ReviewerRecord], List[Dict[str, Any]]]:
    result.add_log("info", f"开始校验评审人清单: {reviewer_file}")

    try:
        records, headers = read_csv(reviewer_file)
    except Exception as e:
        result.add_log("error", f"读取评审人清单失败: {str(e)}")
        raise

    result.add_log("info", f"读取评审人记录 {len(records)} 条，字段 {len(headers)} 个")

    missing = validate_headers(headers, REVIEWER_REQUIRED_FIELDS)
    if missing:
        result.add_log("error", f"评审人清单缺少必要字段: {', '.join(missing)}")
        raise ValueError(f"评审人清单缺少必要字段: {', '.join(missing)}")

    source_file = os.path.basename(reviewer_file)
    reviewers, bad_records = parse_reviewer_records(records, source_file)

    result.add_log("info", f"评审人校验完成: 有效 {len(reviewers)} 条，坏行 {len(bad_records)} 条")

    for br in bad_records:
        result.bad_records.append(br)
        result.add_log("warn", f"坏行 (第{br['source_line']}行): {'; '.join(br['errors'])}")

    return reviewers, bad_records


def check_duplicates(papers: List[PaperRecord], result: ProcessResult) -> List[str]:
    seen = {}
    dups = []
    for p in papers:
        if p.paper_id in seen:
            dups.append(p.paper_id)
            result.add_log("warn", f"论文ID重复: {p.paper_id} (第{p.source_line}行和第{seen[p.paper_id]}行)")
        else:
            seen[p.paper_id] = p.source_line
    return dups


def run_validate_command(paper_file: str, reviewer_file: str, rules_file: str,
                         output_dir: str, snapshot_file: str = "") -> ProcessResult:
    batch = BatchInfo(
        batch_id=BatchInfo.generate_id(),
        command="validate",
        input_file=paper_file,
        rules_file=rules_file,
        snapshot_file=snapshot_file,
        output_dir=output_dir,
        status=TaskStatus.VALIDATING,
    )
    result = ProcessResult(batch=batch)
    result.add_log("info", f"批次 {batch.batch_id} 开始校验")
    result.add_log("info", f"论文清单: {paper_file}")
    result.add_log("info", f"评审人清单: {reviewer_file}")
    result.add_log("info", f"规则配置: {rules_file or '默认规则'}")

    try:
        papers, paper_bad = validate_papers(paper_file, batch, result)
        reviewers, reviewer_bad = validate_reviewers(reviewer_file, batch, result)

        rules = load_rules(rules_file)
        result.add_log("info", f"加载冲突规则 {len(rules)} 条:")
        for r in rules:
            result.add_log("info", f"  - {r.rule_type.value}: {r.description}")

        check_duplicates(papers, result)

        batch.total_count = len(papers) + len(reviewers)
        batch.bad_count = len(paper_bad) + len(reviewer_bad)
        batch.status = TaskStatus.VALIDATED
        batch.end_time = __import__("time").time()

        result.add_log("info", f"校验完成: 有效论文 {len(papers)} 条，有效评审人 {len(reviewers)} 条，坏行 {batch.bad_count} 条")

    except Exception as e:
        batch.status = TaskStatus.FAILED
        batch.end_time = __import__("time").time()
        result.add_log("error", f"校验失败: {str(e)}")
        raise

    return result
