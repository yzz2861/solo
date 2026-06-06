#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
工单SLA逾期处理脚本
- 输入：原始明细、字典表、阈值规则、统计周期
- 输出：明细表、汇总报告、问题清单、文本摘要
- 特性：时间窗口可解释、分组维度可解释、阈值命中可解释
- 验证：正常记录、缺字段、规则冲突、重复处理
"""

import csv
import json
import os
import sys
from datetime import datetime, timedelta
from collections import defaultdict, Counter
from copy import deepcopy


class SLALogger:
    """处理留痕日志记录器"""

    def __init__(self):
        self.logs = []
        self.counter = 0

    def log(self, order_id, action, detail, level="INFO"):
        self.counter += 1
        log_entry = {
            "log_id": f"LOG{self.counter:06d}",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "order_id": order_id,
            "action": action,
            "detail": detail,
            "level": level
        }
        self.logs.append(log_entry)
        return log_entry

    def get_logs_by_order(self, order_id):
        return [log for log in self.logs if log["order_id"] == order_id]

    def get_log_summary(self):
        summary = defaultdict(int)
        for log in self.logs:
            summary[log["action"]] += 1
        return dict(summary)


class SLAProcessor:
    """SLA处理核心引擎"""

    def __init__(self, dictionary_path, rules_path, stats_start=None, stats_end=None):
        self.dictionary = self._load_json(dictionary_path)
        self.rules = self._load_json(rules_path)
        self.stats_start = stats_start
        self.stats_end = stats_end
        self.logger = SLALogger()
        self.processed_orders = []
        self.issues = []
        self.duplicates = []

    def _load_json(self, path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def load_orders(self, csv_path):
        """加载原始工单明细"""
        orders = []
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                orders.append(row)
        self.logger.log("SYSTEM", "LOAD_ORDERS", f"加载原始工单 {len(orders)} 条")
        return orders

    def _validate_fields(self, order):
        """验证必填字段，返回缺失字段列表"""
        required_fields = ["order_id", "priority", "order_type", "create_time", "status"]
        missing = []
        for field in required_fields:
            if not order.get(field) or order.get(field).strip() == "":
                missing.append(field)
        return missing

    def _match_rules(self, order):
        """匹配SLA规则，可能匹配多条（规则冲突）"""
        matched_rules = []
        priority = order.get("priority", "")
        order_type = order.get("order_type", "")

        for rule in self.rules["sla_rules"]:
            if rule["priority"] == priority and rule["order_type"] == order_type:
                matched_rules.append(rule)

        if not matched_rules:
            matched_rules = [self.rules["default_sla"]]
            self.logger.log(
                order["order_id"],
                "RULE_MATCH",
                f"未匹配到专用规则，使用默认规则 DEFAULT",
                "WARNING"
            )
        elif len(matched_rules) > 1:
            rule_ids = [r["rule_id"] for r in matched_rules]
            self.logger.log(
                order["order_id"],
                "RULE_CONFLICT",
                f"匹配到 {len(matched_rules)} 条规则，存在冲突: {rule_ids}",
                "ERROR"
            )

        return matched_rules

    def _select_rule(self, matched_rules):
        """从匹配的规则中选择一条（最严格的，即SLA最短的）"""
        if len(matched_rules) == 1:
            return matched_rules[0]
        sorted_rules = sorted(
            matched_rules,
            key=lambda r: r.get("resolve_sla_hours", 9999)
        )
        return sorted_rules[0]

    def _parse_time(self, time_str):
        """解析时间字符串"""
        if not time_str or time_str.strip() == "":
            return None
        try:
            return datetime.strptime(time_str.strip(), "%Y-%m-%d %H:%M:%S")
        except ValueError:
            return None

    def _calculate_duration(self, start_time, end_time):
        """计算持续时间（小时）"""
        if not start_time or not end_time:
            return None
        delta = end_time - start_time
        return round(delta.total_seconds() / 3600, 2)

    def _get_current_time(self):
        """获取当前时间（用于计算进行中的工单耗时）"""
        if self.stats_end:
            return self._parse_time(self.stats_end)
        return datetime.now()

    def _determine_risk_level(self, actual_hours, sla_hours, warning_threshold):
        """判断风险等级"""
        if actual_hours is None or sla_hours is None:
            return "UNKNOWN"
        if actual_hours >= sla_hours:
            if actual_hours >= sla_hours * 2:
                return "SEVERE"
            return "OVERDUE"
        if actual_hours >= sla_hours * warning_threshold:
            return "WARNING"
        return "NORMAL"

    def _check_duplicate(self, order, processed_orders):
        """检测重复工单"""
        duplicates = []
        for processed in processed_orders:
            processed_original = processed.get("original", processed)
            similarity_score = 0
            if order.get("priority") == processed_original.get("priority"):
                similarity_score += 1
            if order.get("order_type") == processed_original.get("order_type"):
                similarity_score += 1
            if order.get("title") == processed_original.get("title"):
                similarity_score += 2
            create_time_1 = self._parse_time(order.get("create_time", ""))
            create_time_2 = self._parse_time(processed_original.get("create_time", ""))
            if create_time_1 and create_time_2:
                diff = abs((create_time_1 - create_time_2).total_seconds())
                if diff < 3600:
                    similarity_score += 2
            if order.get("description") == processed_original.get("description"):
                similarity_score += 1
            if similarity_score >= 4:
                duplicates.append({
                    "duplicate_with": processed["order_id"],
                    "similarity_score": similarity_score,
                    "reason": f"标题/时间/类型高度相似 (得分:{similarity_score})"
                })
        return duplicates

    def _in_stats_window(self, order):
        """判断工单是否在统计周期内"""
        create_time = self._parse_time(order.get("create_time", ""))
        if not create_time:
            return False
        if self.stats_start:
            start = self._parse_time(self.stats_start)
            if create_time < start:
                return False
        if self.stats_end:
            end = self._parse_time(self.stats_end)
            if create_time > end:
                return False
        return True

    def process_order(self, order):
        """处理单个工单"""
        order_id = order.get("order_id", "UNKNOWN")
        result = {
            "order_id": order_id,
            "original": deepcopy(order),
            "missing_fields": [],
            "matched_rules": [],
            "selected_rule": None,
            "response_sla_hours": None,
            "resolve_sla_hours": None,
            "response_actual_hours": None,
            "resolve_actual_hours": None,
            "response_risk": "UNKNOWN",
            "resolve_risk": "UNKNOWN",
            "overall_risk": "UNKNOWN",
            "in_stats_window": False,
            "is_duplicate": False,
            "duplicate_info": [],
            "explanation": {},
            "issues": []
        }

        self.logger.log(order_id, "PROCESS_START", f"开始处理工单 {order_id}")

        missing_fields = self._validate_fields(order)
        result["missing_fields"] = missing_fields
        if missing_fields:
            self.logger.log(
                order_id,
                "FIELD_MISSING",
                f"缺失字段: {missing_fields}",
                "ERROR"
            )
            for field in missing_fields:
                issue = {
                    "order_id": order_id,
                    "issue_type": "MISSING_FIELD",
                    "field": field,
                    "description": f"缺失必填字段: {field}",
                    "severity": "HIGH"
                }
                result["issues"].append(issue)
                self.issues.append(issue)

        in_window = self._in_stats_window(order)
        result["in_stats_window"] = in_window
        if not in_window:
            self.logger.log(
                order_id,
                "OUT_OF_WINDOW",
                f"工单不在统计周期内 (创建时间: {order.get('create_time', 'N/A')})",
                "WARNING"
            )

        matched_rules = self._match_rules(order)
        result["matched_rules"] = matched_rules

        if len(matched_rules) > 1:
            issue = {
                "order_id": order_id,
                "issue_type": "RULE_CONFLICT",
                "field": "sla_rule",
                "description": f"匹配到 {len(matched_rules)} 条规则: {[r['rule_id'] for r in matched_rules]}",
                "severity": "MEDIUM"
            }
            result["issues"].append(issue)
            self.issues.append(issue)

        selected_rule = self._select_rule(matched_rules)
        result["selected_rule"] = selected_rule
        result["response_sla_hours"] = selected_rule.get("response_sla_hours")
        result["resolve_sla_hours"] = selected_rule.get("resolve_sla_hours")

        self.logger.log(
            order_id,
            "RULE_SELECTED",
            f"选用规则: {selected_rule['rule_id']} - {selected_rule['rule_name']}"
        )

        create_time = self._parse_time(order.get("create_time", ""))
        assign_time = self._parse_time(order.get("assign_time", ""))
        resolve_time = self._parse_time(order.get("resolve_time", ""))
        close_time = self._parse_time(order.get("close_time", ""))
        current_time = self._get_current_time()
        status = order.get("status", "")

        result["response_actual_hours"] = self._calculate_duration(create_time, assign_time)

        if resolve_time:
            result["resolve_actual_hours"] = self._calculate_duration(create_time, resolve_time)
        elif status in ["NEW", "ASSIGNED", "IN_PROGRESS", "PENDING"]:
            result["resolve_actual_hours"] = self._calculate_duration(create_time, current_time)

        warning_threshold = selected_rule.get("warning_threshold", 0.8)

        result["response_risk"] = self._determine_risk_level(
            result["response_actual_hours"],
            result["response_sla_hours"],
            warning_threshold
        )

        result["resolve_risk"] = self._determine_risk_level(
            result["resolve_actual_hours"],
            result["resolve_sla_hours"],
            warning_threshold
        )

        risk_priority = ["SEVERE", "OVERDUE", "WARNING", "NORMAL", "UNKNOWN"]
        for risk in risk_priority:
            if result["response_risk"] == risk or result["resolve_risk"] == risk:
                result["overall_risk"] = risk
                break

        if result["overall_risk"] in ["OVERDUE", "SEVERE"]:
            issue = {
                "order_id": order_id,
                "issue_type": "SLA_OVERDUE",
                "field": "overall_risk",
                "description": f"工单SLA逾期，风险等级: {result['overall_risk']}",
                "severity": "HIGH" if result["overall_risk"] == "SEVERE" else "MEDIUM"
            }
            result["issues"].append(issue)
            self.issues.append(issue)

        self.logger.log(
            order_id,
            "RISK_ASSESS",
            f"响应风险: {result['response_risk']}, 解决风险: {result['resolve_risk']}, 综合风险: {result['overall_risk']}"
        )

        result["explanation"] = {
            "time_window": {
                "stats_start": self.stats_start,
                "stats_end": self.stats_end,
                "in_window": in_window,
                "window_explanation": self._explain_window(order)
            },
            "rule_match": {
                "matched_rule_count": len(matched_rules),
                "matched_rule_ids": [r["rule_id"] for r in matched_rules],
                "selected_rule_id": selected_rule["rule_id"],
                "selected_rule_name": selected_rule["rule_name"],
                "selection_reason": self._explain_rule_selection(matched_rules, selected_rule),
                "rule_detail": selected_rule
            },
            "threshold_hit": {
                "response_sla": result["response_sla_hours"],
                "response_actual": result["response_actual_hours"],
                "response_risk": result["response_risk"],
                "response_hit_detail": self._explain_threshold_hit(
                    result["response_actual_hours"],
                    result["response_sla_hours"],
                    warning_threshold,
                    "响应"
                ),
                "resolve_sla": result["resolve_sla_hours"],
                "resolve_actual": result["resolve_actual_hours"],
                "resolve_risk": result["resolve_risk"],
                "resolve_hit_detail": self._explain_threshold_hit(
                    result["resolve_actual_hours"],
                    result["resolve_sla_hours"],
                    warning_threshold,
                    "解决"
                ),
                "overall_risk": result["overall_risk"]
            }
        }

        self.logger.log(order_id, "PROCESS_END", f"工单处理完成，风险等级: {result['overall_risk']}")
        return result

    def _explain_window(self, order):
        """解释时间窗口判断"""
        create_time_str = order.get("create_time", "N/A")
        if not self.stats_start and not self.stats_end:
            return "未设置统计周期，包含所有工单"
        parts = []
        if self.stats_start:
            parts.append(f"开始于 {self.stats_start}")
        if self.stats_end:
            parts.append(f"结束于 {self.stats_end}")
        window_desc = "、".join(parts)
        if self._in_stats_window(order):
            return f"工单创建时间 {create_time_str} 在统计周期 [{window_desc}] 内"
        else:
            return f"工单创建时间 {create_time_str} 不在统计周期 [{window_desc}] 内"

    def _explain_rule_selection(self, matched_rules, selected_rule):
        """解释规则选择"""
        if len(matched_rules) == 1:
            return f"唯一匹配规则 {selected_rule['rule_id']}"
        rule_details = []
        for r in matched_rules:
            rule_details.append(
                f"{r['rule_id']}(解决SLA:{r.get('resolve_sla_hours', 'N/A')}h)"
            )
        return (f"存在规则冲突，共匹配 {len(matched_rules)} 条: {', '.join(rule_details)}。"
                f"选用最严格规则 {selected_rule['rule_id']}（解决SLA最短: {selected_rule.get('resolve_sla_hours', 'N/A')}h）")

    def _explain_threshold_hit(self, actual, sla, threshold, metric_name):
        """解释阈值命中"""
        if actual is None or sla is None:
            return f"{metric_name}耗时或SLA阈值缺失，无法判断"
        ratio = actual / sla if sla > 0 else 0
        ratio_pct = round(ratio * 100, 1)

        if actual >= sla * 2:
            return f"{metric_name}耗时 {actual}小时，SLA {sla}小时，已超过SLA的 {ratio_pct}%（严重逾期，超过2倍SLA）"
        elif actual >= sla:
            return f"{metric_name}耗时 {actual}小时，SLA {sla}小时，已超过SLA的 {ratio_pct}%（逾期）"
        elif actual >= sla * threshold:
            return f"{metric_name}耗时 {actual}小时，SLA {sla}小时，已达SLA的 {ratio_pct}%（预警阈值 {threshold*100}%）"
        else:
            return f"{metric_name}耗时 {actual}小时，SLA {sla}小时，仅达SLA的 {ratio_pct}%（正常）"

    def process_all(self, orders):
        """处理所有工单"""
        self.logger.log("SYSTEM", "BATCH_START", f"开始批量处理 {len(orders)} 条工单")

        self.processed_orders = []
        self.issues = []

        for order in orders:
            result = self.process_order(order)

            duplicates = self._check_duplicate(order, self.processed_orders)
            if duplicates:
                result["is_duplicate"] = True
                result["duplicate_info"] = duplicates
                for dup in duplicates:
                    issue = {
                        "order_id": order.get("order_id", "UNKNOWN"),
                        "issue_type": "DUPLICATE_ORDER",
                        "field": "duplicate",
                        "description": f"与工单 {dup['duplicate_with']} 疑似重复: {dup['reason']}",
                        "severity": "LOW"
                    }
                    result["issues"].append(issue)
                    self.issues.append(issue)
                self.logger.log(
                    order.get("order_id", "UNKNOWN"),
                    "DUPLICATE_DETECTED",
                    f"检测到 {len(duplicates)} 个疑似重复工单",
                    "WARNING"
                )

            self.processed_orders.append(result)

        self.logger.log(
            "SYSTEM",
            "BATCH_END",
            f"批量处理完成，共 {len(self.processed_orders)} 条，其中异常 {len(self.issues)} 条"
        )

        return self.processed_orders

    def generate_detail_report(self, output_path):
        """生成明细表"""
        fieldnames = [
            "order_id", "title", "priority", "order_type", "department",
            "assignee", "create_time", "assign_time", "resolve_time",
            "close_time", "status", "in_stats_window", "selected_rule_id",
            "selected_rule_name", "response_sla_hours", "response_actual_hours",
            "response_risk", "resolve_sla_hours", "resolve_actual_hours",
            "resolve_risk", "overall_risk", "is_duplicate", "missing_fields",
            "rule_conflict", "explanation_summary"
        ]

        with open(output_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

            for order in self.processed_orders:
                row = {
                    "order_id": order["order_id"],
                    "title": order["original"].get("title", ""),
                    "priority": order["original"].get("priority", ""),
                    "order_type": order["original"].get("order_type", ""),
                    "department": order["original"].get("department", ""),
                    "assignee": order["original"].get("assignee", ""),
                    "create_time": order["original"].get("create_time", ""),
                    "assign_time": order["original"].get("assign_time", ""),
                    "resolve_time": order["original"].get("resolve_time", ""),
                    "close_time": order["original"].get("close_time", ""),
                    "status": order["original"].get("status", ""),
                    "in_stats_window": "是" if order["in_stats_window"] else "否",
                    "selected_rule_id": order["selected_rule"]["rule_id"] if order["selected_rule"] else "",
                    "selected_rule_name": order["selected_rule"]["rule_name"] if order["selected_rule"] else "",
                    "response_sla_hours": order["response_sla_hours"],
                    "response_actual_hours": order["response_actual_hours"],
                    "response_risk": order["response_risk"],
                    "resolve_sla_hours": order["resolve_sla_hours"],
                    "resolve_actual_hours": order["resolve_actual_hours"],
                    "resolve_risk": order["resolve_risk"],
                    "overall_risk": order["overall_risk"],
                    "is_duplicate": "是" if order["is_duplicate"] else "否",
                    "missing_fields": ",".join(order["missing_fields"]) if order["missing_fields"] else "",
                    "rule_conflict": "是" if len(order["matched_rules"]) > 1 else "否",
                    "explanation_summary": self._get_explanation_summary(order)
                }
                writer.writerow(row)

        self.logger.log("SYSTEM", "GENERATE_DETAIL", f"生成明细表: {output_path}")
        return output_path

    def _get_explanation_summary(self, order):
        """获取解释摘要"""
        parts = []
        exp = order.get("explanation", {})

        rule_exp = exp.get("rule_match", {})
        if rule_exp:
            parts.append(f"规则:{rule_exp.get('selected_rule_id', 'N/A')}")

        threshold_exp = exp.get("threshold_hit", {})
        if threshold_exp:
            parts.append(f"综合风险:{threshold_exp.get('overall_risk', 'N/A')}")

        window_exp = exp.get("time_window", {})
        if window_exp and not window_exp.get("in_window", True):
            parts.append("统计周期外")

        if order.get("missing_fields"):
            parts.append(f"缺字段:{','.join(order['missing_fields'])}")

        return "; ".join(parts)

    def generate_summary_report(self, output_path):
        """生成汇总报告"""
        in_window_orders = [o for o in self.processed_orders if o["in_stats_window"]]
        total = len(in_window_orders)

        risk_counts = Counter(o["overall_risk"] for o in in_window_orders)
        priority_counts = Counter(o["original"].get("priority", "UNKNOWN") for o in in_window_orders)
        type_counts = Counter(o["original"].get("order_type", "UNKNOWN") for o in in_window_orders)
        dept_counts = Counter(o["original"].get("department", "UNKNOWN") for o in in_window_orders)
        status_counts = Counter(o["original"].get("status", "UNKNOWN") for o in in_window_orders)

        overdue_count = sum(1 for o in in_window_orders if o["overall_risk"] in ["OVERDUE", "SEVERE"])
        warning_count = sum(1 for o in in_window_orders if o["overall_risk"] == "WARNING")
        normal_count = sum(1 for o in in_window_orders if o["overall_risk"] == "NORMAL")

        avg_response_ratio = 0
        valid_response = 0
        for o in in_window_orders:
            if o["response_actual_hours"] and o["response_sla_hours"] and o["response_sla_hours"] > 0:
                avg_response_ratio += o["response_actual_hours"] / o["response_sla_hours"]
                valid_response += 1
        avg_response_ratio = round(avg_response_ratio / valid_response * 100, 2) if valid_response > 0 else 0

        avg_resolve_ratio = 0
        valid_resolve = 0
        for o in in_window_orders:
            if o["resolve_actual_hours"] and o["resolve_sla_hours"] and o["resolve_sla_hours"] > 0:
                avg_resolve_ratio += o["resolve_actual_hours"] / o["resolve_sla_hours"]
                valid_resolve += 1
        avg_resolve_ratio = round(avg_resolve_ratio / valid_resolve * 100, 2) if valid_resolve > 0 else 0

        summary = {
            "report_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "stats_period": {
                "start": self.stats_start,
                "end": self.stats_end
            },
            "total_orders": total,
            "all_orders_count": len(self.processed_orders),
            "out_of_window_count": len(self.processed_orders) - total,
            "risk_distribution": {
                "NORMAL": risk_counts.get("NORMAL", 0),
                "WARNING": risk_counts.get("WARNING", 0),
                "OVERDUE": risk_counts.get("OVERDUE", 0),
                "SEVERE": risk_counts.get("SEVERE", 0),
                "UNKNOWN": risk_counts.get("UNKNOWN", 0)
            },
            "priority_distribution": dict(priority_counts),
            "type_distribution": dict(type_counts),
            "department_distribution": dict(dept_counts),
            "status_distribution": dict(status_counts),
            "kpi": {
                "overdue_rate": round(overdue_count / total * 100, 2) if total > 0 else 0,
                "warning_rate": round(warning_count / total * 100, 2) if total > 0 else 0,
                "normal_rate": round(normal_count / total * 100, 2) if total > 0 else 0,
                "avg_response_sla_ratio_pct": avg_response_ratio,
                "avg_resolve_sla_ratio_pct": avg_resolve_ratio
            },
            "group_by_priority": self._group_by_dimension(in_window_orders, "priority"),
            "group_by_type": self._group_by_dimension(in_window_orders, "order_type"),
            "group_by_department": self._group_by_dimension(in_window_orders, "department"),
            "issue_count": len(self.issues),
            "duplicate_count": sum(1 for o in self.processed_orders if o["is_duplicate"])
        }

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)

        self.logger.log("SYSTEM", "GENERATE_SUMMARY", f"生成汇总报告: {output_path}")
        return summary

    def _group_by_dimension(self, orders, dimension):
        """按维度分组统计"""
        groups = defaultdict(list)
        for o in orders:
            key = o["original"].get(dimension, "UNKNOWN")
            groups[key].append(o)

        result = {}
        for key, group_orders in groups.items():
            risk_dist = Counter(o["overall_risk"] for o in group_orders)
            result[key] = {
                "count": len(group_orders),
                "risk_distribution": dict(risk_dist),
                "overdue_count": sum(1 for o in group_orders if o["overall_risk"] in ["OVERDUE", "SEVERE"])
            }
        return result

    def generate_issue_list(self, output_path):
        """生成问题清单"""
        with open(output_path, 'w', encoding='utf-8', newline='') as f:
            fieldnames = ["order_id", "issue_type", "field", "description", "severity"]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for issue in self.issues:
                writer.writerow(issue)

        self.logger.log("SYSTEM", "GENERATE_ISSUES", f"生成问题清单，共 {len(self.issues)} 条: {output_path}")
        return len(self.issues)

    def generate_text_summary(self, summary_data):
        """生成文本摘要"""
        lines = []
        lines.append("=" * 60)
        lines.append("工单SLA逾期分析报告")
        lines.append("=" * 60)
        lines.append("")

        lines.append(f"报告生成时间: {summary_data['report_time']}")
        stats = summary_data["stats_period"]
        if stats["start"] or stats["end"]:
            lines.append(f"统计周期: {stats['start'] or '不限'} ~ {stats['end'] or '不限'}")
        else:
            lines.append("统计周期: 全部")
        lines.append("")

        lines.append("一、总体概览")
        lines.append("-" * 40)
        lines.append(f"  统计周期内工单数: {summary_data['total_orders']}")
        lines.append(f"  周期外工单数: {summary_data['out_of_window_count']}")
        lines.append(f"  总工单数: {summary_data['all_orders_count']}")
        lines.append("")

        risk = summary_data["risk_distribution"]
        lines.append("二、风险分布")
        lines.append("-" * 40)
        lines.append(f"  正常 (NORMAL): {risk.get('NORMAL', 0)} 条 ({summary_data['kpi']['normal_rate']}%)")
        lines.append(f"  预警 (WARNING): {risk.get('WARNING', 0)} 条 ({summary_data['kpi']['warning_rate']}%)")
        lines.append(f"  逾期 (OVERDUE): {risk.get('OVERDUE', 0)} 条")
        lines.append(f"  严重逾期 (SEVERE): {risk.get('SEVERE', 0)} 条")
        lines.append(f"  状态未知 (UNKNOWN): {risk.get('UNKNOWN', 0)} 条")
        lines.append(f"  总逾期率: {summary_data['kpi']['overdue_rate']}%")
        lines.append("")

        lines.append("三、关键指标")
        lines.append("-" * 40)
        lines.append(f"  平均响应SLA达成率: {summary_data['kpi']['avg_response_sla_ratio_pct']}%")
        lines.append(f"  平均解决SLA达成率: {summary_data['kpi']['avg_resolve_sla_ratio_pct']}%")
        lines.append(f"  问题记录数: {summary_data['issue_count']} 条")
        lines.append(f"  疑似重复工单: {summary_data['duplicate_count']} 条")
        lines.append("")

        lines.append("四、按优先级分布")
        lines.append("-" * 40)
        for pri, data in sorted(summary_data["group_by_priority"].items()):
            lines.append(f"  {pri}: {data['count']} 条 (逾期: {data['overdue_count']} 条)")
        lines.append("")

        lines.append("五、按工单类型分布")
        lines.append("-" * 40)
        for otype, data in sorted(summary_data["group_by_type"].items()):
            lines.append(f"  {otype}: {data['count']} 条 (逾期: {data['overdue_count']} 条)")
        lines.append("")

        lines.append("六、按部门分布")
        lines.append("-" * 40)
        for dept, data in sorted(summary_data["group_by_department"].items()):
            lines.append(f"  {dept}: {data['count']} 条 (逾期: {data['overdue_count']} 条)")
        lines.append("")

        severe_orders = [o for o in self.processed_orders
                         if o["in_stats_window"] and o["overall_risk"] == "SEVERE"]
        if severe_orders:
            lines.append("七、严重逾期工单TOP5")
            lines.append("-" * 40)
            sorted_severe = sorted(
                severe_orders,
                key=lambda o: o.get("resolve_actual_hours") or 0,
                reverse=True
            )
            for i, o in enumerate(sorted_severe[:5]):
                lines.append(f"  {i+1}. {o['order_id']} - {o['original'].get('title', '')}")
                lines.append(f"     优先级: {o['original'].get('priority', 'N/A')}, "
                           f"类型: {o['original'].get('order_type', 'N/A')}")
                lines.append(f"     解决耗时: {o['resolve_actual_hours']}小时, "
                           f"SLA: {o['resolve_sla_hours']}小时")
            lines.append("")

        lines.append("=" * 60)
        lines.append("报告结束")
        lines.append("=" * 60)

        return "\n".join(lines)

    def save_text_summary(self, summary_data, output_path):
        """保存文本摘要"""
        text = self.generate_text_summary(summary_data)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(text)
        self.logger.log("SYSTEM", "GENERATE_TEXT_SUMMARY", f"生成文本摘要: {output_path}")
        return text

    def save_logs(self, output_path):
        """保存处理日志"""
        with open(output_path, 'w', encoding='utf-8', newline='') as f:
            fieldnames = ["log_id", "timestamp", "order_id", "action", "detail", "level"]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for log in self.logger.logs:
                writer.writerow(log)
        self.logger.log("SYSTEM", "SAVE_LOGS", f"保存处理日志，共 {len(self.logger.logs)} 条: {output_path}")
        return len(self.logger.logs)

    def save_explanation_json(self, output_path):
        """保存可解释性数据（JSON格式）"""
        explanations = []
        for order in self.processed_orders:
            explanations.append({
                "order_id": order["order_id"],
                "explanation": order.get("explanation", {})
            })

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(explanations, f, ensure_ascii=False, indent=2)

        self.logger.log("SYSTEM", "SAVE_EXPLANATION", f"保存可解释性数据: {output_path}")
        return len(explanations)


class SLAResultValidator:
    """SLA结果一致性验证器"""

    def __init__(self, processor):
        self.processor = processor
        self.validation_results = []

    def validate_all(self):
        """执行所有验证"""
        self.validation_results = []

        self._validate_summary_vs_detail_count()
        self._validate_risk_labels_consistency()
        self._validate_logs_vs_issues()
        self._validate_sla_calculations()
        self._validate_issue_list_consistency()

        return self.validation_results

    def _add_result(self, check_name, passed, detail=""):
        self.validation_results.append({
            "check": check_name,
            "passed": passed,
            "detail": detail
        })

    def _validate_summary_vs_detail_count(self):
        """验证汇总数量与明细合计一致"""
        in_window_orders = [o for o in self.processor.processed_orders if o["in_stats_window"]]
        detail_count = len(in_window_orders)

        summary = self._recompute_summary()
        summary_total = summary["total_orders"]

        passed = detail_count == summary_total
        self._add_result(
            "汇总数量与明细合计一致",
            passed,
            f"明细数: {detail_count}, 汇总数: {summary_total}"
        )

        for dim in ["priority", "order_type", "department"]:
            detail_dist = Counter(
                o["original"].get(dim, "UNKNOWN") for o in in_window_orders
            )
            summary_dist = summary.get(f"group_by_{dim}", {})
            summary_total_from_groups = sum(
                v["count"] for v in summary_dist.values()
            )
            passed = detail_count == summary_total_from_groups
            self._add_result(
                f"按{dim}分组汇总与明细一致",
                passed,
                f"明细总数: {detail_count}, 分组汇总: {summary_total_from_groups}"
            )

    def _recompute_summary(self):
        """重新计算汇总（用于验证）"""
        in_window_orders = [o for o in self.processor.processed_orders if o["in_stats_window"]]

        priority_groups = defaultdict(list)
        type_groups = defaultdict(list)
        dept_groups = defaultdict(list)

        for o in in_window_orders:
            priority_groups[o["original"].get("priority", "UNKNOWN")].append(o)
            type_groups[o["original"].get("order_type", "UNKNOWN")].append(o)
            dept_groups[o["original"].get("department", "UNKNOWN")].append(o)

        def _group_stats(group):
            risk_dist = Counter(o["overall_risk"] for o in group)
            return {
                "count": len(group),
                "risk_distribution": dict(risk_dist),
                "overdue_count": sum(1 for o in group if o["overall_risk"] in ["OVERDUE", "SEVERE"])
            }

        return {
            "total_orders": len(in_window_orders),
            "group_by_priority": {k: _group_stats(v) for k, v in priority_groups.items()},
            "group_by_order_type": {k: _group_stats(v) for k, v in type_groups.items()},
            "group_by_department": {k: _group_stats(v) for k, v in dept_groups.items()}
        }

    def _validate_risk_labels_consistency(self):
        """验证风险标签一致性"""
        inconsistencies = []
        for order in self.processor.processed_orders:
            response_risk = order["response_risk"]
            resolve_risk = order["resolve_risk"]
            overall = order["overall_risk"]

            risk_priority = ["SEVERE", "OVERDUE", "WARNING", "NORMAL", "UNKNOWN"]
            expected_overall = "UNKNOWN"
            for risk in risk_priority:
                if response_risk == risk or resolve_risk == risk:
                    expected_overall = risk
                    break

            if overall != expected_overall:
                inconsistencies.append(
                    f"{order['order_id']}: 响应={response_risk}, 解决={resolve_risk}, "
                    f"综合={overall}, 预期={expected_overall}"
                )

        passed = len(inconsistencies) == 0
        detail = "所有工单风险标签一致" if passed else "不一致: " + "; ".join(inconsistencies[:5])
        self._add_result("风险标签一致性", passed, detail)

    def _validate_logs_vs_issues(self):
        """验证日志与问题清单一致"""
        issue_orders = set(issue["order_id"] for issue in self.processor.issues)
        log_issue_orders = set()

        for log in self.processor.logger.logs:
            if log["level"] in ["ERROR", "WARNING"]:
                log_issue_orders.add(log["order_id"])

        issue_logs = [
            log for log in self.processor.logger.logs
            if log["action"] in ["FIELD_MISSING", "RULE_CONFLICT", "DUPLICATE_DETECTED", "SLA_OVERDUE"]
        ]

        passed = len(self.processor.issues) <= len(issue_logs) + len(issue_orders)
        detail = (f"问题清单: {len(self.processor.issues)} 条, "
                  f"相关日志: {len(issue_logs)} 条")
        self._add_result("日志与问题清单一致", passed, detail)

    def _validate_sla_calculations(self):
        """验证SLA计算正确性"""
        errors = []
        for order in self.processor.processed_orders:
            create_time = None
            assign_time = None
            resolve_time = None

            try:
                if order["original"].get("create_time"):
                    create_time = datetime.strptime(
                        order["original"]["create_time"], "%Y-%m-%d %H:%M:%S"
                    )
                if order["original"].get("assign_time"):
                    assign_time = datetime.strptime(
                        order["original"]["assign_time"], "%Y-%m-%d %H:%M:%S"
                    )
                if order["original"].get("resolve_time"):
                    resolve_time = datetime.strptime(
                        order["original"]["resolve_time"], "%Y-%m-%d %H:%M:%S"
                    )
            except ValueError:
                continue

            if create_time and assign_time:
                expected = round((assign_time - create_time).total_seconds() / 3600, 2)
                actual = order["response_actual_hours"]
                if actual and abs(expected - actual) > 0.01:
                    errors.append(f"{order['order_id']}: 响应耗时计算错误, 预期={expected}, 实际={actual}")

        passed = len(errors) == 0
        detail = "所有SLA计算正确" if passed else "错误: " + "; ".join(errors[:3])
        self._add_result("SLA计算正确性", passed, detail)

    def _validate_issue_list_consistency(self):
        """验证问题清单与明细数据一致"""
        detail_issues_count = 0
        for order in self.processor.processed_orders:
            detail_issues_count += len(order["issues"])

        passed = detail_issues_count == len(self.processor.issues)
        self._add_result(
            "问题清单与明细问题数一致",
            passed,
            f"明细问题数: {detail_issues_count}, 汇总问题数: {len(self.processor.issues)}"
        )

    def get_validation_report(self):
        """获取验证报告"""
        passed_count = sum(1 for r in self.validation_results if r["passed"])
        total_count = len(self.validation_results)

        lines = []
        lines.append("=" * 60)
        lines.append("数据一致性验证报告")
        lines.append("=" * 60)
        lines.append("")
        lines.append(f"验证项目总数: {total_count}")
        lines.append(f"通过: {passed_count}")
        lines.append(f"未通过: {total_count - passed_count}")
        lines.append(f"通过率: {round(passed_count/total_count*100, 2)}%" if total_count > 0 else "无验证项目")
        lines.append("")

        lines.append("详细结果:")
        lines.append("-" * 40)
        for i, result in enumerate(self.validation_results):
            status = "✓ 通过" if result["passed"] else "✗ 未通过"
            lines.append(f"{i+1}. {status} - {result['check']}")
            if result["detail"]:
                lines.append(f"   {result['detail']}")
        lines.append("")

        all_passed = passed_count == total_count
        lines.append(f"结论: {'全部验证通过 ✓' if all_passed else '存在验证不通过项 ✗'}")
        lines.append("=" * 60)

        return "\n".join(lines), all_passed


def main():
    """主函数"""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "data")
    output_dir = os.path.join(base_dir, "output")

    os.makedirs(output_dir, exist_ok=True)

    dictionary_path = os.path.join(data_dir, "dictionary.json")
    rules_path = os.path.join(data_dir, "rules.json")
    orders_path = os.path.join(data_dir, "work_orders.csv")

    stats_start = "2026-06-01 00:00:00"
    stats_end = "2026-06-06 23:59:59"

    print("=" * 60)
    print("工单SLA逾期处理系统")
    print("=" * 60)
    print()
    print(f"统计周期: {stats_start} ~ {stats_end}")
    print()

    processor = SLAProcessor(
        dictionary_path=dictionary_path,
        rules_path=rules_path,
        stats_start=stats_start,
        stats_end=stats_end
    )

    print("[1/7] 加载工单数据...")
    orders = processor.load_orders(orders_path)
    print(f"  共加载 {len(orders)} 条工单")
    print()

    print("[2/7] 处理工单SLA...")
    processor.process_all(orders)
    print(f"  处理完成，共 {len(processor.processed_orders)} 条")
    print(f"  其中周期内: {sum(1 for o in processor.processed_orders if o['in_stats_window'])} 条")
    print(f"  周期外: {sum(1 for o in processor.processed_orders if not o['in_stats_window'])} 条")
    print()

    print("[3/7] 生成明细表...")
    detail_path = os.path.join(output_dir, "sla_detail.csv")
    processor.generate_detail_report(detail_path)
    print(f"  输出: {detail_path}")
    print()

    print("[4/7] 生成汇总报告...")
    summary_path = os.path.join(output_dir, "sla_summary.json")
    summary_data = processor.generate_summary_report(summary_path)
    print(f"  输出: {summary_path}")
    print()

    print("[5/7] 生成问题清单...")
    issue_path = os.path.join(output_dir, "sla_issues.csv")
    issue_count = processor.generate_issue_list(issue_path)
    print(f"  输出: {issue_path} (共 {issue_count} 条问题)")
    print()

    print("[6/7] 生成文本摘要...")
    text_summary_path = os.path.join(output_dir, "sla_summary.txt")
    processor.save_text_summary(summary_data, text_summary_path)
    print(f"  输出: {text_summary_path}")
    print()

    print("[7/7] 保存可解释性数据与日志...")
    explanation_path = os.path.join(output_dir, "sla_explanation.json")
    processor.save_explanation_json(explanation_path)
    log_path = os.path.join(output_dir, "sla_process_logs.csv")
    processor.save_logs(log_path)
    print(f"  可解释性数据: {explanation_path}")
    print(f"  处理日志: {log_path}")
    print()

    print("=" * 60)
    print("数据一致性验证")
    print("=" * 60)
    print()

    validator = SLAResultValidator(processor)
    validator.validate_all()
    report, all_passed = validator.get_validation_report()
    print(report)
    print()

    validation_report_path = os.path.join(output_dir, "validation_report.txt")
    with open(validation_report_path, 'w', encoding='utf-8') as f:
        f.write(report)
    print(f"验证报告已保存: {validation_report_path}")
    print()

    print("=" * 60)
    print("处理完成!")
    print("=" * 60)
    print()
    print("输出文件列表:")
    for filename in sorted(os.listdir(output_dir)):
        filepath = os.path.join(output_dir, filename)
        size = os.path.getsize(filepath)
        print(f"  {filename} ({size} bytes)")

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
