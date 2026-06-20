from __future__ import annotations

import json
import sys
from io import StringIO
from typing import Any, Dict, List, Optional, TextIO

from .comparator import ComparisonResult, DiffEntry, DiffType, RiskLevel
from .ignore import mask_diff_env_values


RISK_COLORS = {
    RiskLevel.HIGH: "\033[91m",
    RiskLevel.MEDIUM: "\033[93m",
    RiskLevel.LOW: "\033[96m",
    RiskLevel.INFO: "\033[90m",
}
DIFF_COLORS = {
    DiffType.ADDED: "\033[92m",
    DiffType.REMOVED: "\033[91m",
    DiffType.MODIFIED: "\033[93m",
    DiffType.TYPE_MISMATCH: "\033[95m",
}
RESET = "\033[0m"


def _format_value(value: Any) -> str:
    if value is None:
        return "∅ (null)"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        if not value:
            return '"" (empty)'
        return repr(value)
    if isinstance(value, list):
        items = ", ".join(_format_value(v) for v in value[:5])
        suffix = "..." if len(value) > 5 else ""
        return f"[{items}{suffix}]"
    if isinstance(value, dict):
        keys = ", ".join(str(k) for k in list(value.keys())[:5])
        suffix = "..." if len(value) > 5 else ""
        return f"{{{keys}{suffix}}}"
    return repr(value)


def _color(text: str, color_code: str, use_color: bool) -> str:
    if not use_color:
        return text
    return f"{color_code}{text}{RESET}"


def _diff_symbol(diff_type: DiffType) -> str:
    return {
        DiffType.ADDED: "+",
        DiffType.REMOVED: "−",
        DiffType.MODIFIED: "~",
        DiffType.TYPE_MISMATCH: "⚠",
    }.get(diff_type, "?")


def _diff_label(diff_type: DiffType) -> str:
    return {
        DiffType.ADDED: "新增",
        DiffType.REMOVED: "缺失",
        DiffType.MODIFIED: "修改",
        DiffType.TYPE_MISMATCH: "类型不一致",
    }.get(diff_type, diff_type.value)


def _risk_label(level: RiskLevel) -> str:
    return {
        RiskLevel.HIGH: "高风险",
        RiskLevel.MEDIUM: "中风险",
        RiskLevel.LOW: "低风险",
        RiskLevel.INFO: "提示",
    }.get(level, level.value)


def generate_human_report(
    result: ComparisonResult,
    use_color: Optional[bool] = None,
    show_ignored: bool = False,
    output: TextIO = None,
) -> str:
    color_out = output or sys.stdout
    if use_color is None:
        use_color = hasattr(color_out, "isatty") and color_out.isatty()

    buf = StringIO()
    w = buf.write

    w("=" * 72 + "\n")
    w("  YAML 配置漂移检测报告\n")
    w("=" * 72 + "\n\n")

    w(f"环境数量: {len(result.envs)}  ({', '.join(result.envs)})\n")
    w(f"服务数量: {len(result.services)}  ({', '.join(result.services)})\n")
    w("-" * 72 + "\n\n")

    summary = result.to_dict()["summary"]
    w("📊 差异汇总:\n")
    w(f"   总差异数: {summary['total']}\n")
    if summary["high_risk"] > 0:
        w(_color(f"   ⚠ 高风险:   {summary['high_risk']}\n", RISK_COLORS[RiskLevel.HIGH], use_color))
    if summary["medium_risk"] > 0:
        w(_color(f"   ◆ 中风险:   {summary['medium_risk']}\n", RISK_COLORS[RiskLevel.MEDIUM], use_color))
    if summary["low_risk"] > 0:
        w(_color(f"   · 低风险:   {summary['low_risk']}\n", RISK_COLORS[RiskLevel.LOW], use_color))
    if summary["info"] > 0:
        w(f"   ℹ 提示信息: {summary['info']}\n")
    w("\n")

    if not result.diffs:
        w(_color("✅ 未检测到配置漂移！所有环境配置一致。\n", "\033[92m", use_color))
        if show_ignored and result.ignored_paths:
            w(f"\n📋 已忽略路径 ({len(result.ignored_paths)} 项):\n")
            for p in result.ignored_paths:
                w(f"   - {p}\n")
        report_str = buf.getvalue()
        if output is not None:
            output.write(report_str)
        return report_str

    current_service = None
    current_risk = None

    for diff in result.diffs:
        if diff.service != current_service:
            current_service = diff.service
            current_risk = None
            w(f"\n{'─' * 72}\n")
            w(f"🔧 服务: {current_service}\n")
            w(f"{'─' * 72}\n")

        if diff.risk_level != current_risk:
            current_risk = diff.risk_level
            label = _risk_label(current_risk)
            w(_color(f"\n  ▶ {label}:\n", RISK_COLORS[current_risk], use_color))

        _render_diff_entry(diff, buf, use_color)

    if show_ignored and result.ignored_paths:
        w(f"\n{'=' * 72}\n")
        w(f"📋 已忽略路径 ({len(result.ignored_paths)} 项):\n")
        w("-" * 72 + "\n")
        for p in sorted(set(result.ignored_paths)):
            w(f"   - {p}\n")

    w(f"\n{'=' * 72}\n")
    if result.high_risk_count > 0:
        w(_color(f"❌ 检测到 {result.high_risk_count} 项高风险漂移，需要立即关注！\n",
                 RISK_COLORS[RiskLevel.HIGH], use_color))
    elif result.medium_risk_count > 0:
        w(_color(f"⚠ 检测到 {result.medium_risk_count} 项中风险漂移，建议排查。\n",
                 RISK_COLORS[RiskLevel.MEDIUM], use_color))
    else:
        w(_color("✅ 仅低风险差异，配置基本一致。\n", "\033[92m", use_color))
    w("=" * 72 + "\n")

    report_str = buf.getvalue()
    if output is not None:
        output.write(report_str)
    return report_str


