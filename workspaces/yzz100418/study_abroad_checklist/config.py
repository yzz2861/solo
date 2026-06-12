import os
import yaml
from datetime import datetime
from typing import List, Optional

from .models import SchoolRequirement


def load_school_requirements(yaml_path: str) -> List[SchoolRequirement]:
    if not os.path.exists(yaml_path):
        raise FileNotFoundError(f"学校要求表不存在: {yaml_path}")

    with open(yaml_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    schools = []
    for item in data.get("schools", []):
        deadline_str = item.get("deadline", "")
        deadline = _parse_date(deadline_str)

        schools.append(
            SchoolRequirement(
                school_name=item.get("school_name", ""),
                program=item.get("program", ""),
                deadline=deadline,
                required_materials=item.get("required_materials", []),
                essay_prompts=item.get("essay_prompts", []),
                notes=item.get("notes", ""),
                internal_notes=item.get("internal_notes", ""),
            )
        )

    return schools


def _parse_date(date_str: str) -> datetime.date:
    formats = ["%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y", "%d/%m/%Y"]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"无法解析日期: {date_str}")


def find_student_requirements(student_dir: str) -> Optional[str]:
    candidates = [
        os.path.join(student_dir, "schools.yaml"),
        os.path.join(student_dir, "schools.yml"),
        os.path.join(student_dir, "requirements.yaml"),
        os.path.join(student_dir, "requirements.yml"),
        os.path.join(student_dir, "学校要求.yaml"),
        os.path.join(student_dir, "申请清单.yaml"),
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path
    return None
