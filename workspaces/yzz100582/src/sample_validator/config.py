import os
import yaml
from typing import Dict, List, Optional
from datetime import date

from .models import BoxLayout, BatchRule


def load_box_layouts(config_path: str) -> Dict[str, BoxLayout]:
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"配置文件不存在: {config_path}")

    with open(config_path, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)

    boxes = {}
    default_rows = config.get('default_rows', 9)
    default_cols = config.get('default_cols', 9)

    for box_cfg in config.get('boxes', []):
        box_id = box_cfg.get('id')
        if not box_id:
            continue
        layout = BoxLayout(
            box_id=box_id,
            rows=box_cfg.get('rows', default_rows),
            cols=box_cfg.get('cols', default_cols),
            row_labels=box_cfg.get('row_labels', []),
            col_labels=box_cfg.get('col_labels', []),
            description=box_cfg.get('description', '')
        )
        boxes[box_id] = layout

    return boxes


def load_batch_rules(config_path: str) -> List[BatchRule]:
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"配置文件不存在: {config_path}")

    with open(config_path, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)

    rules = []
    for rule_cfg in config.get('batches', []):
        batch_id = rule_cfg.get('id')
        if not batch_id:
            continue

        start_date = None
        end_date = None
        if 'start_date' in rule_cfg:
            start_date = _parse_date(rule_cfg['start_date'])
        if 'end_date' in rule_cfg:
            end_date = _parse_date(rule_cfg['end_date'])

        rule = BatchRule(
            batch_id=batch_id,
            pattern=rule_cfg.get('pattern', ''),
            start_date=start_date,
            end_date=end_date,
            expected_count=rule_cfg.get('expected_count'),
            description=rule_cfg.get('description', '')
        )
        rules.append(rule)

    return rules


def load_id_format_rules(config_path: str) -> dict:
    if not os.path.exists(config_path):
        return {}

    with open(config_path, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)

    return config.get('id_format', {})


def _parse_date(date_str: str) -> Optional[date]:
    if not date_str:
        return None
    for fmt in ['%Y-%m-%d', '%Y/%m/%d', '%Y%m%d']:
        try:
            from datetime import datetime
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None


def generate_default_config(output_path: str):
    default_config = {
        'default_rows': 9,
        'default_cols': 9,
        'id_format': {
            'pattern': '^[A-Z]{2,3}-\\d{4,6}$',
            'description': '样本号格式：2-3位字母前缀 + 连字符 + 4-6位数字',
            'case_sensitive': True,
            'trim_whitespace': True
        },
        'boxes': [
            {
                'id': 'BOX-001',
                'rows': 9,
                'cols': 9,
                'description': '1号冻存盒 - 血清样本'
            },
            {
                'id': 'BOX-002',
                'rows': 9,
                'cols': 9,
                'description': '2号冻存盒 - 组织样本'
            }
        ],
        'batches': [
            {
                'id': 'BATCH-2024-01',
                'pattern': '^ABC-\\d{4}$',
                'start_date': '2024-01-01',
                'end_date': '2024-06-30',
                'expected_count': 50,
                'description': '2024年上半年批次'
            }
        ]
    }

    os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        yaml.dump(default_config, f, allow_unicode=True, default_flow_style=False, sort_keys=False)
