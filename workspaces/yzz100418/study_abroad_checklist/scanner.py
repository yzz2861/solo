import os
import re
from datetime import datetime, date
from typing import List, Optional, Tuple

from .models import MaterialFile, MaterialType, Language


TRANSCRIPT_KEYWORDS = [
    "transcript", "成绩单", "成绩证明", "成绩", "score", "grades",
    "academic record", "学业成绩单",
]

RECOMMENDATION_KEYWORDS = [
    "recommendation", "推荐信", "推荐函", "rec letter", "lor",
    "letter of recommendation", "reference",
]

PASSPORT_KEYWORDS = [
    "passport", "护照", "护照页", "护照首页", "护照信息页",
    "passport copy", "passport page",
]

ESSAY_KEYWORDS = [
    "essay", "文书", "个人陈述", "ps", "personal statement",
    "statement of purpose", "sop", "动机信", "motivation",
]

CV_KEYWORDS = [
    "cv", "resume", "简历", "个人简历", "curriculum vitae",
]

CERTIFICATE_KEYWORDS = [
    "certificate", "证书", "证明", "diploma", "degree", "毕业证",
    "学位证", "toefl", "托福", "ielts", "雅思", "gre", "gmat",
]


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp", ".heic"}
DOC_EXTENSIONS = {".pdf", ".doc", ".docx", ".pages", ".txt", ".rtf"}


def scan_student_directory(student_dir: str, recursive: bool = True) -> List[MaterialFile]:
    materials = []

    if not os.path.isdir(student_dir):
        raise NotADirectoryError(f"学生目录不存在: {student_dir}")

    for root, dirs, files in os.walk(student_dir):
        for filename in files:
            filepath = os.path.join(root, filename)

            if _is_hidden_file(filename):
                continue
            if filename.lower().endswith((".yaml", ".yml")):
                continue

            try:
                stat = os.stat(filepath)
                material = _analyze_file(filepath, filename, stat)
                if material:
                    materials.append(material)
            except OSError:
                continue

        if not recursive:
            break

    return materials


def _is_hidden_file(filename: str) -> bool:
    return filename.startswith(".") or filename.startswith("~")


def _analyze_file(filepath: str, filename: str, stat) -> Optional[MaterialFile]:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in IMAGE_EXTENSIONS and ext not in DOC_EXTENSIONS:
        return None

    material_type = _detect_material_type(filename)
    if material_type == MaterialType.OTHER:
        return None

    language = _detect_language(filename)
    version = _detect_version(filename)
    is_final = _is_final_version(filename)
    is_photo = _is_photo_file(filename, ext)
    recommender = _detect_recommender(filename) if material_type == MaterialType.RECOMMENDATION else None
    essay_hint = _detect_essay_hint(filename) if material_type == MaterialType.ESSAY else None
    school_hint = _detect_school_hint(filename)
    has_signature = _detect_signature_hint(filename)
    expiry = _detect_passport_expiry(filename) if material_type == MaterialType.PASSPORT else None

    return MaterialFile(
        file_path=filepath,
        file_name=filename,
        file_size=stat.st_size,
        modified_time=stat.st_mtime,
        material_type=material_type,
        language=language,
        version=version,
        is_final=is_final,
        is_photo=is_photo,
        has_signature=has_signature,
        recommender_name=recommender,
        expiry_date=expiry,
        essay_prompt_hint=essay_hint,
        school_hint=school_hint,
    )


def _detect_material_type(filename: str) -> MaterialType:
    name_lower = filename.lower()

    for kw in TRANSCRIPT_KEYWORDS:
        if kw.lower() in name_lower:
            return MaterialType.TRANSCRIPT

    for kw in RECOMMENDATION_KEYWORDS:
        if kw.lower() in name_lower:
            return MaterialType.RECOMMENDATION

    for kw in PASSPORT_KEYWORDS:
        if kw.lower() in name_lower:
            return MaterialType.PASSPORT

    for kw in ESSAY_KEYWORDS:
        if kw.lower() in name_lower:
            return MaterialType.ESSAY

    for kw in CV_KEYWORDS:
        if kw.lower() in name_lower:
            return MaterialType.CV

    for kw in CERTIFICATE_KEYWORDS:
        if kw.lower() in name_lower:
            return MaterialType.CERTIFICATE

    return MaterialType.OTHER


def _detect_language(filename: str) -> Optional[Language]:
    name_lower = filename.lower()

    has_en = any(kw in name_lower for kw in [
        "en", "english", "英文", "英语", "英文版", "en版",
    ])
    has_cn = any(kw in name_lower for kw in [
        "cn", "chinese", "中文", "中文版", "汉语", "cn版", "中版",
    ])
    has_both = any(kw in name_lower for kw in [
        "both", "双语", "中英文", "中英对照", "中英双语",
    ])

    if has_both:
        return Language.BOTH
    if has_en and has_cn:
        return Language.BOTH
    if has_en:
        return Language.EN
    if has_cn:
        return Language.CN
    return None


def _detect_version(filename: str) -> Optional[str]:
    patterns = [
        r'(?:v|ver|version)[\s_.-]?(\d+(?:\.\d+)?)',
        r'(\d+(?:\.\d+)?)\s*版',
        r'第\s*(\d+)\s*版',
        r'(final\d+)',
        r'(draft\d+)',
    ]

    for pattern in patterns:
        match = re.search(pattern, filename, re.IGNORECASE)
        if match:
            return match.group(1)

    return None


