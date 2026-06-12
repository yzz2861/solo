from datetime import date, timedelta
from typing import List, Dict, Set, Tuple
from collections import defaultdict

from .models import (
    StudentProfile, SchoolRequirement, MaterialFile, Issue,
    MaterialType, IssueCategory, IssueSeverity, Language
)
from .scanner import check_filename_clarity


def run_all_checks(profile: StudentProfile) -> List[Issue]:
    issues = []

    issues.extend(check_material_completeness(profile))
    issues.extend(check_filename_naming(profile))
    issues.extend(check_version_issues(profile))
    issues.extend(check_signature_issues(profile))
    issues.extend(check_passport_expiry(profile))
    issues.extend(check_essay_conflicts(profile))
    issues.extend(check_photo_transcripts(profile))

    return issues


def check_material_completeness(profile: StudentProfile) -> List[Issue]:
    issues = []

    for school in profile.schools:
        school_materials = _filter_materials_for_school(profile.materials, school)

        for req in school.required_materials:
            req_type = req.get("type", "")
            req_name = req.get("name", req_type)
            material_type = _get_material_type(req_type)

            if material_type == MaterialType.OTHER:
                continue

            if material_type == MaterialType.RECOMMENDATION:
                count = req.get("count", 1)
                recs = [m for m in school_materials if m.material_type == MaterialType.RECOMMENDATION]
                if len(recs) < count:
                    issues.append(Issue(
                        category=IssueCategory.MISSING,
                        severity=IssueSeverity.CRITICAL,
                        message=f"推荐信不足，需要{count}封，当前只有{len(recs)}封",
                        material_type=MaterialType.RECOMMENDATION,
                        school=school.school_name,
                        details=f"学校要求{count}封推荐信，请补充剩余的{count - len(recs)}封",
                    ))
                continue

            matched = [m for m in school_materials if m.material_type == material_type]

            if not matched:
                issues.append(Issue(
                    category=IssueCategory.MISSING,
                    severity=IssueSeverity.CRITICAL,
                    message=f"缺少{req_name}",
                    material_type=material_type,
                    school=school.school_name,
                    details=f"学校要求提交{req_name}，当前目录中未找到对应材料",
                ))
                continue

            required_language = req.get("language")
            if required_language:
                lang_ok = _check_language_requirement(matched, required_language)
                if not lang_ok:
                    lang_label = {"en": "英文", "cn": "中文", "both": "中英文"}.get(required_language, required_language)
                    issues.append(Issue(
                        category=IssueCategory.MISSING,
                        severity=IssueSeverity.WARNING,
                        message=f"{req_name}语言版本不全，需要{lang_label}版",
                        material_type=material_type,
                        school=school.school_name,
                        details=f"学校要求提供{lang_label}版本的{req_name}",
                    ))

    return issues


def check_filename_naming(profile: StudentProfile) -> List[Issue]:
    issues = []

    for material in profile.materials:
        is_clear, problems = check_filename_clarity(material)
        if not is_clear:
            for problem in problems:
                issues.append(Issue(
                    category=IssueCategory.FILENAME,
                    severity=IssueSeverity.WARNING,
                    message=f"文件名不规范: {problem}",
                    material_type=material.material_type,
                    file_name=material.file_name,
                    details=f"文件「{material.file_name}」-{problem}，建议重命名以便识别",
                ))

    return issues


def check_version_issues(profile: StudentProfile) -> List[Issue]:
    issues = []

    type_groups = defaultdict(list)
    for m in profile.materials:
        key = (m.material_type, m.school_hint or "general", m.recommender_name or "")
        type_groups[key].append(m)

    for key, materials in type_groups.items():
        if len(materials) <= 1:
            continue

        has_final = any(m.is_final for m in materials)
        if not has_final:
            issues.append(Issue(
                category=IssueCategory.VERSION,
                severity=IssueSeverity.WARNING,
                message=f"存在多个版本但没有标记为final的版本",
                material_type=key[0],
                details=f"找到{len(materials)}个版本，但没有明确的最终版本，请确认使用哪个版本",
            ))
        elif sum(1 for m in materials if m.is_final) > 1:
            final_files = [m.file_name for m in materials if m.is_final]
            issues.append(Issue(
                category=IssueCategory.VERSION,
                severity=IssueSeverity.WARNING,
                message=f"存在多个标记为final的版本",
                material_type=key[0],
                details=f"有多个文件标记为最终版本: {', '.join(final_files)}，请确认哪个是最新的",
            ))

        has_final2 = any("final2" in m.file_name.lower() for m in materials)
        if has_final2:
            issues.append(Issue(
                category=IssueCategory.VERSION,
                severity=IssueSeverity.INFO,
                message=f"检测到'final2'命名，建议使用版本号或日期代替",
                material_type=key[0],
                details="使用final2/final3等命名容易混淆，建议使用v1/v2或日期标注",
            ))

    return issues


