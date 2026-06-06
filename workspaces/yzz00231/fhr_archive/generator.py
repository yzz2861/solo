import csv
import json
import os
from datetime import datetime
from typing import List, Dict
from .models import DetailRecord, ReviewItem, ArchiveSummary, FHRRecord, SupplementRecord, ValidationResult
from .validator import aggregate_risk, needs_review


class ArchiveGenerator:
    def __init__(self, batch_id: str, source_identifier: str):
        self.batch_id = batch_id
        self.source_identifier = source_identifier

    def generate_details(
        self,
        records: List[FHRRecord],
        validation_results: Dict[str, List[ValidationResult]],
        supplements: List[SupplementRecord] = None
    ) -> List[DetailRecord]:
        sup_map = {}
        if supplements:
            for s in supplements:
                sup_map[s.record_id] = s

        details = []
        for record in records:
            results = validation_results.get(record.record_id, [])
            risk_level, risk_tags = aggregate_risk(results)
            review, review_reason = needs_review(results)

            sup = sup_map.get(record.record_id)
            supplement_info = {}
            if sup:
                supplement_info = {
                    "maternal_age": sup.maternal_age,
                    "gestational_weeks": sup.gestational_weeks,
                    "high_risk_factors": sup.high_risk_factors,
                    "delivery_outcome": sup.delivery_outcome,
                    "apgar_score": sup.apgar_score,
                }

            detail = DetailRecord(
                record_id=record.record_id,
                patient_id=record.patient_id,
                patient_name=record.patient_name,
                admission_no=record.admission_no,
                exam_time=record.exam_time,
                risk_tags=risk_tags,
                risk_level=risk_level,
                validation_results=results,
                needs_review=review,
                review_reason=review_reason,
                batch_id=self.batch_id,
                source_identifier=self.source_identifier,
                supplement_info=supplement_info,
            )
            details.append(detail)

        return details

    def generate_review_list(self, details: List[DetailRecord]) -> List[ReviewItem]:
        review_items = []
        for d in details:
            if d.needs_review:
                item = ReviewItem(
                    record_id=d.record_id,
                    patient_name=d.patient_name,
                    exam_time=d.exam_time,
                    risk_level=d.risk_level,
                    review_reason=d.review_reason,
                    risk_tags=d.risk_tags,
                    batch_id=self.batch_id,
                    source_identifier=self.source_identifier,
                )
                review_items.append(item)
        return review_items

    def generate_summary(self, details: List[DetailRecord]) -> ArchiveSummary:
        total = len(details)
        review_count = sum(1 for d in details if d.needs_review)

        risk_counts = {"normal": 0, "low": 0, "medium": 0, "high": 0, "critical": 0}
        for d in details:
            if d.risk_level in risk_counts:
                risk_counts[d.risk_level] += 1
            else:
                risk_counts[d.risk_level] = 1

        missing_keywords = ["缺失", "缺少", "missing", "required"]
        missing_count = sum(
            1 for d in details
            if any(
                any(kw in r.rule_name or kw in r.rule_name.lower()
                    for kw in missing_keywords)
                for r in d.validation_results if not r.passed)
        )

        over_threshold_keywords = ["过高", "过低", "过多", "不足", "异常", "超过", "超出"]
        over_threshold_count = sum(
            1 for d in details
            if any(
                any(kw in r.rule_name for kw in over_threshold_keywords)
                for r in d.validation_results if not r.passed)
        )

        valid_count = sum(1 for d in details if d.risk_level == "normal")
        invalid_count = total - valid_count

        return ArchiveSummary(
            total_records=total,
            valid_records=valid_count,
            invalid_records=invalid_count,
            review_required=review_count,
            risk_counts=risk_counts,
            missing_material_count=missing_count,
            over_threshold_count=over_threshold_count,
            batch_id=self.batch_id,
            source_identifier=self.source_identifier,
            generated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )

    def save_details_csv(self, details: List[DetailRecord], output_path: str):
        os.makedirs(os.path.dirname(output_path), exist_ok=True) if os.path.dirname(output_path) else None

        with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "记录ID", "患者ID", "患者姓名", "住院号", "检查时间",
                "风险等级", "风险标签", "是否需复核", "复核原因",
                "批次ID", "来源标识",
                "孕妇年龄", "孕周", "高危因素", "分娩结局", "Apgar评分",
            ])

            for d in details:
                writer.writerow([
                    d.record_id,
                    d.patient_id,
                    d.patient_name,
                    d.admission_no,
                    d.exam_time,
                    d.risk_level,
                    "; ".join(d.risk_tags),
                    "是" if d.needs_review else "否",
                    d.review_reason,
                    d.batch_id,
                    d.source_identifier,
                    d.supplement_info.get("maternal_age", ""),
                    d.supplement_info.get("gestational_weeks", ""),
                    "; ".join(d.supplement_info.get("high_risk_factors", [])),
                    d.supplement_info.get("delivery_outcome", ""),
                    d.supplement_info.get("apgar_score", ""),
                ])

    def save_details_json(self, details: List[DetailRecord], output_path: str):
        os.makedirs(os.path.dirname(output_path), exist_ok=True) if os.path.dirname(output_path) else None

        data = []
        for d in details:
            data.append({
                "record_id": d.record_id,
                "patient_id": d.patient_id,
                "patient_name": d.patient_name,
                "admission_no": d.admission_no,
                "exam_time": d.exam_time,
                "risk_tags": d.risk_tags,
                "risk_level": d.risk_level,
                "needs_review": d.needs_review,
                "review_reason": d.review_reason,
                "batch_id": d.batch_id,
                "source_identifier": d.source_identifier,
                "supplement_info": d.supplement_info,
                "validation_results": [
                    {
                        "rule_id": r.rule_id,
                        "rule_name": r.rule_name,
                        "passed": r.passed,
                        "risk_level": r.risk_level,
                        "message": r.message,
                        "field_name": r.field_name,
                        "actual_value": r.actual_value,
                    }
                    for r in d.validation_results
                ],
            })

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def save_review_csv(self, review_items: List[ReviewItem], output_path: str):
        os.makedirs(os.path.dirname(output_path), exist_ok=True) if os.path.dirname(output_path) else None

        with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "记录ID", "患者姓名", "检查时间", "风险等级",
                "复核原因", "风险标签", "批次ID", "来源标识",
            ])

            for item in review_items:
                writer.writerow([
                    item.record_id,
                    item.patient_name,
                    item.exam_time,
                    item.risk_level,
                    item.review_reason,
                    "; ".join(item.risk_tags),
                    item.batch_id,
                    item.source_identifier,
                ])

    def save_summary_json(self, summary: ArchiveSummary, output_path: str):
        os.makedirs(os.path.dirname(output_path), exist_ok=True) if os.path.dirname(output_path) else None

        data = {
            "total_records": summary.total_records,
            "valid_records": summary.valid_records,
            "invalid_records": summary.invalid_records,
            "review_required": summary.review_required,
            "risk_counts": summary.risk_counts,
            "missing_material_count": summary.missing_material_count,
            "over_threshold_count": summary.over_threshold_count,
            "batch_id": summary.batch_id,
            "source_identifier": summary.source_identifier,
            "generated_at": summary.generated_at,
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
