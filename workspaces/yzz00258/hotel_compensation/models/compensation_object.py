from dataclasses import dataclass, field
from typing import Optional, Dict, Any
from datetime import datetime
import uuid


@dataclass
class CompensationObject:
    business_no: str
    object_status: str
    time_window: str
    rule_version: str
    operator: str
    complaint_type: Optional[str] = None
    hotel_level: Optional[str] = None
    compensation_amount: Optional[float] = None
    materials: Dict[str, bool] = field(default_factory=dict)
    extra: Dict[str, Any] = field(default_factory=dict)

    def validate(self) -> tuple[bool, list[str]]:
        errors = []
        if not self.business_no:
            errors.append("业务编号不能为空")
        if not self.object_status:
            errors.append("对象状态不能为空")
        if not self.time_window:
            errors.append("时间窗口不能为空")
        if not self.rule_version:
            errors.append("规则版本不能为空")
        if not self.operator:
            errors.append("操作人不能为空")
        return len(errors) == 0, errors

    def is_materials_complete(self) -> bool:
        if not self.materials:
            return False
        return all(self.materials.values())

    def missing_materials(self) -> list[str]:
        return [k for k, v in self.materials.items() if not v]
