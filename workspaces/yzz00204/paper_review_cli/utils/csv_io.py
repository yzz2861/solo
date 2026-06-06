"""CSV 读写工具"""
import csv
import os
from typing import List, Dict, Tuple, Any
from ..models import PaperRecord, ReviewerRecord, AssignmentResult


PAPER_REQUIRED_FIELDS = ["paper_id", "title", "author_name", "author_institution"]
REVIEWER_REQUIRED_FIELDS = ["reviewer_id", "name", "institution"]


def _safe_get(d: Dict[Any, Any], key: str, default: str = "") -> str:
    val = d.get(key) if key is not None else None
    return str(val).strip() if val is not None else default


def _clean_raw(d: Dict[Any, Any]) -> Dict[str, str]:
    return {str(k) if k is not None else "": str(v) if v is not None else ""
            for k, v in d.items() if k is not None and not str(k).startswith("_")}


def read_csv(file_path: str) -> Tuple[List[Dict[str, str]], List[str]]:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"CSV文件不存在: {file_path}")

    records = []
    headers = []
    with open(file_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        for i, row in enumerate(reader, start=2):
            row["_source_line"] = i
            records.append(dict(row))
    return records, headers


def validate_headers(headers: List[str], required: List[str]) -> List[str]:
    missing = [f for f in required if f not in headers]
    return missing


def parse_paper_records(records: List[Dict[str, str]], source_file: str) -> Tuple[List[PaperRecord], List[Dict[str, Any]]]:
    papers = []
    bad_records = []

    for rec in records:
        line_num = rec.get("_source_line", 0)
        errors = []

        paper_id = _safe_get(rec, "paper_id")
        if not paper_id:
            errors.append("paper_id不能为空")

        title = _safe_get(rec, "title")
        if not title:
            errors.append("title不能为空")

        author_name = _safe_get(rec, "author_name")
        if not author_name:
            errors.append("author_name不能为空")

        author_institution = _safe_get(rec, "author_institution")
        if not author_institution:
            errors.append("author_institution不能为空")

        if errors:
            bad_records.append({
                "source_file": source_file,
                "source_line": line_num,
                "raw_data": _clean_raw(rec),
                "errors": errors,
            })
            continue

        paper = PaperRecord(
            paper_id=paper_id,
            title=title,
            author_name=author_name,
            author_institution=author_institution,
            author_email=_safe_get(rec, "author_email"),
            keywords=_safe_get(rec, "keywords"),
            abstract=_safe_get(rec, "abstract"),
            source_file=source_file,
            source_line=line_num,
            raw_data=_clean_raw(rec),
        )
        papers.append(paper)

    return papers, bad_records


def parse_reviewer_records(records: List[Dict[str, str]], source_file: str) -> Tuple[List[ReviewerRecord], List[Dict[str, Any]]]:
    reviewers = []
    bad_records = []

    for rec in records:
        line_num = rec.get("_source_line", 0)
        errors = []

        reviewer_id = _safe_get(rec, "reviewer_id")
        if not reviewer_id:
            errors.append("reviewer_id不能为空")

        name = _safe_get(rec, "name")
        if not name:
            errors.append("name不能为空")

        institution = _safe_get(rec, "institution")
        if not institution:
            errors.append("institution不能为空")

        if errors:
            bad_records.append({
                "source_file": source_file,
                "source_line": line_num,
                "raw_data": _clean_raw(rec),
                "errors": errors,
            })
            continue

        reviewer = ReviewerRecord(
            reviewer_id=reviewer_id,
            name=name,
            institution=institution,
            email=_safe_get(rec, "email"),
            research_fields=_safe_get(rec, "research_fields"),
            source_file=source_file,
            source_line=line_num,
            raw_data=_clean_raw(rec),
        )
        reviewers.append(reviewer)

    return reviewers, bad_records


def write_csv(file_path: str, records: List[Dict[str, Any]], fieldnames: List[str]):
    os.makedirs(os.path.dirname(file_path) or ".", exist_ok=True)
    with open(file_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for rec in records:
            writer.writerow(rec)


def write_assignments_csv(file_path: str, assignments: List[AssignmentResult]):
    if not assignments:
        fieldnames = [
            "paper_id", "reviewer_id", "reviewer_name", "reviewer_institution",
            "conflicts", "status", "error_message", "batch_id", "source_file", "source_line",
        ]
        write_csv(file_path, [], fieldnames)
        return

    dicts = [a.to_dict() for a in assignments]
    fieldnames = list(dicts[0].keys())
    write_csv(file_path, dicts, fieldnames)


def write_bad_records_csv(file_path: str, bad_records: List[Dict[str, Any]]):
    if not bad_records:
        fieldnames = ["source_file", "source_line", "errors", "raw_data"]
        write_csv(file_path, [], fieldnames)
        return

    records_out = []
    for br in bad_records:
        row = {
            "source_file": br.get("source_file", ""),
            "source_line": br.get("source_line", ""),
            "errors": "; ".join(br.get("errors", [])),
        }
        raw = br.get("raw_data", {})
        for k, v in raw.items():
            row[f"raw_{k}"] = v
        records_out.append(row)

    fieldnames = list(records_out[0].keys())
    write_csv(file_path, records_out, fieldnames)


def write_diff_csv(file_path: str, diff_records: List[Dict[str, Any]]):
    if not diff_records:
        fieldnames = ["paper_id", "diff_type", "field", "old_value", "new_value", "batch_id"]
        write_csv(file_path, [], fieldnames)
        return

    fieldnames = list(diff_records[0].keys())
    write_csv(file_path, diff_records, fieldnames)
