"""生成逻辑模块，支持幂等性和筛选"""

import os
import json
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from .models import (
    MovingItem, ParameterConfig, ProcessResult,
    generate_batch_no, generate_trace_id, load_items_from_json
)
from .validator import Validator


def compute_items_hash(items: List[MovingItem]) -> str:
    """计算物品清单的哈希值，用于幂等性判断"""
    items_data = [item.to_dict() for item in items]
    items_data.sort(key=lambda x: x.get("item_id", ""))
    raw = json.dumps(items_data, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def compute_config_hash(config: ParameterConfig) -> str:
    """计算配置的哈希值"""
    raw = json.dumps(config.to_dict(), ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def filter_items(items: List[MovingItem], filters: Dict[str, Any]) -> List[MovingItem]:
    """根据筛选条件过滤物品"""
    if not filters:
        return items

    filtered = []
    for item in items:
        match = True

        if "category" in filters and filters["category"]:
            if isinstance(filters["category"], list):
                if item.category not in filters["category"]:
                    match = False
            else:
                if item.category != filters["category"]:
                    match = False

        if "fragile" in filters and filters["fragile"] is not None:
            if item.fragile != filters["fragile"]:
                match = False

        if "min_value" in filters and filters["min_value"] is not None:
            if item.value < filters["min_value"]:
                match = False

        if "max_value" in filters and filters["max_value"] is not None:
            if item.value > filters["max_value"]:
                match = False

        if "min_weight" in filters and filters["min_weight"] is not None:
            if item.weight_kg < filters["min_weight"]:
                match = False

        if "max_weight" in filters and filters["max_weight"] is not None:
            if item.weight_kg > filters["max_weight"]:
                match = False

        if "keyword" in filters and filters["keyword"]:
            keyword = filters["keyword"].lower()
            if keyword not in item.name.lower() and keyword not in item.remark.lower():
                match = False

        if match:
            filtered.append(item)

    return filtered


def load_previous_result(prev_result_path: str) -> Optional[Dict[str, Any]]:
    """加载上次处理结果"""
    if not prev_result_path or not os.path.exists(prev_result_path):
        return None
    with open(prev_result_path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_summary(items: List[MovingItem], issues: List[Any]) -> Dict[str, Any]:
    """构建汇总摘要"""
    total_count = len(items)
    total_weight = sum(item.weight_kg * item.quantity for item in items)
    total_volume = sum(item.volume_cbm * item.quantity for item in items)
    total_value = sum(item.value * item.quantity for item in items)
    total_quantity = sum(item.quantity for item in items)
    fragile_count = sum(1 for item in items if item.fragile)
    need_packing_count = sum(1 for item in items if item.need_packing)

    category_stats = {}
    for item in items:
        cat = item.category or "未分类"
        if cat not in category_stats:
            category_stats[cat] = {"count": 0, "weight": 0.0, "volume": 0.0, "value": 0.0}
        category_stats[cat]["count"] += item.quantity
        category_stats[cat]["weight"] += item.weight_kg * item.quantity
        category_stats[cat]["volume"] += item.volume_cbm * item.quantity
        category_stats[cat]["value"] += item.value * item.quantity

    error_count = sum(1 for issue in issues if issue.severity == "error")
    warning_count = sum(1 for issue in issues if issue.severity == "warning")

    return {
        "total_items": total_count,
        "total_quantity": total_quantity,
        "total_weight_kg": round(total_weight, 2),
        "total_volume_cbm": round(total_volume, 2),
        "total_value": round(total_value, 2),
        "fragile_items": fragile_count,
        "need_packing_items": need_packing_count,
        "category_stats": category_stats,
        "error_count": error_count,
        "warning_count": warning_count,
    }


class Generator:
    """物品清单生成器"""

    def __init__(self, config: ParameterConfig, source: str = "unknown"):
        self.config = config
        self.source = source

    def generate(
        self,
        items: List[MovingItem],
        filters: Optional[Dict[str, Any]] = None,
        prev_result_path: Optional[str] = None,
        force_regenerate: bool = False,
    ) -> ProcessResult:
        """
        生成处理结果
        - 支持筛选
        - 支持幂等性检查（同一输入不产生差异）
        - 支持历史结果对比
        """
        filters = filters or {}
        filtered_items = filter_items(items, filters)

        items_hash = compute_items_hash(filtered_items)
        config_hash = compute_config_hash(self.config)
        filters_hash = hashlib.sha256(
            json.dumps(filters, ensure_ascii=False, sort_keys=True).encode("utf-8")
        ).hexdigest()

        prev_result = load_previous_result(prev_result_path) if prev_result_path else None
        previous_batch_no = ""

        if prev_result and not force_regenerate:
            prev_summary = prev_result.get("summary", {})
            prev_meta = prev_summary.get("_meta", {})
            if (prev_meta.get("items_hash") == items_hash
                    and prev_meta.get("config_hash") == config_hash
                    and prev_meta.get("filters_hash") == filters_hash
                    and prev_meta.get("source") == self.source):
                return _dict_to_process_result(prev_result)

        batch_no = generate_batch_no()
        if prev_result:
            previous_batch_no = prev_result.get("batch_no", "")

        result = self._build_result(
            filtered_items, batch_no, previous_batch_no,
            items_hash, config_hash, filters_hash
        )
        return result

    def _build_result(
        self,
        items: List[MovingItem],
        batch_no: str,
        previous_batch_no: str,
        items_hash: str,
        config_hash: str,
        filters_hash: str,
    ) -> ProcessResult:
        """构建处理结果"""
        validator = Validator(self.config, batch_no, self.source)
        passed_items, failed_items = validator.validate(items)
        issues = validator.get_issues()
        summary = build_summary(items, issues)

        summary["_meta"] = {
            "items_hash": items_hash,
            "config_hash": config_hash,
            "filters_hash": filters_hash,
            "source": self.source,
        }

        passed_dicts = []
        for item in passed_items:
            d = item.to_dict()
            d["trace_id"] = generate_trace_id(self.source, item.item_id, batch_no)
            d["batch_no"] = batch_no
            passed_dicts.append(d)

        failed_dicts = []
        for item in failed_items:
            d = item.to_dict()
            d["trace_id"] = generate_trace_id(self.source, item.item_id, batch_no)
            d["batch_no"] = batch_no
            failed_dicts.append(d)

        issue_dicts = [issue.to_dict() for issue in issues]

        result = ProcessResult(
            batch_no=batch_no,
            source=self.source,
            process_time=datetime.now().isoformat(),
            total_count=len(items),
            passed_count=len(passed_items),
            failed_count=len(failed_items),
            passed_items=passed_dicts,
            failed_items=failed_dicts,
            issues=issue_dicts,
            summary=summary,
            previous_batch_no=previous_batch_no,
        )

        return result

    def save_result(self, result: ProcessResult, output_dir: str) -> Dict[str, str]:
        """保存结果到文件，返回各文件路径"""
        os.makedirs(output_dir, exist_ok=True)
        batch_no = result.batch_no

        result_path = os.path.join(output_dir, f"{batch_no}_result.json")
        with open(result_path, "w", encoding="utf-8") as f:
            json.dump(result.to_dict(), f, ensure_ascii=False, indent=2)

        passed_path = os.path.join(output_dir, f"{batch_no}_passed.json")
        with open(passed_path, "w", encoding="utf-8") as f:
            json.dump(result.passed_items, f, ensure_ascii=False, indent=2)

        failed_path = os.path.join(output_dir, f"{batch_no}_failed.json")
        with open(failed_path, "w", encoding="utf-8") as f:
            json.dump(result.failed_items, f, ensure_ascii=False, indent=2)

        issues_path = os.path.join(output_dir, f"{batch_no}_issues.json")
        with open(issues_path, "w", encoding="utf-8") as f:
            json.dump(result.issues, f, ensure_ascii=False, indent=2)

        summary_path = os.path.join(output_dir, f"{batch_no}_summary.json")
        with open(summary_path, "w", encoding="utf-8") as f:
            json.dump(result.summary, f, ensure_ascii=False, indent=2)

        return {
            "result": result_path,
            "passed": passed_path,
            "failed": failed_path,
            "issues": issues_path,
            "summary": summary_path,
        }


def _dict_to_process_result(data: Dict[str, Any]) -> ProcessResult:
    """从字典重建 ProcessResult 对象"""
    return ProcessResult(
        batch_no=data.get("batch_no", ""),
        source=data.get("source", ""),
        process_time=data.get("process_time", ""),
        total_count=data.get("total_count", 0),
        passed_count=data.get("passed_count", 0),
        failed_count=data.get("failed_count", 0),
        passed_items=data.get("passed_items", []),
        failed_items=data.get("failed_items", []),
        issues=data.get("issues", []),
        summary=data.get("summary", {}),
        previous_batch_no=data.get("previous_batch_no", ""),
    )
