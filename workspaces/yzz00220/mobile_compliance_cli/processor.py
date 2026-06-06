import csv
from pathlib import Path
from collections import OrderedDict


def read_csv(file_path):
    records = []
    with open(file_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        for i, row in enumerate(reader, start=2):
            row["_source_line"] = i
            row["_source_file"] = Path(file_path).name
            records.append(row)
    return records, fieldnames


def apply_filters(records, filters):
    if not filters:
        return records

    filtered = []
    for rec in records:
        match = True
        for field, expected in filters.items():
            actual = str(rec.get(field, "")).strip()
            if isinstance(expected, list):
                if actual not in [str(e).strip() for e in expected]:
                    match = False
                    break
            else:
                if actual != str(expected).strip():
                    match = False
                    break
        if match:
            filtered.append(rec)
    return filtered


def load_last_result(last_result_file):
    if not last_result_file:
        return {}

    path = Path(last_result_file)
    if not path.exists():
        return {}

    last_map = {}
    try:
        records, _ = read_csv(path)
        for rec in records:
            device_id = rec.get("device_id") or rec.get("设备编号") or ""
            if device_id:
                last_map[device_id] = rec
    except Exception:
        pass
    return last_map


def write_csv(file_path, records, fieldnames=None):
    path = Path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    if not records:
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            if fieldnames:
                writer = csv.writer(f)
                writer.writerow(fieldnames)
        return

    if not fieldnames:
        fieldnames = [k for k in records[0].keys() if not k.startswith("_")]

    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for rec in records:
            writer.writerow(rec)


class ComplianceProcessor:
    def __init__(self, rule_engine, logger, last_result_map=None, filters=None):
        self.rule_engine = rule_engine
        self.logger = logger
        self.last_result_map = last_result_map or {}
        self.filters = filters
        self.seen_keys = set()

        self.normal_records = []
        self.abnormal_records = []
        self.review_records = []

    def process(self, records):
        if self.filters:
            self.logger.info(f"应用筛选条件: {self.filters}")
            records = apply_filters(records, self.filters)
            self.logger.info(f"筛选后记录数: {len(records)}")

        self.logger.stats["total"] = len(records)

        for idx, record in enumerate(records):
            self._process_single(record, idx + 1)

        self._finalize_outputs()

    def _process_single(self, record, seq_num):
        source_line = record.get("_source_line", seq_num)
        source_file = record.get("_source_file", "unknown")

        missing = self.rule_engine.check_missing_fields(record)
        if missing:
            self.logger.stats["missing_field"] += 1
            self.logger.stats["abnormal"] += 1
            rec_copy = dict(record)
            rec_copy["_reason"] = f"缺少必填字段: {', '.join(missing)}"
            rec_copy["_source_line"] = source_line
            rec_copy["_source_file"] = source_file
            rec_copy["_risk_labels"] = "缺字段"
            self.abnormal_records.append(rec_copy)
            self.logger.add_risk_label("缺字段")
            self.logger.warn(f"第{source_line}行 缺少字段: {missing}")
            return

        is_dup, dup_key = self.rule_engine.is_duplicate(record, self.seen_keys)
        if is_dup:
            self.logger.stats["duplicate"] += 1
            self.logger.stats["review"] += 1
            rec_copy = dict(record)
            rec_copy["_reason"] = f"重复记录: 键={dup_key}"
            rec_copy["_source_line"] = source_line
            rec_copy["_source_file"] = source_file
            rec_copy["_risk_labels"] = "重复"
            self.review_records.append(rec_copy)
            self.logger.add_risk_label("重复")
            self.logger.info(f"第{source_line}行 重复记录: {dup_key}")
            return

        matched = self.rule_engine.apply_rules(record)
        classification = self.rule_engine.classify(matched)

        risk_labels = [m["label"] for m in matched]
        risk_label_str = ",".join(risk_labels) if risk_labels else ""
        reason_str = "; ".join([f"{m['rule']} (severity={m['severity']})" for m in matched])

        for label in risk_labels:
            self.logger.add_risk_label(label)

        last_result = None
        device_id = record.get("device_id") or record.get("设备编号") or ""
        if device_id and device_id in self.last_result_map:
            last_result = self.last_result_map[device_id]

        rec_copy = dict(record)
        rec_copy["_source_line"] = source_line
        rec_copy["_source_file"] = source_file
        rec_copy["_risk_labels"] = risk_label_str
        rec_copy["_reason"] = reason_str if reason_str else "合规"

        if last_result:
            last_status = last_result.get("_status") or last_result.get("status") or ""
            rec_copy["_last_status"] = last_status

        if classification == "normal":
            self.logger.stats["normal"] += 1
            self.normal_records.append(rec_copy)
            self.logger.debug(f"第{source_line}行 正常")
        elif classification == "abnormal":
            self.logger.stats["abnormal"] += 1
            self.abnormal_records.append(rec_copy)
            self.logger.warn(f"第{source_line}行 异常: {reason_str}")
        else:
            self.logger.stats["review"] += 1
            self.review_records.append(rec_copy)
            self.logger.info(f"第{source_line}行 待复核: {reason_str}")

    def _finalize_outputs(self):
        pass

    def get_output_fieldnames(self, base_fieldnames):
        extra = ["_source_line", "_source_file", "_risk_labels", "_reason", "_last_status"]
        return [f for f in base_fieldnames if not f.startswith("_")] + extra

    def write_results(self, output_dir, base_fieldnames):
        out = Path(output_dir)
        out.mkdir(parents=True, exist_ok=True)

        fieldnames = self.get_output_fieldnames(base_fieldnames)

        normal_path = out / "normal.csv"
        abnormal_path = out / "abnormal.csv"
        review_path = out / "review.csv"

        write_csv(normal_path, self.normal_records, fieldnames)
        write_csv(abnormal_path, self.abnormal_records, fieldnames)
        write_csv(review_path, self.review_records, fieldnames)

        self.logger.info(f"正常记录输出: {normal_path} ({len(self.normal_records)} 条)")
        self.logger.info(f"异常记录输出: {abnormal_path} ({len(self.abnormal_records)} 条)")
        self.logger.info(f"待复核记录输出: {review_path} ({len(self.review_records)} 条)")

        return {
            "normal": str(normal_path),
            "abnormal": str(abnormal_path),
            "review": str(review_path),
        }
