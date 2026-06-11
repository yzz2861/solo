import asyncio
import argparse
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List

from config import URLS_FILE, BASE_DIR
from url_manager import URLManager
from crawler import PageCrawler
from storage import StorageManager
from diff_detector import DiffDetector
from report_generator import ReportGenerator


def print_banner():
    banner = """
╔══════════════════════════════════════════════════════════════╗
║          🔍 竞品页面截屏巡检系统 v1.0                        ║
║  自动监控竞品页面价格、按钮文案、活动入口变化                ║
╚══════════════════════════════════════════════════════════════╝
"""
    print(banner)


def print_progress(message: str, status: str = "info"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    status_prefix = {
        "info": "ℹ️",
        "success": "✅",
        "warning": "⚠️",
        "error": "❌",
        "progress": "🔄",
    }
    prefix = status_prefix.get(status, "ℹ️")
    print(f"[{timestamp}] {prefix} {message}")


async def run_inspection(
    urls_file: Path = URLS_FILE,
    concurrency: int = 3,
    skip_report: bool = False,
    compare_with: str = None,
) -> Dict:
    start_time = time.time()
    timestamp = datetime.now().isoformat()

    url_manager = URLManager(urls_file)
    storage = StorageManager()
    diff_detector = DiffDetector()
    report_generator = ReportGenerator()

    print_progress("开始读取并处理 URL 配置...")
    url_processing = url_manager.load_and_process_urls()
    print_progress(
        f"读取到 {url_processing['total_raw']} 个 URL，去重后 {url_processing['total_unique']} 个有效，"
        f"跳过 {url_processing['total_duplicates']} 个重复/无效配置"
    )

    if url_processing["total_unique"] == 0:
        print_progress("没有有效 URL 可处理，退出", "error")
        return {"success": False, "reason": "no_valid_urls"}

    run_id = storage._generate_run_id()
    print_progress(f"本次运行编号: {run_id}")

    print_progress(f"开始抓取 {url_processing['total_unique']} 个页面 (并发数: {concurrency})...")
    async with PageCrawler() as crawler:
        results = await crawler.crawl_multiple(
            url_processing["urls"],
            concurrency=concurrency,
        )

    success_count = sum(1 for r in results if r["success"])
    failed_count = len(results) - success_count
    print_progress(
        f"抓取完成: 成功 {success_count} 个，失败 {failed_count} 个",
        "success" if failed_count == 0 else "warning"
    )

    print_progress("保存抓取结果和截图...")
    save_result = storage.save_run_results(results, run_id, url_manager)
    print_progress(f"结果已保存到: {save_result['data_path']}", "success")

    print_progress("加载历史数据进行对比...")
    if compare_with:
        old_results_data = storage.load_run_results(compare_with)
        if old_results_data:
            old_results = {r["url_id"]: r for r in old_results_data.get("results", [])}
            print_progress(f"使用指定的历史数据: {compare_with}", "info")
        else:
            print_progress(f"未找到指定的历史数据 {compare_with}，使用最新数据", "warning")
            old_results = storage.load_latest_results()
    else:
        old_results = storage.load_latest_results()

    if old_results:
        print_progress(f"找到 {len(old_results)} 条历史记录用于对比")
    else:
        print_progress("未找到历史记录，将标记为首次运行", "warning")

    print_progress("检测页面变化...")
    diffs = diff_detector.compare_all(old_results, results)

    changed_count = sum(1 for d in diffs if d["has_changes"])
    print_progress(f"变化检测完成: {changed_count} 个页面有变化", "success")

    print_progress("保存差异结果...")
    diff_path = storage.save_diff_results(diffs, run_id)
    print_progress(f"差异结果已保存到: {diff_path}", "success")

    report_path = None
    if not skip_report:
        print_progress("生成 HTML 报告...")
        report_path = report_generator.generate_report(
            diffs,
            url_processing,
            run_id,
            timestamp,
        )
        print_progress(f"报告已生成: {report_path}", "success")

    total_time = round(time.time() - start_time, 2)

    summary = {
        "run_id": run_id,
        "timestamp": timestamp,
        "total_time_seconds": total_time,
        "urls_file": str(urls_file),
        "url_processing": url_processing,
        "crawl_results": {
            "total": len(results),
            "success": success_count,
            "failed": failed_count,
        },
        "diff_results": {
            "total": len(diffs),
            "with_changes": changed_count,
            "no_changes": len(diffs) - changed_count,
        },
        "storage": save_result,
        "diff_path": diff_path,
        "report_path": report_path,
        "success": True,
    }

    print_progress(f"巡检完成！总耗时: {total_time} 秒", "success")
    print_progress(f"运行编号: {run_id}")
    if report_path:
        print_progress(f"查看报告: open '{report_path}'")

    return summary


async def list_history(limit: int = 20):
    storage = StorageManager()
    runs = storage.list_runs(limit=limit)

    print_progress(f"最近 {len(runs)} 次运行记录:")
    print("-" * 80)
    print(f"{'运行编号':<20} {'时间':<20} {'页面数':<10}")
    print("-" * 80)
    for run in runs:
        ts = run.get("timestamp", "")
        try:
            dt = datetime.fromisoformat(ts)
            ts_str = dt.strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            ts_str = ts
        print(f"{run.get('run_id', ''):<20} {ts_str:<20} {run.get('results_count', 0):<10}")
    print("-" * 80)


async def view_report(run_id: str):
    from pathlib import Path
    report_path = BASE_DIR / "reports" / f"report_{run_id}.html"
    if report_path.exists():
        print_progress(f"报告已找到: {report_path}")
        print_progress(f"请在浏览器中打开: file://{report_path}")
    else:
        print_progress(f"未找到运行编号 {run_id} 的报告", "error")

        reports_dir = BASE_DIR / "reports"
        if reports_dir.exists():
            report_files = sorted(reports_dir.glob("report_*.html"))
            if report_files:
                print_progress("可用的报告文件:")
                for rf in report_files[-10:]:
                    print(f"  - {rf.name}")


def main():
    parser = argparse.ArgumentParser(
        description="竞品页面截屏巡检系统 - 自动监控竞品页面变化",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  python main.py                              # 运行巡检
  python main.py --concurrency 5              # 设置并发数为5
  python main.py --urls my_urls.txt           # 指定URL文件
  python main.py --skip-report                # 只抓取不生成报告
  python main.py --compare-with 20260101_080000  # 与指定历史版本对比
  python main.py list                         # 列出历史记录
  python main.py report 20260101_080000       # 查看指定运行的报告
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    list_parser = subparsers.add_parser("list", help="列出历史运行记录")
    list_parser.add_argument("--limit", type=int, default=20, help="显示记录数量")

    report_parser = subparsers.add_parser("report", help="查看指定运行的报告")
    report_parser.add_argument("run_id", help="运行编号 (如 20260101_080000)")

    parser.add_argument("--urls", type=str, default=str(URLS_FILE), help="URL 配置文件路径")
    parser.add_argument("--concurrency", type=int, default=3, help="并发抓取数量 (默认 3)")
    parser.add_argument("--skip-report", action="store_true", help="跳过报告生成")
    parser.add_argument("--compare-with", type=str, help="与指定运行编号对比")

    args = parser.parse_args()

    print_banner()

    try:
        if args.command == "list":
            asyncio.run(list_history(args.limit))
        elif args.command == "report":
            asyncio.run(view_report(args.run_id))
        else:
            urls_file = Path(args.urls)
            if not urls_file.exists():
                print_progress(f"URL 配置文件不存在: {urls_file}", "error")
                print_progress(f"请创建 {urls_file} 文件，每行一个 URL")
                print_progress(f"示例内容可参考 urls.txt.example")
                sys.exit(1)

            asyncio.run(run_inspection(
                urls_file=urls_file,
                concurrency=args.concurrency,
                skip_report=args.skip_report,
                compare_with=args.compare_with,
            ))
    except KeyboardInterrupt:
        print_progress("用户中断", "warning")
        sys.exit(130)
    except Exception as e:
        print_progress(f"执行出错: {str(e)}", "error")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
