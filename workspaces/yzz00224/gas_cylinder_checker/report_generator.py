import csv
import os
from datetime import datetime
from typing import List, Dict
from collections import defaultdict
from core import CylinderRecord, ProblemRecord


class ReportGenerator:
    def __init__(self, config: Dict, base_dir: str):
        self.config = config
        self.base_dir = base_dir
        self.batch_id = config['batch_id']
        self.source_name = config['source_name']
        self.group_dimensions = config['group_dimensions']
        self.output_files = config['output_files']

    def generate_detail_report(self, records: List[CylinderRecord]) -> str:
        output_path = os.path.join(self.base_dir, self.output_files['detail_report'])
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        fieldnames = [
            '气瓶编号', '气瓶类型', '实验室', '存放位置', '充装介质',
            '上次检验日期', '到期日期', '距离到期天数', '风险等级',
            '责任人', '采集来源', '采集时间', '处理批次', '来源标识'
        ]

        sorted_records = sorted(records, key=lambda r: (
            {'高风险': 0, '中风险': 1, '低风险': 2, '无法判定': 3}.get(r.风险等级, 4),
            r.距离到期天数 if r.距离到期天数 is not None else 9999
        ))

        with open(output_path, 'w', encoding='utf-8-sig', newline='') as f:
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

        for dimension in self.group_dimensions:
            groups = defaultdict(lambda: {
                '高风险': 0, '中风险': 0, '低风险': 0, '无法判定': 0, '总计': 0
            })

            for record in records:
                key = getattr(record, dimension, '未知')
                groups[key][record.风险等级] += 1
                groups[key]['总计'] += 1

            for group_key, counts in sorted(groups.items()):
                summary_data.append({
                    '分组维度': dimension,
                    '分组名称': group_key,
                    '高风险': counts['高风险'],
                    '中风险': counts['中风险'],
                    '低风险': counts['低风险'],
                    '无法判定': counts['无法判定'],
                    '总计': counts['总计'],
                    '处理批次': self.batch_id,
                    '来源标识': self.source_name
                })

        total_counts = {'高风险': 0, '中风险': 0, '低风险': 0, '无法判定': 0, '总计': 0}
        for record in records:
            total_counts[record.风险等级] += 1
            total_counts['总计'] += 1

        summary_data.append({
            '分组维度': '总计',
            '分组名称': '全部',
            '高风险': total_counts['高风险'],
            '中风险': total_counts['中风险'],
            '低风险': total_counts['低风险'],
            '无法判定': total_counts['无法判定'],
            '总计': total_counts['总计'],
            '处理批次': self.batch_id,
            '来源标识': self.source_name
        })

        fieldnames = [
            '分组维度', '分组名称', '高风险', '中风险', '低风险',
            '无法判定', '总计', '处理批次', '来源标识'
        ]

        with open(output_path, 'w', encoding='utf-8-sig', newline='') as f:
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

        with open(output_path, 'w', encoding='utf-8-sig', newline='') as f:
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
        high_risk = sum(1 for r in records if r.风险等级 == '高风险')
        medium_risk = sum(1 for r in records if r.风险等级 == '中风险')
        low_risk = sum(1 for r in records if r.风险等级 == '低风险')
        unknown = sum(1 for r in records if r.风险等级 == '无法判定')

        expired = sum(1 for r in records if r.距离到期天数 is not None and r.距离到期天数 < 0)

        lab_groups = defaultdict(list)
        for r in records:
            lab_groups[r.实验室].append(r)

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
        lines.append("二、风险分级汇总")
        lines.append("-" * 60)
        lines.append(f"高风险: {high_risk} 个 (≤{self.config['risk_levels']['high_risk_days']}天到期或已过期)")
        lines.append(f"中风险: {medium_risk} 个 ({self.config['risk_levels']['high_risk_days']+1}~{self.config['risk_levels']['medium_risk_days']}天到期)")
        lines.append(f"低风险: {low_risk} 个 ({self.config['risk_levels']['medium_risk_days']+1}~{self.config['risk_levels']['low_risk_days']}天到期)")
        lines.append(f"无法判定: {unknown} 个")
        lines.append(f"其中已过期: {expired} 个")
        lines.append("")
        lines.append("-" * 60)
        lines.append("三、按实验室分布")
        lines.append("-" * 60)
        for lab in sorted(lab_groups.keys()):
            lab_records = lab_groups[lab]
            lab_high = sum(1 for r in lab_records if r.风险等级 == '高风险')
            lab_med = sum(1 for r in lab_records if r.风险等级 == '中风险')
            lab_low = sum(1 for r in lab_records if r.风险等级 == '低风险')
            lab_total = len(lab_records)
            lines.append(f"  {lab}: 共{lab_total}个 (高风险{lab_high}个, 中风险{lab_med}个, 低风险{lab_low}个)")
        lines.append("")
        lines.append("-" * 60)
        lines.append("四、高风险气瓶明细(Top 10)")
        lines.append("-" * 60)
        high_risk_records = [r for r in records if r.风险等级 == '高风险']
        high_risk_records.sort(key=lambda r: r.距离到期天数 if r.距离到期天数 is not None else 9999)
        if high_risk_records:
            for i, r in enumerate(high_risk_records[:10], 1):
                days_str = f"已过期{abs(r.距离到期天数)}天" if r.距离到期天数 < 0 else f"剩余{r.距离到期天数}天"
                lines.append(f"  {i}. {r.气瓶编号} ({r.气瓶类型}) - {r.实验室} - {r.到期日期} - {days_str} - 责任人: {r.责任人}")
            if len(high_risk_records) > 10:
                lines.append(f"  ... 还有 {len(high_risk_records) - 10} 个高风险气瓶，详见明细表")
        else:
            lines.append("  无高风险气瓶")
        lines.append("")
        lines.append("-" * 60)
        lines.append("五、问题数据分类")
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
