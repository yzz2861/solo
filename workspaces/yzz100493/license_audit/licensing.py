from __future__ import annotations

import re
from typing import List, Optional, Tuple

from license_audit.config import WhiteListConfig
from license_audit.models import LicenseCategory, LicenseInfo


LICENSE_ALIASES = {
    "mit": "MIT",
    "the mit license": "MIT",
    "mit license": "MIT",
    "expat": "MIT",
    "bsd": "BSD-3-Clause",
    "bsd license": "BSD-3-Clause",
    "bsd-2": "BSD-2-Clause",
    "bsd2": "BSD-2-Clause",
    "bsd 2-clause": "BSD-2-Clause",
    "bsd-3": "BSD-3-Clause",
    "bsd3": "BSD-3-Clause",
    "bsd 3-clause": "BSD-3-Clause",
    "new bsd": "BSD-3-Clause",
    "modified bsd": "BSD-3-Clause",
    "apache": "Apache-2.0",
    "apache 2": "Apache-2.0",
    "apache 2.0": "Apache-2.0",
    "apache-2": "Apache-2.0",
    "apache license 2.0": "Apache-2.0",
    "apache software license": "Apache-2.0",
    "asl 2.0": "Apache-2.0",
    "asl-2.0": "Apache-2.0",
    "gpl": "GPL-2.0",
    "gplv2": "GPL-2.0",
    "gpl v2": "GPL-2.0",
    "gpl-2": "GPL-2.0",
    "gpl 2.0": "GPL-2.0",
    "gnu gpl v2": "GPL-2.0",
    "gnu general public license v2": "GPL-2.0",
    "gplv3": "GPL-3.0",
    "gpl v3": "GPL-3.0",
    "gpl-3": "GPL-3.0",
    "gpl 3.0": "GPL-3.0",
    "gnu gpl v3": "GPL-3.0",
    "gnu general public license v3": "GPL-3.0",
    "agpl": "AGPL-3.0",
    "agplv3": "AGPL-3.0",
    "agpl-3": "AGPL-3.0",
    "agpl 3.0": "AGPL-3.0",
    "lgpl": "LGPL-3.0",
    "lgplv3": "LGPL-3.0",
    "lgpl-3": "LGPL-3.0",
    "lgpl 3.0": "LGPL-3.0",
    "lgplv2.1": "LGPL-2.1",
    "lgpl-2.1": "LGPL-2.1",
    "mpl": "MPL-2.0",
    "mpl 2.0": "MPL-2.0",
    "mpl-2": "MPL-2.0",
    "mozilla public license 2.0": "MPL-2.0",
    "isc": "ISC",
    "isc license": "ISC",
    "psf": "PSF",
    "python": "Python-2.0",
    "python-2": "Python-2.0",
    "python 2.0": "Python-2.0",
    "python software foundation": "Python-2.0",
    "unlicense": "Unlicense",
    "the unlicense": "Unlicense",
    "cc0": "CC0-1.0",
    "cc0-1": "CC0-1.0",
    "cc0 1.0": "CC0-1.0",
    "creative commons zero": "CC0-1.0",
    "zlib": "Zlib",
    "zlib/libpng": "Zlib",
    "x11": "X11",
    "sspl": "SSPL-1.0",
    "sspl-1": "SSPL-1.0",
    "sspl 1.0": "SSPL-1.0",
    "server side public license": "SSPL-1.0",
    "eupl": "EUPL-1.2",
    "eupl-1.2": "EUPL-1.2",
    "proprietary": "Proprietary",
    "commercial": "Commercial",
    "unknown": "UNKNOWN",
    "none": "UNKNOWN",
    "no license": "UNKNOWN",
    "": "UNKNOWN",
}


SPDX_PATTERN = re.compile(r"^[A-Za-z][A-Za-z0-9.+_\-]*$")
DUAL_PATTERN = re.compile(r"\s+(OR|and|/|\|)\s+", re.IGNORECASE)
PAREN_PATTERN = re.compile(r"[()]", re.IGNORECASE)
WITH_PATTERN = re.compile(r"\s+WITH\s+", re.IGNORECASE)


def _canonicalize(raw: str) -> str:
    s = raw.strip().lower()
    s = re.sub(r"^['\"]|['\"]$", "", s)
    return s


