"""
命令行入口与批量处理
CLI entry point and batch processing
"""

import os
import sys
import argparse
import datetime
import re
from typing import List, Dict, Optional, Tuple

from .models import SubtitleFile, SubtitleFormat
from .formats import BaseParser, detect_format, get_parser
from .patcher import SubtitlePatcher, PatchConfig, PatchResult
from .backup import BackupManager
from .report import ReportGenerator, BatchReport


def detect_language_from_filename(filepath: str) -> str:
    """
    从文件名推断语言
    规则：
      - xxx.zh.srt / xxx.chinese.srt → zh
      - xxx.en.srt / xxx.english.srt → en
      - xxx.zh-Hans.srt → zh
      - subtitle_zh.srt → zh
    """
    basename = os.path.basename(filepath)
    name_lower = basename.lower()

    patterns = [
        (r"[\._-](zh|chinese|chi|mandarin)(?:[_\.-]|$)", "zh"),
        (r"[\._-](en|english|eng)(?:[_\.-]|$)", "en"),
        (r"[\._-](ja|japanese|jpn)(?:[_\.-]|$)", "ja"),
        (r"[\._-](ko|korean)(?:[_\.-]|$)", "ko"),
        (r"[\._-](fr|french|fra)(?:[_\.-]|$)", "fr"),
        (r"[\._-](de|german|deu)(?:[_\.-]|$)", "de"),
        (r"[\._-](es|spanish|spa)(?:[_\.-]|$)", "es"),
        (r"[\._-](pt|portuguese|por)(?:[_\.-]|$)", "pt"),
        (r"[\._-](ru|russian|rus)(?:[_\.-]|$)", "ru"),
        (r"[\._-](it|italian|ita)(?:[_\.-]|$)", "it"),
        (r"[\._-](th|thai)(?:[_\.-]|$)", "th"),
        (r"[\._-](vi|vietnamese)(?:[_\.-]|$)", "vi"),
        (r"[\._-](ar|arabic)(?:[_\.-]|$)", "ar"),
        (r"[\._-](hi|hindi)(?:[_\.-]|$)", "hi"),
        (r"中[文国]|简体|繁体|chs|cht", "zh"),
        (r"英文|english|eng", "en"),
    ]

    for pattern, lang in patterns:
        if re.search(pattern, name_lower):
            return lang

    return ""


def collect_files(
    inputs: List[str],
    recursive: bool = False,
    allowed_ext: Tuple[str, ...] = (".srt", ".vtt", ".webvtt", ".ass", ".ssa"),
) -> List[str]:
    """
    收集输入路径中的字幕文件
    支持：文件、目录、glob
    """
    files: List[str] = []

    for inp in inputs:
        if os.path.isfile(inp):
            if inp.lower().endswith(allowed_ext):
                files.append(os.path.abspath(inp))
        elif os.path.isdir(inp):
            if recursive:
                for root, _, filenames in os.walk(inp):
                    for fn in filenames:
                        if fn.lower().endswith(allowed_ext):
                            files.append(os.path.abspath(os.path.join(root, fn)))
            else:
                for fn in os.listdir(inp):
                    full = os.path.join(inp, fn)
                    if os.path.isfile(full) and fn.lower().endswith(allowed_ext):
                        files.append(os.path.abspath(full))
        else:
            import glob
            matches = glob.glob(inp, recursive=recursive)
            for m in matches:
                if os.path.isfile(m) and m.lower().endswith(allowed_ext):
                    files.append(os.path.abspath(m))

    return sorted(set(files))


def read_subtitle_file(filepath: str, language: str = "") -> Optional[SubtitleFile]:
    """读取字幕文件（自动检测格式）"""
    try:
        fmt = detect_format(filepath)
        if fmt == SubtitleFormat.UNKNOWN:
            ext = os.path.splitext(filepath)[1].lower().lstrip(".")
            if ext in ("srt", "vtt", "webvtt", "ass", "ssa"):
                parser_cls = get_parser(ext)
            else:
                print(f"  ⚠  无法识别字幕格式，跳过: {filepath}", file=sys.stderr)
                return None
        else:
            parser_cls = get_parser(fmt.value)

        parser: BaseParser = parser_cls()
        lang = language or detect_language_from_filename(filepath)
        sub_file = parser.read(filepath, language=lang)
        return sub_file
    except Exception as e:
        print(f"  ✗ 读取失败 {filepath}: {e}", file=sys.stderr)
        return None


