from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import List, Optional, Sequence, Set

from . import __version__
from .comparator import ComparisonResult, RiskLevel, compare_configs
from .ignore import IgnoreConfig, load_ignore_config
from .loader import LoadedConfig, load_yaml_file, scan_directory
from .reporter import generate_ci_report, generate_human_report, generate_json_report


EXIT_OK = 0
EXIT_HIGH_RISK = 2
EXIT_ANY_RISK = 3
EXIT_ERROR = 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="yaml-drift",
        description="YAML 配置漂移比对工具 - 检测多环境配置差异",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  yaml-drift /path/to/configs
  yaml-drift /path/to/configs -o report.json --format json
  yaml-drift a.yaml b.yaml c.yaml --ignore ignore.yaml
  yaml-drift /configs --ci-mode --fail-on high
        """,
    )

    parser.add_argument(
        "paths",
        nargs="+",
        help="YAML 文件路径或包含 YAML 的目录路径（支持多个）",
    )

    parser.add_argument(
        "-V", "--version",
        action="version",
        version=f"yaml-drift {__version__}",
    )

    input_group = parser.add_argument_group("输入选项")
    input_group.add_argument(
        "--pattern",
        default="*.y*ml",
        help="目录下匹配 YAML 的 glob 模式（默认: *.y*ml）",
    )
    input_group.add_argument(
        "--no-sort-arrays",
        action="store_true",
        default=False,
        help="数组比较时不排序，严格检查顺序（默认自动排序忽略顺序）",
    )
    input_group.add_argument(
        "--env-name",
        action="append",
        default=[],
        metavar="NAME",
        help="按顺序为每个输入文件指定环境名（可多次指定）",
    )

    ignore_group = parser.add_argument_group("忽略选项")
    ignore_group.add_argument(
        "--ignore", "-i",
        action="append",
        default=[],
        metavar="PATH",
        help="忽略指定键路径（可多次指定，支持 glob 模式）",
    )
    ignore_group.add_argument(
        "--ignore-file",
        default=None,
        metavar="FILE",
        help="忽略配置文件（YAML 格式，包含 paths/patterns/services 列表）",
    )
    ignore_group.add_argument(
        "--show-ignored",
        action="store_true",
        default=False,
        help="在报告中显示被忽略的路径",
    )

    output_group = parser.add_argument_group("输出选项")
    output_group.add_argument(
        "--format", "-f",
        choices=["human", "json", "ci", "all"],
        default="human",
        help="输出格式: human(人类可读) / json(机器可读) / ci(CI友好) / all(全部)",
    )
    output_group.add_argument(
        "--output", "-o",
        default=None,
        metavar="FILE",
        help="输出到文件（默认输出到 stdout）",
    )
    output_group.add_argument(
        "--json-output",
        default=None,
        metavar="FILE",
        help="同时输出 JSON 到指定文件（配合 human/ci 格式使用）",
    )
    output_group.add_argument(
        "--no-color",
        action="store_true",
        default=False,
        help="禁用彩色输出",
    )
    output_group.add_argument(
        "--no-mask",
        action="store_true",
        default=False,
        help="不对敏感字段值进行遮蔽（谨慎使用！）",
    )

    ci_group = parser.add_argument_group("CI 选项")
    ci_group.add_argument(
        "--ci-mode",
        action="store_true",
        default=False,
        help="启用 CI 模式：使用 ci 格式输出，仅显示中高风险",
    )
    ci_group.add_argument(
        "--fail-on",
        choices=["high", "medium", "any", "none"],
        default="high",
        help="设置退出码条件: high(仅高风险) / medium(中及以上) / any(任何差异) / none(永不失败)（默认: high）",
    )

    return parser


def _collect_configs(args: argparse.Namespace) -> List[LoadedConfig]:
    configs: List[LoadedConfig] = []
    sort_arrays = not args.no_sort_arrays
    env_names = list(args.env_name)
    env_idx = 0

    for path_str in args.paths:
        path = Path(path_str)
        if not path.exists():
            print(f"[ERROR] 路径不存在: {path}", file=sys.stderr)
            sys.exit(EXIT_ERROR)

        if path.is_dir():
            dir_configs = scan_directory(
                path,
                sort_arrays=sort_arrays,
                pattern=args.pattern,
            )
            for cfg in dir_configs:
                if env_idx < len(env_names):
                    cfg.env_name = env_names[env_idx]
                    env_idx += 1
                configs.append(cfg)
        else:
            env_name = env_names[env_idx] if env_idx < len(env_names) else None
            env_idx += 1
            try:
                cfg = load_yaml_file(path, sort_arrays=sort_arrays, env_name=env_name)
                configs.append(cfg)
            except Exception as e:
                print(f"[ERROR] 加载失败 {path}: {e}", file=sys.stderr)
                sys.exit(EXIT_ERROR)

    return configs


def _build_ignore_config(args: argparse.Namespace) -> IgnoreConfig:
    config = IgnoreConfig()

    if args.ignore_file:
        config = load_ignore_config(args.ignore_file)

    import fnmatch
    for pattern in args.ignore:
        if any(ch in pattern for ch in "*?[]"):
            config.ignore_pattern(pattern)
        else:
            config.ignore_path(pattern)

    return config


def _compute_exit_code(result: ComparisonResult, fail_on: str) -> int:
    if fail_on == "none":
        return EXIT_OK

    if fail_on == "high":
        return EXIT_HIGH_RISK if result.high_risk_count > 0 else EXIT_OK

    if fail_on == "medium":
        if result.high_risk_count > 0:
            return EXIT_HIGH_RISK
        if result.medium_risk_count > 0:
            return EXIT_ANY_RISK
        return EXIT_OK

    if fail_on == "any":
        return EXIT_ANY_RISK if result.total_count > 0 else EXIT_OK

    return EXIT_OK


def _output_to_file(content: str, file_path: Optional[str]) -> None:
    if not file_path:
        return
    Path(file_path).parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)


def run(argv: Optional[Sequence[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.ci_mode and args.format == "human":
        args.format = "ci"

    configs = _collect_configs(args)

    if len(configs) < 2:
        print("[ERROR] 至少需要 2 份配置才能比较，当前只找到 {} 份".format(len(configs)),
              file=sys.stderr)
        for cfg in configs:
            print(f"  - {cfg.env_name}: {cfg.file_path}", file=sys.stderr)
        return EXIT_ERROR

    env_names = [c.env_name for c in configs]
    if len(set(env_names)) != len(env_names):
        print("[WARN] 检测到重复环境名，将自动去重编号", file=sys.stderr)
        seen: dict = {}
        for cfg in configs:
            name = cfg.env_name
            if name in seen:
                seen[name] += 1
                cfg.env_name = f"{name}_{seen[name]}"
            else:
                seen[name] = 0

    ignore_cfg = _build_ignore_config(args)

    for svc in ignore_cfg.services:
        ignore_cfg.exact_paths.add(svc)

    result = compare_configs(
        configs,
        ignore_paths=ignore_cfg.exact_paths,
        ignore_patterns=ignore_cfg.glob_patterns,
    )

    use_color = not args.no_color
    mask_secrets = not args.no_mask

    primary_output = args.output
    json_content: Optional[str] = None
    human_content: Optional[str] = None
    ci_content: Optional[str] = None

    if args.format == "json":
        json_content = generate_json_report(
            result, mask_secrets=mask_secrets, pretty=True,
            output=None,
        )
        if primary_output:
            _output_to_file(json_content, primary_output)
        else:
            sys.stdout.write(json_content)
            sys.stdout.write("\n")

    elif args.format == "human":
        human_content = generate_human_report(
            result, use_color=use_color, show_ignored=args.show_ignored,
            output=None,
        )
        if primary_output:
            _output_to_file(human_content, primary_output)
        else:
            sys.stdout.write(human_content)

    elif args.format == "ci":
        ci_content = generate_ci_report(
            result, high_risk_only=(args.fail_on == "high"),
            output=None,
        )
        if primary_output:
            _output_to_file(ci_content, primary_output)
        else:
            sys.stdout.write(ci_content)

    elif args.format == "all":
        out_dir = Path(primary_output) if primary_output else Path.cwd()
        if primary_output and not out_dir.is_dir():
            out_dir = out_dir.parent

        json_path = str(out_dir / "drift-report.json") if primary_output else None
        human_path = str(out_dir / "drift-report.txt") if primary_output else None
        ci_path = str(out_dir / "drift-report.ci.txt") if primary_output else None

        json_content = generate_json_report(result, mask_secrets=mask_secrets, pretty=True)
        human_content = generate_human_report(
            result, use_color=use_color, show_ignored=args.show_ignored
        )
        ci_content = generate_ci_report(result, high_risk_only=False)

        if primary_output:
            _output_to_file(json_content, json_path)
            _output_to_file(human_content, human_path)
            _output_to_file(ci_content, ci_path)
            print(f"[INFO] 已生成报告文件:")
            print(f"  - JSON:   {json_path}")
            print(f"  - 人类:   {human_path}")
            print(f"  - CI:     {ci_path}")
        else:
            sys.stdout.write(human_content)
            sys.stdout.write("\n\n--- JSON ---\n\n")
            sys.stdout.write(json_content)
            sys.stdout.write("\n")

    if args.json_output and json_content is None:
        json_content = generate_json_report(result, mask_secrets=mask_secrets, pretty=True)
    if args.json_output and json_content is not None:
        _output_to_file(json_content, args.json_output)

    return _compute_exit_code(result, args.fail_on)


def main() -> None:
    try:
        sys.exit(run())
    except KeyboardInterrupt:
        print("\n[INFO] 用户中断", file=sys.stderr)
        sys.exit(EXIT_ERROR)
    except Exception as e:
        print(f"[FATAL] 未处理的异常: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(EXIT_ERROR)


if __name__ == "__main__":
    main()
