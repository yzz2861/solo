"""生成测试数据，用于验证冷链药箱交接管理系统"""
import csv
import json
import os
from datetime import datetime, timedelta
import random


def generate_inventory(filepath: str):
    boxes = [
        {"药箱编号": "CC-001", "类型": "便携式冷藏箱", "存放位置": "药房A区-01", "备注": ""},
        {"药箱编号": "CC-002", "类型": "便携式冷藏箱", "存放位置": "药房A区-02", "备注": ""},
        {"药箱编号": "CC-003", "类型": "大容量冷藏箱", "存放位置": "药房A区-03", "备注": ""},
        {"药箱编号": "CC-004", "类型": "便携式冷藏箱", "存放位置": "药房B区-01", "备注": "待校准"},
        {"药箱编号": "CC-005", "类型": "便携式冷藏箱", "存放位置": "药房B区-02", "备注": ""},
        {"药箱编号": "CC-006", "类型": "大容量冷藏箱", "存放位置": "药房B区-03", "备注": ""},
        {"药箱编号": "CC-007", "类型": "便携式冷藏箱", "存放位置": "药房C区-01", "备注": ""},
        {"药箱编号": "CC-008", "类型": "便携式冷藏箱", "存放位置": "药房C区-02", "备注": ""},
    ]
    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["药箱编号", "类型", "存放位置", "备注"])
        writer.writeheader()
        writer.writerows(boxes)
    print(f"已生成台账: {filepath} ({len(boxes)}条)")


def generate_borrow_records(filepath: str):
    base = datetime(2026, 6, 9, 7, 30)
    records = [
        {"药箱编号": "CC-001", "借出时间": (base + timedelta(minutes=0)).strftime("%Y-%m-%d %H:%M:%S"),
         "借出人": "张医生", "药品名称": "胰岛素注射液", "药品批号": "B20260501", "用途": "病房用药"},
        {"药箱编号": "CC-002", "借出时间": (base + timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M:%S"),
         "借出人": "李护士", "药品名称": "生长激素", "药品批号": "B20260415", "用途": "门诊发药"},
        {"药箱编号": "CC-003", "借出时间": (base + timedelta(minutes=30)).strftime("%Y-%m-%d %H:%M:%S"),
         "借出人": "王医生", "药品名称": "干扰素", "药品批号": "", "用途": "手术室"},
        {"药箱编号": "CC-004", "借出时间": (base + timedelta(minutes=45)).strftime("%Y-%m-%d %H:%M:%S"),
         "借出人": "赵护士", "药品名称": "疫苗", "药品批号": "B20260601", "用途": "预防接种"},
        {"药箱编号": "CC-005", "借出时间": (base + timedelta(minutes=60)).strftime("%Y-%m-%d %H:%M:%S"),
         "借出人": "孙医生", "药品名称": "胰岛素注射液", "药品批号": "B20260502", "用途": "急诊"},
    ]
    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["药箱编号", "借出时间", "借出人", "药品名称", "药品批号", "用途"])
        writer.writeheader()
        writer.writerows(records)
    print(f"已生成借出记录: {filepath} ({len(records)}条)")


def _gen_temp_points(start: datetime, duration_min: int, normal_range=(2, 8), overtemp=False) -> list:
    points = []
    n = duration_min // 5
    for i in range(n):
        t = start + timedelta(minutes=i * 5)
        if overtemp and i > n // 2:
            temp = round(random.uniform(8.5, 12.0), 2)
        else:
            temp = round(random.uniform(normal_range[0], normal_range[1]), 2)
        points.append({"时间": t.strftime("%Y-%m-%d %H:%M:%S"), "温度": temp})
    return points


def generate_return_records(filepath: str):
    base_return = datetime(2026, 6, 9, 17, 0)
    records = []

    boxes_data = [
        {"box_id": "CC-001", "returner": "张医生", "overtemp": False, "offset": 0, "duration": 180},
        {"box_id": "CC-002", "returner": "李护士", "overtemp": False, "offset": 20, "duration": 200},
        {"box_id": "CC-003", "returner": "刘护士", "overtemp": True, "offset": 40, "duration": 240},
        {"box_id": "CC-004", "returner": "赵护士", "overtemp": False, "offset": 60, "duration": 150},
        {"box_id": "CC-006", "returner": "周医生", "overtemp": True, "offset": 90, "duration": 210},
    ]

    for bd in boxes_data:
        return_time = base_return + timedelta(minutes=bd["offset"])
        start_temp = return_time - timedelta(minutes=bd["duration"])
        record = {
            "药箱编号": bd["box_id"],
            "回收时间": return_time.strftime("%Y-%m-%d %H:%M:%S"),
            "回收人": bd["returner"],
            "温度曲线": _gen_temp_points(start_temp, bd["duration"], overtemp=bd["overtemp"]),
            "备注": "晚班回收补录" if bd["box_id"] in ["CC-003", "CC-006"] else ""
        }
        records.append(record)

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f"已生成回收温度记录: {filepath} ({len(records)}条)")


if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "sample_data")
    os.makedirs(out_dir, exist_ok=True)

    generate_inventory(os.path.join(out_dir, "inventory.csv"))
    generate_borrow_records(os.path.join(out_dir, "borrow_records.csv"))
    generate_return_records(os.path.join(out_dir, "return_temperatures.json"))

    print("\n测试数据生成完毕！")
    print(f"数据目录: {out_dir}")