def _is_final_version(filename: str) -> bool:
    name_lower = filename.lower()
    final_markers = ["final", "最终", "终稿", "定稿", "最终版"]
    draft_markers = ["draft", "草稿", "初稿", "草案"]

    has_final = any(marker in name_lower for marker in final_markers)
    has_draft = any(marker in name_lower for marker in draft_markers)

    return has_final and not has_draft


def _is_photo_file(filename: str, ext: str) -> bool:
    if ext in IMAGE_EXTENSIONS:
        return True
    name_lower = filename.lower()
    photo_markers = ["photo", "照片", "拍照", "扫描件", "scanned", "scan", "图片"]
    return any(marker in name_lower for marker in photo_markers)


def _detect_recommender(filename: str) -> Optional[str]:
    excluded_words = {
        "推荐信", "推荐函", "推荐", "签名", "已签名", "未签名", "无签名",
        "推荐人", "推荐教授", "老师", "教授", "professor", "prof",
        "from", "by", "of",
    }

    patterns = [
        r'([\u4e00-\u9fa5]{2,4})[\s_.-]*(?:教授|老师|professor|prof)',
        r'(?:推荐信|推荐函|rec|recommendation)[\s_.-]*([\u4e00-\u9fa5a-zA-Z]+)[\s_.-]*(?:教授|老师)?',
        r'(?:from|by)[\s_.-]*([\u4e00-\u9fa5a-zA-Z]+)',
    ]

    for pattern in patterns:
        match = re.search(pattern, filename, re.IGNORECASE)
        if match:
            name = match.group(1).strip("_.-")
            if name.lower() not in [w.lower() for w in excluded_words] and len(name) >= 2:
                return name

    parts = re.split(r'[\s_.-]+', filename)
    for i, part in enumerate(parts):
        if re.match(r'^[\u4e00-\u9fa5]{2,3}$', part) and part not in excluded_words:
            if i + 1 < len(parts) and parts[i + 1] in ("教授", "老师"):
                return part
            if i > 0 and parts[i - 1] in ("推荐信", "推荐函"):
                return part

    return None


def _detect_essay_hint(filename: str) -> Optional[str]:
    name_lower = filename.lower()

    prompt_markers = [
        "为什么选择", "为什么申请", "职业目标", "学术背景",
        "研究兴趣", "why", "goal", "purpose", "motivation",
        "个人经历", "项目经历",
    ]

    for marker in prompt_markers:
        if marker in name_lower:
            return marker

    return None


def _detect_school_hint(filename: str) -> Optional[str]:
    name_lower = filename.lower()

    schools = [
        ("哥伦比亚大学", ["哥伦比亚", "哥大", "columbia", "cu"]),
        ("纽约大学", ["纽约", "nyu", "new york"]),
        ("南加州大学", ["南加大", "usc", "southern california"]),
        ("斯坦福大学", ["斯坦福", "stanford"]),
        ("哈佛大学", ["哈佛", "harvard"]),
        ("麻省理工", ["mit", "麻省理工"]),
    ]

    for school_name, aliases in schools:
        for alias in aliases:
            if alias in name_lower:
                return school_name

    return None


def _detect_signature_hint(filename: str) -> Optional[bool]:
    name_lower = filename.lower()

    unsigned_markers = ["unsigned", "无签名", "未签名", "没签名", "待签名", "without signature"]
    has_unsigned = any(m in name_lower for m in unsigned_markers)

    if has_unsigned:
        return False

    signed_markers = ["signed", "已签名", "已签字", "签字版", "签名版", "signed version"]
    has_signed = any(m in name_lower for m in signed_markers)

    if has_signed:
        return True

    if "签名" in name_lower or "签字" in name_lower:
        return None

    return None


def _detect_passport_expiry(filename: str) -> Optional[date]:
    patterns = [
        r'(?:有效期至|有效期到|过期日期|到期日|expir(y|es)? date|valid until)[\s_.-]*[:：]?\s*(\d{4}[-/年.]\d{1,2}[-/月.]\d{1,2}日?)',
        r'(?:有效期|过期|到期|expir)[\s_.-]*[:：至到]?\s*(\d{4}[-/年.]\d{1,2}[-/月.]\d{1,2}日?)',
        r'(\d{4}[-/年.]\d{1,2}[-/月.]\d{1,2}日?)\s*(?:过期|到期|有效)',
    ]

    for pattern in patterns:
        match = re.search(pattern, filename, re.IGNORECASE)
        if match:
            date_str = match.group(2) if match.lastindex and match.lastindex >= 2 else match.group(1)
            try:
                date_str_clean = re.sub(r'[年月日.]', '-', date_str).rstrip('-')
                return datetime.strptime(date_str_clean, "%Y-%m-%d").date()
            except ValueError:
                pass

    return None


def check_filename_clarity(material: MaterialFile) -> Tuple[bool, List[str]]:
    problems = []
    mtype = material.material_type

    if mtype == MaterialType.TRANSCRIPT:
        if material.language is None:
            problems.append("成绩单未标明语言版本")

    elif mtype == MaterialType.RECOMMENDATION:
        if material.recommender_name is None:
            problems.append("推荐信未标明推荐人")

    elif mtype == MaterialType.ESSAY:
        if material.school_hint is None:
            problems.append("文书未标明对应学校")
        if material.essay_prompt_hint is None and material.school_hint is None:
            problems.append("文书未标明题目方向")

    elif mtype == MaterialType.CV:
        if material.language is None:
            problems.append("简历未标明语言版本")

    elif mtype == MaterialType.PASSPORT:
        if material.expiry_date is None:
            problems.append("护照文件未标明有效期")

    return len(problems) == 0, problems
