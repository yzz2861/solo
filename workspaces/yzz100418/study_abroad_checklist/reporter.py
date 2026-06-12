from datetime import date, timedelta
from typing import List, Dict
from collections import defaultdict

from .models import (
    StudentProfile, SchoolRequirement, Issue,
    IssueSeverity, IssueCategory, MaterialType
)


SEVERITY_ICONS = {
    IssueSeverity.CRITICAL: "🔴",
    IssueSeverity.WARNING: "🟡",
    IssueSeverity.INFO: "🔵",
}

CATEGORY_LABELS = {
    IssueCategory.MISSING: "材料缺失",
    IssueCategory.VERSION: "版本问题",
    IssueCategory.FILENAME: "文件名问题",
    IssueCategory.SIGNATURE: "签名问题",
    IssueCategory.PASSPORT_EXPIRY: "护照有效期",
    IssueCategory.ESSAY_CONFLICT: "文书冲突",
    IssueCategory.PHOTO_COPY: "照片版材料",
    IssueCategory.INTERNAL_NOTE: "内部备注",
}

MATERIAL_TYPE_LABELS = {
    MaterialType.TRANSCRIPT: "成绩单",
    MaterialType.RECOMMENDATION: "推荐信",
    MaterialType.PASSPORT: "护照",
    MaterialType.ESSAY: "文书",
    MaterialType.CV: "简历",
    MaterialType.PERSONAL_STATEMENT: "个人陈述",
    MaterialType.CERTIFICATE: "证书/成绩",
    MaterialType.OTHER: "其他",
}


def generate_report(
    profile: StudentProfile,
    mode: str = "consultant",
    sort_by: str = "deadline",
) -> str:
    """
    生成报告
    mode: consultant（顾问版，含内部备注）/ student（学生版，隐藏内部备注）
    sort_by: deadline（按截止日）/ issue_count（按问题数量）
    """
    lines = []

    lines.append("=" * 60)
    lines.append(f"📋 留学材料清点报告 - {profile.name}")
    lines.append("=" * 60)
    lines.append(f"生成时间: {date.today().strftime('%Y-%m-%d')}")
    lines.append(f"申请学校数: {len(profile.schools)}所")
    lines.append(f"材料文件数: {len(profile.materials)}个")
    lines.append(f"问题总数: {len(profile.issues)}个")
    lines.append("")

    sorted_schools = _sort_schools(profile.schools, profile.issues, sort_by)

    lines.append(_generate_summary_section(profile, sorted_schools))
    lines.append("")

    lines.append(_generate_school_detail_section(profile, sorted_schools, mode))
    lines.append("")

    lines.append(_generate_issue_list_section(profile, mode))
    lines.append("")

    lines.append(_generate_action_items_section(profile, mode))
    lines.append("")

    lines.append("=" * 60)
    lines.append("报告结束")
    lines.append("=" * 60)

    return "\n".join(lines)


def _sort_schools(
    schools: List[SchoolRequirement],
    issues: List[Issue],
    sort_by: str,
) -> List[SchoolRequirement]:
    if sort_by == "issue_count":
        school_issue_counts = defaultdict(int)
        for issue in issues:
            if issue.school:
                school_issue_counts[issue.school] += 1

        return sorted(
            schools,
            key=lambda s: (-school_issue_counts.get(s.school_name, 0), s.deadline),
        )
    else:
        return sorted(schools, key=lambda s: s.deadline)


def _generate_summary_section(
    profile: StudentProfile,
    sorted_schools: List[SchoolRequirement],
) -> str:
    lines = []
    lines.append("📊 学校申请概览")
    lines.append("-" * 40)

    today = date.today()

    for i, school in enumerate(sorted_schools, 1):
        days_left = (school.deadline - today).days
        urgency = _get_urgency_label(days_left)

        school_issues = [iss for iss in profile.issues if iss.school == school.school_name]
        critical_count = sum(1 for iss in school_issues if iss.severity == IssueSeverity.CRITICAL)
        warning_count = sum(1 for iss in school_issues if iss.severity == IssueSeverity.WARNING)

        lines.append(
            f"{i}. {school.school_name} - {school.program}"
        )
        lines.append(
            f"   截止日期: {school.deadline.strftime('%Y-%m-%d')} {urgency}"
        )
        lines.append(
            f"   问题: 🔴{critical_count}个严重 🟡{warning_count}个提醒"
        )

    return "\n".join(lines)


