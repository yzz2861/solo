from typing import Optional, Dict, Any, List
from ..models.result import ProcessResult


ISSUE_EXPLANATIONS = {
    'missing_required_field': {
        'name': '缺少必填字段',
        'explanation': '系统要求的关键字段为空，该记录将被标记为无效，无法生成材料清单。',
        'impact': '高 - 记录无法进入后续处理流程',
        'action': '请在业务台账中补充缺失的必填字段后重新处理。',
    },
    'missing_custom_field': {
        'name': '缺少自定义必填字段',
        'explanation': '根据参数配置中的自定义必填字段，该记录缺少配置要求的字段。',
        'impact': '高 - 按配置要求，该记录可能无法通过校验',
        'action': '请补充自定义字段的值，或调整参数配置中的必填字段设置。',
    },
    'duplicate_record': {
        'name': '记录ID重复',
        'explanation': '业务台账中存在多条相同ID的记录，可能是数据重复录入。',
        'impact': '中 - 可能导致材料重复生成或统计错误',
        'action': '请核实数据来源，去除重复记录，确保每条记录ID唯一。',
    },
    'multiple_rules_match': {
        'name': '匹配多条规则',
        'explanation': '该记录同时匹配了多条材料规则，系统将按优先级取最高的规则生成材料。',
        'impact': '中 - 可能产生非预期的材料清单',
        'action': '请检查规则配置，确认优先级设置是否正确，或调整规则条件避免冲突。',
    },
    'no_rule_match': {
        'name': '未匹配任何规则',
        'explanation': '该记录的业务类型或公证类型未匹配到任何材料规则，无法生成材料清单。',
        'impact': '中 - 该记录无材料输出',
        'action': '请检查业务类型和公证类型是否正确，或在参数配置中新增对应的规则。',
    },
    'invalid_amount': {
        'name': '金额异常',
        'explanation': '记录中的金额为负数或格式异常，需要人工核实。',
        'impact': '低 - 不影响材料生成，但可能影响业务判断',
        'action': '请核核实该笔业务的金额是否正确。',
    },
}


