import random
from datetime import datetime, timedelta
from typing import List, Dict, Tuple

from models import (
    CalibrationRecord,
    ResponsibilityMapping,
    MaterialType,
    ThresholdType,
)
from config import (
    THRESHOLD_CONFIG,
    REQUIRED_MATERIALS,
    CALIBRATION_TYPES,
    REGIONS,
    DEPARTMENTS,
)


STATION_DATA = [
    {"id": "ST001", "name": "东城区第一小学微站", "region": "东城区", "dept": "监测一科"},
    {"id": "ST002", "name": "东城区文化馆微站", "region": "东城区", "dept": "监测二科"},
    {"id": "ST003", "name": "西城区图书馆微站", "region": "西城区", "dept": "质量控制科"},
    {"id": "ST004", "name": "西城区少年宫微站", "region": "西城区", "dept": "设备运维科"},
    {"id": "ST005", "name": "朝阳区博物馆微站", "region": "朝阳区", "dept": "监测一科"},
    {"id": "ST006", "name": "朝阳区体育馆微站", "region": "朝阳区", "dept": "监测二科"},
    {"id": "ST007", "name": "海淀区科技馆微站", "region": "海淀区", "dept": "质量控制科"},
    {"id": "ST008", "name": "海淀区美术馆微站", "region": "海淀区", "dept": "设备运维科"},
    {"id": "ST009", "name": "丰台区文化中心微站", "region": "丰台区", "dept": "监测一科"},
    {"id": "ST010", "name": "石景山区图书馆微站", "region": "石景山区", "dept": "监测二科"},
]

RESPONSIBLE_PERSONS = [
    "张三", "李四", "王五", "赵六", "钱七",
    "孙八", "周九", "吴十", "郑十一", "王十二",
]

OPERATORS = ["李工", "王工", "张工", "刘工", "陈工"]


def generate_responsibility_map() -> Dict[str, ResponsibilityMapping]:
    mapping = {}
    base_date = datetime(2026, 1, 1)
    for i, station in enumerate(STATION_DATA):
        last_date = base_date + timedelta(days=random.randint(0, 90))
        cycle_days = random.choice([30, 60, 90, 180])
        next_date = last_date + timedelta(days=cycle_days)
        mapping[station["id"]] = ResponsibilityMapping(
            station_id=station["id"],
            station_name=station["name"],
            region=station["region"],
            department=station["dept"],
            responsible_person=RESPONSIBLE_PERSONS[i % len(RESPONSIBLE_PERSONS)],
            phone=f"138{random.randint(10000000, 99999999)}",
            calibration_cycle_days=cycle_days,
            last_calibration_date=last_date,
            next_calibration_date=next_date,
        )
    return mapping


def generate_compliant_samples(
    count: int = 10,
    time_start: datetime = None,
    time_end: datetime = None,
) -> List[CalibrationRecord]:
    records = []
    if time_start is None:
        time_start = datetime(2026, 5, 1)
    if time_end is None:
        time_end = datetime(2026, 5, 31)

    for i in range(count):
        station = random.choice(STATION_DATA)
        days_offset = random.randint(0, (time_end - time_start).days)
        cal_date = time_start + timedelta(days=days_offset)

        parameters = {}
        for param_key, config in THRESHOLD_CONFIG.items():
            lower = config["lower"]
            upper = config["upper"]
            mid = (lower + upper) / 2
            spread = (upper - lower) * 0.3
            value = random.uniform(mid - spread, mid + spread)
            parameters[param_key] = round(value, 2)

        materials = {mat: True for mat in REQUIRED_MATERIALS}

        record = CalibrationRecord(
            record_id=f"REC-C-{i+1:04d}",
            station_id=station["id"],
            station_name=station["name"],
            region=station["region"],
            department=station["dept"],
            calibration_type=random.choice(CALIBRATION_TYPES),
            calibration_date=cal_date,
            operator=random.choice(OPERATORS),
            parameters=parameters,
            materials=materials,
        )
        records.append(record)
    return records


def generate_over_threshold_samples(
    count: int = 5,
    time_start: datetime = None,
    time_end: datetime = None,
) -> List[CalibrationRecord]:
    records = []
    if time_start is None:
        time_start = datetime(2026, 5, 1)
    if time_end is None:
        time_end = datetime(2026, 5, 31)

    for i in range(count):
        station = random.choice(STATION_DATA)
        days_offset = random.randint(0, (time_end - time_start).days)
        cal_date = time_start + timedelta(days=days_offset)

        parameters = {}
        for param_key, config in THRESHOLD_CONFIG.items():
            lower = config["lower"]
            upper = config["upper"]
            mid = (lower + upper) / 2
            spread = (upper - lower) * 0.3
            value = random.uniform(mid - spread, mid + spread)
            parameters[param_key] = round(value, 2)

        num_over = random.randint(1, 3)
        over_params = random.sample(list(THRESHOLD_CONFIG.keys()), num_over)
        for param_key in over_params:
            config = THRESHOLD_CONFIG[param_key]
            upper = config["upper"]
            exceed_factor = random.uniform(1.1, 2.0)
            parameters[param_key] = round(upper * exceed_factor, 2)

        materials = {mat: True for mat in REQUIRED_MATERIALS}

        record = CalibrationRecord(
            record_id=f"REC-O-{i+1:04d}",
            station_id=station["id"],
            station_name=station["name"],
            region=station["region"],
            department=station["dept"],
            calibration_type=random.choice(CALIBRATION_TYPES),
            calibration_date=cal_date,
            operator=random.choice(OPERATORS),
            parameters=parameters,
            materials=materials,
        )
        records.append(record)
    return records