def write_subtitle_file(sub_file: SubtitleFile, output_dir: Optional[str] = None,
                        suffix: str = "") -> str:
    """写入字幕文件"""
    parser_cls = get_parser(sub_file.format.value)
    parser: BaseParser = parser_cls()

    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        basename = os.path.basename(sub_file.filepath)
        if suffix:
            name, ext = os.path.splitext(basename)
            basename = f"{name}{suffix}{ext}"
        out_path = os.path.join(output_dir, basename)
    else:
        out_path = sub_file.filepath
        if suffix:
            name, ext = os.path.splitext(out_path)
            out_path = f"{name}{suffix}{ext}"

    return parser.write(sub_file, out_path)


class BatchProcessor:
    """批量处理器"""

    def __init__(self, args: argparse.Namespace):
        self.args = args

        self.config = PatchConfig(
            reference_language=args.reference_lang,
            min_duration_ms=args.min_duration,
            max_gap_ms=args.max_gap,
            offset_tolerance_ms=args.offset_tolerance,
            merge_threshold_ms=args.merge_threshold,
            protect_missing_text=not args.allow_overwrite_missing,
            allow_duplicate_text=not args.remove_duplicates,
            mark_issues=not args.no_markers,
            safe_mode=not args.force,
        )

        self.patcher = SubtitlePatcher(self.config)
        self.backup_mgr = BackupManager(args.backup_dir)
        self.report_gen = ReportGenerator(args.report_dir)

        self.tag = args.tag or datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

    def _find_reference_file(self, files: List[SubtitleFile]) -> Optional[SubtitleFile]:
        """
        找到参考语言的文件
        优先：--reference 指定的；其次：第一个匹配参考语言的
        """
        if self.args.reference:
            abs_ref = os.path.abspath(self.args.reference)
            for f in files:
                if os.path.abspath(f.filepath) == abs_ref:
                    return f
            ref = read_subtitle_file(self.args.reference, self.config.reference_language)
            if ref:
                return ref

        for f in files:
            if f.language == self.config.reference_language and f.entries:
                return f

        if files and files[0].entries:
            return files[0]

        return None

    def run(self) -> Tuple[int, BatchReport]:
        """执行批量处理，返回 (成功文件数, 报告)"""
        args = self.args

        input_files = collect_files(args.inputs, recursive=args.recursive)
        if not input_files:
            print("错误：未找到任何字幕文件", file=sys.stderr)
            return 0, BatchReport(session_tag=self.tag, created_at="")

        print(f"共找到 {len(input_files)} 个字幕文件")

        if args.dry_run:
            print("  ℹ️  DRY-RUN 模式：只预览修补效果，不写回文件、不生成正式备份")

        print()
        print("▶ 步骤 1/4：读取文件并建立备份...")
        backup_session = None
        if not args.dry_run:
            backup_session = self.backup_mgr.start_session(tag=self.tag)

        sub_files: List[SubtitleFile] = []
        for fp in input_files:
            lang = detect_language_from_filename(fp)
            sub_file = read_subtitle_file(fp, lang)
            if sub_file is None:
                continue

            if not args.dry_run:
                try:
                    rec = self.backup_mgr.backup_file(
                        fp, sub_file.encoding,
                        subfolder=lang or "_nolabel",
                    )
                    print(f"  ✓ 已备份: {os.path.basename(fp)} ({rec.size_bytes} bytes)")
                except Exception as e:
                    print(f"  ⚠  备份失败（继续处理）: {e}", file=sys.stderr)
            else:
                sz = os.path.getsize(fp)
                print(f"  ✓ 已读取: {os.path.basename(fp)} ({sz} bytes, {lang or '未标注'})")

            sub_files.append(sub_file)

        if not args.dry_run:
            manifest_path = self.backup_mgr.write_manifest()
            print(f"  备份清单已写入: {manifest_path}")
        else:
            print("  ℹ️  DRY-RUN 模式：已跳过备份")

        if not sub_files:
            print("错误：没有可处理的字幕文件", file=sys.stderr)
            return 0, BatchReport(session_tag=self.tag, created_at="")

        print()
        print("▶ 步骤 2/4：确定参考语言...")
        ref_file = self._find_reference_file(sub_files)
        if ref_file:
            ref_name = os.path.basename(ref_file.filepath)
            ref_lang = ref_file.language or "未标注"
            print(f"  参考文件: {ref_name} (语言: {ref_lang}, {len(ref_file.entries)} 行)")
        else:
            print("  ⚠  未找到参考文件，将仅执行非对齐类修补")

        print()
        print("▶ 步骤 3/4：执行修补...")
        results: List[PatchResult] = []

        for sub_file in sub_files:
            fname = os.path.basename(sub_file.filepath)
            lang = sub_file.language or "未标注"
            is_ref = ref_file and os.path.abspath(sub_file.filepath) == os.path.abspath(ref_file.filepath)

            print(f"  [{len(results)+1}/{len(sub_files)}] 处理 {fname}（{lang}，{len(sub_file.entries)} 行）...", end="")

            current_ref = None if is_ref else ref_file

            try:
                result = self.patcher.patch_file(sub_file, reference_file=current_ref)
                results.append(result)

                changes = (
                    f" 合并×{result.merged_count}"
                    f" | 变化 {result.count_diff:+d}"
                    f" | 重叠 {len(result.overlaps_before)}→{len(result.overlaps_after)}"
                )
                print(f" ✓{changes}")
            except Exception as e:
                print(f" ✗ 失败: {e}", file=sys.stderr)
                import traceback
                traceback.print_exc()

        print()
        print("▶ 步骤 4/4：写回文件并生成报告...")

        output_dir = args.output_dir
        suffix = args.suffix or ("" if output_dir else "_patched")

        success_count = 0
        for result in results:
            sub_file = result.file
            fname = os.path.basename(sub_file.filepath)

            if args.dry_run:
                print(f"  ℹ️  DRY-RUN: 跳过写回 {fname}")
                success_count += 1
                continue

            try:
                out_path = write_subtitle_file(sub_file, output_dir, suffix)
                print(f"  ✓ 已写回: {out_path}")
                success_count += 1
            except Exception as e:
                print(f"  ✗ 写回失败 {fname}: {e}", file=sys.stderr)

        created_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        batch_report = BatchReport(
            session_tag=self.tag,
            created_at=created_at,
            file_results=results,
            reference_file=os.path.abspath(ref_file.filepath) if ref_file else None,
            backup=backup_session,
        )

        text_report_path = self.report_gen.generate_text_report(batch_report)
        csv_report_path = self.report_gen.generate_csv_summary(batch_report)

        print()
        print(f"  📄 文本报告: {text_report_path}")
        print(f"  📊 CSV 摘要: {csv_report_path}")

        return success_count, batch_report