class ConsoleSummarizer:
    @staticmethod
    def print_summary(result: ProcessResult, verbose: bool = False) -> None:
        summary = result.get_summary()
        batch = result.batch

        print()
        print("=" * 60)
        print("        公 证 材 料 清 单 处 理 摘 要")
        print("=" * 60)
        print()

        print(f"  批次号:     {batch.batch_id}")
        print(f"  处理时间:   {batch.batch_time}")
        print(f"  任务状态:   {ConsoleSummarizer._color_status(batch.task_status)}")
        print(f"  操作人:     {batch.operator or '系统'}")
        if result.is_idempotent_replay:
            print(f"  幂等状态:   \033[32m★ 本次为相同输入重复执行，结果无差异\033[0m")
        print()

        print(f"  来源文件:   {batch.source.source_file}")
        print(f"  来源系统:   {batch.source.source_system or '未知'}")
        print(f"  来源标识:   {batch.source.source_hash}")
        print()

        print("-" * 60)
        print("  处理概览")
        print("-" * 60)
        print(f"  总记录数:   {summary['total_records']}")
        print(f"  有效记录:   \033[32m{summary['valid_records']}\033[0m")
        print(f"  无效记录:   \033[31m{summary['invalid_records']}\033[0m")
        print(f"  生成材料:   {summary['total_materials']} 项")
        print(f"  问题数量:   \033[33m{summary['review_issues']}\033[0m 个")
        print()

        if summary.get('issue_types'):
            print("-" * 60)
            print("  问题类型分布")
            print("-" * 60)
            for issue_type, count in sorted(summary['issue_types'].items(), key=lambda x: -x[1]):
                info = ISSUE_EXPLANATIONS.get(issue_type, {})
                name = info.get('name', issue_type)
                print(f"  {name}: {count} 个")
            print()

        if verbose and summary.get('issue_types'):
            print("-" * 60)
            print("  异常详细解释")
            print("-" * 60)
            ConsoleSummarizer._print_issue_explanations(list(summary['issue_types'].keys()))
            print()

        print("=" * 60)
        print()

    @staticmethod
    def print_issue_explanations(issue_types: Optional[List[str]] = None) -> None:
        print()
        print("=" * 60)
        print("        异 常 类 型 解 释 手 册")
        print("=" * 60)
        print()

        types_to_show = issue_types if issue_types else list(ISSUE_EXPLANATIONS.keys())
        ConsoleSummarizer._print_issue_explanations(types_to_show)

        print("=" * 60)
        print()

    @staticmethod
    def _print_issue_explanations(issue_types: List[str]) -> None:
        for issue_type in issue_types:
            info = ISSUE_EXPLANATIONS.get(issue_type)
            if not info:
                print(f"  【{issue_type}】")
                print(f"    说明: 暂无解释")
                print()
                continue

            print(f"  【{info['name']}】({issue_type})")
            print(f"    说明: {info['explanation']}")
            print(f"    影响: {info['impact']}")
            print(f"    建议: {info['action']}")
            print()

    @staticmethod
    def _color_status(status: str) -> str:
        color_map = {
            'completed': '\033[32mcompleted\033[0m',
            'pending': '\033[33mpending\033[0m',
            'failed': '\033[31mfailed\033[0m',
            'running': '\033[34mrunning\033[0m',
        }
        return color_map.get(status, status)

    @staticmethod
    def print_review_list(result: ProcessResult,
                          severity: Optional[str] = None,
                          limit: int = 20) -> None:
        items = result.review_items
        if severity:
            items = [r for r in items if r.severity == severity]

        print()
        print("=" * 60)
        print(f"        复 核 列 表 (共 {len(items)} 条)")
        print("=" * 60)
        print()

        if not items:
            print("  暂无复核事项")
            print()
            return

        display_items = items[:limit]
        for i, item in enumerate(display_items, 1):
            severity_mark = '\033[31m●\033[0m' if item.severity == 'error' else '\033[33m●\033[0m'
            info = ISSUE_EXPLANATIONS.get(item.issue_type, {})
            name = info.get('name', item.issue_type)

            print(f"  {i}. {severity_mark} [{name}]")
            print(f"     记录ID: {item.record_id}")
            print(f"     问题描述: {item.issue_detail}")
            if item.field_name:
                print(f"     涉及字段: {item.field_name}")
            if item.suggestion:
                print(f"     处理建议: {item.suggestion}")
            print()

        if len(items) > limit:
            print(f"  ... 还有 {len(items) - limit} 条，请导出复核列表查看完整内容")
            print()

    @staticmethod
    def print_materials_by_record(result: ProcessResult, record_id: str) -> None:
        materials = result.get_materials_by_record(record_id)
        record = result.record_map.get(record_id)

        print()
        print("=" * 60)
        print(f"        记 录 材 料 明 细 - {record_id}")
        print("=" * 60)
        print()

        if record:
            print(f"  客户姓名: {record.customer_name}")
            print(f"  证件号码: {record.id_card}")
            print(f"  业务类型: {record.business_type}")
            print(f"  公证类型: {record.notary_type}")
            print(f"  来源系统: {record.source_system}")
            print()

        if not materials:
            print("  该记录暂无材料清单")
            review_items = result.get_review_by_record(record_id)
            if review_items:
                print(f"  相关问题 ({len(review_items)} 个):")
                for item in review_items:
                    print(f"    - {item.issue_detail}")
            print()
            return

        print(f"  材料清单 ({len(materials)} 项):")
        for i, mat in enumerate(materials, 1):
            print(f"    {i}. {mat.material_name}")
            print(f"       来源规则: {mat.rule_name} ({mat.rule_id})")
            print(f"       状态: {mat.status}")
        print()
