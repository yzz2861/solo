import os
from datetime import date, timedelta

import pandas as pd


def generate_sample_data(output_dir: str, billing_month: str = "2024-06"):
    os.makedirs(output_dir, exist_ok=True)

    year, month = map(int, billing_month.split("-"))
    reading_date = date(year, month, 30) if month != 2 else date(year, month, 28)
    prev_date = date(year, month - 1, 30) if month > 1 else date(year - 1, 12, 31)

    shops = [
        {"店铺编号": "S001", "店铺名称": "新名咖啡", "面积": 120.5, "楼层": "1F", "状态": "营业"},
        {"店铺编号": "S002", "店铺名称": "优衣库", "面积": 450.0, "楼层": "1F", "状态": "营业"},
        {"店铺编号": "S003", "店铺名称": "海底捞火锅", "面积": 380.0, "楼层": "2F", "状态": "营业"},
        {"店铺编号": "S004", "店铺名称": "小米之家", "面积": 200.0, "楼层": "1F", "状态": "营业"},
        {"店铺编号": "S005", "店铺名称": "屈臣氏", "面积": 180.0, "楼层": "1F", "状态": "营业"},
        {"店铺编号": "S006", "店铺名称": "必胜客", "面积": 250.0, "楼层": "2F", "状态": "营业"},
        {"店铺编号": "S007", "店铺名称": "热风", "面积": 150.0, "楼层": "2F", "状态": "营业"},
        {"店铺编号": "S008", "店铺名称": "撤场店", "面积": 100.0, "楼层": "B1", "状态": "撤场",
         "撤场日期": f"{year}-{month:02d}-15"},
        {"店铺编号": "S009", "店铺名称": "零面积店", "面积": 0, "楼层": "3F", "状态": "营业"},
    ]
    pd.DataFrame(shops).to_excel(os.path.join(output_dir, "店铺面积表.xlsx"), index=False)

    electric_readings = [
        {"表号": "EM-MASTER", "类型": "电", "店铺编号": "", "店铺名称": "总表", "是否总表": "是",
         "抄表日期": reading_date.isoformat(), "上月读数": 98500.0, "当前读数": 105200.0},
        {"表号": "EM-001", "类型": "电", "店铺编号": "S001", "店铺名称": "旧名咖啡",
         "抄表日期": reading_date.isoformat(), "上月读数": 5200.0, "当前读数": 5650.0},
        {"表号": "EM-002", "类型": "电", "店铺编号": "S002", "店铺名称": "优衣库",
         "抄表日期": reading_date.isoformat(), "上月读数": 18500.0, "当前读数": 19800.0},
        {"表号": "EM-003", "类型": "电", "店铺编号": "S003", "店铺名称": "海底捞火锅",
         "抄表日期": reading_date.isoformat(), "上月读数": 22000.0, "当前读数": 23500.0},
        {"表号": "EM-004", "类型": "电", "店铺编号": "S004", "店铺名称": "小米之家",
         "抄表日期": reading_date.isoformat(), "上月读数": 8500.0, "当前读数": 9100.0},
        {"表号": "EM-005", "类型": "电", "店铺编号": "S005", "店铺名称": "屈臣氏",
         "抄表日期": reading_date.isoformat(), "上月读数": 6200.0, "当前读数": 6000.0},
        {"表号": "EM-006", "类型": "电", "店铺编号": "S006", "店铺名称": "必胜客",
         "抄表日期": reading_date.isoformat(), "上月读数": None, "当前读数": 12000.0},
        {"表号": "EM-007", "类型": "电", "店铺编号": "S007", "店铺名称": "热风",
         "抄表日期": reading_date.isoformat(), "上月读数": 4500.0, "当前读数": 4800.0},
        {"表号": "EM-008", "类型": "电", "店铺编号": "S008", "店铺名称": "撤场店",
         "抄表日期": reading_date.isoformat(), "上月读数": 3200.0, "当前读数": 3500.0},
        {"表号": "EM-009", "类型": "电", "店铺编号": "S009", "店铺名称": "零面积店",
         "抄表日期": reading_date.isoformat(), "上月读数": 1500.0, "当前读数": 1600.0},
    ]

    water_readings = [
        {"表号": "WM-MASTER", "类型": "水", "店铺编号": "", "店铺名称": "总表", "是否总表": "是",
         "抄表日期": reading_date.isoformat(), "上月读数": 5200.0, "当前读数": 5800.0},
        {"表号": "WM-001", "类型": "水", "店铺编号": "S001", "店铺名称": "旧名咖啡",
         "抄表日期": reading_date.isoformat(), "上月读数": 85.0, "当前读数": 120.0},
        {"表号": "WM-002", "类型": "水", "店铺编号": "S002", "店铺名称": "优衣库",
         "抄表日期": reading_date.isoformat(), "上月读数": 150.0, "当前读数": 180.0},
        {"表号": "WM-003", "类型": "水", "店铺编号": "S003", "店铺名称": "海底捞火锅",
         "抄表日期": reading_date.isoformat(), "上月读数": 800.0, "当前读数": 950.0},
        {"表号": "WM-004", "类型": "水", "店铺编号": "S004", "店铺名称": "小米之家",
         "抄表日期": reading_date.isoformat(), "上月读数": 30.0, "当前读数": 45.0},
        {"表号": "WM-005", "类型": "水", "店铺编号": "S005", "店铺名称": "屈臣氏",
         "抄表日期": reading_date.isoformat(), "上月读数": 200.0, "当前读数": 230.0},
        {"表号": "WM-006", "类型": "水", "店铺编号": "S006", "店铺名称": "必胜客",
         "抄表日期": reading_date.isoformat(), "上月读数": 450.0, "当前读数": 520.0},
        {"表号": "WM-007", "类型": "水", "店铺编号": "S007", "店铺名称": "热风",
         "抄表日期": reading_date.isoformat(), "上月读数": 60.0, "当前读数": 75.0},
    ]

    all_readings = electric_readings + water_readings
    pd.DataFrame(all_readings).to_excel(os.path.join(output_dir, "读数表.xlsx"), index=False)

    rules = [
        {"规则编号": "R-ELEC-001", "规则名称": "电费分摊规则", "类型": "电", "分摊方式": "面积比例",
         "单价": 1.2, "固定费用": 50.0, "公摊比例": 0.15},
        {"规则编号": "R-WATER-001", "规则名称": "水费分摊规则", "类型": "水", "分摊方式": "面积比例",
         "单价": 4.5, "固定费用": 20.0, "公摊比例": 0.15},
    ]
    pd.DataFrame(rules).to_excel(os.path.join(output_dir, "公摊规则.xlsx"), index=False)

    disputed = [
        {"店铺编号": "S005", "店铺名称": "屈臣氏"},
    ]
    pd.DataFrame(disputed).to_excel(os.path.join(output_dir, "争议店铺.xlsx"), index=False)

    return {
        "readings": os.path.join(output_dir, "读数表.xlsx"),
        "shops": os.path.join(output_dir, "店铺面积表.xlsx"),
        "rules": os.path.join(output_dir, "公摊规则.xlsx"),
        "disputed": os.path.join(output_dir, "争议店铺.xlsx"),
    }
