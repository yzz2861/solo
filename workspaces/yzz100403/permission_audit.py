#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
目录权限脱敏巡查脚本
扫描指定目录，识别敏感文件、权限风险、外链问题和无人负责文件夹
仅输出风险报告，不修改任何文件
"""

import os
import re
import sys
import stat
import yaml
import argparse
import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
from collections import defaultdict


class ConfigLoader:
    def __init__(self, config_path: str = "config.yaml"):
        self.config_path = config_path
        self.config = self._load_config()

    def _load_config(self) -> Dict[str, Any]:
        if not os.path.exists(self.config_path):
            print(f"警告: 配置文件 {self.config_path} 不存在，使用默认规则")
            return self._get_default_config()
        with open(self.config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)

    def _get_default_config(self) -> Dict[str, Any]:
        return {
            'sensitive_keywords': {
                'salary': ['薪资', '工资', 'salary'],
                'customer': ['客户名单', '客户信息'],
                'personal': ['身份证', '护照'],
                'confidential': ['机密', 'confidential'],
                'employee': ['离职', '员工档案'],
                'financial': ['财报', '合同', '发票']
            },
            'old_department_abbr': ['RD', 'HR', 'BD', 'OP'],
            'department_mapping': {},
            'risk_levels': {
                'critical': {'weight': 100, 'description': '严重风险'},
                'high': {'weight': 75, 'description': '高风险'},
                'medium': {'weight': 50, 'description': '中风险'},
                'low': {'weight': 25, 'description': '低风险'}
            },
            'permission_rules': {
                'overly_broad': ['777', 'rwxrwxrwx', '公开'],
                'no_owner': ['无负责人', 'unknown owner'],
                'external_share': ['外部链接', 'anyone with link']
            },
            'sharing_link_patterns': [r'https?://.*share.*', r'https?://pan\.'],
            'confirmation_required': {
                'has_space': '文件名包含空格',
                'has_chinese_parentheses': '文件名包含中文括号',
                'has_old_dept_abbr': '文件名包含旧部门缩写',
                'permission_missing': '权限信息缺失',
                'owner_missing': '责任人信息缺失',
                'expiry_missing': '外链无过期时间'
            },
            'max_scan_depth': 10,
            'exclude_dirs': ['.git', '__pycache__']
        }

    def get(self, key: str, default: Any = None) -> Any:
        return self.config.get(key, default)


class FileScanner:
    def __init__(self, config: ConfigLoader):
        self.config = config
        self.max_depth = config.get('max_scan_depth', 10)
        self.exclude_dirs = set(config.get('exclude_dirs', []))
        self.metadata_config = config.get('metadata_files', {})

    def scan_directory(self, root_dir: str) -> List[Dict[str, Any]]:
        root_path = Path(root_dir).resolve()
        if not root_path.exists():
            print(f"错误: 目录不存在: {root_dir}")
            return []
        if not root_path.is_dir():
            print(f"错误: 不是目录: {root_dir}")
            return []

        scanned_files = []
        root_depth = len(root_path.parts)

        for dirpath, dirnames, filenames in os.walk(root_path):
            current_path = Path(dirpath)
            current_depth = len(current_path.parts) - root_depth

            if current_depth > self.max_depth:
                dirnames[:] = []
                continue

            dirnames[:] = [d for d in dirnames if d not in self.exclude_dirs]

            dir_info = self._get_file_info(current_path, is_dir=True)
            if dir_info:
                scanned_files.append(dir_info)

            for filename in filenames:
                if filename in self.exclude_dirs:
                    continue
                if filename.startswith('.') and filename.endswith(('.sharing', '.meta')):
                    continue
                file_path = current_path / filename
                file_info = self._get_file_info(file_path, is_dir=False)
                if file_info:
                    scanned_files.append(file_info)

        return scanned_files

    def _get_file_info(self, path: Path, is_dir: bool) -> Optional[Dict[str, Any]]:
        permissions = '??????????'
        permission_description = '未知'
        owner_name = 'unknown'
        group_name = 'unknown'
        owner_id = -1
        group_id = -1
        size = 0
        mtime = datetime.datetime.min
        ctime = datetime.datetime.min
        permission_error = False
        error_message = ''

        try:
            stat_info = path.stat()
            file_mode = stat_info.st_mode
            permissions = self._parse_permissions(file_mode)
            permission_description = self._get_permission_description(permissions)
            owner_name = self._get_owner_name(stat_info.st_uid)
            group_name = self._get_group_name(stat_info.st_gid)
            owner_id = stat_info.st_uid
            group_id = stat_info.st_gid
            size = stat_info.st_size
            mtime = datetime.datetime.fromtimestamp(stat_info.st_mtime)
            ctime = datetime.datetime.fromtimestamp(stat_info.st_ctime)
        except (PermissionError, OSError) as e:
            permission_error = True
            error_message = str(e)

        metadata = self._load_metadata(path)

        if metadata:
            if metadata.get('owner'):
                owner_name = metadata['owner']
            if metadata.get('permission_desc'):
                permission_description = metadata['permission_desc']
            if metadata.get('department'):
                pass

        if permission_description in ['未知', '', 'unknown', '未设置']:
            permission_missing = True
        else:
            permission_missing = False

        file_info = {
            'path': str(path),
            'name': path.name,
            'is_dir': is_dir,
            'size': size,
            'mtime': mtime,
            'ctime': ctime,
            'permissions': permissions,
            'owner_id': owner_id,
            'owner_name': owner_name,
            'group_id': group_id,
            'group_name': group_name,
            'permission_description': permission_description,
            'sharing_links': self._extract_sharing_links(path),
            'relative_path': str(path.relative_to(path.anchor)) if path.anchor else str(path),
            'depth': len(path.parts) - 1,
            'permission_error': permission_error,
            'permission_missing_flag': permission_missing,
            'error_message': error_message,
            'metadata': metadata,
            'has_metadata': metadata is not None
        }
        return file_info

    def _parse_permissions(self, mode: int) -> str:
        try:
            return stat.filemode(mode)
        except Exception:
            return '??????????'

    def _get_owner_name(self, uid: int) -> str:
        try:
            import pwd
            return pwd.getpwuid(uid).pw_name
        except (KeyError, ModuleNotFoundError):
            return f"uid_{uid}"

    def _get_group_name(self, gid: int) -> str:
        try:
            import grp
            return grp.getgrgid(gid).gr_name
        except (KeyError, ModuleNotFoundError):
            return f"gid_{gid}"

    def _get_permission_description(self, permission_str: str) -> str:
        perm_map = {
            'r': '读',
            'w': '写',
            'x': '执行',
            '-': '无'
        }
        if len(permission_str) != 10:
            return '未知'

        parts = []
        owner = permission_str[1:4]
        group = permission_str[4:7]
        other = permission_str[7:10]

        for label, perm in [('所有者', owner), ('组', group), ('其他', other)]:
            desc = []
            for p in perm:
                if p != '-':
                    desc.append(perm_map.get(p, p))
            parts.append(f"{label}:{''.join(desc) if desc else '无'}")

        return ', '.join(parts)

    def _extract_sharing_links(self, path: Path) -> List[str]:
        links = []
        linkfile = path.parent / f".{path.name}.sharing"
        if linkfile.exists():
            try:
                with open(linkfile, 'r', encoding='utf-8') as f:
                    content = f.read()
                patterns = self.config.get('sharing_link_patterns', [])
                for pattern in patterns:
                    matches = re.findall(pattern, content, re.IGNORECASE)
                    links.extend(matches)
            except (PermissionError, OSError, UnicodeDecodeError):
                pass

        return list(set(links))

    def _load_metadata(self, path: Path) -> Optional[Dict[str, str]]:
        meta_pattern = self.metadata_config.get('pattern', '.{name}.meta')
        meta_filename = meta_pattern.replace('{name}', path.name)
        meta_file = path.parent / meta_filename

        if not meta_file.exists():
            return None

        metadata = {}
        try:
            with open(meta_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    if ':' in line:
                        key, value = line.split(':', 1)
                        metadata[key.strip().lower()] = value.strip()
                    elif '=' in line:
                        key, value = line.split('=', 1)
                        metadata[key.strip().lower()] = value.strip()
        except (PermissionError, OSError, UnicodeDecodeError):
            return None

        return metadata if metadata else None


class RiskDetector:
    def __init__(self, config: ConfigLoader):
        self.config = config
        self.sensitive_keywords = config.get('sensitive_keywords', {})
        self.old_dept_abbr = config.get('old_department_abbr', [])
        self.permission_rules = config.get('permission_rules', {})
        self.confirmation_required = config.get('confirmation_required', {})
        self.risk_levels = config.get('risk_levels', {})
        self.unowned_patterns = config.get('unowned_folder_patterns', [])
        self.departed_patterns = config.get('departed_folder_patterns', [])

    def detect_risks(self, file_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        risks = []

        risks.extend(self._check_sensitive_content(file_info))
        risks.extend(self._check_permission_issues(file_info))
        risks.extend(self._check_permission_missing(file_info))
        risks.extend(self._check_sharing_links(file_info))
        risks.extend(self._check_owner_issues(file_info))
        risks.extend(self._check_unowned_folder(file_info))
        risks.extend(self._check_naming_issues(file_info))

        risks = self._deduplicate_risks(risks)

        for risk in risks:
            risk['level'] = self._determine_risk_level(risk)
            risk['weight'] = self.risk_levels.get(risk['level'], {}).get('weight', 25)

        return risks

    def _deduplicate_risks(self, risks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        seen_types = set()
        unique_risks = []
        for risk in risks:
            key = (risk['type'], risk.get('keyword', ''), risk.get('detail', ''))
            if key not in seen_types:
                seen_types.add(key)
                unique_risks.append(risk)
        return unique_risks

    def _check_sensitive_content(self, file_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        risks = []
        filename = file_info['name'].lower()
        filepath = file_info['path'].lower()

        for category, keywords in self.sensitive_keywords.items():
            for keyword in keywords:
                if keyword.lower() in filename or keyword.lower() in filepath:
                    risks.append({
                        'type': 'sensitive_content',
                        'category': category,
                        'keyword': keyword,
                        'description': f"疑似敏感内容: {self._get_category_name(category)}",
                        'detail': f"文件名/路径包含敏感词 '{keyword}'"
                    })

        return risks

    def _get_category_name(self, category: str) -> str:
        names = {
            'salary': '薪资相关',
            'customer': '客户信息',
            'personal': '个人隐私',
            'confidential': '机密文件',
            'employee': '员工信息',
            'financial': '财务资料'
        }
        return names.get(category, category)

    def _check_permission_issues(self, file_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        risks = []
        perm_str = file_info['permissions']
        perm_desc = file_info['permission_description'].lower()

        overly_broad = self.permission_rules.get('overly_broad', [])
        for rule in overly_broad:
            if rule.lower() in perm_str.lower() or rule.lower() in perm_desc:
                risks.append({
                    'type': 'overly_broad_permission',
                    'description': '权限过宽',
                    'detail': f"权限 '{perm_str}' ({file_info['permission_description']}) 符合过宽权限规则 '{rule}'"
                })
                break

        if perm_str[7] == 'r' or perm_str[8] == 'w':
            risks.append({
                'type': 'world_readable_writable',
                'description': '全局可读/可写',
                'detail': f"其他用户拥有{'读' if perm_str[7]=='r' else ''}{'写' if perm_str[8]=='w' else ''}权限"
            })

        return risks

    def _check_sharing_links(self, file_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        risks = []
        links = file_info.get('sharing_links', [])

        if links:
            external_share_rules = self.permission_rules.get('external_share', [])
            for link in links:
                is_external = any(
                    rule.lower() in link.lower()
                    for rule in external_share_rules
                ) or self._is_external_link(link)

                if is_external:
                    has_expiry = self._check_link_expiry(link, file_info)
                    if not has_expiry:
                        risks.append({
                            'type': 'external_link_no_expiry',
                            'description': '外链无过期时间',
                            'detail': f"检测到外部分享链接，未设置过期时间: {self._mask_link(link)}"
                        })
                    else:
                        risks.append({
                            'type': 'external_link',
                            'description': '外部分享链接',
                            'detail': f"检测到外部分享链接: {self._mask_link(link)}"
                        })

        return risks

    def _is_external_link(self, link: str) -> bool:
        internal_domains = ['localhost', '127.0.0.1', 'internal', 'intranet']
        link_lower = link.lower()
        return not any(domain in link_lower for domain in internal_domains)

    def _check_link_expiry(self, link: str, file_info: Dict[str, Any]) -> bool:
        linkfile = Path(file_info['path']).parent / f".{Path(file_info['path']).name}.sharing"
        if linkfile.exists():
            try:
                with open(linkfile, 'r', encoding='utf-8') as f:
                    content = f.read()
                expiry_patterns = [
                    r'expir(?:e|y)\s*[:=]\s*(\d{4}-\d{2}-\d{2})',
                    r'过期\s*[:：]\s*(\d{4}-\d{2}-\d{2})',
                    r'截止\s*[:：]\s*(\d{4}-\d{2}-\d{2})'
                ]
                for pattern in expiry_patterns:
                    match = re.search(pattern, content, re.IGNORECASE)
                    if match:
                        expiry_date = datetime.datetime.strptime(match.group(1), '%Y-%m-%d')
                        return expiry_date > datetime.datetime.now()
            except (PermissionError, OSError, UnicodeDecodeError):
                pass
        return False

    def _mask_link(self, link: str) -> str:
        if len(link) > 15:
            return link[:8] + '...' + link[-5:]
        return link

    def _check_owner_issues(self, file_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        risks = []
        owner = file_info.get('owner_name', '')
        owner_lower = owner.lower()

        metadata = file_info.get('metadata', {})
        if metadata:
            meta_owner = metadata.get('owner', '').lower()
            if meta_owner:
                owner_lower = meta_owner
                owner = metadata.get('owner', owner)

        no_owner_rules = self.permission_rules.get('no_owner', [])
        for rule in no_owner_rules:
            if rule.lower() in owner_lower:
                risks.append({
                    'type': 'no_owner',
                    'description': '无人负责',
                    'detail': f"文件所有者 '{owner}' 符合无负责人规则 '{rule}'",
                    'source': 'owner_name'
                })
                break

        if not risks and (owner_lower in ['none', 'unknown', 'uid_', ''] or owner.startswith('uid_')):
            risks.append({
                'type': 'owner_missing',
                'description': '责任人信息缺失',
                'detail': f"无法识别文件所有者: '{owner}'",
                'confirmation_required': True,
                'source': 'owner_name'
            })

        departed_keywords = self.departed_patterns if self.departed_patterns else ['离职', 'departed', 'former', 'ex-', 'resigned']
        if any(kw.lower() in owner_lower for kw in departed_keywords):
            risks.append({
                'type': 'departed_employee_owner',
                'description': '离职员工文件',
                'detail': f"文件所有者疑似离职员工: '{owner}'",
                'source': 'owner_name'
            })

        return risks

    def _check_unowned_folder(self, file_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        risks = []
        if not file_info.get('is_dir', False):
            return risks

        folder_name = file_info['name']
        folder_path = file_info['path']
        name_lower = folder_name.lower()
        path_lower = folder_path.lower()

        metadata = file_info.get('metadata', {})

        unowned_patterns = self.unowned_patterns if self.unowned_patterns else []
        matched_patterns = []
        for pattern in unowned_patterns:
            if pattern.lower() in name_lower or pattern.lower() in path_lower:
                matched_patterns.append(pattern)

        if matched_patterns:
            evidence = ', '.join(matched_patterns[:3])
            risks.append({
                'type': 'unowned_folder',
                'description': '疑似无人负责的文件夹',
                'detail': f"文件夹名称/路径包含无人负责关键词: {evidence}",
                'source': 'folder_name',
                'evidence': matched_patterns
            })

        if metadata:
            meta_owner = metadata.get('owner', '')
            meta_dept = metadata.get('department', '')
            if not meta_owner or meta_owner.lower() in ['none', 'unknown', '无', '未指定', '']:
                if not any(r['type'] == 'unowned_folder' for r in risks):
                    risks.append({
                        'type': 'unowned_folder',
                        'description': '元数据标记为无负责人的文件夹',
                        'detail': f"元数据中 owner 字段为空或无负责人: '{meta_owner}'",
                        'source': 'metadata',
                        'evidence': ['metadata_owner_missing']
                    })

        if not file_info.get('permission_error', False):
            perm_desc = file_info.get('permission_description', '')
            no_owner_rules = self.permission_rules.get('no_owner', [])
            for rule in no_owner_rules:
                if rule.lower() in perm_desc.lower():
                    if not any(r['type'] == 'unowned_folder' for r in risks):
                        risks.append({
                            'type': 'unowned_folder',
                            'description': '权限描述显示无负责人',
                            'detail': f"权限描述中包含无负责人标记: '{rule}'",
                            'source': 'permission_desc'
                        })
                    break

        if len(matched_patterns) >= 2 and file_info.get('is_dir', False):
            for r in risks:
                if r['type'] == 'unowned_folder':
                    r['confidence'] = 'high'
                    break

        return risks

    def _check_permission_missing(self, file_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        risks = []

        if file_info.get('permission_error', False):
            risks.append({
                'type': 'permission_missing',
                'description': self.confirmation_required.get('permission_missing', '权限信息缺失'),
                'detail': f"无法获取权限信息: {file_info.get('error_message', '未知错误')}",
                'confirmation_required': True,
                'source': 'stat_error'
            })
            return risks

        perm_str = file_info.get('permissions', '')
        if perm_str == '??????????' or '?' in perm_str:
            risks.append({
                'type': 'permission_missing',
                'description': self.confirmation_required.get('permission_missing', '权限信息缺失'),
                'detail': f"权限字符串异常: '{perm_str}'",
                'confirmation_required': True,
                'source': 'permission_string'
            })
            return risks

        if file_info.get('permission_missing_flag', False):
            risks.append({
                'type': 'permission_missing',
                'description': self.confirmation_required.get('permission_missing', '权限信息缺失'),
                'detail': f"权限描述为空或未知: '{file_info.get('permission_description', '')}'",
                'confirmation_required': True,
                'source': 'permission_description'
            })
            return risks

        metadata = file_info.get('metadata', {})
        if metadata:
            meta_perm = metadata.get('permission_desc', metadata.get('permission', ''))
            missing_rules = self.permission_rules.get('permission_missing', [])
            for rule in missing_rules:
                if rule.lower() in meta_perm.lower():
                    risks.append({
                        'type': 'permission_missing',
                        'description': self.confirmation_required.get('permission_missing', '权限信息缺失'),
                        'detail': f"元数据中权限标记为缺失: '{rule}'",
                        'confirmation_required': True,
                        'source': 'metadata'
                    })
                    break

        return risks

    def _check_naming_issues(self, file_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        risks = []
        filename = file_info['name']

        if ' ' in filename:
            risks.append({
                'type': 'has_space',
                'description': self.confirmation_required.get('has_space', '文件名包含空格'),
                'detail': '文件名中包含空格，建议统一使用下划线或连字符',
                'confirmation_required': True
            })

        if re.search(r'[（）]', filename):
            risks.append({
                'type': 'has_chinese_parentheses',
                'description': self.confirmation_required.get('has_chinese_parentheses', '文件名包含中文括号'),
                'detail': '文件名中包含中文括号，建议使用英文括号',
                'confirmation_required': True
            })

        for abbr in self.old_dept_abbr:
            pattern = r'(?:^|[-_\s\.])' + re.escape(abbr) + r'(?:$|[-_\s\.])'
            if re.search(pattern, filename, re.IGNORECASE):
                risks.append({
                    'type': 'has_old_dept_abbr',
                    'description': self.confirmation_required.get('has_old_dept_abbr', '文件名包含旧部门缩写'),
                    'detail': f"文件名包含旧部门缩写 '{abbr}'，请确认是否需要更新",
                    'confirmation_required': True
                })
                break

        return risks

    def _determine_risk_level(self, risk: Dict[str, Any]) -> str:
        risk_type = risk.get('type', '')
        category = risk.get('category', '')

        if risk_type == 'sensitive_content':
            if category in ['salary', 'customer', 'confidential']:
                return 'critical'
            return 'high'

        if risk_type == 'overly_broad_permission':
            if '777' in risk.get('detail', '') or 'rwxrwxrwx' in risk.get('detail', ''):
                return 'critical'
            return 'high'

        if risk_type == 'world_readable_writable':
            if '写' in risk.get('detail', ''):
                return 'critical'
            return 'high'

        if risk_type == 'external_link_no_expiry':
            return 'high'

        if risk_type == 'external_link':
            return 'medium'

        if risk_type in ['no_owner', 'departed_employee_owner']:
            return 'high'

        if risk_type == 'unowned_folder':
            confidence = risk.get('confidence', '')
            if confidence == 'high':
                return 'high'
            return 'medium'

        if risk_type == 'owner_missing':
            return 'medium'

        if risk_type == 'permission_missing':
            return 'medium'

        if risk.get('confirmation_required'):
            if risk_type == 'has_old_dept_abbr':
                return 'medium'
            return 'low'

        return 'low'


class DepartmentClassifier:
    def __init__(self, config: ConfigLoader):
        self.department_mapping = config.get('department_mapping', {})

    def classify(self, file_info: Dict[str, Any]) -> str:
        path = file_info['path'].lower()
        name = file_info['name'].lower()

        for dept, keywords in self.department_mapping.items():
            for kw in keywords:
                if kw.lower() in path or kw.lower() in name:
                    return dept

        owner = file_info.get('owner_name', '').lower()
        for dept, keywords in self.department_mapping.items():
            for kw in keywords:
                if kw.lower() in owner:
                    return dept

        return '未归属'


class RiskRanker:
    def __init__(self, config: ConfigLoader):
        self.risk_levels = config.get('risk_levels', {})

    def rank_risks(self, all_risks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        file_risk_scores = defaultdict(lambda: {'total_weight': 0, 'risks': [], 'file_info': None})

        for item in all_risks:
            path = item['file_info']['path']
            file_risk_scores[path]['total_weight'] += item['risk']['weight']
            file_risk_scores[path]['risks'].append(item['risk'])
            if file_risk_scores[path]['file_info'] is None:
                file_risk_scores[path]['file_info'] = item['file_info']

        ranked = []
        for path, data in file_risk_scores.items():
            has_critical = any(r['level'] == 'critical' for r in data['risks'])
            has_high = any(r['level'] == 'high' for r in data['risks'])

            priority = 0
            if has_critical:
                priority = 1000
            elif has_high:
                priority = 500

            ranked.append({
                'path': path,
                'file_info': data['file_info'],
                'risks': data['risks'],
                'total_weight': data['total_weight'],
                'priority': priority + data['total_weight'],
                'has_critical': has_critical,
                'has_high': has_high
            })

        ranked.sort(key=lambda x: (-x['priority'], x['path']))

        for i, item in enumerate(ranked, 1):
            item['rank'] = i

        return ranked

    def suggest_fix_order(self, ranked_risks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        fix_order = []

        critical_items = [r for r in ranked_risks if r['has_critical']]
        high_items = [r for r in ranked_risks if r['has_high'] and not r['has_critical']]
        medium_items = [r for r in ranked_risks if not r['has_critical'] and not r['has_high']
                        and any(risk['level'] == 'medium' for risk in r['risks'])]
        low_items = [r for r in ranked_risks if not r['has_critical'] and not r['has_high']
                     and not any(risk['level'] == 'medium' for risk in r['risks'])]

        for idx, item in enumerate(critical_items, 1):
            fix_order.append({**item, 'suggested_order': idx, 'batch': '严重风险批处理'})

        for idx, item in enumerate(high_items, len(critical_items) + 1):
            fix_order.append({**item, 'suggested_order': idx, 'batch': '高风险批处理'})

        for idx, item in enumerate(medium_items, len(critical_items) + len(high_items) + 1):
            fix_order.append({**item, 'suggested_order': idx, 'batch': '中风险批处理'})

        for idx, item in enumerate(low_items, len(critical_items) + len(high_items) + len(medium_items) + 1):
            fix_order.append({**item, 'suggested_order': idx, 'batch': '低风险批处理'})

        return fix_order


class ReportGenerator:
    def __init__(self, config: ConfigLoader):
        self.config = config
        self.risk_levels = config.get('risk_levels', {})

    def generate_report(self,
                        scan_results: List[Dict[str, Any]],
                        all_risks: List[Dict[str, Any]],
                        ranked_risks: List[Dict[str, Any]],
                        fix_order: List[Dict[str, Any]],
                        dept_risks: Dict[str, List[Dict[str, Any]]],
                        target_dir: str,
                        output_dir: str = "reports") -> Dict[str, str]:
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')

        reports = {}

        reports['summary'] = self._generate_summary_report(
            scan_results, all_risks, ranked_risks, fix_order, target_dir, output_dir, timestamp
        )
        reports['fix_order'] = self._generate_fix_order_report(
            fix_order, output_dir, timestamp
        )
        reports['by_department'] = self._generate_department_reports(
            dept_risks, output_dir, timestamp
        )
        reports['json'] = self._generate_json_report(
            scan_results, all_risks, ranked_risks, fix_order, dept_risks, target_dir, output_dir, timestamp
        )

        return reports

    def _generate_summary_report(self, scan_results, all_risks, ranked_risks,
                                  fix_order, target_dir, output_dir, timestamp) -> str:
        report_path = os.path.join(output_dir, f"audit_summary_{timestamp}.md")

        critical = sum(1 for r in all_risks if r['risk']['level'] == 'critical')
        high = sum(1 for r in all_risks if r['risk']['level'] == 'high')
        medium = sum(1 for r in all_risks if r['risk']['level'] == 'medium')
        low = sum(1 for r in all_risks if r['risk']['level'] == 'low')

        files_scanned = len(scan_results)
        files_with_risks = len(ranked_risks)
        dirs_with_risks = sum(1 for r in ranked_risks if r['file_info']['is_dir'])

        confirmation_needed = sum(
            1 for r in all_risks if r['risk'].get('confirmation_required')
        )

        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(f"# 目录权限脱敏巡查报告\n\n")
            f.write(f"**扫描时间**: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"**扫描目录**: {target_dir}\n\n")

            f.write("## 一、扫描概览\n\n")
            f.write(f"- 扫描文件/目录总数: **{files_scanned}**\n")
            f.write(f"- 存在风险的文件/目录: **{files_with_risks}**\n")
            f.write(f"- 存在风险的目录: **{dirs_with_risks}**\n")
            f.write(f"- 风险项总数: **{len(all_risks)}**\n")
            f.write(f"- 待确认项: **{confirmation_needed}**\n\n")

            f.write("## 二、风险分布\n\n")
            f.write("| 风险等级 | 数量 | 权重 | 处理建议 |\n")
            f.write("|---------|------|------|----------|\n")
            for level in ['critical', 'high', 'medium', 'low']:
                count = sum(1 for r in all_risks if r['risk']['level'] == level)
                level_info = self.risk_levels.get(level, {})
                f.write(f"| {self._level_display(level)} | {count} | {level_info.get('weight', 0)} | {level_info.get('description', '')} |\n")
            f.write("\n")

            f.write("## 三、风险类型统计\n\n")
            type_counts = defaultdict(int)
            for r in all_risks:
                type_counts[r['risk']['type']] += 1

            f.write("| 风险类型 | 数量 | 描述 |\n")
            f.write("|---------|------|------|\n")
            for risk_type, count in sorted(type_counts.items(), key=lambda x: -x[1]):
                desc = self._get_risk_type_description(risk_type)
                f.write(f"| {risk_type} | {count} | {desc} |\n")
            f.write("\n")

            f.write("## 四、TOP 20 高风险文件\n\n")
            f.write("| 排名 | 路径 | 风险等级 | 风险数量 | 总权重 |\n")
            f.write("|------|------|---------|---------|--------|\n")
            for item in fix_order[:20]:
                top_level = self._get_top_risk_level(item['risks'])
                f.write(f"| {item['suggested_order']} | {self._truncate_path(item['path'])} | {self._level_display(top_level)} | {len(item['risks'])} | {item['total_weight']} |\n")
            f.write("\n")

            f.write("## 五、处理建议\n\n")
            f.write("### 5.1 修复顺序\n")
            total_critical = len([i for i in fix_order if i['has_critical']])
            total_high = len([i for i in fix_order if i['has_high'] and not i['has_critical']])
            f.write(f"- **第1批（严重风险）**: {total_critical} 项，立即处理\n")
            f.write(f"- **第2批（高风险）**: {total_high} 项，优先处理\n")
            f.write(f"- **第3批（中风险）**: {len([i for i in fix_order if i['batch'] == '中风险批处理'])} 项，计划处理\n")
            f.write(f"- **第4批（低风险）**: {len([i for i in fix_order if i['batch'] == '低风险批处理'])} 项，按需处理\n\n")

            f.write("### 5.2 通用修复建议\n\n")
            f.write("1. **敏感文件**: 移动到受限目录，设置严格权限，移除公开分享\n")
            f.write("2. **权限过宽**: 收紧权限，遵循最小权限原则\n")
            f.write("3. **外链问题**: 设置过期时间，定期审查分享链接\n")
            f.write("4. **无人负责**: 确认新负责人或归档/删除\n")
            f.write("5. **命名规范**: 统一文件名格式，移除空格和中文括号\n\n")

            f.write("## 六、免责声明\n\n")
            f.write("> 本报告仅基于文件名、权限和元数据进行自动化扫描，不读取文件内容。")
            f.write("所有风险项均为疑似问题，请人工核实后处理。\n\n")
            f.write(f"*报告生成时间: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n")

        return report_path

    def _generate_fix_order_report(self, fix_order, output_dir, timestamp) -> str:
        report_path = os.path.join(output_dir, f"fix_order_{timestamp}.md")

        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(f"# 建议修复顺序清单\n\n")
            f.write(f"**生成时间**: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

            current_batch = None
            for item in fix_order:
                if item['batch'] != current_batch:
                    current_batch = item['batch']
                    f.write(f"\n## {current_batch}\n\n")
                    f.write(f"| 序号 | 路径 | 类型 | 最高风险 | 风险数 | 建议修复动作 |\n")
                    f.write("|------|------|------|---------|--------|--------------|\n")

                item_type = '目录' if item['file_info']['is_dir'] else '文件'
                top_level = self._get_top_risk_level(item['risks'])
                suggestion = self._get_fix_suggestion(item['risks'])
                f.write(f"| {item['suggested_order']} | {item['path']} | {item_type} | {self._level_display(top_level)} | {len(item['risks'])} | {suggestion} |\n")

        return report_path

    def _generate_department_reports(self, dept_risks, output_dir, timestamp) -> Dict[str, str]:
        dept_dir = os.path.join(output_dir, f"by_department_{timestamp}")
        os.makedirs(dept_dir, exist_ok=True)

        reports = {}
        for dept, risks in dept_risks.items():
            dept_file = os.path.join(dept_dir, f"{dept.replace('/', '_')}_risks_{timestamp}.md")

            with open(dept_file, 'w', encoding='utf-8') as f:
                f.write(f"# {dept} - 风险项清单\n\n")
                f.write(f"**生成时间**: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"**风险项总数**: {len(risks)}\n\n")

                critical = sum(1 for r in risks if r['risk']['level'] == 'critical')
                high = sum(1 for r in risks if r['risk']['level'] == 'high')
                medium = sum(1 for r in risks if r['risk']['level'] == 'medium')
                low = sum(1 for r in risks if r['risk']['level'] == 'low')

                f.write("## 风险等级分布\n\n")
                f.write(f"- 严重: {critical}\n")
                f.write(f"- 高: {high}\n")
                f.write(f"- 中: {medium}\n")
                f.write(f"- 低: {low}\n\n")

                f.write("## 风险明细\n\n")
                f.write("| 路径 | 类型 | 风险类型 | 风险等级 | 风险描述 |\n")
                f.write("|------|------|---------|---------|----------|\n")

                for r in risks:
                    item_type = '目录' if r['file_info']['is_dir'] else '文件'
                    f.write(f"| {r['file_info']['path']} | {item_type} | {r['risk']['type']} | {self._level_display(r['risk']['level'])} | {r['risk']['description']}: {r['risk'].get('detail', '')} |\n")

                f.write("\n## 处理建议\n\n")
                if critical > 0:
                    f.write("⚠️  **存在严重风险项，请立即处理！**\n\n")
                if high > 0:
                    f.write("🔴  存在高风险项，请优先处理。\n\n")

            reports[dept] = dept_file

        return reports

    def _generate_json_report(self, scan_results, all_risks, ranked_risks,
                               fix_order, dept_risks, target_dir, output_dir, timestamp) -> str:
        import json

        report_path = os.path.join(output_dir, f"audit_report_{timestamp}.json")

        json_data = {
            'scan_info': {
                'timestamp': datetime.datetime.now().isoformat(),
                'target_directory': target_dir,
                'files_scanned': len(scan_results),
                'files_with_risks': len(ranked_risks),
                'total_risks': len(all_risks)
            },
            'risk_summary': {
                'critical': sum(1 for r in all_risks if r['risk']['level'] == 'critical'),
                'high': sum(1 for r in all_risks if r['risk']['level'] == 'high'),
                'medium': sum(1 for r in all_risks if r['risk']['level'] == 'medium'),
                'low': sum(1 for r in all_risks if r['risk']['level'] == 'low')
            },
            'fix_order': [
                {
                    'order': item['suggested_order'],
                    'batch': item['batch'],
                    'path': item['path'],
                    'is_dir': item['file_info']['is_dir'],
                    'has_critical': item['has_critical'],
                    'has_high': item['has_high'],
                    'total_weight': item['total_weight'],
                    'risks': [
                        {
                            'type': r['type'],
                            'level': r['level'],
                            'description': r['description'],
                            'detail': r.get('detail', ''),
                            'confirmation_required': r.get('confirmation_required', False)
                        } for r in item['risks']
                    ]
                } for item in fix_order
            ],
            'department_risks': {
                dept: [
                    {
                        'path': r['file_info']['path'],
                        'is_dir': r['file_info']['is_dir'],
                        'permissions': r['file_info']['permissions'],
                        'owner': r['file_info']['owner_name'],
                        'mtime': r['file_info']['mtime'].isoformat(),
                        'risk': {
                            'type': r['risk']['type'],
                            'level': r['risk']['level'],
                            'description': r['risk']['description'],
                            'detail': r['risk'].get('detail', '')
                        }
                    } for r in risks
                ] for dept, risks in dept_risks.items()
            }
        }

        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, ensure_ascii=False, indent=2)

        return report_path

    def _level_display(self, level: str) -> str:
        displays = {
            'critical': '🔴 严重',
            'high': '🟠 高',
            'medium': '🟡 中',
            'low': '🟢 低'
        }
        return displays.get(level, level)

    def _get_risk_type_description(self, risk_type: str) -> str:
        descriptions = {
            'sensitive_content': '检测到敏感内容关键词',
            'overly_broad_permission': '权限设置过宽',
            'world_readable_writable': '全局可读/可写',
            'external_link_no_expiry': '外部分享链接无过期时间',
            'external_link': '存在外部分享链接',
            'no_owner': '无负责人',
            'unowned_folder': '疑似无人负责的文件夹',
            'owner_missing': '责任人信息缺失',
            'permission_missing': '权限信息缺失',
            'departed_employee_owner': '离职员工名下文件',
            'has_space': '文件名含空格',
            'has_chinese_parentheses': '文件名含中文括号',
            'has_old_dept_abbr': '文件名含旧部门缩写'
        }
        return descriptions.get(risk_type, '其他风险')

    def _get_top_risk_level(self, risks: List[Dict[str, Any]]) -> str:
        order = ['critical', 'high', 'medium', 'low']
        for level in order:
            if any(r['level'] == level for r in risks):
                return level
        return 'low'

    def _get_fix_suggestion(self, risks: List[Dict[str, Any]]) -> str:
        suggestions = []
        for r in risks:
            t = r['type']
            if t == 'sensitive_content':
                suggestions.append('移动到安全目录')
            elif t in ['overly_broad_permission', 'world_readable_writable']:
                suggestions.append('收紧权限')
            elif t == 'external_link_no_expiry':
                suggestions.append('设置外链过期时间')
            elif t == 'external_link':
                suggestions.append('审查外链必要性')
            elif t in ['no_owner', 'unowned_folder', 'owner_missing', 'departed_employee_owner']:
                suggestions.append('确认负责人')
            elif t == 'permission_missing':
                suggestions.append('补充权限信息')
            elif t in ['has_space', 'has_chinese_parentheses', 'has_old_dept_abbr']:
                suggestions.append('规范命名')

        return '; '.join(suggestions[:2]) if suggestions else '人工核查'

    def _truncate_path(self, path: str, max_len: int = 50) -> str:
        if len(path) <= max_len:
            return path
        return '...' + path[-(max_len - 3):]


class PermissionAuditor:
    def __init__(self, config_path: str = "config.yaml"):
        self.config_loader = ConfigLoader(config_path)
        self.scanner = FileScanner(self.config_loader)
        self.detector = RiskDetector(self.config_loader)
        self.classifier = DepartmentClassifier(self.config_loader)
        self.ranker = RiskRanker(self.config_loader)
        self.reporter = ReportGenerator(self.config_loader)

    def run_audit(self, target_dir: str, output_dir: str = "reports") -> Dict[str, Any]:
        print(f"开始扫描目录: {target_dir}")
        scan_results = self.scanner.scan_directory(target_dir)
        print(f"扫描完成，共发现 {len(scan_results)} 个文件/目录")

        print("正在检测风险...")
        all_risks = []
        for file_info in scan_results:
            risks = self.detector.detect_risks(file_info)
            for risk in risks:
                all_risks.append({
                    'file_info': file_info,
                    'risk': risk
                })
        print(f"共检测到 {len(all_risks)} 个风险项")

        print("正在按部门分类...")
        dept_risks = defaultdict(list)
        for item in all_risks:
            dept = self.classifier.classify(item['file_info'])
            dept_risks[dept].append(item)
        print(f"共分为 {len(dept_risks)} 个部门/类别")

        print("正在计算风险优先级...")
        ranked_risks = self.ranker.rank_risks(all_risks)
        fix_order = self.ranker.suggest_fix_order(ranked_risks)

        print("正在生成报告...")
        reports = self.reporter.generate_report(
            scan_results, all_risks, ranked_risks, fix_order, dict(dept_risks),
            target_dir, output_dir
        )

        return {
            'scan_results': scan_results,
            'all_risks': all_risks,
            'ranked_risks': ranked_risks,
            'fix_order': fix_order,
            'dept_risks': dict(dept_risks),
            'reports': reports
        }

    def print_summary(self, result: Dict[str, Any]):
        all_risks = result['all_risks']
        critical = sum(1 for r in all_risks if r['risk']['level'] == 'critical')
        high = sum(1 for r in all_risks if r['risk']['level'] == 'high')
        medium = sum(1 for r in all_risks if r['risk']['level'] == 'medium')
        low = sum(1 for r in all_risks if r['risk']['level'] == 'low')

        print("\n" + "=" * 60)
        print("📊 扫描结果摘要")
        print("=" * 60)
        print(f"扫描文件/目录数: {len(result['scan_results'])}")
        print(f"存在风险的文件/目录: {len(result['ranked_risks'])}")
        print(f"风险项总数: {len(all_risks)}")
        print(f"  🔴 严重: {critical}")
        print(f"  🟠 高: {high}")
        print(f"  🟡 中: {medium}")
        print(f"  🟢 低: {low}")
        print("\n报告文件:")
        for name, path in result['reports'].items():
            if isinstance(path, dict):
                print(f"  {name}:")
                for dept, dept_path in path.items():
                    print(f"    - {dept}: {dept_path}")
            else:
                print(f"  {name}: {path}")
        print("=" * 60 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description='目录权限脱敏巡查脚本 - 扫描指定目录的权限风险',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python permission_audit.py /path/to/shared_drive
  python permission_audit.py /path/to/shared_drive -o ./my_reports
  python permission_audit.py /path/to/shared_drive -c custom_config.yaml
        """
    )
    parser.add_argument('directory', help='要扫描的目标目录')
    parser.add_argument('-o', '--output-dir', default='reports', help='报告输出目录 (默认: reports)')
    parser.add_argument('-c', '--config', default='config.yaml', help='配置文件路径 (默认: config.yaml)')
    parser.add_argument('--json-only', action='store_true', help='只输出JSON格式的风险数据')

    args = parser.parse_args()

    try:
        auditor = PermissionAuditor(args.config)
        result = auditor.run_audit(args.directory, args.output_dir)
        auditor.print_summary(result)
    except KeyboardInterrupt:
        print("\n扫描被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"扫描过程中发生错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
