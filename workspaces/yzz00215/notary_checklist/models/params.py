from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
import json
import yaml
import os


@dataclass
class MaterialRule:
    rule_id: str
    rule_name: str
    business_type: str = ""
    notary_type: str = ""
    materials: List[str] = field(default_factory=list)
    conditions: Dict[str, Any] = field(default_factory=dict)
    priority: int = 0
    description: str = ""

    def matches(self, record: Any) -> bool:
        if self.business_type and record.business_type != self.business_type:
            return False
        if self.notary_type and record.notary_type != self.notary_type:
            return False
        for k, v in self.conditions.items():
            record_val = getattr(record, k, None) or record.extra_fields.get(k)
            if isinstance(v, list):
                if record_val not in v:
                    return False
            elif v is not None and v != '':
                if record_val != v:
                    return False
        return True


@dataclass
class FilterCondition:
    field_name: str
    operator: str = "=="
    value: Any = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            'field_name': self.field_name,
            'operator': self.operator,
            'value': self.value,
        }


@dataclass
class ParamsConfig:
    config_name: str = "default"
    material_rules: List[MaterialRule] = field(default_factory=list)
    required_fields: List[str] = field(default_factory=list)
    filters: List[FilterCondition] = field(default_factory=list)
    output_config: Dict[str, Any] = field(default_factory=dict)
    extra: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ParamsConfig':
        rules_data = data.get('material_rules', [])
        rules = [MaterialRule(**r) for r in rules_data]
        filters_data = data.get('filters', [])
        filters = [FilterCondition(**f) for f in filters_data]
        return cls(
            config_name=data.get('config_name', 'default'),
            material_rules=rules,
            required_fields=data.get('required_fields', []),
            filters=filters,
            output_config=data.get('output_config', {}),
            extra=data.get('extra', {}),
        )

    @classmethod
    def from_json(cls, file_path: str) -> 'ParamsConfig':
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return cls.from_dict(data)

    @classmethod
    def from_yaml(cls, file_path: str) -> 'ParamsConfig':
        with open(file_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
        return cls.from_dict(data)

    @classmethod
    def load(cls, file_path: str) -> 'ParamsConfig':
        ext = os.path.splitext(file_path)[1].lower()
        if ext in ('.json',):
            return cls.from_json(file_path)
        elif ext in ('.yaml', '.yml'):
            return cls.from_yaml(file_path)
        else:
            raise ValueError(f"Unsupported config file format: {ext}")

    def to_dict(self) -> Dict[str, Any]:
        return {
            'config_name': self.config_name,
            'material_rules': [
                {
                    'rule_id': r.rule_id,
                    'rule_name': r.rule_name,
                    'business_type': r.business_type,
                    'notary_type': r.notary_type,
                    'materials': r.materials,
                    'conditions': r.conditions,
                    'priority': r.priority,
                    'description': r.description,
                }
                for r in self.material_rules
            ],
            'required_fields': self.required_fields,
            'filters': [f.to_dict() for f in self.filters],
            'output_config': self.output_config,
            'extra': self.extra,
        }

    def get_matching_rules(self, record: Any) -> List[MaterialRule]:
        matched = [r for r in self.material_rules if r.matches(record)]
        matched.sort(key=lambda x: x.priority, reverse=True)
        return matched
