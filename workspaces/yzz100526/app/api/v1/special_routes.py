from typing import Optional
from datetime import date, datetime
from io import BytesIO
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import business

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False

router = APIRouter()


@router.get("/dispatcher/routes/{route_code}", tags=["发行员-路线"])
def get_route_today(
    route_code: str,
    plan_date: Optional[date] = Query(None, description="计划日期，默认今天"),
    db: Session = Depends(get_db)
):
    result = business.get_route_today(db, route_code, plan_date)
    return result


@router.get("/manager/reports/complaints", tags=["主管-报表"])
def report_complaints(
    start_date: date = Query(..., description="起始日期 YYYY-MM-DD"),
    end_date: date = Query(..., description="结束日期 YYYY-MM-DD"),
    format: str = Query("json", enum=["json", "xlsx", "csv"]),
    db: Session = Depends(get_db)
):
    data = business.report_complaints(db, start_date, end_date)
    if format == "json":
        return {"start_date": start_date.isoformat(), "end_date": end_date.isoformat(), "count": len(data), "data": data}
    if not HAS_PANDAS:
        raise HTTPException(status_code=500, detail="缺少 pandas 依赖，无法导出")
    df = pd.DataFrame(data)
    return _export_df(df, f"缺刊投诉_{start_date}_{end_date}", format)


@router.get("/manager/reports/return-rate", tags=["主管-报表"])
def report_return_rate(
    start_date: date = Query(..., description="刊期起始日期"),
    end_date: date = Query(..., description="刊期结束日期"),
    format: str = Query("json", enum=["json", "xlsx", "csv"]),
    db: Session = Depends(get_db)
):
    data = business.report_return_rate(db, start_date, end_date)
    if format == "json":
        return {"start_date": start_date.isoformat(), "end_date": end_date.isoformat(), "count": len(data), "data": data}
    if not HAS_PANDAS:
        raise HTTPException(status_code=500, detail="缺少 pandas 依赖，无法导出")
    df = pd.DataFrame(data)
    return _export_df(df, f"退刊率_{start_date}_{end_date}", format)


@router.get("/manager/reports/response-time", tags=["主管-报表"])
def report_response_time(
    start_date: date = Query(..., description="申请起始日期"),
    end_date: date = Query(..., description="申请结束日期"),
    format: str = Query("json", enum=["json", "xlsx", "csv"]),
    db: Session = Depends(get_db)
):
    data = business.report_response_time(db, start_date, end_date)
    avg_resp = None
    valid = [d["response_minutes"] for d in data if d["response_minutes"] is not None]
    if valid:
        avg_resp = round(sum(valid) / len(valid), 1)
    if format == "json":
        return {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "count": len(data),
            "average_response_minutes": avg_resp,
            "data": data
        }
    if not HAS_PANDAS:
        raise HTTPException(status_code=500, detail="缺少 pandas 依赖，无法导出")
    df = pd.DataFrame(data)
    return _export_df(df, f"补货响应时间_{start_date}_{end_date}", format)


@router.get("/manager/reports/monthly-unsold", tags=["主管-报表"])
def monthly_unsold_report(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    format: str = Query("json", enum=["json", "xlsx", "csv"]),
    db: Session = Depends(get_db)
):
    data = business.monthly_unsold(db, year, month)
    total_unsold = sum(d["unsold_qty"] for d in data)
    total_amount = sum(d["unsold_amount"] for d in data)
    if format == "json":
        return {
            "year": year,
            "month": month,
            "count": len(data),
            "total_unsold_qty": total_unsold,
            "total_unsold_amount": round(total_amount, 2),
            "data": data
        }
    if not HAS_PANDAS:
        raise HTTPException(status_code=500, detail="缺少 pandas 依赖，无法导出")
    df = pd.DataFrame(data)
    return _export_df(df, f"滞销刊核算_{year}年{month}月", format)


