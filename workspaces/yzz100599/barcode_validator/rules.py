import json
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class CheckDigitRule:
    algorithm: str
    position: int = -1

    def __post_init__(self):
        if self.algorithm not in ("mod10", "mod11", "none"):
            raise ValueError(f"unsupported check_digit algorithm: {self.algorithm}")


@dataclass
class DateFieldRule:
    start: int
    end: int
    format: str = "%y%m%d"


@dataclass
class SupplierRule:
    code: str
    name: str
    prefix: str = ""
    length: int = 0
    length_range: tuple = ()
    check_digit: Optional[CheckDigitRule] = None
    batch_date: Optional[DateFieldRule] = None
    production_date: Optional[DateFieldRule] = None
    sample_ratio: float = 1.0


def load_rules(path: str) -> dict[str, SupplierRule]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    rules = {}
    for code, spec in data.get("suppliers", {}).items():
        cd_spec = spec.get("check_digit")
        check_digit = None
        if cd_spec and cd_spec.get("algorithm", "none") != "none":
            check_digit = CheckDigitRule(
                algorithm=cd_spec["algorithm"],
                position=cd_spec.get("position", -1),
            )

        bd_spec = spec.get("batch_date")
        batch_date = None
        if bd_spec:
            batch_date = DateFieldRule(
                start=bd_spec["start"],
                end=bd_spec["end"],
                format=bd_spec.get("format", "%y%m%d"),
            )

        pd_spec = spec.get("production_date")
        production_date = None
        if pd_spec:
            production_date = DateFieldRule(
                start=pd_spec["start"],
                end=pd_spec["end"],
                format=pd_spec.get("format", "%y%m%d"),
            )

        length = spec.get("length", 0)
        length_range = tuple(spec.get("length_range", ()))

        rules[code] = SupplierRule(
            code=code,
            name=spec.get("name", code),
            prefix=spec.get("prefix", ""),
            length=length,
            length_range=length_range,
            check_digit=check_digit,
            batch_date=batch_date,
            production_date=production_date,
            sample_ratio=spec.get("sample_ratio", 1.0),
        )

    return rules
