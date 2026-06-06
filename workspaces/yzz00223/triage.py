from typing import List, Dict, Tuple
from datetime import datetime, timedelta
from models import (
    CalibrationRecord,
    CalibrationStatus,
    ValidationResult,
    ResponsibilityMapping,
)


class TriageManager:
    def __init__(
        self,
        validation_results: Dict[str, ValidationResult],
        responsibility_map: Dict[str, ResponsibilityMapping],
    ):
        self.validation_results = validation_results
        self.responsibility_map = responsibility_map
        self.closed_loop_records: Dict[str, Dict] = {}
        self.history: Dict[str, List[Dict]] = {}

    def triage_by_status(self) -> Dict[str, List[ValidationResult]]:
        groups = {
            CalibrationStatus.COMPLIANT.value: [],
            CalibrationStatus.OVER_THRESHOLD.value: [],
            CalibrationStatus.MISSING_MATERIAL.value: [],
            CalibrationStatus.PENDING_REVIEW.value: [],
            CalibrationStatus.CLOSED_LOOP.value: [],
        }
        for result in self.validation_results.values():
            if result.record_id in self.closed_loop_records:
                groups[CalibrationStatus.CLOSED_LOOP.value].append(result)
            else:
                groups[result.status.value].append(result)
        return groups

    def get_abnormal_samples(self, limit: int = 20) -> List[Dict]:
        abnormal = []
        for result in self.validation_results.values():
            if result.status != CalibrationStatus.COMPLIANT:
                resp = self.responsibility_map.get(result.station_id)
                abnormal.append({
                    "record_id": result.record_id,
                    "station_id": result.station_id,
                    "station_name": resp.station_name if resp else "未知",
                    "status": result.status.value,
                    "status_label": self._status_label(result.status.value),
                    "reasons": result.reasons,
                    "threshold_hits": [
                        {
                            "parameter": h.parameter,
                            "measured_value": h.measured_value,
                            "threshold_value": h.threshold_value,
                            "unit": h.unit,
                            "exceed_ratio": h.exceed_ratio,
                        }
                        for h in result.threshold_hits
                    ],
                    "missing_materials": result.missing_materials,
                    "responsible_person": resp.responsible_person if resp else "未分配",
                    "phone": resp.phone if resp else "",
                    "time_explanation": result.time_window_explanation,
                    "dimension_explanation": result.dimension_explanation,
                })
        abnormal.sort(key=lambda x: (x["status"], len(x["reasons"])), reverse=True)
        return abnormal[:limit]

    def get_reminder_list(self) -> List[Dict]:
        reminders = []
        for result in self.validation_results.values():
            if result.status == CalibrationStatus.COMPLIANT:
                continue
            if result.record_id in self.closed_loop_records:
                continue
            resp = self.responsibility_map.get(result.station_id)
            reminders.append({
                "record_id": result.record_id,
                "station_id": result.station_id,
                "station_name": resp.station_name if resp else "未知",
                "responsible_person": resp.responsible_person if resp else "未分配",
                "phone": resp.phone if resp else "",
                "status": result.status.value,
                "status_label": self._status_label(result.status.value),
                "reasons": result.reasons,
                "action_required": self._get_action_required(result),
                "deadline": self._calculate_deadline(result),
            })
        return reminders

    def close_loop(self, record_id: str, resolution: str, closed_by: str) -> bool:
        if record_id not in self.validation_results:
            return False
        if record_id in self.closed_loop_records:
            return False
        result = self.validation_results[record_id]
        if result.status == CalibrationStatus.COMPLIANT:
            return False
        close_time = datetime.now()
        self.closed_loop_records[record_id] = {
            "record_id": record_id,
            "original_status": result.status.value,
            "resolution": resolution,
            "closed_by": closed_by,
            "closed_at": close_time,
        }
        if record_id not in self.history:
            self.history[record_id] = []
        self.history[record_id].append({
            "timestamp": close_time,
            "action": "close_loop",
            "from_status": result.status.value,
            "to_status": CalibrationStatus.CLOSED_LOOP.value,
            "reason": resolution,
            "operator": closed_by,
        })
        return True

    def get_history(self, record_id: str) -> List[Dict]:
        return self.history.get(record_id, [])

    def get_history_trajectory(self, record_id: str) -> str:
        history = self.get_history(record_id)
        if not history:
            result = self.validation_results.get(record_id)
            if result:
                return f"记录 {record_id} 当前状态: {self._status_label(result.status.value)}，暂无历史变更"
            return f"记录 {record_id} 不存在"
        trajectory = [f"记录 {record_id} 历史轨迹:"]
        for i, event in enumerate(history, 1):
            trajectory.append(
                f"  {i}. {event['timestamp'].strftime('%Y-%m-%d %H:%M:%S')} - "
                f"{self._status_label(event['from_status'])} → "
                f"{self._status_label(event['to_status'])} "
                f"({event['action']}) - 操作人: {event['operator']} - 原因: {event['reason']}"
            )
        return "\n".join(trajectory)

    def replay_history(self, record_id: str, steps: List[Dict]) -> List[Dict]:
        trajectory = []
        current_status = None
        for i, step in enumerate(steps):
            if "initial_status" in step:
                current_status = step["initial_status"]
                trajectory.append({
                    "step": i + 1,
                    "timestamp": step.get("timestamp", ""),
                    "status": current_status,
                    "status_label": self._status_label(current_status),
                    "action": "初始状态",
                    "reason": step.get("reason", ""),
                    "operator": step.get("operator", ""),
                })
            elif step.get("action") == "close_loop":
                from_status = current_status
                current_status = CalibrationStatus.CLOSED_LOOP.value
                trajectory.append({
                    "step": i + 1,
                    "timestamp": step.get("timestamp", ""),
                    "from_status": from_status,
                    "to_status": current_status,
                    "from_status_label": self._status_label(from_status),
                    "to_status_label": self._status_label(current_status),
                    "action": "闭环",
                    "reason": step.get("reason", ""),
                    "operator": step.get("operator", ""),
                })
        return trajectory

    def _status_label(self, status: str) -> str:
        labels = {
            "compliant": "合规",
            "over_threshold": "超阈值",
            "missing_material": "材料缺失",
            "pending_review": "待审核",
            "closed_loop": "已闭环",
        }
        return labels.get(status, status)

    def _get_action_required(self, result: ValidationResult) -> str:
        if result.status == CalibrationStatus.OVER_THRESHOLD:
            return "请立即核查超阈值原因，安排设备检修或重新校准"
        elif result.status == CalibrationStatus.MISSING_MATERIAL:
            return "请尽快补齐缺失的校准材料并提交审核"
        elif result.status == CalibrationStatus.PENDING_REVIEW:
            return "存在多项问题，请全面核查并整改后提交复核"
        return "无"

    def _calculate_deadline(self, result: ValidationResult) -> str:
        base_days = {
            CalibrationStatus.OVER_THRESHOLD.value: 3,
            CalibrationStatus.MISSING_MATERIAL.value: 7,
            CalibrationStatus.PENDING_REVIEW.value: 5,
        }
        days = base_days.get(result.status.value, 7)
        deadline = datetime.now() + timedelta(days=days)
        return deadline.strftime("%Y-%m-%d")
