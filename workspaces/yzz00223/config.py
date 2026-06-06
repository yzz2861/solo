from typing import Dict, List
from models import ThresholdType, MaterialType, GroupDimension


THRESHOLD_CONFIG: Dict[str, Dict[str, float]] = {
    ThresholdType.PM25.value: {
        "upper": 35.0,
        "lower": 0.0,
        "unit": "μg/m³",
        "name": "PM2.5",
    },
    ThresholdType.PM10.value: {
        "upper": 70.0,
        "lower": 0.0,
        "unit": "μg/m³",
        "name": "PM10",
    },
    ThresholdType.NO2.value: {
        "upper": 40.0,
        "lower": 0.0,
        "unit": "μg/m³",
        "name": "二氧化氮",
    },
    ThresholdType.SO2.value: {
        "upper": 50.0,
        "lower": 0.0,
        "unit": "μg/m³",
        "name": "二氧化硫",
    },
    ThresholdType.CO.value: {
        "upper": 4.0,
        "lower": 0.0,
        "unit": "mg/m³",
        "name": "一氧化碳",
    },
    ThresholdType.O3.value: {
        "upper": 100.0,
        "lower": 0.0,
        "unit": "μg/m³",
        "name": "臭氧",
    },
    ThresholdType.TEMPERATURE.value: {
        "upper": 40.0,
        "lower": -10.0,
        "unit": "℃",
        "name": "温度",
    },
    ThresholdType.HUMIDITY.value: {
        "upper": 95.0,
        "lower": 10.0,
        "unit": "%",
        "name": "湿度",
    },
}

REQUIRED_MATERIALS: List[str] = [
    MaterialType.CALIBRATION_CERTIFICATE.value,
    MaterialType.MAINTENANCE_LOG.value,
    MaterialType.FLOW_RATE_RECORD.value,
    MaterialType.STANDARD_GAS_RECORD.value,
    MaterialType.ZERO_SPAN_RECORD.value,
]

MATERIAL_NAMES: Dict[str, str] = {
    MaterialType.CALIBRATION_CERTIFICATE.value: "校准证书",
    MaterialType.MAINTENANCE_LOG.value: "维护日志",
    MaterialType.FLOW_RATE_RECORD.value: "流量记录",
    MaterialType.STANDARD_GAS_RECORD.value: "标气记录",
    MaterialType.ZERO_SPAN_RECORD.value: "零跨记录",
}

CALIBRATION_TYPES: List[str] = [
    "日常巡检",
    "季度校准",
    "年度校准",
    "临时校准",
]

REGIONS: List[str] = [
    "东城区",
    "西城区",
    "朝阳区",
    "海淀区",
    "丰台区",
    "石景山区",
]

DEPARTMENTS: List[str] = [
    "监测一科",
    "监测二科",
    "质量控制科",
    "设备运维科",
]

DEFAULT_TIME_WINDOW_DAYS: int = 7

TIME_WINDOW_LABELS: Dict[str, str] = {
    "daily": "按日统计",
    "weekly": "按周统计",
    "monthly": "按月统计",
}

GROUP_DIMENSION_LABELS: Dict[str, str] = {
    GroupDimension.STATION.value: "按站点分组",
    GroupDimension.REGION.value: "按区域分组",
    GroupDimension.DEPARTMENT.value: "按部门分组",
    GroupDimension.CALIBRATION_TYPE.value: "按校准类型分组",
    GroupDimension.STATUS.value: "按状态分组",
}

STATUS_LABELS: Dict[str, str] = {
    "compliant": "合规",
    "over_threshold": "超阈值",
    "missing_material": "材料缺失",
    "pending_review": "待审核",
    "closed_loop": "已闭环",
}
