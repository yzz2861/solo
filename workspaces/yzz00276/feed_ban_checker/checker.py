"""禁用料校验与风险分级引擎。"""
from typing import List, Dict
from datetime import datetime

from .config import RiskLevel, ProcessContext
from .models import FormulaRow, CheckResult, DiffRecord


class BannedChecker:
    """禁用料检查引擎。"""

    def __init__(self, banned_list: List[dict], ctx: ProcessContext):
        self.banned_list = banned_list
        self.ctx = ctx
        self._name_index: Dict[str, dict] = {}
        self._code_index: Dict[str, dict] = {}
        self._build_index()

    def _build_index(self):
        """构建索引以加速匹配。"""
        for item in self.banned_list:
            name = str(item.get("ingredient_name", "")).strip()
            code = str(item.get("ingredient_code", "")).strip()
            if name:
                self._name_index[name] = item
            if code:
                self._code_index[code] = item

    def check_row(self, row: FormulaRow) -> CheckResult:
        """检查单条配方原料行。"""
        name = row.ingredient_name.strip()
        code = row.ingredient_code.strip()

        matched = None
        matched_by = ""

        if code and code in self._code_index:
            matched = self._code_index[code]
            matched_by = "原料编码"
        elif name and name in self._name_index:
            matched = self._name_index[name]
            matched_by = "原料名称"
        else:
            for bn_name, item in self._name_index.items():
                if bn_name and (bn_name in name or name in bn_name):
                    matched = item
                    matched_by = "名称模糊匹配"
                    break

        if matched:
            risk_str = matched.get("risk_level", "高风险")
            risk = RiskLevel(risk_str) if risk_str in [e.value for e in RiskLevel] else RiskLevel.HIGH
            reason = matched.get("reason", "")

            if matched.get("ban_date"):
                try:
                    ban_dt = datetime.strptime(matched["ban_date"], "%Y-%m-%d")
                    if row.effective_date:
                        row_dt = datetime.strptime(row.effective_date, "%Y-%m-%d")
                        if row_dt < ban_dt:
                            return CheckResult(
                                row=row,
                                is_banned=False,
                                risk_level=RiskLevel.LOW,
                                banned_ingredient_name="",
                                matched_by="",
                                reason="禁料生效日期晚于配方生效日期，暂不触发",
                            )
                except Exception:
                    pass

            return CheckResult(
                row=row,
                is_banned=True,
                risk_level=risk,
                banned_ingredient_name=matched.get("ingredient_name", ""),
                matched_by=matched_by,
                reason=reason,
            )
        else:
            return CheckResult(
                row=row,
                is_banned=False,
                risk_level=RiskLevel.LOW,
                banned_ingredient_name="",
                matched_by="",
                reason="未匹配到禁用料",
            )

    def check_all(self, rows: List[FormulaRow]) -> List[CheckResult]:
        """批量检查。"""
        return [self.check_row(r) for r in rows]


def build_diff_records(
    check_results: List[CheckResult],
    ctx: ProcessContext,
) -> List[DiffRecord]:
    """生成差异记录：将命中禁用料的行与预期值对比。

    差异表用于业务人员快速查看"命中了什么、风险等级、命中方式"等。
    """
    diffs: List[DiffRecord] = []

    for cr in check_results:
        if not cr.is_banned:
            continue

        diffs.append(DiffRecord(
            row_index=cr.row.row_index,
            source_file=cr.row.source_file,
            formula_id=cr.row.formula_id,
            field_name="原料名称",
            original_value=cr.row.ingredient_name,
            expected_value=cr.banned_ingredient_name,
            diff_type="禁用料命中",
        ))
        diffs.append(DiffRecord(
            row_index=cr.row.row_index,
            source_file=cr.row.source_file,
            formula_id=cr.row.formula_id,
            field_name="风险等级",
            original_value="未判定",
            expected_value=cr.risk_level.value,
            diff_type="风险分级",
        ))
        diffs.append(DiffRecord(
            row_index=cr.row.row_index,
            source_file=cr.row.source_file,
            formula_id=cr.row.formula_id,
            field_name="匹配方式",
            original_value="-",
            expected_value=cr.matched_by,
            diff_type="匹配口径",
        ))
        if cr.reason:
            diffs.append(DiffRecord(
                row_index=cr.row.row_index,
                source_file=cr.row.source_file,
                formula_id=cr.row.formula_id,
                field_name="异常解释",
                original_value="-",
                expected_value=cr.reason,
                diff_type="原因说明",
            ))

    return diffs


def summarize_risks(check_results: List[CheckResult]) -> Dict[str, int]:
    """统计各风险等级数量。"""
    counts = {
        RiskLevel.LOW.value: 0,
        RiskLevel.MEDIUM.value: 0,
        RiskLevel.HIGH.value: 0,
        RiskLevel.UNKNOWN.value: 0,
    }
    for cr in check_results:
        counts[cr.risk_level.value] = counts.get(cr.risk_level.value, 0) + 1
    return counts
