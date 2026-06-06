#!/usr/bin/env python3

import sys
import json
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.api import inspection_api, create_batch_inspection_inputs
from app.services import process_single_inspection
from app.models import generate_audit_number
from app.utils import get_logger


def run_demo():
    logger = get_logger("main")
    logger.print_banner("风机叶片缺陷巡检API - 演示程序")

    from datetime import datetime, timedelta

    today = datetime.now()
    recent_date = (today - timedelta(days=5)).strftime("%Y-%m-%d")
    old_date = (today - timedelta(days=60)).strftime("%Y-%m-%d")

    demo_records = [
        {
            "master_data": {
                "blade_id": "BLD-2024001",
                "turbine_id": "WT-001",
                "wind_farm_id": "WF-A",
                "blade_model": "BM-59.5",
                "manufacture_date": "2020-03-15",
                "install_date": "2020-06-20",
                "design_life_years": 20,
                "length_meters": 59.5,
                "manufacturer": "中材科技",
            },
            "application": {
                "application_id": "APP-20260601-A001",
                "blade_id": "BLD-2024001",
                "applicant": "张工",
                "application_date": recent_date,
                "inspection_type": "routine",
                "defect_type": "crack",
                "defect_description": "叶片前缘发现裂纹",
                "defect_location": "距叶根15米处前缘",
                "defect_size_mm": 15.0,
                "defect_depth_mm": 2.0,
            },
            "evidence_list": [
                {
                    "evidence_id": "EVD-001",
                    "application_id": "APP-20260601-A001",
                    "material_type": "photo",
                    "file_path": "/data/photos/crack_001.jpg",
                    "upload_time": "2026-06-01 10:30:00",
                    "file_size_bytes": 2048000,
                    "description": "裂纹正面照片",
                },
                {
                    "evidence_id": "EVD-002",
                    "application_id": "APP-20260601-A001",
                    "material_type": "report",
                    "file_path": "/data/reports/report_001.pdf",
                    "upload_time": "2026-06-01 10:35:00",
                    "file_size_bytes": 1024000,
                    "description": "初检报告",
                },
            ],
            "history_list": [],
        },
        {
            "master_data": {
                "blade_id": "BLD-2024002",
                "turbine_id": "WT-002",
                "wind_farm_id": "WF-A",
                "blade_model": "BM-59.5",
                "manufacture_date": "2020-03-15",
                "install_date": "2020-07-10",
                "design_life_years": 20,
                "length_meters": 59.5,
                "manufacturer": "中材科技",
            },
            "application": {
                "application_id": "APP-20260602-A002",
                "blade_id": "BLD-2024002",
                "applicant": "李工",
                "application_date": recent_date,
                "inspection_type": "special",
                "defect_type": "crack",
                "defect_description": "叶片后缘严重裂纹",
                "defect_location": "距叶根30米处后缘",
                "defect_size_mm": 80.0,
                "defect_depth_mm": 8.0,
            },
            "evidence_list": [
                {
                    "evidence_id": "EVD-003",
                    "application_id": "APP-20260602-A002",
                    "material_type": "photo",
                    "file_path": "/data/photos/crack_002.jpg",
                    "upload_time": "2026-06-02 14:20:00",
                    "file_size_bytes": 3072000,
                    "description": "严重裂纹照片",
                },
                {
                    "evidence_id": "EVD-004",
                    "application_id": "APP-20260602-A002",
                    "material_type": "report",
                    "file_path": "/data/reports/report_002.pdf",
                    "upload_time": "2026-06-02 14:25:00",
                    "file_size_bytes": 1536000,
                    "description": "专项检测报告",
                },
            ],
            "history_list": [],
        },
        {
            "master_data": {
                "blade_id": "BLD-2024003",
                "turbine_id": "WT-003",
                "wind_farm_id": "WF-B",
                "blade_model": "BM-45.0",
                "manufacture_date": "2019-08-20",
                "install_date": "2019-11-15",
                "design_life_years": 20,
                "length_meters": 45.0,
                "manufacturer": "时代新材",
            },
            "application": {
                "application_id": "APP-20260401-A003",
                "blade_id": "BLD-2024003",
                "applicant": "王工",
                "application_date": old_date,
                "inspection_type": "routine",
                "defect_type": "paint_peeling",
                "defect_description": "表面漆层脱落",
                "defect_location": "叶尖部位",
                "defect_size_mm": 30.0,
                "defect_depth_mm": 0.1,
            },
            "evidence_list": [
                {
                    "evidence_id": "EVD-005",
                    "application_id": "APP-20260401-A003",
                    "material_type": "photo",
                    "file_path": "/data/photos/peel_001.jpg",
                    "upload_time": "2026-04-01 09:00:00",
                    "file_size_bytes": 1024000,
                    "description": "漆层脱落照片",
                },
            ],
            "history_list": [],
        },
    ]

    inputs = create_batch_inspection_inputs(demo_records)
    result = inspection_api.inspect_batch(inputs, save_files=False)

    print()
    print("=" * 60)
    print("  输出字段说明")
    print("=" * 60)
    print("  - audit_number:    审计编号（唯一标识）")
    print("  - business_conclusion: 业务结论 (pass/review_required/reject/pending)")
    print("  - risk_label:      风险标签 (high_risk/medium_risk/low_risk/no_risk/missing_material)")
    print("  - next_action:     下一步动作 (direct_pass/enter_review/supplement_material/...)")
    print("  - review_required: 是否需要复核")
    print()

    review_entry = inspection_api.get_review_entry()
    print("=" * 60)
    print("  复核入口信息")
    print("=" * 60)
    print(json.dumps(review_entry["data"], ensure_ascii=False, indent=2))
    print()

    return result


if __name__ == "__main__":
    run_demo()
