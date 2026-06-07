#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
不动产抵押注销数据校验与状态分流系统

功能：
- 数据校验：材料完整性、阈值合规性、时间有效性
- 状态分流：合规通过、待补材料、超阈值、已注销、处理中
- 闭环管理：任务分配、超时预警、完成跟踪
- 多维输出：明细表、汇总报告、问题清单、文本摘要
- 可解释：时间窗口、分组维度、阈值命中原因

使用方式：
    python mortgage_discharge_validator.py --data data.json --mapping mapping.json \
        --time-start 2024-01-01 --time-end 2024-12-31 --group-by branch,status

作者：业务风控团队
"""

import argparse
import json
import os
import sys
from datetime import datetime, date, timedelta
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Tuple, Any
from copy import deepcopy


# ============================================================
# 数据模型
# ============================================================

@dataclass
class MortgageRecord:
    """抵押注销记录 - 采集数据"""
    record_id: str
    property_id: str
    property_address: str
    borrower_name: str
    borrower_id: str
    loan_amount: float
    mortgage_amount: float
    discharge_amount: float
    apply_date: str
    expected_close_date: str
    actual_close_date: Optional[str]
    branch: str
    handler: str
    materials: List[str]
    status: str
    remarks: str = ""

    def __post_init__(self):
        if not isinstance(self.materials, list):
            self.materials = []
        if self.actual_close_date == "":
            self.actual_close_date = None


@dataclass
class ResponsibilityMapping:
    """责任映射 - 分支机构/人员/阈值"""
    branch: str
    manager: str
    contact: str
    daily_threshold: float
    monthly_threshold: float
    required_materials: List[str]


@dataclass
class ValidationResult:
    """单条校验结果"""
    record_id: str
    property_id: str
    borrower_name: str
    is_valid: bool
    final_status: str
    issues: List[Dict] = field(default_factory=list)
    explanations: List[str] = field(default_factory=list)
    risk_level: str = "normal"
    responsible_person: str = ""
    deadline: str = ""


@dataclass
class TimeWindow:
    """时间窗口"""
    start: date
    end: date
    label: str

    @classmethod
    def from_str(cls, start_str: str, end_str: str, label: str = ""):
        s = datetime.strptime(start_str, "%Y-%m-%d").date()
        e = datetime.strptime(end_str, "%Y-%m-%d").date()
        if not label:
            label = f"{start_str} 至 {end_str}"
        return cls(start=s, end=e, label=label)

    def contains(self, date_str: Optional[str]) -> bool:
        if not date_str:
            return False
        d = datetime.strptime(date_str, "%Y-%m-%d").date()
        return self.start <= d <= self.end

    def days(self) -> int:
        return (self.end - self.start).days + 1


# ============================================================
# 常量与规则配置
# ============================================================

REQUIRED_MATERIALS_STANDARD = [
    "不动产登记申请书",
    "申请人身份证明",
    "不动产权属证书",
    "抵押权消灭的证明材料",
    "授权委托书（如有）",
]

STATUS_FLOW = {
    "pending": "待受理",
    "reviewing": "审核中",
    "supplement": "待补材料",
    "approved": "已核准",
    "discharged": "已注销",
    "rejected": "已驳回",
    "overdue": "已逾期",
}

RISK_LEVELS = {
    "normal": "正常",
    "warning": "关注",
    "high": "高风险",
}

# 办理时限（自然日）
PROCESSING_DEADLINE_DAYS = 7
SUPPLEMENT_DEADLINE_DAYS = 15


# ============================================================
# 校验引擎
# ============================================================

class ValidationEngine:
    """校验引擎 - 数据校验 + 状态分流"""

    def __init__(self, mapping: Dict[str, ResponsibilityMapping],
                 time_window: TimeWindow,
                 group_dims: List[str],
                 today: Optional[date] = None):
        self.mapping = mapping
        self.time_window = time_window
        self.group_dims = group_dims
        self.today = today if today else date.today()
        self.audit_trail = []

    def _audit(self, record_id: str, rule: str, result: str, detail: str = ""):
        """审计轨迹 - 用于可解释性和历史回放"""
        self.audit_trail.append({
            "timestamp": datetime.now().isoformat(),
            "record_id": record_id,
            "rule": rule,
            "result": result,
            "detail": detail,
        })

    def validate_record(self, record: MortgageRecord) -> ValidationResult:
        """校验单条记录"""
        issues = []
        explanations = []
        final_status = record.status
        risk_level = "normal"
        responsible = ""
        deadline = ""

        branch_map = self.mapping.get(record.branch)
        if branch_map:
            responsible = branch_map.manager

        # 规则1：时间窗口校验 - 记录是否在统计范围内
        in_window = self.time_window.contains(record.apply_date)
        if in_window:
            explanations.append(
                f"申请日期 {record.apply_date} 落在统计窗口 {self.time_window.label} 内，纳入统计"
            )
        else:
            explanations.append(
                f"申请日期 {record.apply_date} 不在统计窗口 {self.time_window.label} 内，仅校验不汇总"
            )
        self._audit(record.record_id, "time_window_check",
                    "pass" if in_window else "out_of_range",
                    f"apply_date={record.apply_date}, window={self.time_window.label}")

        # 规则2：材料完整性校验
        required_all = set(REQUIRED_MATERIALS_STANDARD)
        if branch_map and branch_map.required_materials:
            required_all = set(branch_map.required_materials)

        optional_keywords = ["如有", "可选", "视情况"]
        required_mandatory = set()
        required_optional = set()
        for mat in required_all:
            is_optional = any(kw in mat for kw in optional_keywords)
            if is_optional:
                required_optional.add(mat)
            else:
                required_mandatory.add(mat)

        provided = set(record.materials)
        missing_mandatory = required_mandatory - provided
        missing_optional = required_optional - provided

        if missing_mandatory:
            issues.append({
                "type": "material_missing",
                "severity": "high",
                "missing_items": sorted(list(missing_mandatory)),
                "missing_optional": sorted(list(missing_optional)),
                "description": f"缺失 {len(missing_mandatory)} 项必要材料",
            })
            if final_status in ("pending", "reviewing"):
                final_status = "supplement"
            risk_level = "high" if len(missing_mandatory) >= 2 else "warning"
            explanations.append(
                f"材料校验不通过，缺失必选材料：{', '.join(sorted(missing_mandatory))}；"
                f"可选材料缺失：{', '.join(sorted(missing_optional)) if missing_optional else '无'}；"
                f"状态调整为「{STATUS_FLOW.get(final_status, final_status)}」"
            )
            self._audit(record.record_id, "material_check", "fail",
                        f"missing_mandatory={sorted(missing_mandatory)}, missing_optional={sorted(missing_optional)}")
        else:
            if missing_optional:
                explanations.append(
                    f"材料完整性校验通过（必选材料齐全，可选材料缺失：{', '.join(sorted(missing_optional))}）"
                )
            else:
                explanations.append("材料完整性校验通过（所有材料齐全）")
            self._audit(record.record_id, "material_check", "pass",
                        f"provided {len(provided)} items, missing_optional={sorted(missing_optional)}")

        # 规则3：金额阈值校验
        if branch_map:
            daily_threshold = branch_map.daily_threshold
            monthly_threshold = branch_map.monthly_threshold
        else:
            daily_threshold = float('inf')
            monthly_threshold = float('inf')

        if record.discharge_amount > daily_threshold:
            issues.append({
                "type": "amount_exceed_daily",
                "severity": "warning",
                "threshold": daily_threshold,
                "actual": record.discharge_amount,
                "exceed_by": record.discharge_amount - daily_threshold,
                "description": f"单笔注销金额超日阈值",
            })
            risk_level = "warning" if risk_level == "normal" else risk_level
            explanations.append(
                f"金额校验：单笔注销金额 {record.discharge_amount:,.2f} 元 "
                f"超过日阈值 {daily_threshold:,.2f} 元，超出 "
                f"{record.discharge_amount - daily_threshold:,.2f} 元"
            )
            self._audit(record.record_id, "daily_threshold_check", "exceed",
                        f"actual={record.discharge_amount}, threshold={daily_threshold}")
        else:
            if branch_map:
                explanations.append(
                    f"金额校验：{record.discharge_amount:,.2f} 元 ≤ 日阈值 {daily_threshold:,.2f} 元，通过"
                )
            self._audit(record.record_id, "daily_threshold_check", "pass",
                        f"actual={record.discharge_amount}")

        # 规则4：贷款-抵押-注销金额一致性校验
        if record.discharge_amount > record.mortgage_amount:
            issues.append({
                "type": "amount_inconsistent",
                "severity": "high",
                "mortgage_amount": record.mortgage_amount,
                "discharge_amount": record.discharge_amount,
                "description": "注销金额超过抵押金额",
            })
            risk_level = "high"
            explanations.append(
                f"一致性校验异常：注销金额 {record.discharge_amount:,.2f} 元 "
                f"大于抵押金额 {record.mortgage_amount:,.2f} 元"
            )
            self._audit(record.record_id, "amount_consistency_check", "fail",
                        f"discharge={record.discharge_amount} > mortgage={record.mortgage_amount}")
        else:
            explanations.append("金额一致性校验通过")
            self._audit(record.record_id, "amount_consistency_check", "pass")

        # 规则5：办理时限校验与状态分流
        apply_dt = datetime.strptime(record.apply_date, "%Y-%m-%d").date()
        today = self.today

        if record.status == "pending" and (today - apply_dt).days > PROCESSING_DEADLINE_DAYS:
            final_status = "overdue"
            issues.append({
                "type": "processing_overdue",
                "severity": "high",
                "deadline_days": PROCESSING_DEADLINE_DAYS,
                "actual_days": (today - apply_dt).days,
                "description": f"待受理超 {PROCESSING_DEADLINE_DAYS} 个工作日未处理",
            })
            risk_level = "high"
            deadline_dt = apply_dt + timedelta(days=PROCESSING_DEADLINE_DAYS)
            deadline = deadline_dt.strftime("%Y-%m-%d")
            explanations.append(
                f"时效校验：已超 {PROCESSING_DEADLINE_DAYS} 天办理时限（应于 {deadline} 前完成），"
                f"状态置为「已逾期」"
            )
            self._audit(record.record_id, "timeliness_check", "overdue",
                        f"pending for {(today - apply_dt).days} days")
        elif record.status == "supplement":
            deadline_dt = apply_dt + timedelta(days=SUPPLEMENT_DEADLINE_DAYS)
            deadline = deadline_dt.strftime("%Y-%m-%d")
            if (today - apply_dt).days > SUPPLEMENT_DEADLINE_DAYS:
                risk_level = "high"
                issues.append({
                    "type": "supplement_overdue",
                    "severity": "high",
                    "deadline_days": SUPPLEMENT_DEADLINE_DAYS,
                    "actual_days": (today - apply_dt).days,
                    "description": f"补材料超 {SUPPLEMENT_DEADLINE_DAYS} 天未完成",
                })
                explanations.append(
                    f"时效校验：补材料已超 {SUPPLEMENT_DEADLINE_DAYS} 天时限（截止 {deadline}），风险升级"
                )
                self._audit(record.record_id, "supplement_check", "overdue",
                            f"supplement for {(today - apply_dt).days} days")
            else:
                explanations.append(
                    f"时效校验：补材料中，截止日期 {deadline}，剩余 "
                    f"{(deadline_dt - today).days} 天"
                )
                self._audit(record.record_id, "supplement_check", "in_progress")
        elif record.status in ("pending", "reviewing"):
            deadline_dt = apply_dt + timedelta(days=PROCESSING_DEADLINE_DAYS)
            deadline = deadline_dt.strftime("%Y-%m-%d")
            days_left = (deadline_dt - today).days
            if days_left <= 2 and days_left >= 0:
                risk_level = "warning"
                explanations.append(
                    f"时效校验：办理中，距截止 {deadline} 还有 {days_left} 天，请注意时效"
                )
                self._audit(record.record_id, "timeliness_check", "approaching_deadline",
                            f"{days_left} days left")
            else:
                explanations.append(
                    f"时效校验：办理中，截止日期 {deadline}，剩余 {days_left} 天"
                )
                self._audit(record.record_id, "timeliness_check", "on_time")

        # 规则6：已注销记录闭环校验
        if record.status == "discharged" and record.actual_close_date:
            close_dt = datetime.strptime(record.actual_close_date, "%Y-%m-%d").date()
            days_used = (close_dt - apply_dt).days
            explanations.append(
                f"闭环校验：已于 {record.actual_close_date} 完成注销，"
                f"用时 {days_used} 天"
            )
            self._audit(record.record_id, "closure_check", "completed",
                        f"closed in {days_used} days")
        elif record.status == "discharged" and not record.actual_close_date:
            issues.append({
                "type": "missing_close_date",
                "severity": "warning",
                "description": "已注销状态但缺失实际办结日期",
            })
            explanations.append("闭环校验异常：已注销但未记录实际办结日期")
            self._audit(record.record_id, "closure_check", "missing_date")

        is_valid = len([i for i in issues if i["severity"] == "high"]) == 0

        return ValidationResult(
            record_id=record.record_id,
            property_id=record.property_id,
            borrower_name=record.borrower_name,
            is_valid=is_valid,
            final_status=final_status,
            issues=issues,
            explanations=explanations,
            risk_level=risk_level,
            responsible_person=responsible,
            deadline=deadline,
        )

    def validate_all(self, records: List[MortgageRecord]) -> List[ValidationResult]:
        """批量校验"""
        results = []
        for r in records:
            results.append(self.validate_record(r))
        return results


# ============================================================
# 分组汇总
# ============================================================

class GroupAnalyzer:
    """分组维度分析"""

    def __init__(self, group_dims: List[str], time_window: TimeWindow):
        self.group_dims = group_dims
        self.time_window = time_window

    def _get_group_key(self, record: MortgageRecord, result: ValidationResult) -> Tuple:
        """生成分组键"""
        keys = []
        for dim in self.group_dims:
            dim = dim.strip()
            if dim == "branch":
                keys.append(record.branch)
            elif dim == "status":
                keys.append(result.final_status)
            elif dim == "risk_level":
                keys.append(result.risk_level)
            elif dim == "handler":
                keys.append(record.handler)
            elif dim == "month":
                if record.apply_date:
                    keys.append(record.apply_date[:7])
                else:
                    keys.append("unknown")
            else:
                keys.append(getattr(record, dim, "unknown"))
        return tuple(keys)

    def summarize(self, records: List[MortgageRecord],
                  results: List[ValidationResult]) -> Dict:
        """按维度分组汇总"""
        groups = defaultdict(lambda: {
            "count": 0,
            "total_discharge_amount": 0.0,
            "valid_count": 0,
            "issue_count": 0,
            "high_risk_count": 0,
            "warning_count": 0,
            "normal_count": 0,
            "status_breakdown": defaultdict(int),
            "avg_processing_days": [],
        })

        rec_result_map = {r.record_id: r for r in results}

        for rec in records:
            if not self.time_window.contains(rec.apply_date):
                continue
            result = rec_result_map.get(rec.record_id)
            if not result:
                continue

            key = self._get_group_key(rec, result)
            g = groups[key]
            g["count"] += 1
            g["total_discharge_amount"] += rec.discharge_amount
            if result.is_valid:
                g["valid_count"] += 1
            if result.issues:
                g["issue_count"] += 1
            risk_key_map = {
                "high": "high_risk_count",
                "warning": "warning_count",
                "normal": "normal_count",
            }
            g[risk_key_map.get(result.risk_level, "normal_count")] += 1
            g["status_breakdown"][result.final_status] += 1

            if rec.actual_close_date and rec.apply_date:
                try:
                    d1 = datetime.strptime(rec.apply_date, "%Y-%m-%d").date()
                    d2 = datetime.strptime(rec.actual_close_date, "%Y-%m-%d").date()
                    g["avg_processing_days"].append((d2 - d1).days)
                except Exception:
                    pass

        summary = []
        for key, g in groups.items():
            avg_days = (sum(g["avg_processing_days"]) / len(g["avg_processing_days"])
                        if g["avg_processing_days"] else None)
            dim_values = {dim: val for dim, val in zip(self.group_dims, key)}
            summary.append({
                **dim_values,
                "count": g["count"],
                "total_discharge_amount": round(g["total_discharge_amount"], 2),
                "valid_count": g["valid_count"],
                "valid_rate": round(g["valid_count"] / g["count"] * 100, 2) if g["count"] else 0,
                "issue_count": g["issue_count"],
                "issue_rate": round(g["issue_count"] / g["count"] * 100, 2) if g["count"] else 0,
                "high_risk_count": g["high_risk_count"],
                "warning_count": g["warning_count"],
                "normal_count": g["normal_count"],
                "status_breakdown": dict(g["status_breakdown"]),
                "avg_processing_days": round(avg_days, 1) if avg_days else None,
            })

        summary.sort(key=lambda x: x["count"], reverse=True)

        return {
            "group_dimensions": self.group_dims,
            "time_window": self.time_window.label,
            "total_groups": len(summary),
            "groups": summary,
        }


# ============================================================
# 输出模块
# ============================================================

class ReportGenerator:
    """报告生成器 - 明细表/汇总/问题清单/摘要"""

    def __init__(self, time_window: TimeWindow, group_dims: List[str]):
        self.time_window = time_window
        self.group_dims = group_dims

    def generate_detail_report(self, records: List[MortgageRecord],
                               results: List[ValidationResult]) -> Dict:
        """生成明细表"""
        detail_rows = []
        rec_map = {r.record_id: r for r in records}

        for result in results:
            rec = rec_map.get(result.record_id)
            if not rec:
                continue
            row = {
                "record_id": result.record_id,
                "property_id": result.property_id,
                "property_address": rec.property_address,
                "borrower_name": result.borrower_name,
                "loan_amount": rec.loan_amount,
                "mortgage_amount": rec.mortgage_amount,
                "discharge_amount": rec.discharge_amount,
                "apply_date": rec.apply_date,
                "expected_close_date": rec.expected_close_date,
                "actual_close_date": rec.actual_close_date,
                "branch": rec.branch,
                "handler": rec.handler,
                "original_status": rec.status,
                "original_status_label": STATUS_FLOW.get(rec.status, rec.status),
                "final_status": result.final_status,
                "final_status_label": STATUS_FLOW.get(result.final_status, result.final_status),
                "is_valid": result.is_valid,
                "risk_level": result.risk_level,
                "risk_level_label": RISK_LEVELS.get(result.risk_level, result.risk_level),
                "responsible_person": result.responsible_person,
                "deadline": result.deadline,
                "issue_count": len(result.issues),
                "issues": result.issues,
                "explanations": result.explanations,
                "in_time_window": self.time_window.contains(rec.apply_date),
            }
            detail_rows.append(row)

        detail_rows.sort(key=lambda x: x["apply_date"])

        return {
            "report_type": "detail",
            "time_window": self.time_window.label,
            "total_count": len(detail_rows),
            "in_window_count": sum(1 for r in detail_rows if r["in_time_window"]),
            "rows": detail_rows,
        }

    def generate_summary_report(self, group_summary: Dict) -> Dict:
        """生成汇总报告"""
        all_groups = group_summary["groups"]
        total_count = sum(g["count"] for g in all_groups)
        total_amount = sum(g["total_discharge_amount"] for g in all_groups)
        total_valid = sum(g["valid_count"] for g in all_groups)
        total_issue = sum(g["issue_count"] for g in all_groups)
        total_high_risk = sum(g["high_risk_count"] for g in all_groups)
        total_warning = sum(g["warning_count"] for g in all_groups)

        all_statuses = defaultdict(int)
        for g in all_groups:
            for status, cnt in g["status_breakdown"].items():
                all_statuses[status] += cnt

        overall = {
            "total_count": total_count,
            "total_discharge_amount": round(total_amount, 2),
            "valid_count": total_valid,
            "valid_rate": round(total_valid / total_count * 100, 2) if total_count else 0,
            "issue_count": total_issue,
            "issue_rate": round(total_issue / total_count * 100, 2) if total_count else 0,
            "high_risk_count": total_high_risk,
            "high_risk_rate": round(total_high_risk / total_count * 100, 2) if total_count else 0,
            "warning_count": total_warning,
            "warning_rate": round(total_warning / total_count * 100, 2) if total_count else 0,
            "status_breakdown": {
                STATUS_FLOW.get(k, k): v for k, v in all_statuses.items()
            },
        }

        return {
            "report_type": "summary",
            "time_window": group_summary["time_window"],
            "group_dimensions": group_summary["group_dimensions"],
            "overall": overall,
            "group_count": group_summary["total_groups"],
            "groups": all_groups,
        }

    def generate_issue_list(self, results: List[ValidationResult],
                            records: List[MortgageRecord]) -> Dict:
        """生成问题清单"""
        issues = []
        rec_map = {r.record_id: r for r in records}

        for result in results:
            if not result.issues:
                continue
            rec = rec_map.get(result.record_id)
            if rec and not self.time_window.contains(rec.apply_date):
                continue
            for issue in result.issues:
                issues.append({
                    "record_id": result.record_id,
                    "property_id": result.property_id,
                    "borrower_name": result.borrower_name,
                    "branch": rec.branch if rec else "",
                    "handler": rec.handler if rec else "",
                    "responsible_person": result.responsible_person,
                    "issue_type": issue["type"],
                    "severity": issue["severity"],
                    "description": issue["description"],
                    "detail": issue,
                    "final_status": result.final_status,
                    "deadline": result.deadline,
                })

        issues.sort(key=lambda x: (
            {"high": 0, "warning": 1, "info": 2}.get(x["severity"], 3),
            x["issue_type"],
        ))

        type_stats = defaultdict(lambda: {"count": 0, "high": 0, "warning": 0})
        for issue in issues:
            t = issue["issue_type"]
            type_stats[t]["count"] += 1
            type_stats[t][issue["severity"]] += 1

        return {
            "report_type": "issue_list",
            "time_window": self.time_window.label,
            "total_issues": len(issues),
            "high_severity": sum(1 for i in issues if i["severity"] == "high"),
            "warning_severity": sum(1 for i in issues if i["severity"] == "warning"),
            "issue_type_breakdown": {
                k: dict(v) for k, v in type_stats.items()
            },
            "issues": issues,
        }

    def generate_text_summary(self, summary_report: Dict,
                              issue_list: Dict) -> str:
        """生成文本摘要"""
        overall = summary_report["overall"]
        dims = "、".join(summary_report["group_dimensions"])
        tw = summary_report["time_window"]

        lines = []
        lines.append("=" * 60)
        lines.append("不动产抵押注销数据校验报告 - 文本摘要")
        lines.append("=" * 60)
        lines.append(f"统计时间窗口：{tw}")
        lines.append(f"分组维度：{dims}")
        lines.append(f"分组数量：{summary_report['group_count']}")
        lines.append("")
        lines.append("一、总体情况")
        lines.append(f"  本期共处理抵押注销申请 {overall['total_count']} 笔")
        lines.append(f"  涉及注销金额合计 {overall['total_discharge_amount']:,.2f} 元")
        lines.append(f"  校验通过率：{overall['valid_rate']}%（{overall['valid_count']}/{overall['total_count']}）")
        lines.append(f"  问题检出率：{overall['issue_rate']}%（{overall['issue_count']}/{overall['total_count']}）")
        lines.append("")
        lines.append("二、风险分布")
        lines.append(f"  高风险：{overall['high_risk_count']} 笔，占比 {overall['high_risk_rate']}%")
        lines.append(f"  关注级：{overall['warning_count']} 笔，占比 {overall['warning_rate']}%")
        lines.append(f"  正常：{overall['total_count'] - overall['high_risk_count'] - overall['warning_count']} 笔")
        lines.append("")
        lines.append("三、状态分布")
        for status_label, count in overall["status_breakdown"].items():
            pct = round(count / overall["total_count"] * 100, 2) if overall["total_count"] else 0
            lines.append(f"  {status_label}：{count} 笔（{pct}%）")
        lines.append("")
        lines.append("四、主要问题类型")
        if issue_list["issue_type_breakdown"]:
            for issue_type, stats in sorted(issue_list["issue_type_breakdown"].items(),
                                            key=lambda x: x[1]["count"], reverse=True):
                lines.append(f"  - {issue_type}：{stats['count']} 笔（高风险 {stats['high']}，关注 {stats['warning']}）")
        else:
            lines.append("  无问题")
        lines.append("")
        lines.append("五、分组概览")
        for g in summary_report["groups"][:10]:
            group_label = " / ".join(str(g.get(d, "")) for d in summary_report["group_dimensions"])
            lines.append(
                f"  [{group_label}] {g['count']} 笔，通过率 {g['valid_rate']}%，"
                f"金额 {g['total_discharge_amount']:,.2f} 元"
            )
        if len(summary_report["groups"]) > 10:
            lines.append(f"  ... 共 {summary_report['group_count']} 个分组，详见汇总报告")
        lines.append("")
        lines.append("=" * 60)

        return "\n".join(lines)


# ============================================================
# 历史回放
# ============================================================

class HistoryPlayer:
    """历史回放 - 基于审计轨迹重放校验过程"""

    def __init__(self, audit_trail: List[Dict]):
        self.audit_trail = audit_trail

    def replay_by_record(self, record_id: str) -> List[Dict]:
        """按记录回放"""
        return [t for t in self.audit_trail if t["record_id"] == record_id]

    def replay_by_rule(self, rule: str) -> List[Dict]:
        """按规则回放"""
        return [t for t in self.audit_trail if t["rule"] == rule]

    def generate_replay_report(self, record_id: str,
                               record: MortgageRecord,
                               result: ValidationResult) -> Dict:
        """生成单条记录的完整回放报告"""
        trail = self.replay_by_record(record_id)
        return {
            "record_id": record_id,
            "borrower_name": record.borrower_name,
            "property_id": record.property_id,
            "apply_date": record.apply_date,
            "original_status": record.status,
            "original_status_label": STATUS_FLOW.get(record.status, record.status),
            "final_status": result.final_status,
            "final_status_label": STATUS_FLOW.get(result.final_status, result.final_status),
            "is_valid": result.is_valid,
            "risk_level": result.risk_level,
            "audit_steps": [
                {
                    "step": idx + 1,
                    "rule": step["rule"],
                    "result": step["result"],
                    "detail": step["detail"],
                    "timestamp": step["timestamp"],
                }
                for idx, step in enumerate(trail)
            ],
            "explanations": result.explanations,
            "issues": result.issues,
        }


# ============================================================
# 数据加载
# ============================================================

def load_mortgage_records(filepath: str) -> List[MortgageRecord]:
    """加载抵押注销记录"""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict) and "records" in data:
        data = data["records"]
    return [MortgageRecord(**item) for item in data]


def load_mapping(filepath: str) -> Dict[str, ResponsibilityMapping]:
    """加载责任映射"""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict) and "mapping" in data:
        data = data["mapping"]
    mapping = {}
    for item in data:
        m = ResponsibilityMapping(**item)
        mapping[m.branch] = m
    return mapping


# ============================================================
# 主入口
# ============================================================

def run_analysis(data_file: str, mapping_file: str,
                 time_start: str, time_end: str,
                 group_by: List[str],
                 output_dir: str = "./output",
                 today_str: Optional[str] = None) -> Dict:
    """运行完整分析"""
    records = load_mortgage_records(data_file)
    mapping = load_mapping(mapping_file)
    time_window = TimeWindow.from_str(time_start, time_end)

    today = datetime.strptime(today_str, "%Y-%m-%d").date() if today_str else None

    print(f"加载记录数：{len(records)}")
    print(f"责任映射数：{len(mapping)}")
    print(f"时间窗口：{time_window.label}（共 {time_window.days()} 天）")
    print(f"基准日期：{today_str if today_str else '系统当前日期'}")
    print(f"分组维度：{', '.join(group_by)}")
    print()

    engine = ValidationEngine(mapping, time_window, group_by, today=today)
    results = engine.validate_all(records)
    print(f"校验完成：{len(results)} 条记录")
    print(f"  通过：{sum(1 for r in results if r.is_valid)}")
    print(f"  有问题：{sum(1 for r in results if r.issues)}")
    print(f"  高风险：{sum(1 for r in results if r.risk_level == 'high')}")
    print()

    analyzer = GroupAnalyzer(group_by, time_window)
    group_summary = analyzer.summarize(records, results)

    reporter = ReportGenerator(time_window, group_by)
    detail_report = reporter.generate_detail_report(records, results)
    summary_report = reporter.generate_summary_report(group_summary)
    issue_list = reporter.generate_issue_list(results, records)
    text_summary = reporter.generate_text_summary(summary_report, issue_list)

    player = HistoryPlayer(engine.audit_trail)

    os.makedirs(output_dir, exist_ok=True)

    def save_json(name: str, data: Any):
        path = os.path.join(output_dir, name)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        print(f"  已输出：{path}")

    print("输出文件：")
    save_json("detail_report.json", detail_report)
    save_json("summary_report.json", summary_report)
    save_json("issue_list.json", issue_list)

    text_path = os.path.join(output_dir, "summary.txt")
    with open(text_path, "w", encoding="utf-8") as f:
        f.write(text_summary)
    print(f"  已输出：{text_path}")

    audit_path = os.path.join(output_dir, "audit_trail.json")
    with open(audit_path, "w", encoding="utf-8") as f:
        json.dump(engine.audit_trail, f, ensure_ascii=False, indent=2)
    print(f"  已输出：{audit_path}")

    replay_samples = {}
    high_risk_records = [r for r in results if r.risk_level == "high"][:3]
    for r in high_risk_records:
        rec = next((x for x in records if x.record_id == r.record_id), None)
        if rec:
            replay_samples[r.record_id] = player.generate_replay_report(r.record_id, rec, r)

    replay_path = os.path.join(output_dir, "replay_samples.json")
    with open(replay_path, "w", encoding="utf-8") as f:
        json.dump(replay_samples, f, ensure_ascii=False, indent=2, default=str)
    print(f"  已输出：{replay_path}")

    print()
    print("=" * 60)
    print(text_summary)

    return {
        "detail_report": detail_report,
        "summary_report": summary_report,
        "issue_list": issue_list,
        "text_summary": text_summary,
        "audit_trail": engine.audit_trail,
        "replay_samples": replay_samples,
    }


def main():
    parser = argparse.ArgumentParser(
        description="不动产抵押注销数据校验与状态分流系统"
    )
    parser.add_argument("--data", required=True, help="采集数据文件路径(JSON)")
    parser.add_argument("--mapping", required=True, help="责任映射文件路径(JSON)")
    parser.add_argument("--time-start", required=True, help="统计开始日期 YYYY-MM-DD")
    parser.add_argument("--time-end", required=True, help="统计结束日期 YYYY-MM-DD")
    parser.add_argument("--group-by", default="branch",
                        help="分组维度，逗号分隔（branch,status,risk_level,handler,month）")
    parser.add_argument("--output", default="./output", help="输出目录")
    parser.add_argument("--today", default=None, help="模拟基准日期 YYYY-MM-DD（用于历史回放/测试）")

    args = parser.parse_args()
    group_dims = [g.strip() for g in args.group_by.split(",") if g.strip()]

    run_analysis(
        data_file=args.data,
        mapping_file=args.mapping,
        time_start=args.time_start,
        time_end=args.time_end,
        group_by=group_dims,
        output_dir=args.output,
        today_str=args.today,
    )


if __name__ == "__main__":
    main()
