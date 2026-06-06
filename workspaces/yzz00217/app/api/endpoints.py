from typing import List, Dict, Any, Optional
from datetime import datetime

from app.models import (
    InspectionInput,
    InspectionOutput,
    MasterData,
    ApplicationRecord,
    EvidenceMaterial,
    HistoricalStatus,
    ThresholdConfig,
    DefectType,
    InspectionStatus,
)
from app.services import (
    InspectionService,
    process_single_inspection,
    process_batch_inspection,
    load_default_config,
)
from app.records import BadRowRecord
from app.utils import get_logger


def create_single_inspection_input(
    master_data_dict: Dict[str, Any],
    application_dict: Dict[str, Any],
    evidence_list: List[Dict[str, Any]],
    history_list: Optional[List[Dict[str, Any]]] = None,
    config_dict: Optional[Dict[str, Any]] = None,
    row_number: int = 0,
    raw_data: Optional[Dict[str, Any]] = None,
) -> InspectionInput:
    master = MasterData(
        blade_id=master_data_dict.get("blade_id", ""),
        turbine_id=master_data_dict.get("turbine_id", ""),
        wind_farm_id=master_data_dict.get("wind_farm_id", ""),
        blade_model=master_data_dict.get("blade_model", ""),
        manufacture_date=master_data_dict.get("manufacture_date", ""),
        install_date=master_data_dict.get("install_date", ""),
        design_life_years=master_data_dict.get("design_life_years", 20),
        length_meters=master_data_dict.get("length_meters", 0.0),
        manufacturer=master_data_dict.get("manufacturer", ""),
    )

    defect_type_str = application_dict.get("defect_type", "unknown")
    try:
        defect_type = DefectType(defect_type_str)
    except ValueError:
        defect_type = DefectType.UNKNOWN

    app = ApplicationRecord(
        application_id=application_dict.get("application_id", ""),
        blade_id=application_dict.get("blade_id", ""),
        applicant=application_dict.get("applicant", ""),
        application_date=application_dict.get("application_date", ""),
        inspection_type=application_dict.get("inspection_type", ""),
        defect_type=defect_type,
        defect_description=application_dict.get("defect_description", ""),
        defect_location=application_dict.get("defect_location", ""),
        defect_size_mm=application_dict.get("defect_size_mm", 0.0),
        defect_depth_mm=application_dict.get("defect_depth_mm", 0.0),
    )

    evidences = []
    for ev in evidence_list:
        evidences.append(
            EvidenceMaterial(
                evidence_id=ev.get("evidence_id", ""),
                application_id=ev.get("application_id", ""),
                material_type=ev.get("material_type", ""),
                file_path=ev.get("file_path", ""),
                upload_time=ev.get("upload_time", ""),
                file_size_bytes=ev.get("file_size_bytes", 0),
                description=ev.get("description", ""),
            )
        )

    histories = []
    if history_list:
        for h in history_list:
            status_str = h.get("status", "draft")
            try:
                status = InspectionStatus(status_str)
            except ValueError:
                status = InspectionStatus.DRAFT
            histories.append(
                HistoricalStatus(
                    record_id=h.get("record_id", ""),
                    blade_id=h.get("blade_id", ""),
                    status=status,
                    status_time=h.get("status_time", ""),
                    operator=h.get("operator", ""),
                    remark=h.get("remark", ""),
                )
            )

    if config_dict:
        config = ThresholdConfig(
            config_id=config_dict.get("config_id", "default"),
            crack_size_high_mm=config_dict.get("crack_size_high_mm", 50.0),
            crack_size_medium_mm=config_dict.get("crack_size_medium_mm", 20.0),
            delamination_area_high_pct=config_dict.get("delamination_area_high_pct", 5.0),
            delamination_area_medium_pct=config_dict.get("delamination_area_medium_pct", 2.0),
            corrosion_area_high_pct=config_dict.get("corrosion_area_high_pct", 10.0),
            corrosion_area_medium_pct=config_dict.get("corrosion_area_medium_pct", 3.0),
            surface_damage_high_mm=config_dict.get("surface_damage_high_mm", 100.0),
            surface_damage_medium_mm=config_dict.get("surface_damage_medium_mm", 50.0),
            max_application_age_days=config_dict.get("max_application_age_days", 30),
            required_evidence_types=config_dict.get("required_evidence_types", ["photo", "report"]),
            review_required_risk_levels=config_dict.get("review_required_risk_levels", ["high_risk", "missing_material"]),
        )
    else:
        config = load_default_config()

    return InspectionInput(
        master_data=master,
        application=app,
        evidence_list=evidences,
        history_list=histories,
        threshold_config=config,
        row_number=row_number,
        raw_data=raw_data or {},
    )


def create_batch_inspection_inputs(
    records: List[Dict[str, Any]],
    config_dict: Optional[Dict[str, Any]] = None,
) -> List[InspectionInput]:
    inputs = []
    for idx, record in enumerate(records, start=1):
        try:
            input_data = create_single_inspection_input(
                master_data_dict=record.get("master_data", {}),
                application_dict=record.get("application", {}),
                evidence_list=record.get("evidence_list", []),
                history_list=record.get("history_list", []),
                config_dict=config_dict,
                row_number=record.get("row_number", idx),
                raw_data=record,
            )
            inputs.append(input_data)
        except Exception as e:
            logger = get_logger("api")
            logger.error(f"创建输入数据失败，行{idx}: {str(e)}")
            bad_record = record.copy()
            bad_record["_parse_error"] = str(e)
            bad_record["row_number"] = idx
            inputs.append(
                InspectionInput(
                    master_data=MasterData(blade_id="", turbine_id="", wind_farm_id="", blade_model="", manufacture_date="", install_date=""),
                    application=ApplicationRecord(application_id="", blade_id="", applicant="", application_date="", inspection_type="", defect_type=DefectType.UNKNOWN, defect_description=""),
                    evidence_list=[],
                    history_list=[],
                    threshold_config=ThresholdConfig(),
                    row_number=idx,
                    raw_data=bad_record,
                )
            )
    return inputs


class InspectionAPI:
    def __init__(self, config: Optional[ThresholdConfig] = None):
        self.service = InspectionService(config=config)
        self.logger = get_logger("inspection-api")

    def inspect_single(self, input_data: InspectionInput) -> Dict[str, Any]:
        self.logger.info("API: 单条巡检申请处理")
        output = self.service.process_single(input_data)
        return self._format_response(output)

    def inspect_batch(self, inputs: List[InspectionInput], save_files: bool = True) -> Dict[str, Any]:
        self.logger.info(f"API: 批量巡检申请处理，共{len(inputs)}条")
        results, bad_rows = self.service.process_batch(inputs)
        if save_files:
            self.service.save_results(results, bad_rows)

        return {
            "code": 0,
            "message": "success",
            "data": {
                "total": len(inputs),
                "success_count": len(results),
                "bad_row_count": len(bad_rows),
                "results": [r.to_dict() for r in results],
                "bad_rows": [br.to_dict() for br in bad_rows],
                "summary": self.service.record_manager.get_summary(),
            },
        }

    def get_review_entry(self) -> Dict[str, Any]:
        entry = self.service.get_review_entry_info()
        return {
            "code": 0,
            "message": "success",
            "data": entry,
        }

    def _format_response(self, output: InspectionOutput) -> Dict[str, Any]:
        return {
            "code": 0,
            "message": "success",
            "data": output.to_dict(),
        }


inspection_api = InspectionAPI()
