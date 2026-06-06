"""校验逻辑模块"""

from typing import List, Dict, Any, Tuple
from .models import (
    MovingItem, ParameterConfig, ValidationIssue,
    generate_trace_id
)


class Validator:
    """物品清单校验器"""

    def __init__(self, config: ParameterConfig, batch_no: str, source: str = "unknown"):
        self.config = config
        self.batch_no = batch_no
        self.source = source
        self.issues: List[ValidationIssue] = []

    def validate(self, items: List[MovingItem]) -> Tuple[List[MovingItem], List[MovingItem]]:
        """校验所有物品，返回(通过列表, 异常列表)"""
        self.issues = []
        passed_items = []
        failed_items = []

        for item in items:
            item_issues = self._validate_item(item)
            if item_issues:
                self.issues.extend(item_issues)
                failed_items.append(item)
            else:
                passed_items.append(item)

        total_issues = self._validate_totals(items)
        if total_issues:
            self.issues.extend(total_issues)

        return passed_items, failed_items

    def _validate_item(self, item: MovingItem) -> List[ValidationIssue]:
        """校验单个物品"""
        issues = []
        trace_id = generate_trace_id(self.source, item.item_id, self.batch_no)

        for field_name in self.config.required_fields:
            value = getattr(item, field_name, None)
            if value is None or (isinstance(value, str) and value.strip() == ""):
                issues.append(ValidationIssue(
                    item_id=item.item_id,
                    trace_id=trace_id,
                    rule_id="R001",
                    rule_name="必填字段校验",
                    field=field_name,
                    actual_value=value,
                    expected_value="非空",
                    severity="error",
                    description=f"字段 '{field_name}' 为必填项，不能为空",
                    batch_no=self.batch_no,
                    source=self.source,
                ))

        if item.category and item.category not in self.config.valid_categories:
            issues.append(ValidationIssue(
                item_id=item.item_id,
                trace_id=trace_id,
                rule_id="R002",
                rule_name="品类有效性校验",
                field="category",
                actual_value=item.category,
                expected_value=self.config.valid_categories,
                severity="error",
                description=f"品类 '{item.category}' 不在有效品类列表中",
                batch_no=self.batch_no,
                source=self.source,
            ))

        if item.quantity < self.config.min_quantity:
            issues.append(ValidationIssue(
                item_id=item.item_id,
                trace_id=trace_id,
                rule_id="R003",
                rule_name="数量下限校验",
                field="quantity",
                actual_value=item.quantity,
                expected_value=f">= {self.config.min_quantity}",
                severity="error",
                description=f"数量 {item.quantity} 低于最小值 {self.config.min_quantity}",
                batch_no=self.batch_no,
                source=self.source,
            ))

        if item.quantity > self.config.max_quantity:
            issues.append(ValidationIssue(
                item_id=item.item_id,
                trace_id=trace_id,
                rule_id="R004",
                rule_name="数量上限校验",
                field="quantity",
                actual_value=item.quantity,
                expected_value=f"<= {self.config.max_quantity}",
                severity="error",
                description=f"数量 {item.quantity} 超过最大值 {self.config.max_quantity}",
                batch_no=self.batch_no,
                source=self.source,
            ))

        if item.weight_kg > self.config.max_weight_per_item_kg:
            issues.append(ValidationIssue(
                item_id=item.item_id,
                trace_id=trace_id,
                rule_id="R005",
                rule_name="单品重量上限校验",
                field="weight_kg",
                actual_value=item.weight_kg,
                expected_value=f"<= {self.config.max_weight_per_item_kg} kg",
                severity="error",
                description=f"单品重量 {item.weight_kg}kg 超过上限 {self.config.max_weight_per_item_kg}kg",
                batch_no=self.batch_no,
                source=self.source,
            ))

        if item.weight_kg < 0:
            issues.append(ValidationIssue(
                item_id=item.item_id,
                trace_id=trace_id,
                rule_id="R006",
                rule_name="重量非负校验",
                field="weight_kg",
                actual_value=item.weight_kg,
                expected_value=">= 0",
                severity="error",
                description=f"重量不能为负数",
                batch_no=self.batch_no,
                source=self.source,
            ))

        if item.volume_cbm > self.config.max_volume_per_item_cbm:
            issues.append(ValidationIssue(
                item_id=item.item_id,
                trace_id=trace_id,
                rule_id="R007",
                rule_name="单物体积上限校验",
                field="volume_cbm",
                actual_value=item.volume_cbm,
                expected_value=f"<= {self.config.max_volume_per_item_cbm} cbm",
                severity="error",
                description=f"单物体积 {item.volume_cbm}cbm 超过上限 {self.config.max_volume_per_item_cbm}cbm",
                batch_no=self.batch_no,
                source=self.source,
            ))

        if item.volume_cbm < 0:
            issues.append(ValidationIssue(
                item_id=item.item_id,
                trace_id=trace_id,
                rule_id="R008",
                rule_name="体积非负校验",
                field="volume_cbm",
                actual_value=item.volume_cbm,
                expected_value=">= 0",
                severity="error",
                description=f"体积不能为负数",
                batch_no=self.batch_no,
                source=self.source,
            ))

        if item.value > self.config.max_value_per_item:
            issues.append(ValidationIssue(
                item_id=item.item_id,
                trace_id=trace_id,
                rule_id="R009",
                rule_name="单品价值上限校验",
                field="value",
                actual_value=item.value,
                expected_value=f"<= {self.config.max_value_per_item}",
                severity="warning",
                description=f"单品价值 {item.value} 超过建议上限 {self.config.max_value_per_item}，建议购买保险",
                batch_no=self.batch_no,
                source=self.source,
            ))

        if item.value < 0:
            issues.append(ValidationIssue(
                item_id=item.item_id,
                trace_id=trace_id,
                rule_id="R010",
                rule_name="价值非负校验",
                field="value",
                actual_value=item.value,
                expected_value=">= 0",
                severity="error",
                description=f"价值不能为负数",
                batch_no=self.batch_no,
                source=self.source,
            ))

        if item.category in self.config.fragile_categories and not item.fragile:
            issues.append(ValidationIssue(
                item_id=item.item_id,
                trace_id=trace_id,
                rule_id="R011",
                rule_name="易碎品标记校验",
                field="fragile",
                actual_value=item.fragile,
                expected_value=True,
                severity="warning",
                description=f"品类 '{item.category}' 建议标记为易碎品",
                batch_no=self.batch_no,
                source=self.source,
            ))

        return issues

    def _validate_totals(self, items: List[MovingItem]) -> List[ValidationIssue]:
        """校验汇总指标"""
        issues = []
        total_weight = sum(item.weight_kg * item.quantity for item in items)
        total_volume = sum(item.volume_cbm * item.quantity for item in items)

        if total_weight > self.config.max_total_weight_kg:
            issues.append(ValidationIssue(
                item_id="TOTAL",
                trace_id=generate_trace_id(self.source, "TOTAL", self.batch_no),
                rule_id="R012",
                rule_name="总重量上限校验",
                field="total_weight",
                actual_value=total_weight,
                expected_value=f"<= {self.config.max_total_weight_kg} kg",
                severity="warning",
                description=f"总重量 {total_weight:.2f}kg 超过上限 {self.config.max_total_weight_kg}kg，可能需要分车运输",
                batch_no=self.batch_no,
                source=self.source,
            ))

        if total_volume > self.config.max_total_volume_cbm:
            issues.append(ValidationIssue(
                item_id="TOTAL",
                trace_id=generate_trace_id(self.source, "TOTAL", self.batch_no),
                rule_id="R013",
                rule_name="总体积上限校验",
                field="total_volume",
                actual_value=total_volume,
                expected_value=f"<= {self.config.max_total_volume_cbm} cbm",
                severity="warning",
                description=f"总体积 {total_volume:.2f}cbm 超过上限 {self.config.max_total_volume_cbm}cbm，可能需要分车运输",
                batch_no=self.batch_no,
                source=self.source,
            ))

        return issues

    def get_issues(self) -> List[ValidationIssue]:
        """获取所有校验问题"""
        return self.issues

    def get_error_count(self) -> int:
        """获取错误级别的问题数量"""
        return sum(1 for issue in self.issues if issue.severity == "error")

    def get_warning_count(self) -> int:
        """获取警告级别的问题数量"""
        return sum(1 for issue in self.issues if issue.severity == "warning")