def build_parser() -> argparse.ArgumentParser:
    """构建命令行参数解析器"""
    parser = argparse.ArgumentParser(
        prog="subtitle-patch",
        description="字幕时间轴修补工具 / Subtitle Timeline Patcher",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法：
  # 处理当前目录所有 SRT，中文作为参考语言
  subtitle-patch *.srt --reference-lang zh

  # 处理整个项目目录，输出到单独目录
  subtitle-patch ./subtitles -r -o ./patched --reference ./subtitles/ep01.zh.srt

  # 只合并短片段，不做时间对齐
  subtitle-patch ./video.srt --merge-threshold 800 --min-duration 400

  # 宽松模式（允许覆盖缺句内容，谨慎使用）
  subtitle-patch ./subs/ -r --allow-overwrite-missing
        """,
    )

    parser.add_argument(
        "inputs", nargs="+",
        help="输入文件、目录或 glob 模式",
    )
    parser.add_argument(
        "-r", "--recursive", action="store_true",
        help="递归扫描子目录",
    )
    parser.add_argument(
        "-o", "--output-dir", default=None,
        help="输出目录（不写原文件），不指定则覆盖原文件（先备份）",
    )
    parser.add_argument(
        "--suffix", default=None,
        help="输出文件名后缀（默认：覆盖时无，写入原目录时 _patched）",
    )

    ref_group = parser.add_argument_group("参考与语言")
    ref_group.add_argument(
        "--reference", default=None,
        help="指定参考字幕文件路径（优先于 --reference-lang 查找）",
    )
    ref_group.add_argument(
        "--reference-lang", default="zh",
        help="参考语言标识（默认 zh，用于自动从文件名中定位参考文件）",
    )

    tune_group = parser.add_argument_group("修补参数（毫秒）")
    tune_group.add_argument(
        "--min-duration", type=int, default=300,
        help="字幕最小时长，短于该值的相邻行会被合并（默认 300ms）",
    )
    tune_group.add_argument(
        "--max-gap", type=int, default=150,
        help="正常空白间隔上限，超过会被缩减（默认 150ms）",
    )
    tune_group.add_argument(
        "--offset-tolerance", type=int, default=500,
        help="偏移容差，超过此值才会被校正（默认 500ms）",
    )
    tune_group.add_argument(
        "--merge-threshold", type=int, default=500,
        help="两行间隔小于该值才会被合并（默认 500ms）",
    )

    safety_group = parser.add_argument_group("安全选项")
    safety_group.add_argument(
        "--no-markers", action="store_true",
        help="不在字幕行里标记修补问题（默认会在 issue 里留痕）",
    )
    safety_group.add_argument(
        "--allow-overwrite-missing", action="store_true",
        help="允许覆盖缺句对应的语言行（谨慎！默认关闭以避免误删）",
    )
    safety_group.add_argument(
        "--remove-duplicates", action="store_true",
        help="发现重复文本时删除重复项（默认只提醒不删除）",
    )
    safety_group.add_argument(
        "--force", action="store_true",
        help="强制模式：跳过某些安全检查",
    )

    meta_group = parser.add_argument_group("元参数")
    meta_group.add_argument(
        "--backup-dir", default=None,
        help="备份文件目录（默认 ./_subtitle_backups）",
    )
    meta_group.add_argument(
        "--report-dir", default=None,
        help="报告输出目录（默认 ./_patch_reports）",
    )
    meta_group.add_argument(
        "--tag", default=None,
        help="本次处理的标签，用于备份目录命名",
    )
    meta_group.add_argument(
        "--dry-run", action="store_true",
        help="只预览修补效果，不写回文件、不生成正式备份（仍生成报告）",
    )
    meta_group.add_argument(
        "-v", "--verbose", action="store_true",
        help="详细输出",
    )

    return parser


def main(argv: Optional[List[str]] = None) -> int:
    """CLI 入口函数"""
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.verbose:
        import logging
        logging.basicConfig(level=logging.DEBUG)

    print("=" * 68)
    print("  字幕时间轴修补工具  Subtitle Timeline Patcher  v1.0")
    print("=" * 68)
    print()

    processor = BatchProcessor(args)
    success_count, report = processor.run()

    print()
    print("=" * 68)
    if success_count > 0:
        print(f"  ✓ 完成！成功修补 {success_count}/{report.total_files} 个文件")
        print(f"  ✓ 共执行 {report.total_ops} 项修补操作")
        print(f"  ✓ 备份目录: {report.backup.backup_dir if report.backup else '未备份'}")
    else:
        print("  ✗ 没有成功处理任何文件")

    still_issues = sum(
        len(r.overlaps_after) + len(r.out_of_bounds_after)
        for r in report.file_results
    )
    if still_issues > 0:
        print(f"  ⚠  仍有 {still_issues} 处问题需人工复查，请查看报告")
    print("=" * 68)

    return 0 if success_count > 0 else 1


if __name__ == "__main__":
    sys.exit(main())
