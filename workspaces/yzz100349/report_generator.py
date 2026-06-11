import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import urlparse

from config import REPORT_DIR, SNAPSHOT_DIR
from diff_detector import ChangeType


class ReportGenerator:
    def __init__(self, report_dir: Path = REPORT_DIR):
        self.report_dir = report_dir
        self.report_dir.mkdir(parents=True, exist_ok=True)

    def _get_severity_badge(self, severity: str) -> str:
        styles = {
            "high": "background-color: #dc2626; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;",
            "medium": "background-color: #f59e0b; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;",
            "low": "background-color: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;",
        }
        labels = {"high": "高", "medium": "中", "low": "低"}
        return f'<span style="{styles.get(severity, "")}">{labels.get(severity, severity)}</span>'

    def _get_change_type_label(self, change_type: str) -> str:
        type_labels = {
            "price_changed": "价格变动",
            "price_new": "新价格",
            "price_removed": "价格消失",
            "button_text_changed": "按钮文案",
            "button_new": "新按钮",
            "button_removed": "按钮消失",
            "activity_new": "新活动",
            "activity_removed": "活动消失",
            "activity_text_changed": "活动文案",
            "title_changed": "标题变化",
            "keyword_new": "新增关键词",
            "keyword_removed": "关键词消失",
            "crawl_failed": "抓取失败",
            "crawl_recovered": "抓取恢复",
            "new_url": "新增URL",
            "page_text_changed": "页面内容",
        }
        return type_labels.get(change_type, change_type)

    def _get_change_type_icon(self, change_type: str) -> str:
        icons = {
            "price_changed": "💰",
            "price_new": "🆕",
            "price_removed": "❌",
            "button_text_changed": "🔄",
            "button_new": "➕",
            "button_removed": "➖",
            "activity_new": "🎉",
            "activity_removed": "📉",
            "activity_text_changed": "📝",
            "title_changed": "🏷️",
            "keyword_new": "🔍",
            "keyword_removed": "🙈",
            "crawl_failed": "⚠️",
            "crawl_recovered": "✅",
            "new_url": "🌐",
            "page_text_changed": "📄",
        }
        return icons.get(change_type, "•")

    def _format_timestamp(self, timestamp: str) -> str:
        try:
            dt = datetime.fromisoformat(timestamp)
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            return timestamp

    def _extract_domain(self, url: str) -> str:
        try:
            parsed = urlparse(url)
            return parsed.netloc
        except Exception:
            return url

    def _generate_css(self) -> str:
        return """
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
                background: #f8fafc;
                color: #1e293b;
                line-height: 1.6;
            }
            .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
            .header {
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                padding: 24px 32px;
                border-radius: 12px;
                margin-bottom: 24px;
            }
            .header h1 { font-size: 24px; margin-bottom: 8px; }
            .header .meta { opacity: 0.9; font-size: 14px; }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }
            .stat-card {
                background: white;
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .stat-card .label { color: #64748b; font-size: 13px; margin-bottom: 8px; }
            .stat-card .value { font-size: 28px; font-weight: 700; }
            .stat-card.high .value { color: #dc2626; }
            .stat-card.medium .value { color: #f59e0b; }
            .stat-card.low .value { color: #10b981; }
            .tabs {
                display: flex;
                gap: 4px;
                margin-bottom: 20px;
                background: #e2e8f0;
                padding: 4px;
                border-radius: 8px;
            }
            .tab-btn {
                flex: 1;
                padding: 12px 24px;
                border: none;
                background: transparent;
                cursor: pointer;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
                color: #64748b;
            }
            .tab-btn.active {
                background: white;
                color: #3b82f6;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .tab-content { display: none; }
            .tab-content.active { display: block; }
            .section-title {
                font-size: 18px;
                font-weight: 600;
                margin: 24px 0 16px;
                padding-left: 12px;
                border-left: 4px solid #3b82f6;
            }
            .url-card {
                background: white;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 16px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .url-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 16px;
            }
            .url-title {
                font-size: 16px;
                font-weight: 600;
                color: #1e293b;
                margin-bottom: 4px;
            }
            .url-domain {
                color: #64748b;
                font-size: 13px;
            }
            .url-link {
                color: #3b82f6;
                text-decoration: none;
                font-size: 12px;
            }
            .change-list {
                list-style: none;
            }
            .change-item {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 12px;
                background: #f8fafc;
                border-radius: 8px;
                margin-bottom: 8px;
            }
            .change-icon { font-size: 20px; }
            .change-content { flex: 1; }
            .change-type {
                font-size: 12px;
                color: #64748b;
                margin-bottom: 4px;
            }
            .change-desc { font-size: 14px; }
            .change-value {
                margin-top: 8px;
                font-family: 'SF Mono', Monaco, monospace;
                font-size: 13px;
            }
            .old-value {
                color: #dc2626;
                text-decoration: line-through;
            }
            .new-value {
                color: #10b981;
                font-weight: 500;
            }
            .arrow { margin: 0 8px; color: #94a3b8; }
            .screenshot-compare {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
                margin-top: 16px;
            }
            .screenshot-box {
                background: #f1f5f9;
                border-radius: 8px;
                overflow: hidden;
            }
            .screenshot-label {
                padding: 8px 12px;
                background: #e2e8f0;
                font-size: 12px;
                font-weight: 500;
                color: #475569;
            }
            .screenshot-img {
                width: 100%;
                cursor: pointer;
                display: block;
            }
            .no-changes {
                text-align: center;
                padding: 40px;
                color: #94a3b8;
            }
            .no-changes .emoji { font-size: 48px; margin-bottom: 16px; }
            .filter-bar {
                display: flex;
                gap: 12px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }
            .filter-btn {
                padding: 8px 16px;
                border: 1px solid #e2e8f0;
                background: white;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s;
            }
            .filter-btn.active {
                background: #3b82f6;
                color: white;
                border-color: #3b82f6;
            }
            .image-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.9);
                z-index: 1000;
                justify-content: center;
                align-items: center;
            }
            .image-modal.active { display: flex; }
            .image-modal img {
                max-width: 95%;
                max-height: 95%;
                object-fit: contain;
            }
            .image-modal .close {
                position: absolute;
                top: 20px;
                right: 30px;
                color: white;
                font-size: 40px;
                cursor: pointer;
                font-weight: bold;
            }
            .summary-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 16px;
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .summary-table th, .summary-table td {
                padding: 12px 16px;
                text-align: left;
                border-bottom: 1px solid #e2e8f0;
            }
            .summary-table th {
                background: #f8fafc;
                font-weight: 600;
                font-size: 13px;
                color: #475569;
            }
            .summary-table tr:last-child td { border-bottom: none; }
            .warning-banner {
                background: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 16px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            .success-banner {
                background: #d1fae5;
                border-left: 4px solid #10b981;
                padding: 16px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            .duplicate-list {
                background: #fef3c7;
                padding: 12px 16px;
                border-radius: 8px;
                margin-bottom: 16px;
            }
            .load-time {
                font-size: 12px;
                color: #64748b;
            }
        </style>
        """

    def _generate_js(self) -> str:
        return """
        <script>
            function switchTab(tabName) {
                document.querySelectorAll('.tab-content').forEach(tab => {
                    tab.classList.remove('active');
                });
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                document.getElementById(tabName).classList.add('active');
                event.target.classList.add('active');
            }

            function filterBySeverity(severity) {
                document.querySelectorAll('.url-card').forEach(card => {
                    if (severity === 'all') {
                        card.style.display = 'block';
                    } else {
                        const hasSeverity = card.querySelector(`.severity-${severity}`);
                        card.style.display = hasSeverity ? 'block' : 'none';
                    }
                });
                document.querySelectorAll('.filter-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                event.target.classList.add('active');
            }

            function openModal(imgSrc) {
                const modal = document.getElementById('imageModal');
                const modalImg = document.getElementById('modalImage');
                modalImg.src = imgSrc;
                modal.classList.add('active');
            }

            function closeModal() {
                document.getElementById('imageModal').classList.remove('active');
            }

            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    closeModal();
                }
            });
        </script>
        """

    def _generate_summary_section(
        self,
        diffs: List[Dict],
        url_processing: Dict,
        run_id: str,
        timestamp: str,
    ) -> str:
        total_urls = url_processing.get("total_unique", 0)
        total_changes = sum(1 for d in diffs if d.get("has_changes"))
        no_changes = total_urls - total_changes

        severity_counts = {"high": 0, "medium": 0, "low": 0}
        type_counts = {}
        failed_count = 0
        success_count = 0

        for diff in diffs:
            if diff.get("new_result", {}).get("success"):
                success_count += 1
            else:
                failed_count += 1

            for change in diff.get("changes", []):
                severity = change.severity if hasattr(change, 'severity') else change.get("severity", "medium")
                severity_counts[severity] = severity_counts.get(severity, 0) + 1

                change_type = change.type.value if hasattr(change, 'type') and hasattr(change.type, 'value') else change.get("type", "unknown")
                type_counts[change_type] = type_counts.get(change_type, 0) + 1

        stats_html = f"""
        <div class="stats-grid">
            <div class="stat-card">
                <div class="label">监控页面总数</div>
                <div class="value">{total_urls}</div>
            </div>
            <div class="stat-card">
                <div class="label">有变化</div>
                <div class="value">{total_changes}</div>
            </div>
            <div class="stat-card">
                <div class="label">无变化</div>
                <div class="value">{no_changes}</div>
            </div>
            <div class="stat-card high">
                <div class="label">严重变更</div>
                <div class="value">{severity_counts.get('high', 0)}</div>
            </div>
            <div class="stat-card medium">
                <div class="label">中等变更</div>
                <div class="value">{severity_counts.get('medium', 0)}</div>
            </div>
            <div class="stat-card low">
                <div class="label">轻微变更</div>
                <div class="value">{severity_counts.get('low', 0)}</div>
            </div>
            <div class="stat-card">
                <div class="label">抓取成功</div>
                <div class="value" style="color: #10b981;">{success_count}</div>
            </div>
            <div class="stat-card">
                <div class="label">抓取失败</div>
                <div class="value" style="color: #dc2626;">{failed_count}</div>
            </div>
        </div>
        """

        if type_counts:
            type_rows = ""
            for change_type, count in sorted(type_counts.items(), key=lambda x: -x[1]):
                type_rows += f"""
                <tr>
                    <td>{self._get_change_type_icon(change_type)} {self._get_change_type_label(change_type)}</td>
                    <td style="font-weight: 600;">{count}</td>
                </tr>
                """

            stats_html += f"""
            <div class="section-title">变更类型统计</div>
            <table class="summary-table">
                <thead>
                    <tr>
                        <th>变更类型</th>
                        <th>数量</th>
                    </tr>
                </thead>
                <tbody>
                    {type_rows}
                </tbody>
            </table>
            """

        return stats_html

    def _generate_ops_view(
        self,
        diffs: List[Dict],
        url_processing: Dict,
    ) -> str:
        changed_diffs = [d for d in diffs if d.get("has_changes")]
        changed_diffs.sort(key=lambda x: (
            -x.get("summary", {}).get("severity_counts", {}).get("high", 0),
            -x.get("summary", {}).get("severity_counts", {}).get("medium", 0),
            -x.get("summary", {}).get("total_changes", 0),
        ))

        if not changed_diffs:
            return f"""
            <div class="no-changes">
                <div class="emoji">🎉</div>
                <div style="font-size: 18px; margin-bottom: 8px;">太棒了！所有页面均无变化</div>
                <div>今日监控的 {url_processing.get('total_unique', 0)} 个页面一切正常</div>
            </div>
            """

        filter_bar = """
        <div class="filter-bar">
            <button class="filter-btn active" onclick="filterBySeverity('all')">全部变更</button>
            <button class="filter-btn" onclick="filterBySeverity('high')">仅严重</button>
            <button class="filter-btn" onclick="filterBySeverity('medium')">仅中等</button>
            <button class="filter-btn" onclick="filterBySeverity('low')">仅轻微</button>
        </div>
        """

        url_cards = ""
        for diff in changed_diffs:
            new_result = diff.get("new_result", {})
            url = new_result.get("normalized_url", "")
            page_title = new_result.get("data", {}).get("page_title", "") if new_result.get("data") else ""
            domain = self._extract_domain(url)

            has_high = any(
                (c.severity if hasattr(c, 'severity') else c.get("severity")) == "high"
                for c in diff.get("changes", [])
            )
            has_medium = any(
                (c.severity if hasattr(c, 'severity') else c.get("severity")) == "medium"
                for c in diff.get("changes", [])
            )
            has_low = any(
                (c.severity if hasattr(c, 'severity') else c.get("severity")) == "low"
                for c in diff.get("changes", [])
            )

            severity_classes = []
            if has_high:
                severity_classes.append("severity-high")
            if has_medium:
                severity_classes.append("severity-medium")
            if has_low:
                severity_classes.append("severity-low")

            changes_html = ""
            for change in diff.get("changes", []):
                change_type = change.type.value if hasattr(change, 'type') and hasattr(change.type, 'value') else change.get("type", "unknown")
                severity = change.severity if hasattr(change, 'severity') else change.get("severity", "medium")
                description = change.description if hasattr(change, 'description') else change.get("description", "")
                old_value = change.old_value if hasattr(change, 'old_value') else change.get("old_value")
                new_value = change.new_value if hasattr(change, 'new_value') else change.get("new_value")

                value_html = ""
                if old_value and new_value:
                    value_html = f"""
                    <div class="change-value">
                        <span class="old-value">{old_value}</span>
                        <span class="arrow">→</span>
                        <span class="new-value">{new_value}</span>
                    </div>
                    """
                elif new_value:
                    value_html = f"""
                    <div class="change-value">
                        <span class="new-value">{new_value}</span>
                    </div>
                    """
                elif old_value:
                    value_html = f"""
                    <div class="change-value">
                        <span class="old-value">{old_value}</span>
                    </div>
                    """

                changes_html += f"""
                <li class="change-item">
                    <span class="change-icon">{self._get_change_type_icon(change_type)}</span>
                    <div class="change-content">
                        <div class="change-type">
                            {self._get_change_type_label(change_type)}
                            {self._get_severity_badge(severity)}
                        </div>
                        <div class="change-desc">{description}</div>
                        {value_html}
                    </div>
                </li>
                """

            load_time = new_result.get("load_time_ms", 0)
            load_time_html = f'<div class="load-time">加载时间: {load_time}ms</div>' if load_time > 0 else ""

            url_cards += f"""
            <div class="url-card {' '.join(severity_classes)}">
                <div class="url-header">
                    <div>
                        <div class="url-title">{page_title or domain}</div>
                        <div class="url-domain">{domain}</div>
                        <a href="{url}" target="_blank" class="url-link">访问页面 →</a>
                        {load_time_html}
                    </div>
                    <div>
                        {diff.get("summary", {}).get("severity_counts", {}).get("high", 0) > 0 and self._get_severity_badge("high") + " "}
                        {diff.get("summary", {}).get("severity_counts", {}).get("medium", 0) > 0 and self._get_severity_badge("medium") + " "}
                        {diff.get("summary", {}).get("severity_counts", {}).get("low", 0) > 0 and self._get_severity_badge("low") + " "}
                        ({diff.get("summary", {}).get("total_changes", 0)} 项变更)
                    </div>
                </div>
                <ul class="change-list">
                    {changes_html}
                </ul>
            </div>
            """

        return filter_bar + url_cards

    def _generate_design_view(
        self,
        diffs: List[Dict],
    ) -> str:
        url_cards = ""

        for diff in diffs:
            new_result = diff.get("new_result", {})
            old_result = diff.get("old_result")
            url = new_result.get("normalized_url", "")
            page_title = new_result.get("data", {}).get("page_title", "") if new_result.get("data") else ""
            domain = self._extract_domain(url)

            new_screenshot = new_result.get("screenshot_relative", "")
            old_screenshot = old_result.get("screenshot_relative", "") if old_result else ""

            screenshot_section = ""
            if new_screenshot or old_screenshot:
                screenshot_section = '<div class="screenshot-compare">'

                if old_screenshot:
                    old_path = f"../../data/snapshots/{old_screenshot}"
                    screenshot_section += f"""
                    <div class="screenshot-box">
                        <div class="screenshot-label">之前版本</div>
                        <img src="{old_path}" class="screenshot-img" onclick="openModal('{old_path}')" alt="之前的截图">
                    </div>
                    """

                if new_screenshot:
                    new_path = f"../../data/snapshots/{new_screenshot}"
                    screenshot_section += f"""
                    <div class="screenshot-box">
                        <div class="screenshot-label">当前版本</div>
                        <img src="{new_path}" class="screenshot-img" onclick="openModal('{new_path}')" alt="最新截图">
                    </div>
                    """

                screenshot_section += "</div>"

            changes_html = ""
            if diff.get("has_changes"):
                changes_html = '<div style="margin-top: 16px;"><strong>变更摘要:</strong><ul style="margin-top: 8px; padding-left: 20px;">'
                for change in diff.get("changes", [])[:5]:
                    description = change.description if hasattr(change, 'description') else change.get("description", "")
                    changes_html += f'<li style="margin-bottom: 4px;">{description}</li>'
                if len(diff.get("changes", [])) > 5:
                    changes_html += f'<li style="color: #64748b;">... 还有 {len(diff.get("changes", [])) - 5} 项变更</li>'
                changes_html += "</ul></div>"

            url_cards += f"""
            <div class="url-card">
                <div class="url-header">
                    <div>
                        <div class="url-title">{page_title or domain}</div>
                        <div class="url-domain">{domain}</div>
                        <a href="{url}" target="_blank" class="url-link">访问页面 →</a>
                    </div>
                    <div>
                        {diff.get("has_changes") and f'<span class="stat-card high" style="padding: 4px 12px; font-size: 12px; display: inline-block; margin: 0;">有 {diff.get("summary", {}).get("total_changes", 0)} 项变更</span>' or '<span class="stat-card low" style="padding: 4px 12px; font-size: 12px; display: inline-block; margin: 0;">无变化</span>'}
                    </div>
                </div>
                {screenshot_section}
                {changes_html}
            </div>
            """

        return url_cards

    def _generate_duplicates_section(self, url_processing: Dict) -> str:
        duplicates = url_processing.get("duplicates", [])
        if not duplicates:
            return ""

        duplicate_items = ""
        for dup in duplicates:
            line = dup.get("line", "?")
            url = dup.get("original_url", "")
            normalized = dup.get("normalized_url", "")
            error = dup.get("error", "")

            if error:
                duplicate_items += f'<li>第 {line} 行: <code>{url}</code> - <span style="color: #dc2626;">{error}</span></li>'
            else:
                duplicate_items += f'<li>第 {line} 行: <code>{url}</code> 与之前的配置重复 (已跳过)</li>'

        return f"""
        <div class="duplicate-list">
            <strong>⚠️ URL 配置警告 ({len(duplicates)} 项):</strong>
            <ul style="margin-top: 8px; padding-left: 20px;">
                {duplicate_items}
            </ul>
        </div>
        """

    def generate_report(
        self,
        diffs: List[Dict],
        url_processing: Dict,
        run_id: str,
        timestamp: str,
    ) -> str:
        formatted_time = self._format_timestamp(timestamp)
        report_path = self.report_dir / f"report_{run_id}.html"

        duplicates_section = self._generate_duplicates_section(url_processing)
        summary_section = self._generate_summary_section(diffs, url_processing, run_id, timestamp)
        ops_view = self._generate_ops_view(diffs, url_processing)
        design_view = self._generate_design_view(diffs)

        failed_count = sum(1 for d in diffs if not d.get("new_result", {}).get("success"))
        total_urls = url_processing.get("total_unique", 0)
        success_count = total_urls - failed_count

        banner = ""
        if failed_count > 0:
            banner = f"""
            <div class="warning-banner">
                <strong>⚠️ 注意:</strong> 本次巡检有 {failed_count} 个页面抓取失败，{success_count} 个页面抓取成功。失败的页面已在变更列表中标注。
            </div>
            """
        elif total_urls > 0:
            banner = f"""
            <div class="success-banner">
                <strong>✅ 全部正常:</strong> 本次巡检的 {total_urls} 个页面全部抓取成功。
            </div>
            """

        html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>竞品页面巡检报告 - {formatted_time}</title>
    {self._generate_css()}
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 竞品页面巡检报告</h1>
            <div class="meta">
                生成时间: {formatted_time} | 运行编号: {run_id} | 监控页面: {total_urls} 个
            </div>
        </div>

        {duplicates_section}
        {banner}
        {summary_section}

        <div class="tabs">
            <button class="tab-btn active" onclick="switchTab('ops-view')">📊 运营摘要视图</button>
            <button class="tab-btn" onclick="switchTab('design-view')">🖼️ 设计复核视图</button>
        </div>

        <div id="ops-view" class="tab-content active">
            <div class="section-title">变更详情 (按严重程度排序)</div>
            {ops_view}
        </div>

        <div id="design-view" class="tab-content">
            <div class="section-title">截图对比 (点击图片放大查看)</div>
            {design_view}
        </div>
    </div>

    <div id="imageModal" class="image-modal" onclick="closeModal()">
        <span class="close" onclick="closeModal()">&times;</span>
        <img id="modalImage" src="" alt="放大图片">
    </div>

    {self._generate_js()}
</body>
</html>
"""

        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(html)

        return str(report_path)