def check_signature_issues(profile: StudentProfile) -> List[Issue]:
    issues = []
    seen_issues = set()

    all_recs = [m for m in profile.materials if m.material_type == MaterialType.RECOMMENDATION]

    schools_need_signature = []
    for school in profile.schools:
        for req in school.required_materials:
            if req.get("type") == "recommendation" and req.get("need_signature", True):
                schools_need_signature.append(school.school_name)
                break

    for rec in all_recs:
        if rec.has_signature is False:
            key = (rec.file_name, "unsigned")
            if key not in seen_issues:
                seen_issues.add(key)
                school_list = ", ".join(schools_need_signature) if schools_need_signature else "所有申请学校"
                issues.append(Issue(
                    category=IssueCategory.SIGNATURE,
                    severity=IssueSeverity.CRITICAL,
                    message=f"推荐信缺少签名: {rec.recommender_name or '未知推荐人'}",
                    material_type=MaterialType.RECOMMENDATION,
                    file_name=rec.file_name,
                    details=f"推荐信「{rec.file_name}」未签名。涉及学校: {school_list}",
                ))
        elif rec.has_signature is None:
            key = (rec.file_name, "unknown")
            if key not in seen_issues:
                seen_issues.add(key)
                school_list = ", ".join(schools_need_signature) if schools_need_signature else "所有申请学校"
                issues.append(Issue(
                    category=IssueCategory.SIGNATURE,
                    severity=IssueSeverity.WARNING,
                    message=f"请确认推荐信是否有签名: {rec.recommender_name or '未知推荐人'}",
                    material_type=MaterialType.RECOMMENDATION,
                    file_name=rec.file_name,
                    details=f"请确认推荐信「{rec.file_name}」是否有教授签名。涉及学校: {school_list}",
                ))

    return issues


def check_passport_expiry(profile: StudentProfile) -> List[Issue]:
    issues = []
    today = date.today()

    passports = [m for m in profile.materials if m.material_type == MaterialType.PASSPORT]

    min_validity_months = 6
    for school in profile.schools:
        for req in school.required_materials:
            if req.get("type") == "passport":
                min_validity_months = max(min_validity_months, req.get("min_validity_months", 6))
                break

    for passport in passports:
        if passport.expiry_date:
            months_left = (passport.expiry_date.year - today.year) * 12 + (passport.expiry_date.month - today.month)
            if passport.expiry_date.day < today.day:
                months_left -= 1

            if passport.expiry_date <= today:
                issues.append(Issue(
                    category=IssueCategory.PASSPORT_EXPIRY,
                    severity=IssueSeverity.CRITICAL,
                    message="护照已过期",
                    material_type=MaterialType.PASSPORT,
                    file_name=passport.file_name,
                    details=f"护照有效期至{passport.expiry_date}，已经过期，请立即更新",
                ))
            elif months_left < min_validity_months:
                issues.append(Issue(
                    category=IssueCategory.PASSPORT_EXPIRY,
                    severity=IssueSeverity.WARNING,
                    message=f"护照有效期不足{min_validity_months}个月（剩余约{months_left}个月）",
                    material_type=MaterialType.PASSPORT,
                    file_name=passport.file_name,
                    details=f"护照有效期至{passport.expiry_date}，建议确保有效期至少到申请后{min_validity_months}个月",
                ))
        else:
            issues.append(Issue(
                category=IssueCategory.PASSPORT_EXPIRY,
                severity=IssueSeverity.INFO,
                message="无法从文件名判断护照有效期，请确认",
                material_type=MaterialType.PASSPORT,
                file_name=passport.file_name,
                details=f"建议在文件名中标注有效期，例如：护照_有效期至2028-06-01.pdf",
            ))

    return issues