def normalize_license(raw: str) -> List[str]:
    if not raw:
        return ["UNKNOWN"]

    s = PAREN_PATTERN.sub(" ", raw).strip()

    if WITH_PATTERN.search(s):
        s = WITH_PATTERN.split(s)[0].strip()

    parts = DUAL_PATTERN.split(s)
    parts = [p for p in parts if p and p.upper() not in {"OR", "AND", "/", "|"}]

    results: List[str] = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        key = _canonicalize(part)
        if key in LICENSE_ALIASES:
            results.append(LICENSE_ALIASES[key])
        elif SPDX_PATTERN.match(part):
            results.append(part)
        else:
            results.append(part)

    if not results:
        return ["UNKNOWN"]

    seen = set()
    unique = []
    for r in results:
        if r not in seen:
            seen.add(r)
            unique.append(r)
    return unique


def classify_license(
    identifiers: List[str],
    whitelist: WhiteListConfig,
) -> Tuple[LicenseCategory, str]:
    if not identifiers or identifiers == ["UNKNOWN"]:
        return LicenseCategory.MISSING, "未声明许可证"

    approved = set(whitelist.licenses)
    restricted = set(whitelist.restricted)
    uncertain = set(whitelist.uncertain)

    if len(identifiers) == 1:
        lic = identifiers[0]
        if lic in approved:
            return LicenseCategory.APPROVED, ""
        if lic in restricted:
            return LicenseCategory.RESTRICTED, f"许可证 {lic} 属于限制类"
        if lic in uncertain:
            return LicenseCategory.UNCERTAIN, f"许可证 {lic} 存疑，需法务确认"
        return LicenseCategory.UNCERTAIN, f"许可证 {lic} 未在白名单中，需法务确认"

    has_approved = any(l in approved for l in identifiers)
    all_restricted = all(l in restricted for l in identifiers)
    any_restricted = any(l in restricted for l in identifiers)
    any_uncertain = any(l in uncertain or (l not in approved and l not in restricted) for l in identifiers)

    if all_restricted:
        return LicenseCategory.DUAL_RESTRICTED, (
            f"双许可全部为限制许可证: {', '.join(identifiers)}，不可用"
        )
    if has_approved and not any_restricted and not any_uncertain:
        return LicenseCategory.DUAL_APPROVED, (
            f"双许可全部合规: {', '.join(identifiers)}"
        )
    if has_approved and (any_restricted or any_uncertain):
        return LicenseCategory.DUAL_MIXED, (
            f"双许可存在合规分支但含限制/存疑项: {', '.join(identifiers)}，需法务确认是否选用合规分支"
        )
    return LicenseCategory.DUAL_MIXED, (
        f"双许可部分合规: {', '.join(identifiers)}，需法务确认可接受的许可选项"
    )


def parse_license(
    raw: str,
    whitelist: WhiteListConfig,
    package_name: Optional[str] = None,
) -> LicenseInfo:
    if package_name and package_name in whitelist.package_exceptions:
        exception_license = whitelist.package_exceptions[package_name]
        identifiers = normalize_license(exception_license)
        category, note = classify_license(identifiers, whitelist)
        return LicenseInfo(
            raw=raw or exception_license,
            identifiers=identifiers,
            category=category,
            is_dual=len(identifiers) > 1,
            note=note or f"使用白名单例外许可证: {exception_license}",
        )

    if isinstance(raw, dict):
        type_val = raw.get("type") or raw.get("name", "")
        raw = type_val
    elif isinstance(raw, list):
        parts = []
        for item in raw:
            if isinstance(item, dict):
                parts.append(item.get("type") or item.get("name", ""))
            elif isinstance(item, str):
                parts.append(item)
        raw = " OR ".join(parts)

    if not raw:
        raw = ""

    identifiers = normalize_license(raw)
    category, note = classify_license(identifiers, whitelist)

    return LicenseInfo(
        raw=raw,
        identifiers=identifiers,
        category=category,
        is_dual=len(identifiers) > 1,
        note=note,
    )


def should_ignore_package(
    name: str,
    whitelist: WhiteListConfig,
) -> bool:
    if name in whitelist.ignore_packages:
        return True
    if "/" in name:
        scope = name.split("/")[0]
        if scope.startswith("@") and scope in whitelist.ignore_scopes:
            return True
    return False
