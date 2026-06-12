import os
from typing import List

import pandas as pd

from .models import BillingResult, ShopBill, MeterType, BillStatus


def _status_text(status: BillStatus) -> str:
    mapping = {
        BillStatus.NORMAL: "正常",
        BillStatus.DISPUTED: "争议",
        BillStatus.ABNORMAL: "异常",
    }
    return mapping.get(status, status.value)


def _meter_type_text(meter_type: MeterType) -> str:
    return "电费" if meter_type == MeterType.ELECTRIC else "水费"


def export_shop_bills(
    result: BillingResult,
    output_dir: str,
    format: str = "excel",
) -> List[str]:
    os.makedirs(output_dir, exist_ok=True)
    generated_files = []

    electric_bills = [b for b in result.bills if b.meter_type == MeterType.ELECTRIC]
    water_bills = [b for b in result.bills if b.meter_type == MeterType.WATER]

    for bills, bill_type in [(electric_bills, "electric"), (water_bills, "water")]:
        if not bills:
            continue

        type_name = "电费" if bill_type == "electric" else "水费"
        rows = []
        for bill in bills:
            rows.append({
                "账单编号": bill.bill_no,
                "账期": bill.billing_month,
                "店铺编号": bill.shop_id,
                "店铺名称": bill.shop_name,
                "费用类型": type_name,
                "总金额": round(bill.total_amount, 2),
                "状态": _status_text(bill.status),
                "备注": bill.notes,
            })

        df = pd.DataFrame(rows)
        df = df.sort_values("账单编号")

        if format == "excel":
            file_path = os.path.join(output_dir, f"商户账单_{type_name}_{result.billing_month}.xlsx")
            df.to_excel(file_path, index=False, sheet_name="账单明细")
        else:
            file_path = os.path.join(output_dir, f"商户账单_{type_name}_{result.billing_month}.csv")
            df.to_csv(file_path, index=False, encoding="utf-8-sig")

        generated_files.append(file_path)

    return generated_files


def export_internal_report(
    result: BillingResult,
    output_dir: str,
    format: str = "excel",
) -> str:
    os.makedirs(output_dir, exist_ok=True)

    file_path = os.path.join(output_dir, f"内部报告_{result.billing_month}.xlsx")

    with pd.ExcelWriter(file_path, engine="openpyxl") as writer:
        summary_data = []
        for meter_type in [MeterType.ELECTRIC, MeterType.WATER]:
            type_name = _meter_type_text(meter_type)
            total_master = result.total_master_consumption.get(meter_type, 0)
            total_amount = result.total_billed_amount.get(meter_type, 0)
            bill_count = len([b for b in result.bills if b.meter_type == meter_type])
            summary_data.append({
                "费用类型": type_name,
                "总表用量": round(total_master, 2),
                "账单数量": bill_count,
                "应收总金额": round(total_amount, 2),
            })
        pd.DataFrame(summary_data).to_excel(writer, sheet_name="汇总", index=False)

        detail_rows = []
        for bill in sorted(result.bills, key=lambda b: (b.meter_type.value, b.bill_no)):
            base_row = {
                "账单编号": bill.bill_no,
                "账期": bill.billing_month,
                "店铺编号": bill.shop_id,
                "店铺名称": bill.shop_name,
                "费用类型": _meter_type_text(bill.meter_type),
                "状态": _status_text(bill.status),
            }
            for item in bill.items:
                row = base_row.copy()
                row.update({
                    "分摊项": item.item_name,
                    "数量": round(item.quantity, 4) if item.quantity is not None else "",
                    "单价": round(item.unit_price, 4) if item.unit_price is not None else "",
                    "金额": round(item.amount, 2),
                    "计算公式": item.formula,
                })
                detail_rows.append(row)

            base_row["分摊项"] = "合计"
            base_row["金额"] = round(bill.total_amount, 2)
            base_row["计算公式"] = f"各项费用合计"
            detail_rows.append(base_row)

            detail_rows.append({})

        if detail_rows:
            pd.DataFrame(detail_rows).to_excel(writer, sheet_name="账单明细", index=False)

        anomaly_rows = []
        for anomaly in result.anomalies:
            anomaly_rows.append(anomaly)
        if anomaly_rows:
            pd.DataFrame(anomaly_rows).to_excel(writer, sheet_name="异常清单", index=False)

        disputed_bills = [b for b in result.bills if b.status == BillStatus.DISPUTED]
        if disputed_bills:
            disputed_rows = []
            for bill in disputed_bills:
                disputed_rows.append({
                    "账单编号": bill.bill_no,
                    "店铺编号": bill.shop_id,
                    "店铺名称": bill.shop_name,
                    "费用类型": _meter_type_text(bill.meter_type),
                    "总金额": round(bill.total_amount, 2),
                    "备注": bill.notes,
                })
            pd.DataFrame(disputed_rows).to_excel(writer, sheet_name="争议店铺", index=False)

    return file_path


def export_bill_explain(
    bill: ShopBill,
    output_path: str,
) -> str:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    type_name = _meter_type_text(bill.meter_type)

    content = f"""{'='*50}
店铺能耗账单解释单
{'='*50}

账单编号: {bill.bill_no}
账期: {bill.billing_month}
店铺: {bill.shop_name} ({bill.shop_id})
费用类型: {type_name}
状态: {_status_text(bill.status)}
{'='*50}

费用明细:
"""

    for i, item in enumerate(bill.items, 1):
        content += f"\n【{i}】 {item.item_name}\n"
        content += f"    金额: {item.amount:.2f} 元\n"
        if item.quantity is not None:
            unit = "度" if bill.meter_type == MeterType.ELECTRIC else "吨"
            content += f"    用量: {item.quantity:.4f} {unit}\n"
        if item.unit_price is not None:
            unit = "元/度" if bill.meter_type == MeterType.ELECTRIC else "元/吨"
            content += f"    单价: {item.unit_price:.4f} {unit}\n"
        if item.formula:
            content += f"    计算方式: {item.formula}\n"

    content += f"\n{'-'*50}\n"
    content += f"总金额: {bill.total_amount:.2f} 元\n"

    if bill.anomalies:
        content += f"\n异常提示:\n"
        for anomaly in bill.anomalies:
            content += f"  - {anomaly.value}\n"

    if bill.notes:
        content += f"\n备注: {bill.notes}\n"

    content += f"\n{'='*50}\n"

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

    return output_path


def export_all_explanations(
    result: BillingResult,
    output_dir: str,
) -> List[str]:
    os.makedirs(output_dir, exist_ok=True)
    generated = []

    for bill in result.bills:
        type_name = "电费" if bill.meter_type == MeterType.ELECTRIC else "水费"
        safe_shop_name = bill.shop_name.replace("/", "_").replace("\\", "_")
        file_name = f"{bill.billing_month}_{safe_shop_name}_{type_name}_解释单.txt"
        file_path = os.path.join(output_dir, file_name)
        export_bill_explain(bill, file_path)
        generated.append(file_path)

    return generated
