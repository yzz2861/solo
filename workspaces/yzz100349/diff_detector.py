import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from difflib import SequenceMatcher


class ChangeType(Enum):
    PRICE_CHANGED = "price_changed"
    PRICE_NEW = "price_new"
    PRICE_REMOVED = "price_removed"
    BUTTON_TEXT_CHANGED = "button_text_changed"
    BUTTON_NEW = "button_new"
    BUTTON_REMOVED = "button_removed"
    ACTIVITY_NEW = "activity_new"
    ACTIVITY_REMOVED = "activity_removed"
    ACTIVITY_TEXT_CHANGED = "activity_text_changed"
    TITLE_CHANGED = "title_changed"
    KEYWORD_NEW = "keyword_new"
    KEYWORD_REMOVED = "keyword_removed"
    CRAWL_FAILED = "crawl_failed"
    CRAWL_RECOVERED = "crawl_recovered"
    NEW_URL = "new_url"
    PAGE_TEXT_CHANGED = "page_text_changed"


@dataclass
class Change:
    type: ChangeType
    description: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    details: Dict = field(default_factory=dict)
    severity: str = "medium"


class DiffDetector:
    def __init__(self):
        self.price_number_pattern = re.compile(r'[\d.,]+')

    def _parse_price_number(self, price_str: str) -> Optional[float]:
        try:
            match = self.price_number_pattern.search(price_str)
            if match:
                num_str = match.group().replace(',', '')
                return float(num_str)
        except (ValueError, TypeError):
            pass
        return None

    def _compare_price_lists(
        self, old_prices: List[str], new_prices: List[str]
    ) -> List[Change]:
        changes = []

        old_set = set(old_prices)
        new_set = set(new_prices)

        old_numeric = {p: self._parse_price_number(p) for p in old_prices}
        new_numeric = {p: self._parse_price_number(p) for p in new_prices}

        for old_p in old_prices:
            old_num = old_numeric.get(old_p)
            if old_num is None:
                continue

            matched = False
            for new_p in new_prices:
                new_num = new_numeric.get(new_p)
                if new_num is None:
                    continue

                if abs(old_num - new_num) > 0.01:
                    ratio = SequenceMatcher(None, old_p, new_p).ratio()
                    if ratio > 0.3:
                        change_dir = "上涨" if new_num > old_num else "下降"
                        change_amount = abs(new_num - old_num)
                        change_pct = (change_amount / old_num * 100) if old_num > 0 else 0

                        changes.append(Change(
                            type=ChangeType.PRICE_CHANGED,
                            description=f"价格{change_dir}: {old_p} → {new_p}",
                            old_value=old_p,
                            new_value=new_p,
                            severity="high" if change_pct > 5 else "medium",
                            details={
                                "direction": change_dir,
                                "amount": change_amount,
                                "percentage": round(change_pct, 2),
                                "old_price": old_num,
                                "new_price": new_num,
                            }
                        ))
                        matched = True
                        break

            if not matched and old_p not in new_set:
                changes.append(Change(
                    type=ChangeType.PRICE_REMOVED,
                    description=f"价格消失: {old_p}",
                    old_value=old_p,
                    severity="high",
                ))

        for new_p in new_prices:
            if new_p not in old_set:
                new_num = new_numeric.get(new_p)
                has_match = False
                if new_num is not None:
                    for old_p in old_prices:
                        old_num = old_numeric.get(old_p)
                        if old_num is not None:
                            ratio = SequenceMatcher(None, old_p, new_p).ratio()
                            if ratio > 0.3 and abs(old_num - new_num) > 0.01:
                                has_match = True
                                break

                if not has_match:
                    changes.append(Change(
                        type=ChangeType.PRICE_NEW,
                        description=f"新价格出现: {new_p}",
                        new_value=new_p,
                        severity="medium",
                    ))

        return changes

    def _compare_element_lists(
        self,
        old_elements: List[Dict],
        new_elements: List[Dict],
        element_type: str,
    ) -> List[Change]:
        changes = []

        old_texts = {e["text"] for e in old_elements if e.get("visible", True)}
        new_texts = {e["text"] for e in new_elements if e.get("visible", True)}

        old_visible = {e["text"] for e in old_elements if e.get("visible", True)}
        new_visible = {e["text"] for e in new_elements if e.get("visible", True)}

        for old_text in old_visible:
            if old_text not in new_visible:
                matched = False
                for new_text in new_visible:
                    ratio = SequenceMatcher(None, old_text, new_text).ratio()
                    if ratio > 0.6 and ratio < 1.0:
                        if element_type == "button":
                            changes.append(Change(
                                type=ChangeType.BUTTON_TEXT_CHANGED,
                                description=f"按钮文案替换: \"{old_text}\" → \"{new_text}\"",
                                old_value=old_text,
                                new_value=new_text,
                                severity="medium",
                            ))
                        elif element_type == "activity":
                            changes.append(Change(
                                type=ChangeType.ACTIVITY_TEXT_CHANGED,
                                description=f"活动文案变化: \"{old_text}\" → \"{new_text}\"",
                                old_value=old_text,
                                new_value=new_text,
                                severity="medium",
                            ))
                        matched = True
                        break

                if not matched:
                    if element_type == "button":
                        changes.append(Change(
                            type=ChangeType.BUTTON_REMOVED,
                            description=f"按钮消失: \"{old_text}\"",
                            old_value=old_text,
                            severity="high",
                        ))
                    elif element_type == "activity":
                        changes.append(Change(
                            type=ChangeType.ACTIVITY_REMOVED,
                            description=f"活动入口消失: \"{old_text}\"",
                            old_value=old_text,
                            severity="high",
                        ))

        for new_text in new_visible:
            if new_text not in old_visible:
                has_match = False
                for old_text in old_visible:
                    ratio = SequenceMatcher(None, old_text, new_text).ratio()
                    if ratio > 0.6:
                        has_match = True
                        break

                if not has_match:
                    if element_type == "button":
                        changes.append(Change(
                            type=ChangeType.BUTTON_NEW,
                            description=f"新按钮出现: \"{new_text}\"",
                            new_value=new_text,
                            severity="medium",
                        ))
                    elif element_type == "activity":
                        changes.append(Change(
                            type=ChangeType.ACTIVITY_NEW,
                            description=f"新活动入口: \"{new_text}\"",
                            new_value=new_text,
                            severity="high",
                        ))

        return changes

    def _compare_keywords(
        self, old_keywords: List[str], new_keywords: List[str]
    ) -> List[Change]:
        changes = []
        old_set = set(old_keywords)
        new_set = set(new_keywords)

        for kw in new_set - old_set:
            changes.append(Change(
                type=ChangeType.KEYWORD_NEW,
                description=f"新关键词出现: \"{kw}\"",
                new_value=kw,
                severity="medium",
            ))

        for kw in old_set - new_set:
            changes.append(Change(
                type=ChangeType.KEYWORD_REMOVED,
                description=f"关键词消失: \"{kw}\"",
                old_value=kw,
                severity="medium",
            ))

        return changes

    def _compare_page_text(
        self, old_text: str, new_text: str
    ) -> List[Change]:
        changes = []

        if not old_text or not new_text:
            return changes

        old_clean = re.sub(r'\s+', ' ', old_text.strip())
        new_clean = re.sub(r'\s+', ' ', new_text.strip())

        if old_clean != new_clean:
            ratio = SequenceMatcher(None, old_clean, new_clean).ratio()
            if ratio < 0.95:
                changes.append(Change(
                    type=ChangeType.PAGE_TEXT_CHANGED,
                    description=f"页面整体内容变化 (相似度: {ratio:.2%})",
                    severity="low",
                    details={"similarity": ratio},
                ))

        return changes

    def compare_results(
        self,
        old_result: Optional[Dict],
        new_result: Dict,
        url_id: str,
    ) -> Dict:
        changes: List[Change] = []

        was_failed = old_result is None or not old_result.get("success", False)
        is_failed = not new_result.get("success", False)

        if is_failed:
            if was_failed:
                old_error = old_result.get("error", "未知错误") if old_result else "首次失败"
                new_error = new_result.get("error", "未知错误")
                changes.append(Change(
                    type=ChangeType.CRAWL_FAILED,
                    description=f"抓取持续失败: {new_error}",
                    old_value=old_error,
                    new_value=new_error,
                    severity="high",
                ))
            else:
                changes.append(Change(
                    type=ChangeType.CRAWL_FAILED,
                    description=f"抓取失败: {new_result.get('error', '未知错误')}",
                    new_value=new_result.get("error", "未知错误"),
                    severity="high",
                ))

            return {
                "url_id": url_id,
                "has_changes": True,
                "changes": changes,
                "summary": self._generate_summary(changes),
            }

        if was_failed and not is_failed:
            changes.append(Change(
                type=ChangeType.CRAWL_RECOVERED,
                description="抓取已恢复正常",
                severity="medium",
            ))

        if old_result is None:
            changes.append(Change(
                type=ChangeType.NEW_URL,
                description="新增监控 URL",
                severity="low",
            ))
            return {
                "url_id": url_id,
                "has_changes": True,
                "changes": changes,
                "summary": self._generate_summary(changes),
            }

        old_data = old_result.get("data", {})
        new_data = new_result.get("data", {})

        old_title = old_data.get("page_title", "")
        new_title = new_data.get("page_title", "")
        if old_title != new_title:
            changes.append(Change(
                type=ChangeType.TITLE_CHANGED,
                description=f"页面标题变化: \"{old_title}\" → \"{new_title}\"",
                old_value=old_title,
                new_value=new_title,
                severity="medium",
            ))

        old_prices = old_data.get("prices", [])
        new_prices = new_data.get("prices", [])
        changes.extend(self._compare_price_lists(old_prices, new_prices))

        old_buttons = old_data.get("elements", {}).get("buttons", [])
        new_buttons = new_data.get("elements", {}).get("buttons", [])
        changes.extend(self._compare_element_lists(old_buttons, new_buttons, "button"))

        old_activities = old_data.get("elements", {}).get("activities", [])
        new_activities = new_data.get("elements", {}).get("activities", [])
        changes.extend(self._compare_element_lists(old_activities, new_activities, "activity"))

        old_keywords = old_data.get("keywords", [])
        new_keywords = new_data.get("keywords", [])
        changes.extend(self._compare_keywords(old_keywords, new_keywords))

        old_full_text = old_data.get("full_text", "")
        new_full_text = new_data.get("full_text", "")
        changes.extend(self._compare_page_text(old_full_text, new_full_text))

        return {
            "url_id": url_id,
            "has_changes": len(changes) > 0,
            "changes": changes,
            "summary": self._generate_summary(changes),
        }

    def _generate_summary(self, changes: List[Change]) -> Dict:
        high = sum(1 for c in changes if c.severity == "high")
        medium = sum(1 for c in changes if c.severity == "medium")
        low = sum(1 for c in changes if c.severity == "low")

        by_type = {}
        for change in changes:
            type_name = change.type.value
            by_type[type_name] = by_type.get(type_name, 0) + 1

        return {
            "total_changes": len(changes),
            "severity_counts": {
                "high": high,
                "medium": medium,
                "low": low,
            },
            "by_type": by_type,
        }

    def compare_all(
        self,
        old_results: Dict[str, Dict],
        new_results: List[Dict],
    ) -> List[Dict]:
        diffs = []
        for new_result in new_results:
            url_id = new_result.get("url_id")
            old_result = old_results.get(url_id)
            diff = self.compare_results(old_result, new_result, url_id)
            diff["new_result"] = new_result
            diff["old_result"] = old_result
            diffs.append(diff)
        return diffs