def _get_urgency_label(days_left: int) -> str:
    if days_left < 0:
        return "❌ 已过期"
    elif days_left <= 3:
        return "🔥 紧急"
    elif days_left <= 7:
        return "⏰ 即将截止"
    elif days_left <= 30:
        return "📅 近期"
    else:
        return "✅ 充足"


def _generate_school_detail_section(
    profile: StudentProfile,
    sorted_schools: List[SchoolRequirement],
    mode: str,
) -> str:
    lines = []
    lines.append("📚 各校材料详情")
    lines.append("-" * 40)

    for school in sorted_schools:
        school_issues = [iss for iss in profile.issues if iss.school == school.school_name]

        lines.append(f"\n📍 {school.school_name}")
        lines.append(f"   项目: {school.program}")
        lines.append(f"   截止: {school.deadline.strftime('%Y-%m-%d')}")
        lines.append("")

        lines.append("   材料清单:")
        for req in school.required_materials:
            req_name = req.get("name", req.get("type", ""))
            req_type = req.get("type", "")
            material_type = _get_material_type_enum(req_type)

            school_materials = [
                m for m in profile.materials
                if m.material_type == material_type
                and (m.school_hint == school.school_name or m.school_hint is None)
            ]

            if material_type == MaterialType.RECOMMENDATION:
                count = req.get("count", 1)
                status = "✅" if len(school_materials) >= count else "❌"
                lines.append(f"   {status} {req_name} ({len(school_materials)}/{count}封)")
                for rec in school_materials:
                    rec_status = " "
                    if rec.has_signature is False:
                        rec_status = "⚠️缺签名"
                    elif rec.has_signature is None:
                        rec_status = "❓待确认签名"
                    recommender = rec.recommender_name or "未知推荐人"
                    lines.append(f"      • {recommender}: {rec.file_name} {rec_status}")
            else:
                status = "✅" if school_materials else "❌"
                lines.append(f"   {status} {req_name}")
                for mat in school_materials:
                    lang_label = _get_language_label(mat)
                    lines.append(f"      • {mat.file_name} {lang_label}")

        if school.notes:
            lines.append("")
            lines.append(f"   备注: {school.notes}")

        if mode == "consultant" and school.internal_notes:
            lines.append("")
            lines.append(f"   🔒 内部备注: {school.internal_notes}")

        if school_issues:
            lines.append("")
            lines.append(f"   问题列表 ({len(school_issues)}个):")
            for issue in school_issues:
                icon = SEVERITY_ICONS.get(issue.severity, "•")
                lines.append(f"   {icon} {issue.message}")

    return "\n".join(lines)


def _generate_issue_list_section(profile: StudentProfile, mode: str) -> str:
    lines = []
    lines.append("⚠️ 全部问题汇总")
    lines.append("-" * 40)

    critical_issues = [i for i in profile.issues if i.severity == IssueSeverity.CRITICAL]
    warning_issues = [i for i in profile.issues if i.severity == IssueSeverity.WARNING]
    info_issues = [i for i in profile.issues if i.severity == IssueSeverity.INFO]

    if mode != "consultant":
        info_issues = [i for i in info_issues if i.category != IssueCategory.INTERNAL_NOTE]

    all_sorted = critical_issues + warning_issues + info_issues

    if not all_sorted:
        lines.append("✅ 没有发现问题！")
        return "\n".join(lines)

    for i, issue in enumerate(all_sorted, 1):
        icon = SEVERITY_ICONS.get(issue.severity, "•")
        category = CATEGORY_LABELS.get(issue.category, issue.category.value)
        school = f"[{issue.school}]" if issue.school else ""
        file_info = f" ({issue.file_name})" if issue.file_name else ""

        lines.append(f"{i}. {icon} {category}{school} - {issue.message}{file_info}")
        if issue.details:
            lines.append(f"   {issue.details}")

    return "\n".join(lines)