def check_essay_conflicts(profile: StudentProfile) -> List[Issue]:
    issues = []

    essay_groups = defaultdict(list)
    for m in profile.materials:
        if m.material_type != MaterialType.ESSAY:
            continue
        key = m.school_hint or "未指定学校"
        essay_groups[key].append(m)

    school_essay_requirements = {}
    for school in profile.schools:
        essay_reqs = [
            req for req in school.required_materials
            if req.get("type") == "essay"
        ]
        if essay_reqs:
            school_essay_requirements[school.school_name] = essay_reqs

    for school_name, essay_reqs in school_essay_requirements.items():
        school_essays = [
            m for m in profile.materials
            if m.material_type == MaterialType.ESSAY
            and (m.school_hint == school_name or m.school_hint is None)
        ]

        if len(essay_reqs) > 1 and len(school_essays) < len(essay_reqs):
            essay_titles = [req.get("prompt", req.get("name", "")) for req in essay_reqs]
            issues.append(Issue(
                category=IssueCategory.ESSAY_CONFLICT,
                severity=IssueSeverity.WARNING,
                message=f"学校需要{len(essay_reqs)}篇文书，但只找到{len(school_essays)}篇",
                material_type=MaterialType.ESSAY,
                school=school_name,
                details=f"题目包括: {'; '.join(essay_titles)}",
            ))

    general_essays = [m for m in profile.materials if m.material_type == MaterialType.ESSAY and m.school_hint is None]
    if general_essays and len(profile.schools) > 1:
        school_names = [s.school_name for s in profile.schools]
        essay_files = [m.file_name for m in general_essays]
        issues.append(Issue(
            category=IssueCategory.ESSAY_CONFLICT,
            severity=IssueSeverity.WARNING,
            message=f"有{len(general_essays)}篇文书未指定学校，可能多校共用",
            material_type=MaterialType.ESSAY,
            details=f"共用文书: {', '.join(essay_files)}。请注意不同学校文书要求可能不同，建议检查是否需要调整",
        ))

    return issues


def check_photo_transcripts(profile: StudentProfile) -> List[Issue]:
    issues = []

    transcripts = [m for m in profile.materials if m.material_type == MaterialType.TRANSCRIPT]

    for transcript in transcripts:
        if transcript.is_photo:
            issues.append(Issue(
                category=IssueCategory.PHOTO_COPY,
                severity=IssueSeverity.WARNING,
                message="成绩单可能是照片/扫描版",
                material_type=MaterialType.TRANSCRIPT,
                file_name=transcript.file_name,
                details=f"成绩单「{transcript.file_name}」是图片格式，部分学校可能要求PDF或官方电子成绩单",
            ))

    return issues


def _filter_materials_for_school(materials: List[MaterialFile], school: SchoolRequirement) -> List[MaterialFile]:
    school_materials = []
    for m in materials:
        if m.school_hint and m.school_hint == school.school_name:
            school_materials.append(m)
        elif m.school_hint is None:
            school_materials.append(m)
    return school_materials


def _get_material_type(type_str: str) -> MaterialType:
    mapping = {
        "transcript": MaterialType.TRANSCRIPT,
        "recommendation": MaterialType.RECOMMENDATION,
        "passport": MaterialType.PASSPORT,
        "essay": MaterialType.ESSAY,
        "cv": MaterialType.CV,
        "personal_statement": MaterialType.PERSONAL_STATEMENT,
        "certificate": MaterialType.CERTIFICATE,
    }
    return mapping.get(type_str.lower(), MaterialType.OTHER)


def _check_language_requirement(materials: List[MaterialFile], required: str) -> bool:
    if required == "both":
        has_en = any(m.language in (Language.EN, Language.BOTH) for m in materials)
        has_cn = any(m.language in (Language.CN, Language.BOTH) for m in materials)
        return has_en and has_cn
    elif required == "en":
        return any(m.language in (Language.EN, Language.BOTH) for m in materials)
    elif required == "cn":
        return any(m.language in (Language.CN, Language.BOTH) for m in materials)
    return True
