import os
import json
from typing import Optional, Dict, Any, List
import pandas as pd

from ..models.result import ProcessResult, MaterialItem, ReviewItem
from ..models.ledger import LedgerRecord


class Exporter:
    def __init__(self, output_dir: str = "./output"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def export_all(self, result: ProcessResult, prefix: str = "") -> Dict[str, str]:
        outputs = {}
        outputs['detail'] = self.export_detail(result, prefix)
        outputs['review'] = self.export_review(result, prefix)
        outputs['report'] = self.export_report(result, prefix)
        outputs['json'] = self.export_json(result, prefix)
        return outputs

    def export_detail(self, result: ProcessResult, prefix: str = "") -> str:
        batch_id = result.batch.batch_id
        prefix_part = f"{prefix}_" if prefix else ""
        file_path = os.path.join(
            self.output_dir, f'{prefix_part}材料明细_{batch_id}.xlsx')

        rows = []
        for mat in result.material_items:
            record = result.record_map.get(mat.record_id)
            row = {
                '批次号': batch_id,
                '记录ID': mat.record_id,
                '客户姓名': record.customer_name if record else '',
                '证件号码': record.id_card if record else '',
                '业务类型': record.business_type if record else '',
                '公证类型': record.notary_type if record else '',
                '材料名称': mat.material_name,
                '规则ID': mat.rule_id,
                '规则名称': mat.rule_name,
                '是否必需': '是' if mat.required else '否',
                '状态': mat.status,
                '备注': mat.notes,
                '来源系统': record.source_system if record else '',
                '来源文件': result.batch.source.source_file,
                '来源标识': result.batch.source.source_hash,
            }
            rows.append(row)

        df = pd.DataFrame(rows)
        with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='材料明细', index=False)
            self._write_batch_sheet(writer, result)

        return file_path

    def export_review(self, result: ProcessResult, prefix: str = "") -> str:
        batch_id = result.batch.batch_id
        prefix_part = f"{prefix}_" if prefix else ""
        file_path = os.path.join(
            self.output_dir, f'{prefix_part}复核列表_{batch_id}.xlsx')

        rows = []
        for item in result.review_items:
            record = result.record_map.get(item.record_id)
            row = {
                '批次号': batch_id,
                '记录ID': item.record_id,
                '客户姓名': record.customer_name if record else '',
                '问题类型': item.issue_type,
                '问题描述': item.issue_detail,
                '严重级别': item.severity,
                '涉及字段': item.field_name,
                '处理建议': item.suggestion,
                '来源系统': record.source_system if record else '',
            }
            rows.append(row)

        df = pd.DataFrame(rows)
        df = df.sort_values(by=['严重级别', '记录ID'], ascending=[True, True])

        with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='复核列表', index=False)
            self._write_batch_sheet(writer, result)

        return file_path

    def export_report(self, result: ProcessResult, prefix: str = "") -> str:
        batch_id = result.batch.batch_id
        prefix_part = f"{prefix}_" if prefix else ""
        file_path = os.path.join(
            self.output_dir, f'{prefix_part}处理报告_{batch_id}.txt')

        summary = result.get_summary()
        lines = []
        lines.append("=" * 60)
        lines.append("          公 证 材 料 清 单 处 理 报 告")
        lines.append("=" * 60)
        lines.append("")

        lines.append("【批次信息】")
        lines.append(f"  批次号:     {result.batch.batch_id}")
        lines.append(f"  处理时间:   {result.batch.batch_time}")
        lines.append(f"  任务状态:   {result.batch.task_status}")
        lines.append(f"  操作人:     {result.batch.operator or '系统'}")
        lines.append("")

        lines.append("【来源信息】")
        lines.append(f"  来源文件:   {result.batch.source.source_file}")
        lines.append(f"  来源系统:   {result.batch.source.source_system or '未知'}")
        lines.append(f"  加载时间:   {result.batch.source.load_time}")
        lines.append(f"  来源标识:   {result.batch.source.source_hash}")
        lines.append("")

        lines.append("【处理概览】")
        lines.append(f"  总记录数:   {summary['total_records']}")
        lines.append(f"  有效记录:   {summary['valid_records']}")
        lines.append(f"  无效记录:   {summary['invalid_records']}")
        lines.append(f"  生成材料:   {summary['total_materials']} 项")
        lines.append(f"  问题总数:   {summary['review_issues']} 个")
        if result.is_idempotent_replay:
            lines.append("")
            lines.append("  ★ 幂等提示: 本次为相同输入已处理过，结果完全一致，无新增差异")
        lines.append("")

        lines.append("【问题类型分布】")
        issue_types = summary.get('issue_types', {})
        if issue_types:
            for issue_type, count in sorted(issue_types.items(), key=lambda x: -x[1]):
                lines.append(f"  {issue_type}: {count} 个")
        else:
            lines.append("  无问题")
        lines.append("")

        lines.append("【材料按规则分布】")
        if summary.get('material_by_rule'):
            for rule_name, count in sorted(summary['material_by_rule'].items(), key=lambda x: -x[1]):
                lines.append(f"  {rule_name}: {count} 项")
        else:
            lines.append("  无材料")
        lines.append("")

        lines.append("【异常解释说明】")
        lines.append("  missing_required_field: 缺少系统必填字段，记录无法正常处理")
        lines.append("  missing_custom_field:  缺少自定义必填字段，按配置要求补充")
        lines.append("  duplicate_record:     记录ID重复，需核实并去重")
        lines.append("  multiple_rules_match: 匹配多条规则，按优先级取最高规则")
        lines.append("  no_rule_match:      未匹配任何规则，建议检查配置")
        lines.append("  invalid_amount:     金额异常，需人工核实")
        lines.append("")

        lines.append("=" * 60)
        lines.append(f"报告生成时间: {result.batch.batch_time}")
        lines.append("=" * 60)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write("\n".join(lines))

        return file_path

    def export_json(self, result: ProcessResult, prefix: str = "") -> str:
        batch_id = result.batch.batch_id
        prefix_part = f"{prefix}_" if prefix else ""
        file_path = os.path.join(
            self.output_dir, f'{prefix_part}处理结果_{batch_id}.json')

        data = self._result_to_serializable(result)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return file_path

    def _result_to_serializable(self, result: ProcessResult) -> Dict[str, Any]:
        data = result.to_dict()
        data['record_data'] = {
            rid: rec.to_dict() for rid, rec in result.record_map.items()
        }
        return data

    def _write_batch_sheet(self, writer, result: ProcessResult):
        batch_data = [
            {'项目': '批次号', '值': result.batch.batch_id},
            {'项目': '处理时间', '值': result.batch.batch_time},
            {'项目': '任务状态', '值': result.batch.task_status},
            {'项目': '操作人', '值': result.batch.operator or '系统'},
            {'项目': '来源文件', '值': result.batch.source.source_file},
            {'项目': '来源系统', '值': result.batch.source.source_system},
            {'项目': '来源标识', '值': result.batch.source.source_hash},
            {'项目': '参数版本', '值': result.batch.params_hash},
            {'项目': '数据版本', '值': result.batch.ledger_hash},
            {'项目': '筛选条件', '值': result.batch.filter_hash},
            {'项目': '幂等键', '值': result.idempotency_key},
        ]
        df_batch = pd.DataFrame(batch_data)
        df_batch.to_excel(writer, sheet_name='批次信息', index=False)

    def export_diff_report(self, result1: ProcessResult, result2: ProcessResult,
                      diff: Dict[str, Any], prefix: str = "") -> str:
        batch_id = result2.batch.batch_id
        prefix_part = f"{prefix}_" if prefix else ""
        file_path = os.path.join(
            self.output_dir, f'{prefix_part}差异报告_{batch_id}.txt')

        lines = []
        lines.append("=" * 60)
        lines.append("          差 异 对 比 报 告")
        lines.append("=" * 60)
        lines.append("")

        lines.append(f"基准批次: {result1.batch.batch_id} ({result1.batch.batch_time})")
        lines.append(f"当前批次: {result2.batch.batch_id} ({result2.batch.batch_time})")
        lines.append("")

        lines.append("【总体差异】")
        lines.append(f"  输入是否相同: {'是' if diff['same_inputs'] else '否'}")
        lines.append(f"  记录数变化: {diff['total_records_diff']:+d}")
        lines.append(f"  材料数变化: {diff['total_materials_diff']:+d}")
        lines.append(f"  问题数变化: {diff['review_items_diff']:+d}")
        lines.append("")

        if diff['added_materials']:
            lines.append(f"【新增材料】({len(diff['added_materials'])} 项)")
            for m in diff['added_materials']:
                lines.append(f"  - {m['record_id']}: {m['material_name']} ({m['rule_name']})")
            lines.append("")

        if diff['removed_materials']:
            lines.append(f"【减少材料】({len(diff['removed_materials'])} 项)")
            for m in diff['removed_materials']:
                lines.append(f"  - {m['record_id']}: {m['material_name']} ({m['rule_name']})")
            lines.append("")

        if diff['added_issues']:
            lines.append(f"【新增问题】({len(diff['added_issues'])} 个)")
            for r in diff['added_issues']:
                lines.append(f"  - [{r['severity']}] {r['record_id']}: {r['issue_type']}: {r['issue_detail']}")
            lines.append("")

        if diff['removed_issues']:
            lines.append(f"【解决问题】({len(diff['removed_issues'])} 个)")
            for r in diff['removed_issues']:
                lines.append(f"  - [{r['severity']}] {r['record_id']}: {r['issue_type']}: {r['issue_detail']}")
            lines.append("")

        lines.append("=" * 60)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write("\n".join(lines))

        return file_path