def _generate_action_items_section(profile: StudentProfile, mode: str) -> str:
    lines = []
    lines.append("✅ 待办事项清单 (按优先级)")
    lines.append("-" * 40)

    critical_issues = [i for i in profile.issues if i.severity == IssueSeverity.CRITICAL]
    warning_issues = [i for i in profile.issues if i.severity == IssueSeverity.WARNING]

    if mode != "consultant":
        critical_issues = [i for i in critical_issues if i.category != IssueCategory.INTERNAL_NOTE]
        warning_issues = [i for i in warning_issues if i.category != IssueCategory.INTERNAL_NOTE]

    critical_actions = _deduplicate_actions(critical_issues)
    warning_actions = _deduplicate_actions(warning_issues)

    action_items = []
    for action in critical_actions:
        action_items.append(("🔴 紧急", action))
    for action in warning_actions:
        action_items.append(("🟡 重要", action))

    if not action_items:
        lines.append("🎉 所有材料都齐全啦！")
        return "\n".join(lines)

    for i, (priority, action) in enumerate(action_items, 1):
        lines.append(f"{i}. {priority}: {action}")

    return "\n".join(lines)


def _issue_to_action(issue: Issue) -> str:
    if issue.category == IssueCategory.MISSING:
        material = MATERIAL_TYPE_LABELS.get(issue.material_type, "材料")
        school = issue.school or "对应学校"
        return f"补充{school}的{material}"

    if issue.category == IssueCategory.SIGNATURE:
        return f"请推荐人在推荐信上签名 ({issue.file_name})"

    if issue.category == IssueCategory.PASSPORT_EXPIRY:
        return "更新护照或确认护照有效期"

    if issue.category == IssueCategory.VERSION:
        return "确认材料最终版本，清理旧版本"

    if issue.category == IssueCategory.FILENAME:
        return f"重命名文件使其更清晰 ({issue.file_name})"

    if issue.category == IssueCategory.ESSAY_CONFLICT:
        return "检查并调整各校文书，确保符合不同学校要求"

    if issue.category == IssueCategory.PHOTO_COPY:
        return "确认照片版成绩单是否符合学校要求，必要时准备正式电子版"

    return issue.message


def _deduplicate_actions(issues: List[Issue]) -> List[str]:
    actions = []
    seen = set()

    filename_issues = defaultdict(list)
    other_issues = []

    for issue in issues:
        if issue.category == IssueCategory.FILENAME and issue.file_name:
            filename_issues[issue.file_name].append(issue)
        else:
            other_issues.append(issue)

    for file_name, file_issues in filename_issues.items():
        problems = [iss.message for iss in file_issues]
        if len(problems) > 1:
            action = f"优化文件名: {file_name} ({'; '.join(problems)})"
        else:
            action = f"重命名文件使其更清晰 ({file_name})"
        if action not in seen:
            seen.add(action)
            actions.append(action)

    for issue in other_issues:
        action = _issue_to_action(issue)
        if action and action not in seen:
            seen.add(action)
            actions.append(action)

    return actions


def _get_material_type_enum(type_str: str) -> MaterialType:
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


def _get_language_label(material) -> str:
    if material.language is None:
        return ""
    labels = {"en": "[英文]", "cn": "[中文]", "both": "[中英文]"}
    return labels.get(material.language.value, "")


def generate_student_report(profile: StudentProfile, sort_by: str = "deadline") -> str:
    return generate_report(profile, mode="student", sort_by=sort_by)


def generate_consultant_report(profile: StudentProfile, sort_by: str = "deadline") -> str:
    return generate_report(profile, mode="consultant", sort_by=sort_by)


def get_days_until_deadline(school: SchoolRequirement) -> int:
    return (school.deadline - date.today()).days
