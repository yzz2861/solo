#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
日志压缩脱敏脚本
功能：
  1. 扫描指定目录，按日期和服务分组
  2. 替换敏感字段（手机号、token、请求参数等）
  3. 检测异常：长行、半截JSON、重复文件、规则未命中
  4. 压缩打包并校验（sha256/md5），重复运行不生成重复包
  5. 生成处理报告 + 脱敏前后差异审计样本
"""

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
import tarfile
import tempfile
import zipfile
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

try:
    import yaml
except ImportError:
    print("[ERROR] 需要 PyYAML，请先安装：pip install pyyaml", file=sys.stderr)
    sys.exit(1)


# ============================================================
# 数据结构
# ============================================================

@dataclass
class SanitizeRule:
    name: str
    pattern: str
    replacement: Optional[str] = None
    enabled: bool = True
    compiled: Optional[re.Pattern] = None


@dataclass
class AnomalyItem:
    type: str            # LONG_LINE / BROKEN_JSON / DUPLICATE / NO_MATCH / READ_ERROR
    file: str
    detail: str
    line_no: Optional[int] = None


@dataclass
class FileProcessResult:
    source_file: str
    target_file: str
    lines_total: int = 0
    lines_changed: int = 0
    rules_hit: Dict[str, int] = field(default_factory=dict)
    anomalies: List[AnomalyItem] = field(default_factory=list)
    success: bool = True
    error_msg: Optional[str] = None


@dataclass
class GroupResult:
    date: str
    service: str
    files: List[FileProcessResult] = field(default_factory=list)
    archive_path: Optional[str] = None
    checksum: Optional[str] = None
    checksum_file: Optional[str] = None
    audit_path: Optional[str] = None
    skipped_duplicate: bool = False


# ============================================================
# 核心引擎
# ============================================================

class LogSanitizer:
    def __init__(self, config_path: str):
        self.config = self._load_config(config_path)
        self.rules: List[SanitizeRule] = []
        self._compile_rules()
        self.date_patterns = [re.compile(p.strip()) for p in self.config["grouping"]["date_patterns"]]
        self.service_pattern = re.compile(self.config["grouping"]["service_pattern"].strip())

    @staticmethod
    def _load_config(path: str) -> dict:
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    def _compile_rules(self):
        placeholder = self.config["sanitize"]["placeholder"]
        for r in self.config["sanitize"]["rules"]:
            if not r.get("enabled", True):
                continue
            pattern = r["pattern"].strip()
            repl = r.get("replacement")
            if repl:
                repl = repl.strip()
            else:
                repl = placeholder
            self.rules.append(SanitizeRule(
                name=r["name"],
                pattern=pattern,
                replacement=repl,
                enabled=True,
                compiled=re.compile(pattern)
            ))

    # --- 扫描与分组 ---
    def scan_and_group(self, input_dir: str) -> Dict[Tuple[str, str], List[str]]:
        input_path = Path(input_dir)
        if not input_path.exists():
            raise FileNotFoundError(f"日志目录不存在：{input_dir}")

        exts = set(self.config["scan"]["extensions"])
        recursive = self.config["scan"]["recursive"]
        groups: Dict[Tuple[str, str], List[str]] = defaultdict(list)

        iterator = input_path.rglob("*") if recursive else input_path.glob("*")
        for f in iterator:
            if not f.is_file():
                continue
            if f.suffix.lower() not in exts:
                continue
            date = self._extract_date(f)
            service = self._extract_service(f)
            groups[(date, service)].append(str(f.resolve()))

        return groups

    def _extract_date(self, file_path: Path) -> str:
        # 先尝试从文件名提取
        name = file_path.name
        for pat in self.date_patterns:
            m = pat.search(name)
            if m:
                y, mo, d = m.group(1), m.group(2).zfill(2), m.group(3).zfill(2)
                return f"{y}-{mo}-{d}"
        # 再尝试从文件前几行提取
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                for _ in range(50):
                    line = f.readline()
                    if not line:
                        break
                    for pat in self.date_patterns:
                        m = pat.search(line)
                        if m:
                            y, mo, d = m.group(1), m.group(2).zfill(2), m.group(3).zfill(2)
                            return f"{y}-{mo}-{d}"
        except Exception:
            pass
        return self.config["grouping"]["default_date"]

    def _extract_service(self, file_path: Path) -> str:
        m = self.service_pattern.match(file_path.name)
        if m and m.group(1):
            return m.group(1)
        # 用父目录名兜底
        if file_path.parent.name and file_path.parent.name != ".":
            return file_path.parent.name
        return self.config["grouping"]["default_service"]

    # --- 脱敏单文件 ---
    def sanitize_file(self, src: str, dst: str, audit_bucket: Optional[List[dict]] = None) -> FileProcessResult:
        result = FileProcessResult(source_file=src, target_file=dst)
        max_len = self.config["anomaly"]["max_line_length"]
        check_json = self.config["anomaly"]["check_json_broken"]
        audit_limit = self.config["audit"]["samples_per_group"]
        audit_only_matched = self.config["audit"]["only_matched_lines"]

        try:
            with open(src, "r", encoding="utf-8", errors="replace") as fin, \
                 open(dst, "w", encoding="utf-8") as fout:
                line_no = 0
                for line in fin:
                    line_no += 1
                    result.lines_total += 1
                    original = line
                    changed = False
                    matched_rules: List[str] = []

                    # 长行检测
                    if len(line) > max_len:
                        result.anomalies.append(AnomalyItem(
                            type="LONG_LINE", file=src, line_no=line_no,
                            detail=f"行长度 {len(line)} > 阈值 {max_len}"
                        ))

                    # 半截JSON检测（只要行里有 { 或 [ 就尝试检查）
                    if check_json:
                        if "{" in line or "[" in line:
                            self._check_json_broken(line.rstrip("\n"), result, src, line_no)

                    # 依次执行脱敏规则
                    for rule in self.rules:
                        if not rule.compiled:
                            continue
                        new_line, count = rule.compiled.subn(rule.replacement, line)
                        if count > 0:
                            line = new_line
                            changed = True
                            result.rules_hit[rule.name] = result.rules_hit.get(rule.name, 0) + count
                            matched_rules.append(rule.name)

                    if changed:
                        result.lines_changed += 1

                    # 审计抽样（命中行优先，最多 audit_limit 条）
                    if audit_bucket is not None and len(audit_bucket) < audit_limit:
                        if (audit_only_matched and matched_rules) or not audit_only_matched:
                            audit_bucket.append({
                                "line_no": line_no,
                                "matched_rules": matched_rules,
                                "before": original.rstrip("\n")[:2000],
                                "after": line.rstrip("\n")[:2000]
                            })

                    fout.write(line)

            # 规则未命中告警
            if self.config["anomaly"]["warn_no_match"] and result.lines_changed == 0 and result.lines_total > 0:
                wl = self.config["anomaly"].get("no_match_whitelist", [])
                service = self._extract_service(Path(src))
                if service not in wl:
                    result.anomalies.append(AnomalyItem(
                        type="NO_MATCH", file=src,
                        detail=f"共 {result.lines_total} 行，无任何脱敏规则命中，请人工确认"
                    ))

        except Exception as e:
            result.success = False
            result.error_msg = str(e)
            result.anomalies.append(AnomalyItem(
                type="READ_ERROR", file=src, detail=f"读取/写入失败：{e}"
            ))
        return result

    @staticmethod
    def _check_json_broken(text: str, result: FileProcessResult, src: str, line_no: int):
        # 找到行中第一个 { 或 [ 的位置（如果存在），尝试从那里开始解析
        for marker in ('{', '['):
            idx = text.rfind(marker)  # 找最后一个开括号开始的部分，更可能是日志末尾截断
            if idx < 0:
                idx = text.find(marker)
            if idx >= 0:
                candidate = text[idx:]
                try:
                    json.loads(candidate)
                    return  # 解析成功，不是半截
                except json.JSONDecodeError as e:
                    # 判断是否疑似半截：末尾字符、错误位置靠后、Unterminated 错误等
                    end = candidate[-1] if candidate else ""
                    truncated_signals = {",", ":", "{", "[", "(", "\"", "'"}
                    near_end = False
                    pos_match = re.search(r"char (\d+)", str(e))
                    if pos_match and len(candidate) > 5:
                        try:
                            pos = int(pos_match.group(1))
                            near_end = pos >= max(len(candidate) - 10, 1)
                        except ValueError:
                            pass
                    is_unterminated = any(k in str(e) for k in ("Unterminated", "Expecting value", "End of value"))
                    if (end in truncated_signals) or near_end or is_unterminated:
                        result.anomalies.append(AnomalyItem(
                            type="BROKEN_JSON", file=src, line_no=line_no,
                            detail=f"疑似半截JSON（位置{idx}）：{str(e)[:120]}"
                        ))
                        return


# ============================================================
# 重复文件检测、压缩、校验、报告
# ============================================================

def compute_file_hash(path: str, algorithm: str = "sha256", chunk_size: int = 1 << 20) -> str:
    h = hashlib.new(algorithm)
    with open(path, "rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def detect_duplicates(files: List[str]) -> Tuple[List[str], List[AnomalyItem]]:
    """按文件大小+内容hash检测重复，返回[去重后的文件列表], [异常列表]"""
    by_size: Dict[int, List[str]] = defaultdict(list)
    for f in files:
        try:
            by_size[os.path.getsize(f)].append(f)
        except OSError:
            continue

    unique_files: List[str] = []
    anomalies: List[AnomalyItem] = []
    seen_hashes: Dict[str, str] = {}

    for size, group in by_size.items():
        if len(group) == 1:
            unique_files.append(group[0])
            continue
        for f in group:
            try:
                digest = compute_file_hash(f, "md5")
            except OSError as e:
                anomalies.append(AnomalyItem(type="READ_ERROR", file=f, detail=str(e)))
                continue
            if digest in seen_hashes:
                anomalies.append(AnomalyItem(
                    type="DUPLICATE", file=f,
                    detail=f"与 {seen_hashes[digest]} 内容完全相同，已跳过"
                ))
            else:
                seen_hashes[digest] = f
                unique_files.append(f)
    return unique_files, anomalies


def create_archive(source_dir: str, output_path: str, fmt: str) -> bool:
    if fmt == "zip":
        with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for root, _, files in os.walk(source_dir):
                for name in files:
                    full = os.path.join(root, name)
                    arc = os.path.relpath(full, source_dir)
                    zf.write(full, arc)
        return True
    elif fmt in ("tar.gz", "tgz"):
        with tarfile.open(output_path, "w:gz") as tf:
            tf.add(source_dir, arcname=os.path.basename(source_dir))
        return True
    else:
        raise ValueError(f"不支持的压缩格式：{fmt}")


def verify_archive(archive_path: str, fmt: str) -> bool:
    try:
        if fmt == "zip":
            with zipfile.ZipFile(archive_path, "r") as zf:
                bad = zf.testzip()
                return bad is None
        else:
            with tarfile.open(archive_path, "r:gz") as tf:
                for member in tf.getmembers():
                    if member.isfile():
                        f = tf.extractfile(member)
                        if f:
                            f.read()
            return True
    except Exception:
        return False


# ============================================================
# 主流程
# ============================================================

def main():
    parser = argparse.ArgumentParser(description="日志压缩脱敏脚本")
    parser.add_argument("-c", "--config", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "sanitize_config.yaml"),
                        help="配置文件路径")
    parser.add_argument("-i", "--input", help="输入日志目录（覆盖配置文件）")
    parser.add_argument("-o", "--output", help="输出归档目录（覆盖配置文件）")
    parser.add_argument("-v", "--verbose", action="store_true", help="详细输出")
    args = parser.parse_args()

    # 初始化
    sanitizer = LogSanitizer(args.config)
    cfg = sanitizer.config
    input_dir = os.path.abspath(args.input or cfg["scan"]["input_dir"])
    output_dir = os.path.abspath(args.output or cfg["scan"]["output_dir"])
    audit_dir = os.path.abspath(cfg["scan"]["audit_dir"])
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(audit_dir, exist_ok=True)

    archive_fmt = cfg["archive"]["format"]
    checksum_algo = cfg["archive"]["checksum_algorithm"]
    name_template = cfg["archive"]["name_template"]
    keep_temp = cfg["archive"].get("keep_temp", False)

    # 1) 扫描分组
    print(f"[INFO] 扫描目录：{input_dir}")
    groups = sanitizer.scan_and_group(input_dir)
    if not groups:
        print("[WARN] 未找到任何匹配的日志文件")
        return

    print(f"[INFO] 共识别 {len(groups)} 个分组：")
    for (d, s), fs in sorted(groups.items()):
        print(f"       {d} / {s}  -> {len(fs)} 个文件")

    # 2) 处理每个分组
    all_group_results: List[GroupResult] = []
    total_files = total_lines = total_changed = 0
    failed_files: List[str] = []

    with tempfile.TemporaryDirectory(prefix="sanitize_") as temp_root:
        for (date, service), raw_files in sorted(groups.items()):
            print(f"\n[INFO] ---- 处理 {date} / {service} ----")
            gr = GroupResult(date=date, service=service)

            # 2a) 重复检测
            unique_files, dup_anoms = detect_duplicates(raw_files)
            if dup_anoms:
                # 挂到第一个文件结果里或单独记录
                print(f"       发现 {len(dup_anoms)} 个重复/异常文件")

            # 2b) 逐文件脱敏
            safe_date = re.sub(r"[^A-Za-z0-9_-]", "_", date)
            safe_svc = re.sub(r"[^A-Za-z0-9_-]", "_", service)
            work_dir = os.path.join(temp_root, f"{safe_date}_{safe_svc}")
            os.makedirs(work_dir, exist_ok=True)

            audit_bucket: List[dict] = []

            for src in unique_files:
                safe_name = re.sub(r"[\\/:*?\"<>|]", "_", os.path.basename(src))
                dst = os.path.join(work_dir, safe_name)
                # 防止文件名冲突
                i = 1
                while os.path.exists(dst):
                    base, ext = os.path.splitext(safe_name)
                    dst = os.path.join(work_dir, f"{base}_{i}{ext}")
                    i += 1

                res = sanitizer.sanitize_file(src, dst, audit_bucket)
                gr.files.append(res)
                total_files += 1
                total_lines += res.lines_total
                total_changed += res.lines_changed
                if not res.success:
                    failed_files.append(src)

                if args.verbose:
                    hit = sum(res.rules_hit.values())
                    print(f"       {os.path.basename(src):40s} {res.lines_total:6d} 行 "
                          f"命中 {hit:4d} 次 {'OK' if res.success else 'FAIL'}")

            # 为被跳过的重复文件单独记录异常（以虚拟 FileProcessResult 方式）
            for a in dup_anoms:
                dummy = FileProcessResult(source_file=a.file, target_file="", success=True)
                dummy.anomalies.append(a)
                gr.files.append(dummy)
                total_files += 1

            # 2c) 计算整个工作目录的内容哈希（用于去重归档包）
            # 对所有已脱敏文件计算合并哈希
            group_hasher = hashlib.new(checksum_algo)
            for root, _, files in os.walk(work_dir):
                for name in sorted(files):
                    fp = os.path.join(root, name)
                    rel = os.path.relpath(fp, work_dir)
                    group_hasher.update(rel.encode("utf-8"))
                    group_hasher.update(compute_file_hash(fp, checksum_algo).encode("utf-8"))
            content_hash = group_hasher.hexdigest()[:12]

            # 2d) 检查归档包是否已存在（去重）
            archive_basename = name_template.format(date=safe_date, service=safe_svc, checksum=content_hash)
            archive_ext = ".zip" if archive_fmt == "zip" else ".tar.gz"
            archive_path = os.path.join(output_dir, archive_basename + archive_ext)
            checksum_file = archive_path + cfg["archive"]["checksum_suffix"]

            if os.path.exists(archive_path):
                print(f"       [SKIP] 归档包已存在，跳过：{os.path.basename(archive_path)}")
                gr.skipped_duplicate = True
                gr.archive_path = archive_path
                gr.checksum = content_hash
                gr.checksum_file = checksum_file
            else:
                # 2e) 压缩 + 校验
                print(f"       正在压缩：{archive_basename}{archive_ext}")
                try:
                    create_archive(work_dir, archive_path, archive_fmt)
                except Exception as e:
                    print(f"       [ERROR] 压缩失败：{e}", file=sys.stderr)
                    failed_files.append(f"archive:{date}/{service}")
                    all_group_results.append(gr)
                    continue

                ok = verify_archive(archive_path, archive_fmt)
                if not ok:
                    print(f"       [ERROR] 归档包校验失败，已删除", file=sys.stderr)
                    if os.path.exists(archive_path):
                        os.remove(archive_path)
                    failed_files.append(f"archive-verify:{archive_path}")
                    all_group_results.append(gr)
                    continue

                # 写校验文件
                file_hash = compute_file_hash(archive_path, checksum_algo)
                with open(checksum_file, "w", encoding="utf-8") as cf:
                    cf.write(f"{file_hash}  {os.path.basename(archive_path)}\n")
                print(f"       {checksum_algo}: {file_hash}")

                gr.archive_path = archive_path
                gr.checksum = file_hash
                gr.checksum_file = checksum_file

            # 2f) 写审计样本
            if audit_bucket:
                audit_filename = f"{safe_date}_{safe_svc}_{content_hash}.audit.json"
                audit_path = os.path.join(audit_dir, audit_filename)
                with open(audit_path, "w", encoding="utf-8") as af:
                    json.dump({
                        "date": date,
                        "service": service,
                        "generated_at": datetime.now().isoformat(timespec="seconds"),
                        "samples": audit_bucket
                    }, af, ensure_ascii=False, indent=2)
                gr.audit_path = audit_path
                print(f"       审计样本：{len(audit_bucket)} 条 -> {audit_filename}")

            # 2g) 可选保留临时文件
            if keep_temp:
                keep_dir = os.path.join(output_dir, "_sanitized", f"{safe_date}_{safe_svc}_{content_hash}")
                if not os.path.exists(keep_dir):
                    shutil.copytree(work_dir, keep_dir)

            all_group_results.append(gr)

        # 3) 生成报告
        report_path = os.path.join(output_dir, f"sanitize_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        report = _build_report(all_group_results, total_files, total_lines, total_changed, failed_files,
                               input_dir, output_dir)
        with open(report_path, "w", encoding="utf-8") as rf:
            json.dump(report, rf, ensure_ascii=False, indent=2, default=_json_default)
        _print_summary(report)
        print(f"\n[INFO] 完整报告已写入：{report_path}")


def _json_default(o):
    if isinstance(o, (AnomalyItem, FileProcessResult, GroupResult)):
        return asdict(o)
    return str(o)


def _build_report(group_results: List[GroupResult], total_files, total_lines, total_changed,
                  failed_files, input_dir, output_dir) -> dict:
    anomalies_all: List[dict] = []
    rules_total: Dict[str, int] = defaultdict(int)
    deliverables: List[dict] = []
    files_processed = 0

    for gr in group_results:
        for fr in gr.files:
            files_processed += 1
            for a in fr.anomalies:
                anomalies_all.append({
                    "date": gr.date,
                    "service": gr.service,
                    **asdict(a)
                })
            for k, v in fr.rules_hit.items():
                rules_total[k] += v
        if gr.archive_path and os.path.exists(gr.archive_path):
            deliverables.append({
                "date": gr.date,
                "service": gr.service,
                "archive": gr.archive_path,
                "checksum": gr.checksum,
                "checksum_file": gr.checksum_file,
                "audit_sample": gr.audit_path,
                "skipped_duplicate": gr.skipped_duplicate,
                "files_count": len(gr.files)
            })

    # 按类型汇总异常
    anomaly_summary: Dict[str, int] = defaultdict(int)
    for a in anomalies_all:
        anomaly_summary[a["type"]] += 1

    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "input_dir": input_dir,
        "output_dir": output_dir,
        "statistics": {
            "groups": len(group_results),
            "files_processed": files_processed,
            "files_failed": len(failed_files),
            "lines_total": total_lines,
            "lines_masked": total_changed,
            "rules_hit_total": dict(rules_total),
            "anomaly_summary": dict(anomaly_summary)
        },
        "failed_files": failed_files,
        "anomalies": anomalies_all,
        "deliverable_packages": deliverables
    }


def _print_summary(report: dict):
    s = report["statistics"]
    print("\n" + "=" * 60)
    print("           脱敏处理报告摘要")
    print("=" * 60)
    print(f"  分组数量       : {s['groups']}")
    print(f"  处理文件数     : {s['files_processed']}")
    print(f"  失败文件数     : {s['files_failed']}")
    print(f"  总日志行数     : {s['lines_total']}")
    print(f"  脱敏命中行数   : {s['lines_masked']}")
    if s["rules_hit_total"]:
        print("  规则命中统计   :")
        for k, v in sorted(s["rules_hit_total"].items(), key=lambda x: -x[1]):
            print(f"    - {k:<30s}: {v}")
    if s["anomaly_summary"]:
        print("  异常汇总       :")
        for k, v in sorted(s["anomaly_summary"].items()):
            print(f"    - {k:<18s}: {v}")
    if report["failed_files"]:
        print("  失败文件       :")
        for f in report["failed_files"]:
            print(f"    ! {f}")
    if report["deliverable_packages"]:
        print("  可交付归档包   :")
        for d in report["deliverable_packages"]:
            tag = " [已存在跳过]" if d.get("skipped_duplicate") else ""
            print(f"    + {d['date']} / {d['service']}{tag}")
            print(f"        归档 : {d['archive']}")
            print(f"        校验 : {d['checksum_file']}")
            if d.get("audit_sample"):
                print(f"        审计 : {d['audit_sample']}")
    print("=" * 60)


if __name__ == "__main__":
    main()