def _render_diff_entry(diff: DiffEntry, buf: StringIO, use_color: bool) -> None:
    symbol = _diff_symbol(diff.diff_type)
    diff_lbl = _diff_label(diff.diff_type)
    sym_color = DIFF_COLORS[diff.diff_type]
    prefix = _color(f"   {symbol} ", sym_color, use_color)

    path_text = diff.path
    svc_prefix = diff.service + "."
    if path_text.startswith(svc_prefix):
        path_text = path_text[len(svc_prefix):]
    if diff.is_sensitive:
        path_text += _color("  [敏感]", "\033[35m", use_color)

    buf.write(f"{prefix}{path_text}  " + _color(f"({diff_lbl})", sym_color, use_color) + "\n")

    env_values = diff.env_values
    if diff.is_sensitive:
        env_values = mask_diff_env_values(env_values, diff.path)

    envs = sorted(env_values.keys())
    for i, env in enumerate(envs):
        val = env_values[env]
        val_str = _format_value(val)
        connector = "├─" if i < len(envs) - 1 else "└─"
        buf.write(f"      {connector} {env}: {val_str}\n")

    all_envs_present = set(envs)
    if diff.diff_type in (DiffType.ADDED, DiffType.REMOVED):
        pass


def generate_json_report(
    result: ComparisonResult,
    mask_secrets: bool = True,
    pretty: bool = True,
    output: TextIO = None,
) -> str:
    data = result.to_dict()

    if mask_secrets:
        for diff in data["diffs"]:
            if diff.get("is_sensitive"):
                diff["env_values"] = {
                    env: _json_mask_value(val, diff["path"])
                    for env, val in diff["env_values"].items()
                }

    indent = 2 if pretty else None
    json_str = json.dumps(data, ensure_ascii=False, indent=indent, default=str)

    if output is not None:
        output.write(json_str)
        if pretty:
            output.write("\n")

    return json_str


def _json_mask_value(value: Any, path: str) -> Any:
    if value is None:
        return None
    if isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        if not value:
            return value
        from .ignore import _mask_string
        return _mask_string(value)
    if isinstance(value, list):
        return [_json_mask_value(v, path) for v in value]
    if isinstance(value, dict):
        return {k: _json_mask_value(v, f"{path}.{k}") for k, v in value.items()}
    return str(value)


def generate_ci_report(
    result: ComparisonResult,
    high_risk_only: bool = True,
    output: TextIO = None,
) -> str:
    lines: List[str] = []

    if high_risk_only:
        items = [d for d in result.diffs if d.risk_level == RiskLevel.HIGH]
    else:
        items = [d for d in result.diffs if d.risk_level in (RiskLevel.HIGH, RiskLevel.MEDIUM)]

    lines.append(f"TOTAL_DIFFS={result.total_count}")
    lines.append(f"HIGH_RISK={result.high_risk_count}")
    lines.append(f"MEDIUM_RISK={result.medium_risk_count}")
    lines.append(f"CHECKED_ENVS={','.join(result.envs)}")
    lines.append(f"CHECKED_SERVICES={','.join(result.services)}")

    if items:
        lines.append("")
        lines.append("DRIFT_DETAILS:")
        for diff in items:
            symbol = _diff_symbol(diff.diff_type)
            display_path = diff.path
            svc_prefix = diff.service + "."
            if display_path.startswith(svc_prefix):
                display_path = display_path[len(svc_prefix):]
            line = f"  [{_risk_label(diff.risk_level)}] {symbol} {diff.service}::{display_path}"
            if diff.is_sensitive:
                line += " (敏感字段,值已遮蔽)"
            lines.append(line)
            env_values = diff.env_values
            if diff.is_sensitive:
                env_values = mask_diff_env_values(env_values, diff.path)
            for env, val in env_values.items():
                lines.append(f"      {env}: {_format_value(val)}")

    report_str = "\n".join(lines) + "\n"
    if output is not None:
        output.write(report_str)
    return report_str
