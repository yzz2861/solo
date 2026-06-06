import csv
import os
from datetime import datetime
from typing import List, Dict
from collections import defaultdict
from core import CylinderRecord, ProblemRecord, RiskClassifier


class ReportGenerator:
    def __init__(self, config: Dict, base_dir: str):
        self.config = config
        self.base_dir = base_dir
        self.batch_id = config['batch_id']
        self.source_name = config['source_name']
        self.group_dimensions = config['group_dimensions']
        self.output_files = config['output_files']

        consistency = config.get('consistency_rules', {})
        self.export_encoding = consistency.get('export_encoding', 'utf-8-sig')
        self.risk_level_order = consistency.get(
            'risk_level_order',
            RiskClassifier.RISK_LEVEL_ORDER
        )

        self.risk_classifier = RiskClassifier(config)

    def _risk_sort_key(self, risk_level: str) -> int:
        if risk_level in self.risk_level_order:
            return self.risk_level_order.index(risk_level)
        return len(self.risk_level_order)

    def generate_detail_report(self, records: List[CylinderRecord]) -> str:
        output_path = os.path.join(self.base_dir, self.output_files['detail_report'])
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        fieldnames = [
            '气瓶编号', '气瓶类型', '实验室', '存放位置', '充装介质',
            '上次检验日期', '到期日期', '距离到期天数', '风险等级',
            '责任人', '采集来源', '采集时间', '处理批次', '来源标识'
        ]

        sorted_records = sorted(records, key=lambda r: (
            self._risk_sort_key(r.风险等级),
            r.距离到期天数 if r.距离到期天数 is not None else 999999
        ))

        with open(output_path, 'w', encoding=self.export_encoding, newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for record in sorted_records:
                writer.writerow({
                    '气瓶编号': record.气瓶编号,
                    '气瓶类型': record.气瓶类型,
                    '实验室': record.实验室,
                    '存放位置': record.存放位置,
                    '充装介质': record.充装介质,
                    '上次检验日期': record.上次检验日期,
                    '到期日期': record.到期日期,
                    '距离到期天数': record.距离到期天数,
                    '风险等级': record.风险等级,
                    '责任人': record.责任人,
                    '采集来源': record.采集来源,
                    '采集时间': record.采集时间,
                    '处理批次': record.处理批次,
                    '来源标识': record.来源标识
                })

        return output_path

    def generate_summary_report(self, records: List[CylinderRecord]) -> str:
        output_path = os.path.join(self.base_dir, self.output_files['summary_report'])
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        summary_data = []
        risk_levels = self.risk_level_order

        for dimension in self.group_dimensions:
            groups = defaultdict(lambda: {level: 0 for level in risk_levels})
            groups.default_factory = lambda: {level: 0 for level in risk_levels}

            for record in records:
                key = getattr(record, dimension, '未知')
                groups[key][record.风险等级] += 1

            for group_key in sorted(groups.keys()):
                counts = groups[group_key]
                row = {
                    '分组维度': dimension,
                    '分组名称': group_key,
                }
                for level in risk_levels:
                    row[level] = counts[level]
                row['总计'] = sum(counts[level] for level in risk_levels)
                row['处理批次'] = self.batch_id
                row['来源标识'] = self.source_name
                summary_data.append(row)

        total_counts = {level: 0 for level in risk_levels}
        for record in records:
            total_counts[record.风险等级] += 1

        total_row = {
            '分组维度': '总计',
            '分组名称': '全部',
        }
        for level in risk_levels:
            total_row[level] = total_counts[level]
        total_row['总计'] = sum(total_counts[level] for level in risk_levels)
        total_row['处理批次'] = self.batch_id
        total_row['来源标识'] = self.source_name
        summary_data.append(total_row)

        fieldnames = ['分组维度', '分组名称'] + risk_levels + ['总计', '处理批次', '来源标识']

        with open(output_path, 'w', encoding=self.export_encoding, newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for row in summary_data:
                writer.writerow(row)

        return output_path

    def generate_problem_list(self, problems: List[ProblemRecord], dedup_removed: int) -> str:
        output_path = os.path.join(self.base_dir, self.output_files['problem_list'])
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        fieldnames = [
            '数据行号', '气瓶编号', '问题类型', '问题描述',
            '原始数据', '处理批次', '来源标识'
        ]

        sorted_problems = sorted(problems, key=lambda p: p.数据行号)

        with open(output_path, 'w', encoding=self.export_encoding, newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for problem in sorted_problems:
                writer.writerow({
                    '数据行号': problem.数据行号,
                    '气瓶编号': problem.气瓶编号,
                    '问题类型': problem.问题类型,
                    '问题描述': problem.问题描述,
                    '原始数据': problem.原始数据,
                    '处理批次': problem.处理批次,
                    '来源标识': problem.来源标识
                })

        return output_path

    def generate_text_summary(self, records: List[CylinderRecord],
                               problems: List[ProblemRecord],
                               dedup_removed: int) -> str:
        output_path = os.path.join(self.base_dir, self.output_files['text_summary'])
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        total = len(records)
        risk_counts = {level: sum(1 for r in records if r.风险等级 == level)
                       for level in self.risk_level_order}

        expired = sum(1 for r in records if r.距离到期天数 is not None and r.距离到期天数 < 0)

        lab_groups = defaultdict(list)
        for r in records:
            lab_groups[r.实验室].append(r)

        rule_desc = self.risk_classifier.get_rule_description()

        lines = []
        lines.append("=" * 60)
        lines.append("实验室气瓶到期检查报告")
        lines.append("=" * 60)
        lines.append("")
        lines.append(f"处理批次: {self.batch_id}")
        lines.append(f"来源标识: {self.source_name}")
        lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"检查基准日: {self.config['time_range']['check_date']}")
        lines.append(f"统计时间范围: {self.config['time_range']['start_date']} ~ {self.config['time_range']['end_date']}")
        lines.append("")
        lines.append("-" * 60)
        lines.append("一、数据概览")
        lines.append("-" * 60)
        lines.append(f"有效气瓶记录数: {total}")
        lines.append(f"去重移除记录数: {dedup_removed}")
        lines.append(f"问题数据数: {len(problems)}")
        lines.append("")
        lines.append("-" * 60)
        lines.append("二、风险分级口径")
        lines.append("-" * 60)
        for level in self.risk_level_order:
            lines.append(f"  {level}: {rule_desc[level]}")
        lines.append("")
        lines.append("-" * 60)
        lines.append("三、风险分级汇总")
        lines.append("-" * 60)
        for level in self.risk_level_order:
            lines.append(f"  {level}: {risk_counts[level]} 个")
        lines.append(f"  其中已过期: {expired} 个")
        lines.append("")
        lines.append("-" * 60)
        lines.append("四、按实验室分布")
        lines.append("-" * 60)
        for lab in sorted(lab_groups.keys()):
            lab_records = lab_groups[lab]
            lab_counts = {level: sum(1 for r in lab_records if r.风险等级 == level)
                          for level in self.risk_level_order}
            lab_total = len(lab_records)
            count_str = ', '.join(f"{level}{lab_counts[level]}个" for level in self.risk_level_order)
            lines.append(f"  {lab}: 共{lab_total}个 ({count_str})")
        lines.append("")
        lines.append("-" * 60)
        lines.append("五、高风险气瓶明细(Top 10)")
        lines.append("-" * 60)
        high_risk_records = [r for r in records if r.风险等级 == RiskClassifier.RISK_HIGH]
        high_risk_records.sort(key=lambda r: r.距离到期天数 if r.距离到期天数 is not None else 9999)
        if high_risk_records:
            for i, r in enumerate(high_risk_records[:10], 1):
                if r.距离到期天数 is not None and r.距离到期天数 < 0:
                    days_str = f"已过期{abs(r.距离到期天数)}天"
                elif r.距离到期天数 is not None:
                    days_str = f"剩余{r.距离到期天数}天"
                else:
                    days_str = "天数未知"
                lines.append(f"  {i}. {r.气瓶编号} ({r.气瓶类型}) - {r.实验室} - {r.到期日期} - {days_str} - 责任人: {r.责任人}")
            if len(high_risk_records) > 10:
                lines.append(f"  ... 还有 {len(high_risk_records) - 10} 个高风险气瓶，详见明细表")
        else:
            lines.append("  无高风险气瓶")
        lines.append("")
        lines.append("-" * 60)
        lines.append("六、无法判定气瓶明细")
        lines.append("-" * 60)
        unknown_records = [r for r in records if r.风险等级 == RiskClassifier.RISK_UNKNOWN]
        if unknown_records:
            for i, r in enumerate(unknown_records[:10], 1):
                if r.距离到期天数 is not None:
                    days_str = f"剩余{r.距离到期天数}天"
                else:
                    days_str = "无法计算"
                lines.append(f"  {i}. {r.气瓶编号} ({r.气瓶类型}) - {r.实验室} - {r.到期日期} - {days_str}")
            if len(unknown_records) > 10:
                lines.append(f"  ... 还有 {len(unknown_records) - 10} 个无法判定气瓶，详见明细表")
        else:
            lines.append("  无无法判定气瓶")
        lines.append("")
        lines.append("-" * 60)
        lines.append("七、问题数据分类")
        lines.append("-" * 60)
        problem_types = defaultdict(int)
        for p in problems:
            problem_types[p.问题类型] += 1
        if problem_types:
            for ptype, count in sorted(problem_types.items()):
                lines.append(f"  {ptype}: {count} 条")
        else:
            lines.append("  无问题数据")
        lines.append("")
        lines.append("-" * 60)
        lines.append("八、口径一致性说明")
        lines.append("-" * 60)
        lines.append("  ✓ 解析口径: 统一使用配置中的日期格式列表进行解析")
        lines.append("  ✓ 去重口径: 按气瓶编号去重，保留采集时间最新的记录")
        lines.append("  ✓ 分级口径: 统一使用 RiskClassifier 类进行风险判定")
        lines.append("  ✓ 导出口径: 统一使用配置中的编码和字段顺序导出")
        lines.append("  ✓ 坏数据隔离: 问题数据仅进入问题清单，不参与汇总统计")
        lines.append("")
        lines.append("=" * 60)
        lines.append("报告结束")
        lines.append("=" * 60)

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))

        return output_path

    def generate_all(self, records: List[CylinderRecord],
                     problems: List[ProblemRecord],
                     dedup_removed: int) -> Dict[str, str]:
        detail_path = self.generate_detail_report(records)
        summary_path = self.generate_summary_report(records)
        problem_path = self.generate_problem_list(problems, dedup_removed)
        text_path = self.generate_text_summary(records, problems, dedup_removed)

        return {
            'detail': detail_path,
            'summary': summary_path,
            'problem': problem_path,
            'text': text_path
        }
