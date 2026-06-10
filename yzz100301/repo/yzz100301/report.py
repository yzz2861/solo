import os
from datetime import datetime, date
import csv
from services import (
    get_handover_summary,
    get_overdue_tools,
    get_calibration_expiring_tools,
    get_returner_mismatch_tools,
    get_pending_reviews,
    get_all_tools,
)


def export_handover_report(output_dir=None, format="txt"):
    if output_dir is None:
        output_dir = os.path.dirname(os.path.abspath(__file__))

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    summary = get_handover_summary()
    overdue = get_overdue_tools()
    cal_expiring = get_calibration_expiring_tools(days_threshold=30)
    mismatch = get_returner_mismatch_tools()
    pending_reviews = get_pending_reviews()
    all_borrowed = get_all_tools(status_filter="borrowed")

    if format == "txt":
        return _export_txt(output_dir, timestamp, summary, overdue, cal_expiring,
                          mismatch, pending_reviews, all_borrowed)
    elif format == "csv":
        return _export_csv(output_dir, timestamp, summary, overdue, cal_expiring,
                          mismatch, pending_reviews, all_borrowed)


def _export_txt(output_dir, timestamp, summary, overdue, cal_expiring,
               mismatch, pending_reviews, all_borrowed):
    filename = f"交接报告_{timestamp}.txt"
    filepath = os.path.join(output_dir, filename)

    today = date.today().isoformat()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    lines = []
    lines.append("=" * 60)
    lines.append("        机场机务库房交接班报告")
    lines.append("=" * 60)
    lines.append(f"报告生成时间：{now}")
    lines.append(f"交接日期：{today}")
    lines.append("")

    lines.append("-" * 60)
    lines.append("一、台账概览")
    lines.append("-" * 60)
    lines.append(f"  工具总数：{summary['total_tools']} 件")
    lines.append(f"  在库数量：{summary['in_stock_count']} 件")
    lines.append(f"  借出中：{summary['borrowed_count']} 件")
    lines.append(f"  已归还待复核：{summary['returned_count']} 件")
    lines.append("")

    lines.append("-" * 60)
    lines.append("二、异常预警")
    lines.append("-" * 60)
    lines.append(f"  ⚠ 超期未还：{summary['overdue_count']} 件")
    lines.append(f"  ⚠ 校验过期/临期：{summary['cal_expired_count']} 件")
    lines.append(f"  ⚠ 归还人不一致：{summary['mismatch_count']} 件")
    lines.append(f"  ⏳ 待复核：{summary['pending_review_count']} 件")
    lines.append("")

    if overdue:
        lines.append("-" * 60)
        lines.append("三、超期未还明细")
        lines.append("-" * 60)
        lines.append(f"  共 {len(overdue)} 件")
        lines.append("")
        for i, item in enumerate(overdue, 1):
            lines.append(f"  {i}. [{item['tool_no']}] {item.get('tool_name', '')}")
            lines.append(f"     借用人：{item['borrower']}")
            lines.append(f"     借出日期：{item['borrow_date']}")
            lines.append(f"     应还日期：{item['expected_return_date']}")
            lines.append("")

    if cal_expiring:
        lines.append("-" * 60)
        lines.append("四、校验有效期异常明细")
        lines.append("-" * 60)
        lines.append(f"  共 {len(cal_expiring)} 件（含临期30天内）")
        lines.append("")
        for i, item in enumerate(cal_expiring, 1):
            status = "【已过期】" if item.get("is_expired") else "【临期】"
            lines.append(f"  {i}. {status} [{item['tool_no']}] {item['tool_name']}")
            lines.append(f"     校验有效期至：{item['calibration_expiry']}")
            lines.append("")

    if mismatch:
        lines.append("-" * 60)
        lines.append("五、归还人与借出人不一致明细")
        lines.append("-" * 60)
        lines.append(f"  共 {len(mismatch)} 件")
        lines.append("")
        for i, item in enumerate(mismatch, 1):
            lines.append(f"  {i}. [{item['tool_no']}] {item.get('tool_name', '')}")
            lines.append(f"     借用人：{item['borrower']}（借出日期：{item['borrow_date']}）")
            lines.append(f"     归还人：{item['returner']}（归还日期：{item['return_date']}）")
            lines.append("")

    if pending_reviews:
        lines.append("-" * 60)
        lines.append("六、待复核明细")
        lines.append("-" * 60)
        lines.append(f"  共 {len(pending_reviews)} 件")
        lines.append("")
        for i, item in enumerate(pending_reviews, 1):
            lines.append(f"  {i}. [{item['tool_no']}] {item.get('tool_name', '')}")
            lines.append(f"     借用人：{item.get('borrower', '')} / 归还人：{item.get('returner', '')}")
            lines.append("")

    if all_borrowed:
        lines.append("-" * 60)
        lines.append("七、借出中工具清单")
        lines.append("-" * 60)
        lines.append(f"  共 {len(all_borrowed)} 件")
        lines.append("")
        for i, item in enumerate(all_borrowed, 1):
            lines.append(f"  {i}. [{item['tool_no']}] {item['tool_name']}")
            lines.append(f"     借用人：{item.get('current_borrower', '')}")
            lines.append(f"     借出日期：{item.get('current_borrow_date', '')}")
            lines.append("")

    lines.append("-" * 60)
    lines.append("八、交接签字")
    lines.append("-" * 60)
    lines.append("")
    lines.append("  交班人：____________________  时间：________________")
    lines.append("")
    lines.append("  接班人：____________________  时间：________________")
    lines.append("")
    lines.append("  值班主管：__________________  时间：________________")
    lines.append("")
    lines.append("=" * 60)
    lines.append("                    报告结束")
    lines.append("=" * 60)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return filepath


