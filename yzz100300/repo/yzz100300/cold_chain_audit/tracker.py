"""箱号全链路追踪 + 异常检测。"""

from typing import List, Dict

from .models import ScanRecord, BoxLifecycle, Anomaly


TEMP_THRESHOLD = 8.0
"""超温阈值（摄氏度）。"""

TEMP_JUMP_THRESHOLD = 5.0
"""温度跳变阈值：相邻环节温差超过此值视为异常。"""


def build_lifecycle(records: List[ScanRecord]) -> Dict[str, BoxLifecycle]:
    """将扫码记录按箱号组装成生命周期。

    每个环节只保留最早的一条记录（第一条扫码为有效记录）。
    """
    boxes: Dict[str, BoxLifecycle] = {}

    for rec in records:
        if rec.box_id not in boxes:
            boxes[rec.box_id] = BoxLifecycle(box_id=rec.box_id)

        box = boxes[rec.box_id]

        if rec.scan_type == "outbound":
            if box.outbound is None or rec.scan_time < box.outbound.scan_time:
                box.outbound = rec
        elif rec.scan_type == "arrive":
            if box.arrive is None or rec.scan_time < box.arrive.scan_time:
                box.arrive = rec
        elif rec.scan_type == "return":
            if box.return_ is None or rec.scan_time < box.return_.scan_time:
                box.return_ = rec
        elif rec.scan_type == "clean":
            if box.clean is None or rec.scan_time < box.clean.scan_time:
                box.clean = rec

    return boxes


def detect_anomalies(boxes: Dict[str, BoxLifecycle]) -> List[Anomaly]:
    """检测所有异常。"""
    anomalies: List[Anomaly] = []

    for box_id, box in boxes.items():
        # 1. 缺箱/流程不完整
        if box.outbound and not box.arrive:
            anomalies.append(
                Anomaly(
                    level="error",
                    category="missing_arrive",
                    message="已出库但未到店",
                    box_id=box_id,
                    scan_type="arrive",
                    source_file=box.outbound.source_file,
                    source_line=box.outbound.source_line,
                    raw=box.outbound.raw,
                )
            )

        if box.outbound and not box.return_:
            anomalies.append(
                Anomaly(
                    level="warning",
                    category="missing_return",
                    message="已出库但未回仓",
                    box_id=box_id,
                    scan_type="return",
                    source_file=box.outbound.source_file,
                    source_line=box.outbound.source_line,
                    raw=box.outbound.raw,
                )
            )

        if box.outbound and not box.clean:
            anomalies.append(
                Anomaly(
                    level="warning",
                    category="missing_clean",
                    message="未完成清洗",
                    box_id=box_id,
                    scan_type="clean",
                    source_file=box.outbound.source_file if box.outbound else "",
                    source_line=box.outbound.source_line if box.outbound else 0,
                    raw=box.outbound.raw if box.outbound else {},
                )
            )

        # 2. 门店签收差异
        if box.outbound and box.arrive:
            if box.outbound.store and box.arrive.store:
                if box.outbound.store != box.arrive.store:
                    anomalies.append(
                        Anomaly(
                            level="error",
                            category="store_mismatch",
                            message=f"门店不符：出库='{box.outbound.store}' 到店='{box.arrive.store}'",
                            box_id=box_id,
                            scan_type="arrive",
                            source_file=box.arrive.source_file,
                            source_line=box.arrive.source_line,
                            raw=box.arrive.raw,
                        )
                    )

        # 3. 超温检测
        for rec in (box.outbound, box.arrive, box.return_, box.clean):
            if rec and rec.temperature is not None and rec.temperature > TEMP_THRESHOLD:
                anomalies.append(
                    Anomaly(
                        level="error",
                        category="over_temperature",
                        message=f"超温：{rec.temperature:.1f}℃ (阈值 {TEMP_THRESHOLD}℃)",
                        box_id=box_id,
                        scan_type=rec.scan_type,
                        source_file=rec.source_file,
                        source_line=rec.source_line,
                        raw=rec.raw,
                    )
                )

        # 4. 温度跳变（相邻环节温差过大）
        chain = [box.outbound, box.arrive, box.return_, box.clean]
        chain = [r for r in chain if r is not None and r.temperature is not None]
        for i in range(len(chain) - 1):
            prev, curr = chain[i], chain[i + 1]
            if prev.temperature is not None and curr.temperature is not None:
                diff = abs(curr.temperature - prev.temperature)
                if diff > TEMP_JUMP_THRESHOLD:
                    anomalies.append(
                        Anomaly(
                            level="warning",
                            category="temp_jump",
                            message=(
                                f"温度跳变：{prev.scan_type}={prev.temperature:.1f}℃ → "
                                f"{curr.scan_type}={curr.temperature:.1f}℃ (差 {diff:.1f}℃)"
                            ),
                            box_id=box_id,
                            scan_type=curr.scan_type,
                            source_file=curr.source_file,
                            source_line=curr.source_line,
                            raw=curr.raw,
                        )
                    )

        # 5. 时间顺序异常（例如到店早于出库）
        if box.outbound and box.arrive and box.arrive.scan_time < box.outbound.scan_time:
            anomalies.append(
                Anomaly(
                    level="error",
                    category="time_order",
                    message="时间顺序异常：到店时间早于出库时间",
                    box_id=box_id,
                    scan_type="arrive",
                    source_file=box.arrive.source_file,
                    source_line=box.arrive.source_line,
                    raw=box.arrive.raw,
                )
            )

        if box.arrive and box.return_ and box.return_.scan_time < box.arrive.scan_time:
            anomalies.append(
                Anomaly(
                    level="error",
                    category="time_order",
                    message="时间顺序异常：回仓时间早于到店时间",
                    box_id=box_id,
                    scan_type="return",
                    source_file=box.return_.source_file,
                    source_line=box.return_.source_line,
                    raw=box.return_.raw,
                )
            )

        if box.return_ and box.clean and box.clean.scan_time < box.return_.scan_time:
            anomalies.append(
                Anomaly(
                    level="error",
                    category="time_order",
                    message="时间顺序异常：清洗时间早于回仓时间",
                    box_id=box_id,
                    scan_type="clean",
                    source_file=box.clean.source_file,
                    source_line=box.clean.source_line,
                    raw=box.clean.raw,
                )
            )

    return anomalies
