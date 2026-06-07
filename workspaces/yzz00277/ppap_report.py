#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import csv
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, date
from typing import List, Dict, Tuple, Any, Optional

REQUIRED_FIELDS = [
    "record_id", "part_number", "part_name", "process_step",
    "inspection_item", "measurement_value", "unit", "spec_min",
    "spec_max", "inspector", "inspection_date", "shift",
    "equipment_id", "batch_number"
]

NUMERIC_FIELDS = ["measurement_value", "spec_min", "spec_max"]

DATE_FIELDS = ["inspection_date"]

DATE_FORMATS = ["%Y-%m-%d", "%Y/%m/%d", "%Y%m%d"]


class PPAPAnalyzer:

    def __init__(
        self,
        data_path: str,
        mapping_path: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        group_by: str = "process_step"
    ):
        self.data_path = data_path
        self.mapping_path = mapping_path
        self.start_date = self._parse_date(start_date) if start_date else None
        self.end_date = self._parse_date(end_date) if end_date else None
        self.group_by = group_by

        self.raw_records: List[Dict[str, Any]] = []
        self.valid_records: List[Dict[str, Any]] = []
        self.bad_records: List[Dict[str, Any]] = []
        self.responsibility_map: Dict[str, Any] = {}

        self.missing_count = 0
        self.duplicate_count = 0
        self.out_of_spec_count = 0
        self.rule_conflict_count = 0

    def _parse_date(self, date_str: str) -> Optional[date]:
        for fmt in DATE_FORMATS:
            try:
                return datetime.strptime(date_str, fmt).date()
            except (ValueError, TypeError):
                continue
        return None

    def _format_date(self, d: Any) -> str:
        if isinstance(d, date):
            return d.strftime("%Y-%m-%d")
        return str(d) if d else ""

    def load_responsibility_mapping(self) -> None:
        if not os.path.exists(self.mapping_path):
            print(f"[WARN] 责任映射文件不存在: {self.mapping_path}，将使用默认映射")
            self.responsibility_map = {}
            return
        with open(self.mapping_path, "r", encoding="utf-8") as f:
            self.responsibility_map = json.load(f)
        print(f"[INFO] 已加载责任映射，共 {len(self.responsibility_map)} 条规则")

    def get_responsibility(self, process_step: str, defect_type: str = "") -> Dict[str, str]:
        key = process_step or "default"
        if key in self.responsibility_map:
            return self.responsibility_map[key]
        if "default" in self.responsibility_map:
            return self.responsibility_map["default"]
        return {
            "department": "未指派",
            "owner": "未指派",
            "severity": "中"
        }

    def load_raw_data(self) -> None:
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"采集数据文件不存在: {self.data_path}")

        with open(self.data_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            self.raw_records = [dict(row) for row in reader]

        print(f"[INFO] 已加载原始记录 {len(self.raw_records)} 条")

    def _check_missing(self, record: Dict[str, str]) -> List[str]:
        missing = []
        for field in REQUIRED_FIELDS:
            val = record.get(field, "")
            if val is None or str(val).strip() == "":
                missing.append(field)
        return missing

    def _parse_numeric(self, value: str) -> Tuple[Optional[float], bool]:
        if value is None or str(value).strip() == "":
            return None, False
        try:
            return float(str(value).strip()), True
        except (ValueError, TypeError):
            return None, False

    def _check_out_of_spec(self, record: Dict[str, str]) -> Tuple[bool, str]:
        val, val_ok = self._parse_numeric(record.get("measurement_value", ""))
        spec_min, min_ok = self._parse_numeric(record.get("spec_min", ""))
        spec_max, max_ok = self._parse_numeric(record.get("spec_max", ""))

        if not val_ok or val is None:
            return False, ""

        reasons = []
        if min_ok and spec_min is not None and val < spec_min:
            reasons.append(f"低于下限{spec_min}")
        if max_ok and spec_max is not None and val > spec_max:
            reasons.append(f"高于上限{spec_max}")

        if reasons:
            return True, ";".join(reasons)
        return False, ""

    def _check_rule_conflict(self, record: Dict[str, str]) -> Tuple[bool, str]:
        spec_min, min_ok = self._parse_numeric(record.get("spec_min", ""))
        spec_max, max_ok = self._parse_numeric(record.get("spec_max", ""))

        conflicts = []
        if min_ok and max_ok and spec_min is not None and spec_max is not None:
            if spec_min > spec_max:
                conflicts.append(f"规格下限({spec_min})大于上限({spec_max})")

        if conflicts:
            return True, ";".join(conflicts)
        return False, ""

    def _in_date_range(self, record: Dict[str, str]) -> bool:
        if not self.start_date and not self.end_date:
            return True

        date_str = record.get("inspection_date", "")
        d = self._parse_date(date_str)
        if d is None:
            return False

        if self.start_date and d < self.start_date:
            return False
        if self.end_date and d > self.end_date:
            return False
        return True

    def validate_and_classify(self) -> None:
        seen_ids = defaultdict(list)

        for idx, record in enumerate(self.raw_records, start=1):
            rec = dict(record)
            rec["_row_num"] = idx
            rec["_issues"] = []
            rec["_issue_types"] = []
            rec["_is_bad"] = False

            missing_fields = self._check_missing(rec)
            if missing_fields:
                rec["_issues"].append(f"缺失字段:{','.join(missing_fields)}")
                rec["_issue_types"].append("缺失")
                rec["_missing_fields"] = ",".join(missing_fields)
                self.missing_count += 1
                rec["_is_bad"] = True

            has_conflict, conflict_reason = self._check_rule_conflict(rec)
            if has_conflict:
                rec["_issues"].append(f"规则冲突:{conflict_reason}")
                rec["_issue_types"].append("规则冲突")
                self.rule_conflict_count += 1
                rec["_is_bad"] = True

            out_of_spec, spec_reason = self._check_out_of_spec(rec)
            if out_of_spec:
                rec["_issues"].append(f"越界:{spec_reason}")
                rec["_issue_types"].append("越界")
                self.out_of_spec_count += 1

            rid = rec.get("record_id", "").strip()
            if rid:
                seen_ids[rid].append(idx)

            if not self._in_date_range(rec):
                rec["_issues"].append("不在时间范围内")
                rec["_issue_types"].append("时间越界")
                rec["_is_bad"] = True

            if rec["_is_bad"]:
                self.bad_records.append(rec)
            else:
                self.valid_records.append(rec)

        for rid, rows in seen_ids.items():
            if len(rows) > 1:
                self.duplicate_count += len(rows)
                for rec in self.valid_records + self.bad_records:
                    if rec.get("record_id", "").strip() == rid:
                        if "重复" not in rec["_issue_types"]:
                            rec["_issues"].append(f"重复记录:{len(rows)}条")
                            rec["_issue_types"].append("重复")
                        rec["_duplicate_count"] = len(rows)

        print(f"[INFO] 有效记录: {len(self.valid_records)} 条")
        print(f"[INFO] 坏记录: {len(self.bad_records)} 条")
        print(f"[INFO] 缺失: {self.missing_count} 条, 重复: {self.duplicate_count} 条, "
              f"越界: {self.out_of_spec_count} 条, 规则冲突: {self.rule_conflict_count} 条")

    def generate_detail_report(self, output_path: str) -> None:
        all_records = self.valid_records + self.bad_records
        all_records.sort(key=lambda r: r["_row_num"])

        fieldnames = REQUIRED_FIELDS + [
            "责任部门", "责任人", "严重等级",
            "问题类型", "问题描述", "是否坏行", "行号"
        ]

        with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()

            for rec in all_records:
                resp = self.get_responsibility(rec.get("process_step", ""))
                out_row = {k: rec.get(k, "") for k in REQUIRED_FIELDS}
                out_row["责任部门"] = resp.get("department", "")
                out_row["责任人"] = resp.get("owner", "")
                out_row["严重等级"] = resp.get("severity", "")
                out_row["问题类型"] = ",".join(rec.get("_issue_types", []))
                out_row["问题描述"] = ";".join(rec.get("_issues", []))
                out_row["是否坏行"] = "是" if rec.get("_is_bad") else "否"
                out_row["行号"] = rec.get("_row_num", "")
                writer.writerow(out_row)

        print(f"[INFO] 明细表已生成: {output_path}")

    def generate_summary_report(self, output_path: str) -> None:
        groups = defaultdict(lambda: {
            "total": 0,
            "valid": 0,
            "bad": 0,
            "missing": 0,
            "duplicate": 0,
            "out_of_spec": 0,
            "rule_conflict": 0,
            "pass_rate": 0.0,
            "records": []
        })

        all_records = self.valid_records + self.bad_records
        for rec in all_records:
            key = rec.get(self.group_by, "未分类") or "未分类"
            g = groups[key]
            g["total"] += 1
            g["records"].append(rec)

            if rec.get("_is_bad"):
                g["bad"] += 1
            else:
                g["valid"] += 1

            issue_types = rec.get("_issue_types", [])
            if "缺失" in issue_types:
                g["missing"] += 1
            if "重复" in issue_types:
                g["duplicate"] += 1
            if "越界" in issue_types:
                g["out_of_spec"] += 1
            if "规则冲突" in issue_types:
                g["rule_conflict"] += 1

        for key, g in groups.items():
            if g["total"] > 0:
                g["pass_rate"] = round(g["valid"] / g["total"] * 100, 2)

        fieldnames = [
            self.group_by, "总记录数", "有效记录数", "坏记录数",
            "缺失数", "重复数", "越界数", "规则冲突数", "合格率(%)"
        ]

        with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

            for key in sorted(groups.keys()):
                g = groups[key]
                writer.writerow({
                    self.group_by: key,
                    "总记录数": g["total"],
                    "有效记录数": g["valid"],
                    "坏记录数": g["bad"],
                    "缺失数": g["missing"],
                    "重复数": g["duplicate"],
                    "越界数": g["out_of_spec"],
                    "规则冲突数": g["rule_conflict"],
                    "合格率(%)": g["pass_rate"]
                })

            writer.writerow({})
            writer.writerow({
                self.group_by: "合计",
                "总记录数": len(all_records),
                "有效记录数": len(self.valid_records),
                "坏记录数": len(self.bad_records),
                "缺失数": self.missing_count,
                "重复数": self.duplicate_count,
                "越界数": self.out_of_spec_count,
                "规则冲突数": self.rule_conflict_count,
                "合格率(%)": round(len(self.valid_records) / len(all_records) * 100, 2) if all_records else 0
            })

        print(f"[INFO] 汇总报告已生成: {output_path}")

    def generate_issue_list(self, output_path: str) -> None:
        issues = []
        all_records = self.valid_records + self.bad_records

        for rec in all_records:
            if not rec.get("_issue_types"):
                continue
            resp = self.get_responsibility(rec.get("process_step", ""))
            for itype in rec["_issue_types"]:
                issues.append({
                    "行号": rec.get("_row_num", ""),
                    "记录ID": rec.get("record_id", ""),
                    "零件号": rec.get("part_number", ""),
                    "工序": rec.get("process_step", ""),
                    "检验项目": rec.get("inspection_item", ""),
                    "问题类型": itype,
                    "问题描述": ";".join(rec.get("_issues", [])),
                    "责任部门": resp.get("department", ""),
                    "责任人": resp.get("owner", ""),
                    "严重等级": resp.get("severity", ""),
                    "是否坏行": "是" if rec.get("_is_bad") else "否"
                })

        fieldnames = [
            "行号", "记录ID", "零件号", "工序", "检验项目",
            "问题类型", "问题描述", "责任部门", "责任人", "严重等级", "是否坏行"
        ]

        with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for issue in issues:
                writer.writerow(issue)

        print(f"[INFO] 问题清单已生成: {output_path}，共 {len(issues)} 条问题")

    def generate_text_summary(self, output_path: str) -> str:
        all_count = len(self.valid_records) + len(self.bad_records)
        pass_rate = round(len(self.valid_records) / all_count * 100, 2) if all_count else 0

        time_range = "全部"
        if self.start_date or self.end_date:
            start = self._format_date(self.start_date) if self.start_date else "不限"
            end = self._format_date(self.end_date) if self.end_date else "不限"
            time_range = f"{start} 至 {end}"

        summary_lines = [
            "=" * 60,
            "汽车零部件 PPAP 材料复核报告",
            "=" * 60,
            "",
            f"报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"数据文件: {self.data_path}",
            f"时间范围: {time_range}",
            f"分组维度: {self.group_by}",
            "",
            "-" * 40,
            "一、总体情况",
            "-" * 40,
            f"总记录数: {all_count} 条",
            f"有效记录: {len(self.valid_records)} 条",
            f"坏记录: {len(self.bad_records)} 条",
            f"合格率: {pass_rate}%",
            "",
            "-" * 40,
            "二、问题分类统计",
            "-" * 40,
            f"缺失字段记录: {self.missing_count} 条",
            f"重复记录: {self.duplicate_count} 条",
            f"越界(超规格)记录: {self.out_of_spec_count} 条",
            f"规则冲突记录: {self.rule_conflict_count} 条",
            "",
            "-" * 40,
            "三、按分组维度汇总",
            "-" * 40,
        ]

        groups = defaultdict(lambda: {"total": 0, "valid": 0})
        for rec in self.valid_records + self.bad_records:
            key = rec.get(self.group_by, "未分类") or "未分类"
            groups[key]["total"] += 1
            if not rec.get("_is_bad"):
                groups[key]["valid"] += 1

        for key in sorted(groups.keys()):
            g = groups[key]
            rate = round(g["valid"] / g["total"] * 100, 2) if g["total"] else 0
            summary_lines.append(f"  {key}: {g['total']}条, 合格{g['valid']}条, 合格率{rate}%")

        summary_lines.extend([
            "",
            "-" * 40,
            "四、输出文件说明",
            "-" * 40,
            "  1. ppap_detail.csv   - 明细表（全量记录，含问题标注）",
            "  2. ppap_summary.csv  - 汇总报告（按分组维度统计）",
            "  3. ppap_issues.csv   - 问题清单（仅异常记录）",
            "  4. ppap_summary.txt  - 本摘要文件",
            "",
            "=" * 60,
            "复核入口：请对照明细表逐行核对，问题清单中重点核查。",
            "=" * 60,
            ""
        ])

        text = "\n".join(summary_lines)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(text)

        print(f"[INFO] 文本摘要已生成: {output_path}")
        return text

    def generate_bad_records(self, output_path: str) -> None:
        fieldnames = REQUIRED_FIELDS + ["问题类型", "问题描述", "行号"]

        with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()

            for rec in self.bad_records:
                out_row = {k: rec.get(k, "") for k in REQUIRED_FIELDS}
                out_row["问题类型"] = ",".join(rec.get("_issue_types", []))
                out_row["问题描述"] = ";".join(rec.get("_issues", []))
                out_row["行号"] = rec.get("_row_num", "")
                writer.writerow(out_row)

        print(f"[INFO] 坏行隔离文件已生成: {output_path}，共 {len(self.bad_records)} 条")

    def run(self, output_dir: str = "output") -> Dict[str, str]:
        os.makedirs(output_dir, exist_ok=True)

        self.load_responsibility_mapping()
        self.load_raw_data()
        self.validate_and_classify()

        outputs = {
            "detail": os.path.join(output_dir, "ppap_detail.csv"),
            "summary": os.path.join(output_dir, "ppap_summary.csv"),
            "issues": os.path.join(output_dir, "ppap_issues.csv"),
            "bad": os.path.join(output_dir, "ppap_bad_records.csv"),
            "text": os.path.join(output_dir, "ppap_summary.txt"),
        }

        self.generate_detail_report(outputs["detail"])
        self.generate_summary_report(outputs["summary"])
        self.generate_issue_list(outputs["issues"])
        self.generate_bad_records(outputs["bad"])
        summary_text = self.generate_text_summary(outputs["text"])

        print("\n" + "=" * 60)
        print("处理完成！输出文件清单：")
        for name, path in outputs.items():
            print(f"  [{name}] {path}")
        print("=" * 60)

        return outputs


def main():
    parser = argparse.ArgumentParser(
        description="汽车零部件PPAP材料脚本 - 将原始记录整理成可复核报告",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python ppap_report.py -d data.csv -m mapping.json
  python ppap_report.py -d data.csv -m mapping.json -s 2025-01-01 -e 2025-12-31
  python ppap_report.py -d data.csv -m mapping.json -g part_number
  python ppap_report.py -d data.csv -m mapping.json -o ./report
        """
    )
    parser.add_argument("-d", "--data", required=True, help="采集数据CSV文件路径")
    parser.add_argument("-m", "--mapping", required=True, help="责任映射JSON文件路径")
    parser.add_argument("-s", "--start-date", help="开始日期 (YYYY-MM-DD)")
    parser.add_argument("-e", "--end-date", help="结束日期 (YYYY-MM-DD)")
    parser.add_argument("-g", "--group-by", default="process_step",
                        help="分组维度 (默认: process_step)")
    parser.add_argument("-o", "--output-dir", default="output",
                        help="输出目录 (默认: output)")

    args = parser.parse_args()

    try:
        analyzer = PPAPAnalyzer(
            data_path=args.data,
            mapping_path=args.mapping,
            start_date=args.start_date,
            end_date=args.end_date,
            group_by=args.group_by
        )
        analyzer.run(output_dir=args.output_dir)
    except Exception as ex:
        print(f"[ERROR] 处理失败: {ex}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