def _export_csv(output_dir, timestamp, summary, overdue, cal_expiring,
               mismatch, pending_reviews, all_borrowed):
    filename = f"交接报告_{timestamp}.csv"
    filepath = os.path.join(output_dir, filename)

    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)

        writer.writerow(["机场机务库房交接班报告"])
        writer.writerow([f"生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"])
        writer.writerow([])

        writer.writerow(["一、台账概览"])
        writer.writerow(["工具总数", "在库数量", "借出中", "已归还待复核"])
        writer.writerow([summary["total_tools"], summary["in_stock_count"],
                        summary["borrowed_count"], summary["returned_count"]])
        writer.writerow([])

        writer.writerow(["二、异常预警"])
        writer.writerow(["超期未还", "校验过期", "归还人不一致", "待复核"])
        writer.writerow([summary["overdue_count"], summary["cal_expired_count"],
                        summary["mismatch_count"], summary["pending_review_count"]])
        writer.writerow([])

        if overdue:
            writer.writerow(["三、超期未还明细"])
            writer.writerow(["序号", "工具编号", "工具名称", "借用人", "借出日期", "应还日期"])
            for i, item in enumerate(overdue, 1):
                writer.writerow([i, item["tool_no"], item.get("tool_name", ""),
                                item["borrower"], item["borrow_date"],
                                item["expected_return_date"]])
            writer.writerow([])

        if cal_expiring:
            writer.writerow(["四、校验有效期异常明细"])
            writer.writerow(["序号", "状态", "工具编号", "工具名称", "校验有效期"])
            for i, item in enumerate(cal_expiring, 1):
                status = "已过期" if item.get("is_expired") else "临期"
                writer.writerow([i, status, item["tool_no"], item["tool_name"],
                                item["calibration_expiry"]])
            writer.writerow([])

        if mismatch:
            writer.writerow(["五、归还人与借出人不一致明细"])
            writer.writerow(["序号", "工具编号", "工具名称", "借用人", "借出日期",
                            "归还人", "归还日期"])
            for i, item in enumerate(mismatch, 1):
                writer.writerow([i, item["tool_no"], item.get("tool_name", ""),
                                item["borrower"], item["borrow_date"],
                                item["returner"], item["return_date"]])
            writer.writerow([])

    return filepath
