import pytest
from checker.types import (
    ForbiddenRule,
    Issue,
    IssueKind,
    IssueSeverity,
    Template,
    TemplateStatus,
    UnitRule,
    VariableRule,
)
from checker.validators.unclosed_var import check_unclosed_variables, check_multiline_variable
from checker.validators.default_missing import check_default_missing
from checker.validators.unit_consistency import check_unit_consistency_single
from checker.validators.forbidden_expr import check_forbidden_expressions
from checker.risk import compute_risk_score, run_checks, sort_by_risk


class TestUnclosedVar:
    def test_no_issues(self):
        content = "【患者姓名】正常文本"
        issues = check_unclosed_variables(content)
        assert len(issues) == 0

    def test_unclosed_chinese_bracket(self):
        content = "【患者姓名"
        issues = check_unclosed_variables(content)
        assert len(issues) == 1
        assert issues[0].kind == IssueKind.UNCLOSED_VAR
        assert "未闭合" in issues[0].message

    def test_unclosed_curly_bracket(self):
        content = "{患者姓名"
        issues = check_unclosed_variables(content)
        assert len(issues) == 1
        assert "缺少闭合符号" in issues[0].message

    def test_mismatched_brackets(self):
        content = "【患者姓名}"
        issues = check_unclosed_variables(content)
        assert len(issues) >= 1

    def test_extra_close_bracket(self):
        content = "患者姓名】"
        issues = check_unclosed_variables(content)
        assert len(issues) == 1
        assert "多余" in issues[0].message

    def test_multiple_vars_ok(self):
        content = "【姓名】{年龄}【体重】"
        issues = check_unclosed_variables(content)
        assert len(issues) == 0

    def test_multiline_var(self):
        content = "【用药剂量\n给药途径】"
        issues = check_multiline_variable(content)
        assert len(issues) == 1
        assert "跨越多行" in issues[0].message


class TestDefaultMissing:
    def test_no_issues(self):
        content = "【给药途径】"
        rules = {"给药途径": VariableRule(name="给药途径", required=True, default="口服")}
        issues = check_default_missing(content, rules)
        assert all(i.kind != IssueKind.DEFAULT_MISSING for i in issues)

    def test_required_no_default(self):
        content = "【患者姓名】"
        rules = {"患者姓名": VariableRule(name="患者姓名", required=True, default=None)}
        issues = check_default_missing(content, rules)
        assert any("没有默认值" in i.message for i in issues)

    def test_undefined_variable(self):
        content = "【自定义变量】"
        rules = {}
        issues = check_default_missing(content, rules)
        assert any("不在变量规则定义中" in i.message for i in issues)

    def test_rule_var_not_in_template(self):
        content = "其他内容"
        rules = {"住院号": VariableRule(name="住院号", required=True, default=None)}
        issues = check_default_missing(content, rules)
        assert any("未出现且无默认值" in i.message for i in issues)


class TestUnitConsistency:
    def test_same_unit_ok(self):
        content = "阿莫西林：500 mg 口服\n阿莫西林：250 mg 口服"
        rules = {"mg": UnitRule(canonical="mg", aliases=["毫克"])}
        issues = check_unit_consistency_single(content, rules)
        assert len(issues) == 0

    def test_inconsistent_units(self):
        content = "阿莫西林：0.5 g 口服\n阿莫西林：500 mg 口服"
        rules = {
            "g": UnitRule(canonical="g", aliases=["克"]),
            "mg": UnitRule(canonical="mg", aliases=["毫克"]),
        }
        issues = check_unit_consistency_single(content, rules)
        assert len(issues) >= 1
        assert any("不一致" in i.message for i in issues)

    def test_alias_normalized(self):
        content = "阿莫西林：500 毫克 口服\n阿莫西林：250 mg 口服"
        rules = {"mg": UnitRule(canonical="mg", aliases=["毫克"])}
        issues = check_unit_consistency_single(content, rules)
        assert len(issues) == 0


class TestForbiddenExpr:
    def test_placeholder_xxx(self):
        content = "剂量：XXX mg"
        issues = check_forbidden_expressions(content, [])
        assert any("占位符" in i.message for i in issues)

    def test_todo(self):
        content = "TODO: 补充信息"
        issues = check_forbidden_expressions(content, [])
        assert any("TODO" in i.message for i in issues)

    def test_forbidden_rule_literal(self):
        content = "剂量按说明书"
        rules = [ForbiddenRule(pattern="按说明书", reason="引用外部说明")]
        issues = check_forbidden_expressions(content, rules)
        assert any("按说明书" in i.message for i in issues)

    def test_forbidden_rule_regex(self):
        content = "剂量[待填写]"
        rules = [ForbiddenRule(pattern=r"\[.*?\]", reason="方括号占位符", is_regex=True)]
        issues = check_forbidden_expressions(content, rules)
        assert any("方括号" in i.message for i in issues)

    def test_no_duplicate_for_overlapping_matches(self):
        content = "XXX"
        issues = check_forbidden_expressions(content, [ForbiddenRule(pattern="XX", reason="占位符")])
        counts_at_0 = sum(1 for i in issues if i.col == 1)
        assert counts_at_0 == 1


class TestRiskScoring:
    def test_score_empty(self):
        assert compute_risk_score([]) == 0

    def test_error_weight(self):
        issues = [Issue(kind=IssueKind.UNCLOSED_VAR, severity=IssueSeverity.ERROR, line=1, col=1, message="test")]
        assert compute_risk_score(issues) == 10

    def test_warning_weight(self):
        issues = [Issue(kind=IssueKind.DEFAULT_MISSING, severity=IssueSeverity.WARNING, line=1, col=1, message="test")]
        assert compute_risk_score(issues) == 5

    def test_forbidden_extra_weight(self):
        issues = [Issue(kind=IssueKind.FORBIDDEN_EXPR, severity=IssueSeverity.ERROR, line=1, col=1, message="test")]
        assert compute_risk_score(issues) == 15

    def test_sort_by_risk(self):
        t_low = Template(path="a", name="a", risk_score=5)
        t_high = Template(path="b", name="b", risk_score=50)
        t_disc = Template(path="c", name="c", risk_score=100, status=TemplateStatus.DISCONTINUED)
        result = sort_by_risk([t_low, t_high, t_disc])
        assert result[0].path == "b"
        assert result[1].path == "a"
        assert result[-1].is_discontinued


class TestRunChecks:
    def test_full_pipeline(self):
        content = "【患者姓名】\n剂量：XXX mg\n备注：按说明书"
        t = Template(path="test.order", name="测试", content=content)
        var_rules = {"患者姓名": VariableRule(name="患者姓名", required=True, default=None)}
        unit_rules = {"mg": UnitRule(canonical="mg", aliases=["毫克"])}
        forbidden = [ForbiddenRule(pattern="按说明书", reason="引用外部说明")]
        run_checks([t], var_rules, unit_rules, forbidden, [])
        assert len(t.issues) > 0
        assert t.risk_score > 0

        kinds = {i.kind for i in t.issues}
        assert IssueKind.FORBIDDEN_EXPR in kinds
