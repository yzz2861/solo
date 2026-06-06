from typing import List, Any, Optional
from datetime import datetime, date
from .models import SourceRecord, PrecoolRecord, ValidationResult, generate_record_id
from .mapper import FieldMapper


VALID_PRODUCT_TYPES = {"水果", "蔬菜", "Fruit", "Vegetable", "fruit", "vegetable"}
VALID_UNITS = {"kg", "箱", "件", "吨", "KG", "Kg", "T", "t"}
PRODUCT_TYPE_PRECOOL_HOURS = {
    "水果": 12.0,
    "蔬菜": 8.0,
    "fruit": 12.0,
    "vegetable": 8.0,
    "Fruit": 12.0,
    "Vegetable": 8.0,
}


class DataValidator:
    def __init__(self, mapper: FieldMapper, batch_id: str):
        self.mapper = mapper
        self.batch_id = batch_id

    def validate(self, sources: List[SourceRecord]) -> ValidationResult:
        result = ValidationResult()
        for src in sources:
            record = self._validate_one(src)
            if record.errors:
                record.status = "exception"
                result.exceptions.append(record)
            else:
                record.status = "pending"
                result.passed.append(record)
        return result

    def _validate_one(self, src: SourceRecord) -> PrecoolRecord:
        mapped = self.mapper.map_record(src)
        errors: List[str] = []
        row_hash = src.compute_row_hash()
        record_id = generate_record_id(self.batch_id, row_hash)

        product_name = mapped.get("product_name")
        if not product_name or not str(product_name).strip():
            errors.append("缺少产品名称(product_name)")

        product_type = mapped.get("product_type")
        if not product_type:
            errors.append("缺少产品类型(product_type)")
        elif str(product_type).strip() not in VALID_PRODUCT_TYPES:
            errors.append(f"无效的产品类型: {product_type}，有效值: {', '.join(sorted(VALID_PRODUCT_TYPES))}")

        quantity_val = mapped.get("quantity")
        quantity = 0.0
        if quantity_val is None or str(quantity_val).strip() == "":
            errors.append("缺少数量(quantity)")
        else:
            try:
                quantity = float(quantity_val)
                if quantity <= 0:
                    errors.append(f"数量必须大于0，当前值: {quantity}")
            except (ValueError, TypeError):
                errors.append(f"数量格式无效: {quantity_val}")

        unit = mapped.get("unit")
        if not unit:
            errors.append("缺少单位(unit)")
        elif str(unit).strip() not in VALID_UNITS:
            errors.append(f"无效的单位: {unit}，有效值: {', '.join(sorted(VALID_UNITS))}")

        inbound_date_val = mapped.get("inbound_date")
        inbound_date = None
        if not inbound_date_val:
            errors.append("缺少入库日期(inbound_date)")
        else:
            inbound_date = self._parse_date(str(inbound_date_val).strip())
            if inbound_date is None:
                errors.append(f"入库日期格式无效: {inbound_date_val}，支持 YYYY-MM-DD / YYYY/MM/DD")

        target_temp_val = mapped.get("target_temp")
        target_temp = 0.0
        if target_temp_val is None or str(target_temp_val).strip() == "":
            errors.append("缺少目标温度(target_temp)")
        else:
            try:
                target_temp = float(target_temp_val)
            except (ValueError, TypeError):
                errors.append(f"目标温度格式无效: {target_temp_val}")

        current_temp_val = mapped.get("current_temp")
        current_temp = 25.0
        if current_temp_val is None or str(current_temp_val).strip() == "":
            errors.append("缺少当前温度(current_temp)")
        else:
            try:
                current_temp = float(current_temp_val)
            except (ValueError, TypeError):
                errors.append(f"当前温度格式无效: {current_temp_val}")

        precool_hours = self._estimate_precool_hours(product_type, quantity, current_temp, target_temp) if product_type else 0.0

        review_required = False
        review_reason = ""
        if not errors:
            if current_temp - target_temp > 20:
                review_required = True
                review_reason = "温差超过20℃，需人工确认预冷方案"
            if quantity > 5000:
                review_required = True
                reason = "单批次数量超过5000，需人工确认库房分配"
                review_reason = f"{review_reason}; {reason}" if review_reason else reason

        precool_start = datetime.combine(inbound_date, datetime.min.time()) if inbound_date else datetime.now()
        from datetime import timedelta
        precool_end = precool_start + timedelta(hours=precool_hours) if precool_hours else precool_start

        room = self._assign_room(product_type, row_hash) if product_type else ""

        record = PrecoolRecord(
            record_id=record_id,
            batch_id=self.batch_id,
            source_file=src.source_file,
            row_number=src.row_number,
            source_row_hash=row_hash,
            product_name=str(product_name).strip() if product_name else "",
            product_type=str(product_type).strip() if product_type else "",
            quantity=quantity,
            unit=str(unit).strip() if unit else "",
            inbound_date=inbound_date or date.today(),
            target_temp=target_temp,
            current_temp=current_temp,
            precool_hours=round(precool_hours, 2),
            precool_start=precool_start,
            precool_end=precool_end,
            precool_room=room,
            status="pending",
            review_required=review_required,
            review_reason=review_reason,
            errors=errors,
        )
        return record

    @staticmethod
    def _parse_date(value: str) -> Optional[date]:
        fmts = ["%Y-%m-%d", "%Y/%m/%d", "%Y%m%d", "%m/%d/%Y"]
        for fmt in fmts:
            try:
                return datetime.strptime(value, fmt).date()
            except ValueError:
                continue
        return None

    @staticmethod
    def _estimate_precool_hours(product_type: str, quantity: float, current_temp: float, target_temp: float) -> float:
        base = PRODUCT_TYPE_PRECOOL_HOURS.get(str(product_type).strip(), 10.0)
        delta = max(0, current_temp - target_temp)
        temp_factor = delta / 10.0
        qty_factor = max(1.0, quantity / 1000.0)
        return round(base * (1.0 + temp_factor * 0.3) * qty_factor, 2)

    @staticmethod
    def _assign_room(product_type: str, row_hash: str) -> str:
        rooms = ["A-01", "A-02", "B-01", "B-02", "C-01"]
        idx = int(row_hash, 16) % len(rooms)
        prefix_map = {"水果": "A", "蔬菜": "B", "fruit": "A", "vegetable": "B", "Fruit": "A", "Vegetable": "B"}
        prefix = prefix_map.get(str(product_type).strip(), "C")
        return f"{prefix}-{idx + 1:02d}"