def generate_missing_material_samples(
    count: int = 3,
    time_start: datetime = None,
    time_end: datetime = None,
) -> List[CalibrationRecord]:
    records = []
    if time_start is None:
        time_start = datetime(2026, 5, 1)
    if time_end is None:
        time_end = datetime(2026, 5, 31)

    for i in range(count):
        station = random.choice(STATION_DATA)
        days_offset = random.randint(0, (time_end - time_start).days)
        cal_date = time_start + timedelta(days=days_offset)

        parameters = {}
        for param_key, config in THRESHOLD_CONFIG.items():
            lower = config["lower"]
            upper = config["upper"]
            mid = (lower + upper) / 2
            spread = (upper - lower) * 0.3
            value = random.uniform(mid - spread, mid + spread)
            parameters[param_key] = round(value, 2)

        materials = {mat: True for mat in REQUIRED_MATERIALS}
        num_missing = random.randint(1, 3)
        missing_mats = random.sample(REQUIRED_MATERIALS, num_missing)
        for mat in missing_mats:
            materials[mat] = False

        record = CalibrationRecord(
            record_id=f"REC-M-{i+1:04d}",
            station_id=station["id"],
            station_name=station["name"],
            region=station["region"],
            department=station["dept"],
            calibration_type=random.choice(CALIBRATION_TYPES),
            calibration_date=cal_date,
            operator=random.choice(OPERATORS),
            parameters=parameters,
            materials=materials,
        )
        records.append(record)
    return records


def generate_mixed_samples(
    count: int = 2,
    time_start: datetime = None,
    time_end: datetime = None,
) -> List[CalibrationRecord]:
    records = []
    if time_start is None:
        time_start = datetime(2026, 5, 1)
    if time_end is None:
        time_end = datetime(2026, 5, 31)

    for i in range(count):
        station = random.choice(STATION_DATA)
        days_offset = random.randint(0, (time_end - time_start).days)
        cal_date = time_start + timedelta(days=days_offset)

        parameters = {}
        for param_key, config in THRESHOLD_CONFIG.items():
            lower = config["lower"]
            upper = config["upper"]
            mid = (lower + upper) / 2
            spread = (upper - lower) * 0.3
            value = random.uniform(mid - spread, mid + spread)
            parameters[param_key] = round(value, 2)

        num_over = random.randint(1, 2)
        over_params = random.sample(list(THRESHOLD_CONFIG.keys()), num_over)
        for param_key in over_params:
            config = THRESHOLD_CONFIG[param_key]
            upper = config["upper"]
            exceed_factor = random.uniform(1.15, 1.8)
            parameters[param_key] = round(upper * exceed_factor, 2)

        materials = {mat: True for mat in REQUIRED_MATERIALS}
        num_missing = random.randint(1, 2)
        missing_mats = random.sample(REQUIRED_MATERIALS, num_missing)
        for mat in missing_mats:
            materials[mat] = False

        record = CalibrationRecord(
            record_id=f"REC-X-{i+1:04d}",
            station_id=station["id"],
            station_name=station["name"],
            region=station["region"],
            department=station["dept"],
            calibration_type=random.choice(CALIBRATION_TYPES),
            calibration_date=cal_date,
            operator=random.choice(OPERATORS),
            parameters=parameters,
            materials=materials,
        )
        records.append(record)
    return records


def generate_historical_replay_samples() -> List[Dict]:
    replay_scenarios = []

    replay_scenarios.append({
        "scenario_name": "超阈值整改闭环",
        "record_id": "REC-R-0001",
        "steps": [
            {
                "timestamp": "2026-05-01 09:00:00",
                "initial_status": "over_threshold",
                "reason": "PM2.5浓度超过上限阈值",
                "operator": "系统自动检测",
            },
            {
                "timestamp": "2026-05-02 14:30:00",
                "action": "close_loop",
                "reason": "设备检修完成，重新校准后数据恢复正常",
                "operator": "张工",
            },
        ],
    })

    replay_scenarios.append({
        "scenario_name": "材料缺失补齐闭环",
        "record_id": "REC-R-0002",
        "steps": [
            {
                "timestamp": "2026-05-05 10:00:00",
                "initial_status": "missing_material",
                "reason": "缺少校准证书和流量记录",
                "operator": "系统自动检测",
            },
            {
                "timestamp": "2026-05-07 16:00:00",
                "action": "close_loop",
                "reason": "已补齐全部缺失材料并通过审核",
                "operator": "李工",
            },
        ],
    })

    replay_scenarios.append({
        "scenario_name": "混合问题多次处理",
        "record_id": "REC-R-0003",
        "steps": [
            {
                "timestamp": "2026-05-10 08:00:00",
                "initial_status": "pending_review",
                "reason": "存在超阈值且材料缺失",
                "operator": "系统自动检测",
            },
            {
                "timestamp": "2026-05-12 11:00:00",
                "action": "close_loop",
                "reason": "设备校准完成，材料已补齐，审核通过",
                "operator": "王工",
            },
        ],
    })

    return replay_scenarios


def generate_all_samples(
    time_start: datetime = None,
    time_end: datetime = None,
) -> Tuple[List[CalibrationRecord], Dict[str, ResponsibilityMapping], List[Dict]]:
    if time_start is None:
        time_start = datetime(2026, 5, 1)
    if time_end is None:
        time_end = datetime(2026, 5, 31)

    records = []
    records.extend(generate_compliant_samples(10, time_start, time_end))
    records.extend(generate_over_threshold_samples(5, time_start, time_end))
    records.extend(generate_missing_material_samples(3, time_start, time_end))
    records.extend(generate_mixed_samples(2, time_start, time_end))

    records.sort(key=lambda r: r.calibration_date)

    resp_map = generate_responsibility_map()
    replay_samples = generate_historical_replay_samples()

    return records, resp_map, replay_samples