@router.get("/driver/print/{delivery_id}", tags=["配送员-打印"])
def get_print_sheet(
    delivery_id: int,
    format: str = Query("json", enum=["json", "html", "txt"]),
    db: Session = Depends(get_db)
):
    result = business.get_print_data(db, delivery_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    data = result["data"]
    if format == "json":
        return data
    if format == "txt":
        return _print_txt(data)
    return _print_html(data)


@router.get("/owner/progress/{owner_id}", tags=["亭主-进度"])
def get_owner_progress(owner_id: int, db: Session = Depends(get_db)):
    return business.get_owner_progress(db, owner_id)


def _export_df(df, filename: str, fmt: str):
    buf = BytesIO()
    if fmt == "xlsx":
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Sheet1")
        buf.seek(0)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ext = "xlsx"
    else:
        buf.write(df.to_csv(index=False).encode("utf-8-sig"))
        buf.seek(0)
        media_type = "text/csv; charset=utf-8-sig"
        ext = "csv"
    return StreamingResponse(
        buf,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}.{ext}"}
    )


def _print_txt(data: dict) -> dict:
    lines = []
    lines.append("=" * 60)
    lines.append(f"          补刊 / 退刊 配送单")
    lines.append("=" * 60)
    lines.append(f"配送单号: {data['delivery_no']}")
    lines.append(f"线    路: {data['route_code']}")
    lines.append(f"日    期: {data['plan_date']}")
    lines.append(f"司    机: {data['driver']}")
    lines.append(f"网点数量: {data['outlet_count']}    补刊合计: {data['total_restock']}    退刊合计: {data['total_return']}")
    lines.append("")

    for idx, o in enumerate(data["outlets"], 1):
        lines.append("-" * 60)
        lines.append(f"【{idx}】{o['code']}  {o['name']}")
        lines.append(f"    地址: {o['address']}")
        lines.append(f"    亭主: {o['owner']}  电话: {o['owner_phone']}")
        if o["restocks"]:
            lines.append(f"    >>> 补刊清单 (共{o['restock_total']}本):")
            lines.append(f"    {'序号':<4}{'ISSN':<12}{'刊名':<20}{'期次':<10}{'数量':<6}{'签收':<8}")
            for i, r in enumerate(o["restocks"], 1):
                pub = r["publication_name"][:18] if len(r["publication_name"]) > 18 else r["publication_name"]
                lines.append(f"    {i:<4}{r['issn']:<12}{pub:<20}{r['issue_code']:<10}{r['qty']:<6}{'':<8}")
        if o["returns"]:
            lines.append(f"    >>> 退刊清单 (共{o['return_total']}本):")
            lines.append(f"    {'序号':<4}{'ISSN':<12}{'刊名':<20}{'期次':<10}{'数量':<6}{'签收':<8}")
            for i, r in enumerate(o["returns"], 1):
                pub = r["publication_name"][:18] if len(r["publication_name"]) > 18 else r["publication_name"]
                lines.append(f"    {i:<4}{r['issn']:<12}{pub:<20}{r['issue_code']:<10}{r['qty']:<6}{'':<8}")
        lines.append("")
    lines.append("=" * 60)
    lines.append("司机签字: ______________     日期: ______________")
    text = "\n".join(lines)
    buf = BytesIO(text.encode("utf-8"))
    return StreamingResponse(
        buf,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=配送单_{data['delivery_no']}.txt"}
    )


def _print_html(data: dict):
    outlet_blocks = ""
    for idx, o in enumerate(data["outlets"], 1):
        restock_rows = ""
        if o["restocks"]:
            restock_rows = f"""
            <div class="section-title">📦 补刊清单（共 {o['restock_total']} 本）</div>
            <table class="inner">
            <thead><tr><th>序号</th><th>ISSN</th><th>刊名</th><th>期次</th><th>数量</th><th>签收</th></tr></thead>
            <tbody>
            {''.join(f'''<tr><td>{i}</td><td>{r["issn"]}</td><td>{r["publication_name"]}</td>
            <td>{r["issue_code"]}</td><td>{r["qty"]}</td><td class="sign"></td></tr>'''
            for i, r in enumerate(o["restocks"], 1))}
            </tbody></table>"""
        return_rows = ""
        if o["returns"]:
            return_rows = f"""
            <div class="section-title">↩️ 退刊清单（共 {o['return_total']} 本）</div>
            <table class="inner">
            <thead><tr><th>序号</th><th>ISSN</th><th>刊名</th><th>期次</th><th>数量</th><th>签收</th></tr></thead>
            <tbody>
            {''.join(f'''<tr><td>{i}</td><td>{r["issn"]}</td><td>{r["publication_name"]}</td>
            <td>{r["issue_code"]}</td><td>{r["qty"]}</td><td class="sign"></td></tr>'''
            for i, r in enumerate(o["returns"], 1))}
            </tbody></table>"""
        outlet_blocks += f"""
        <div class="outlet">
        <div class="outlet-header"><span class="num">{idx}</span>
        <span class="code">{o['code']}</span>
        <span class="name">{o['name']}</span></div>
        <div class="meta">地址：{o['address']}　亭主：{o['owner']}（{o['owner_phone']}）</div>
        {restock_rows}
        {return_rows}
        </div>"""

    html = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>配送单 {data['delivery_no']}</title>
<style>
body {{ font-family: "Microsoft YaHei", Arial, sans-serif; margin: 20px; color: #222; }}
h1 {{ text-align: center; margin-bottom: 8px; }}
.header-grid {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 24px;
  border: 2px solid #333; padding: 12px 16px; margin-bottom: 20px; }}
.header-grid div {{ font-size: 15px; }}
.summary {{ text-align: center; font-size: 16px; font-weight: bold;
  padding: 8px; background: #f5f5f5; border: 1px solid #ccc; margin-bottom: 16px; }}
.outlet {{ border: 1.5px solid #444; margin-bottom: 18px; page-break-inside: avoid; }}
.outlet-header {{ background: #e8f0fe; padding: 10px 12px; font-weight: bold;
  border-bottom: 1.5px solid #444; font-size: 16px; }}
.outlet-header .num {{ display: inline-block; width: 32px; height: 32px; line-height: 32px;
  text-align: center; background: #1976d2; color: #fff; border-radius: 50%; margin-right: 10px; }}
.outlet-header .code {{ color: #1976d2; margin-right: 12px; }}
.meta {{ padding: 6px 12px; font-size: 14px; background: #fafafa; border-bottom: 1px solid #ddd; }}
.section-title {{ padding: 8px 12px; font-weight: bold; background: #fff8e1;
  border-bottom: 1px dashed #ccc; font-size: 14px; }}
table.inner {{ width: 100%; border-collapse: collapse; margin: 0; }}
table.inner th, table.inner td {{ border: 1px solid #888; padding: 6px 8px; text-align: center; font-size: 14px; }}
table.inner th {{ background: #f0f0f0; }}
td.sign {{ width: 90px; height: 32px; }}
.signoff {{ border: 2px solid #333; padding: 18px; margin-top: 20px;
  display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
.signoff div {{ font-size: 16px; }}
@media print {{ body {{ margin: 0; }} .outlet {{ margin-bottom: 12px; }} }}
</style></head><body>
<h1>城市书报亭 · 补刊 / 退刊 配送单</h1>
<div class="header-grid">
<div><b>配送单号：</b>{data['delivery_no']}</div>
<div><b>配送线路：</b>{data['route_code']}</div>
<div><b>计划日期：</b>{data['plan_date']}</div>
<div><b>配送司机：</b>{data['driver']}（{data['driver_phone'] or '—'}）</div>
</div>
<div class="summary">
本次合计：网点 <b>{data['outlet_count']}</b> 个　｜　
补刊 <b style="color:#1976d2;">{data['total_restock']}</b> 本　｜　
退刊 <b style="color:#d32f2f;">{data['total_return']}</b> 本
</div>
{outlet_blocks}
<div class="signoff">
<div>司机签字：_________________________</div>
<div>日期：_________________________</div>
</div>
</body></html>"""
    buf = BytesIO(html.encode("utf-8"))
    return StreamingResponse(
        buf,
        media_type="text/html; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=配送单_{data['delivery_no']}.html"}
    )
