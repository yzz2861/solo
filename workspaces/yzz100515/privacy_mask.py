#!/usr/bin/env python3
"""
桌面截图隐私遮罩工具
批量处理截图，识别并遮挡敏感信息，生成预览报告。
"""

import os
import re
import sys
import json
import shutil
import hashlib
import argparse
import datetime
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Tuple

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

try:
    import yaml
except ImportError:
    yaml = None


@dataclass
class MaskRegion:
    x: int
    y: int
    width: int
    height: int
    reason: str
    confidence: float = 1.0
    needs_review: bool = False


@dataclass
class ProcessResult:
    filename: str
    original_path: str
    backup_path: str
    output_path: str
    status: str = "success"
    mask_regions: List[MaskRegion] = field(default_factory=list)
    needs_review: bool = False
    review_reasons: List[str] = field(default_factory=list)
    error_message: str = ""
    image_size: Tuple[int, int] = (0, 0)
    is_dark_theme: bool = False
    process_time: float = 0.0


class PrivacyMasker:
    def __init__(self, config_path: str):
        self.config = self._load_config(config_path)
        self.regex_patterns = self._compile_patterns()
        self.area_rules = self.config.get("area_rules", [])
        self.mask_color = tuple(self.config.get("mask_color", [0, 0, 0]))
        self.mask_padding = self.config.get("mask_padding", 4)
        self.dark_theme_threshold = self.config.get("dark_theme_threshold", 80)
        self.min_text_confidence = self.config.get("min_text_confidence", 0.6)

    def _load_config(self, config_path: str) -> dict:
        if yaml and config_path.endswith((".yaml", ".yml")):
            with open(config_path, "r", encoding="utf-8") as f:
                return yaml.safe_load(f)
        elif config_path.endswith(".json"):
            with open(config_path, "r", encoding="utf-8") as f:
                return json.load(f)
        else:
            raise ValueError(f"不支持的配置文件格式: {config_path}")

    def _compile_patterns(self) -> List[dict]:
        patterns = []
        for rule in self.config.get("regex_rules", []):
            try:
                pattern = re.compile(rule["pattern"], re.IGNORECASE)
                patterns.append({
                    "name": rule["name"],
                    "pattern": pattern,
                    "priority": rule.get("priority", 1),
                    "needs_review": rule.get("needs_review", False)
                })
            except re.error as e:
                print(f"警告: 正则表达式编译失败 '{rule.get('name', '')}': {e}")
        return patterns

    def backup_file(self, src_path: str, backup_dir: str) -> str:
        os.makedirs(backup_dir, exist_ok=True)
        filename = os.path.basename(src_path)
        base, ext = os.path.splitext(filename)
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"{base}_backup_{timestamp}{ext}"
        dst_path = os.path.join(backup_dir, backup_name)
        shutil.copy2(src_path, dst_path)
        return dst_path

    def detect_dark_theme(self, image: np.ndarray) -> bool:
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        avg_brightness = float(np.mean(gray))
        return bool(avg_brightness < self.dark_theme_threshold)

    def detect_text_regions_opencv(self, image: np.ndarray) -> List[Tuple[int, int, int, int, float]]:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        h, w = binary.shape
        if h > 1000 or w > 1600:
            kernel_size = 17
            iterations = 3
        else:
            kernel_size = 11
            iterations = 2
        
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_size, kernel_size // 3))
        dilated = cv2.dilate(binary, kernel, iterations=iterations)
        
        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        text_regions = []
        min_area = 50
        max_area = w * h * 0.1
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if min_area < area < max_area:
                x, y, cw, ch = cv2.boundingRect(contour)
                aspect_ratio = cw / max(ch, 1)
                if 0.2 < aspect_ratio < 20 and ch > 8:
                    roi = binary[y:y+ch, x:x+cw]
                    if roi.size > 0:
                        density = np.count_nonzero(roi) / roi.size
                        if 0.05 < density < 0.8:
                            confidence = min(0.8, density * 2 + 0.2)
                            text_regions.append((x, y, cw, ch, confidence))
        
        return text_regions

    def find_text_by_regex(self, image: np.ndarray, regions: List[Tuple[int, int, int, int, float]]) -> List[MaskRegion]:
        mask_regions = []
        
        for x, y, w, h, conf in regions:
            try:
                roi = image[y:y+h, x:x+w]
                text = self._simple_ocr_fallback(roi)
                
                if not text:
                    continue
                
                for rule in self.regex_patterns:
                    matches = rule["pattern"].findall(text)
                    if matches:
                        match_text = matches[0] if isinstance(matches[0], str) else matches[0][0]
                        mask_regions.append(MaskRegion(
                            x=x - self.mask_padding,
                            y=y - self.mask_padding,
                            width=w + self.mask_padding * 2,
                            height=h + self.mask_padding * 2,
                            reason=f"正则匹配[{rule['name']}]: {match_text[:20]}...",
                            confidence=min(1.0, conf * rule.get("priority", 1)),
                            needs_review=rule.get("needs_review", False)
                        ))
                        break
            except Exception:
                continue
        
        return mask_regions

    def _simple_ocr_fallback(self, roi: np.ndarray) -> str:
        return ""

    def apply_area_rules(self, image: np.ndarray) -> List[MaskRegion]:
        mask_regions = []
        h, w = image.shape[:2]
        
        for rule in self.area_rules:
            try:
                region_type = rule.get("type", "absolute")
                if region_type == "relative":
                    rx = rule.get("x", 0)
                    ry = rule.get("y", 0)
                    rw = rule.get("width", 0)
                    rh = rule.get("height", 0)
                    x = int(rx * w)
                    y = int(ry * h)
                    width = int(rw * w)
                    height = int(rh * h)
                else:
                    x = rule.get("x", 0)
                    y = rule.get("y", 0)
                    width = rule.get("width", 0)
                    height = rule.get("height", 0)
                    if x < 0: x = w + x
                    if y < 0: y = h + y
                    if width < 0: width = w + width - x
                    if height < 0: height = h + height - y
                
                x = max(0, min(x, w))
                y = max(0, min(y, h))
                width = max(0, min(width, w - x))
                height = max(0, min(height, h - y))
                
                if width > 0 and height > 0:
                    mask_regions.append(MaskRegion(
                        x=x,
                        y=y,
                        width=width,
                        height=height,
                        reason=f"区域规则: {rule.get('name', '未命名')}",
                        confidence=1.0,
                        needs_review=rule.get("needs_review", False)
                    ))
            except Exception as e:
                print(f"警告: 区域规则处理失败 '{rule.get('name', '')}': {e}")
        
        return mask_regions

    def find_suspect_text_regions(self, image: np.ndarray, confirmed_regions: List[MaskRegion]) -> List[MaskRegion]:
        text_regions = self.detect_text_regions_opencv(image)
        
        suspect_regions = []
        for x, y, w, h, conf in text_regions:
            if conf < self.min_text_confidence:
                continue
            
            is_confirmed = False
            for cr in confirmed_regions:
                if (x < cr.x + cr.width and x + w > cr.x and
                    y < cr.y + cr.height and y + h > cr.y):
                    is_confirmed = True
                    break
            
            if not is_confirmed:
                roi_h, roi_w = image.shape[:2]
                edge_threshold = roi_w * 0.2
                
                is_near_edge = (x < edge_threshold or x + w > roi_w - edge_threshold or
                               y < roi_h * 0.1 or y + h > roi_h * 0.9)
                
                if is_near_edge or conf > 0.7:
                    suspect_regions.append(MaskRegion(
                        x=x - self.mask_padding,
                        y=y - self.mask_padding,
                        width=w + self.mask_padding * 2,
                        height=h + self.mask_padding * 2,
                        reason=f"疑似文本区域 (置信度: {conf:.2f})",
                        confidence=conf,
                        needs_review=True
                    ))
        
        return suspect_regions

    def check_resolution_anomaly(self, image: np.ndarray) -> Tuple[bool, str]:
        h, w = image.shape[:2]
        standard_resolutions = [
            (1920, 1080), (2560, 1440), (3840, 2160),
            (1440, 900), (1680, 1050), (1280, 800),
            (2880, 1800), (2560, 1600), (2048, 1280),
            (3024, 1964), (3456, 2234),
        ]
        
        tolerance = 50
        for sw, sh in standard_resolutions:
            if abs(w - sw) <= tolerance and abs(h - sh) <= tolerance:
                return False, ""
        
        aspect_ratio = w / max(h, 1)
        if aspect_ratio < 1.0 or aspect_ratio > 2.5:
            return True, f"异常宽高比: {aspect_ratio:.2f} ({w}x{h})"
        
        return True, f"非标准分辨率: {w}x{h}"

    def apply_masks(self, image: np.ndarray, regions: List[MaskRegion]) -> np.ndarray:
        result = image.copy()
        h, w = result.shape[:2]
        
        for region in regions:
            if region.needs_review and not self.config.get("mask_suspect_regions", True):
                continue
            
            x1 = max(0, region.x)
            y1 = max(0, region.y)
            x2 = min(w, region.x + region.width)
            y2 = min(h, region.y + region.height)
            
            if x2 > x1 and y2 > y1:
                result[y1:y2, x1:x2] = self.mask_color
        
        return result

    def draw_overlay(self, image: np.ndarray, regions: List[MaskRegion]) -> np.ndarray:
        result = image.copy()
        overlay = result.copy()
        h, w = result.shape[:2]
        
        for region in regions:
            x1 = max(0, region.x)
            y1 = max(0, region.y)
            x2 = min(w, region.x + region.width)
            y2 = min(h, region.y + region.height)
            
            if x2 <= x1 or y2 <= y1:
                continue
            
            if region.needs_review:
                color = (0, 165, 255)
                alpha = 0.3
            else:
                color = (255, 0, 0)
                alpha = 0.4
            
            cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)
            cv2.addWeighted(overlay, alpha, result, 1 - alpha, 0, result)
            overlay = result.copy()
            
            cv2.rectangle(result, (x1, y1), (x2, y2), color, 2)
        
        return result

    def process_image(self, input_path: str, output_dir: str, backup_dir: str) -> ProcessResult:
        import time
        start_time = time.time()
        
        filename = os.path.basename(input_path)
        result = ProcessResult(
            filename=filename,
            original_path=input_path,
            backup_path="",
            output_path="",
        )
        
        try:
            image = cv2.imread(input_path)
            if image is None:
                raise ValueError(f"无法读取图片: {input_path}")
            
            result.image_size = (image.shape[1], image.shape[0])
            
            backup_path = self.backup_file(input_path, backup_dir)
            result.backup_path = backup_path
            
            is_dark = self.detect_dark_theme(image)
            result.is_dark_theme = is_dark
            
            text_regions = self.detect_text_regions_opencv(image)
            regex_masks = self.find_text_by_regex(image, text_regions)
            area_masks = self.apply_area_rules(image)
            
            all_confirmed = regex_masks + area_masks
            suspect_masks = self.find_suspect_text_regions(image, all_confirmed)
            
            all_regions = all_confirmed + suspect_masks
            result.mask_regions = all_regions
            
            review_reasons = []
            if is_dark:
                review_reasons.append("深色主题，需确认遮罩效果")
            
            area_review = [r for r in area_masks if r.needs_review]
            if area_review:
                review_reasons.append(f"{len(area_review)} 个区域规则遮罩需确认")
            
            regex_review = [r for r in regex_masks if r.needs_review]
            if regex_review:
                review_reasons.append(f"{len(regex_review)} 个正则匹配遮罩需确认")
            
            if suspect_masks:
                review_reasons.append(f"发现 {len(suspect_masks)} 个疑似文本区域")
            
            res_anomaly, res_msg = self.check_resolution_anomaly(image)
            if res_anomaly:
                review_reasons.append(res_msg)
            
            result.needs_review = len(review_reasons) > 0
            result.review_reasons = review_reasons
            
            masked_image = self.apply_masks(image, all_regions)
            
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, filename)
            cv2.imwrite(output_path, masked_image)
            result.output_path = output_path
            
            overlay_path = os.path.join(output_dir, f"overlay_{filename}")
            overlay_image = self.draw_overlay(image, all_regions)
            cv2.imwrite(overlay_path, overlay_image)
            
            result.status = "success"
            
        except Exception as e:
            result.status = "failed"
            result.error_message = str(e)
            print(f"处理失败 {filename}: {e}")
        
        result.process_time = time.time() - start_time
        return result


class ReportGenerator:
    def __init__(self, output_dir: str, config: dict):
        self.output_dir = output_dir
        self.config = config
    
    def generate_preview_html(self, results: List[ProcessResult]) -> str:
        template_path = os.path.join(os.path.dirname(__file__), "preview_template.html")
        
        if not os.path.exists(template_path):
            return self._generate_simple_html(results)
        
        with open(template_path, "r", encoding="utf-8") as f:
            template = f.read()
        
        results_json = json.dumps([self._result_to_dict(r) for r in results], 
                                  ensure_ascii=False, indent=2)
        
        summary = self._generate_summary(results)
        summary_json = json.dumps(summary, ensure_ascii=False)
        
        html = template.replace("{{RESULTS_JSON}}", results_json)
        html = html.replace("{{SUMMARY_JSON}}", summary_json)
        html = html.replace("{{GENERATE_TIME}}", 
                           datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        
        output_path = os.path.join(self.output_dir, "preview.html")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html)
        
        return output_path
    
    def _result_to_dict(self, result: ProcessResult) -> dict:
        regions = []
        for r in result.mask_regions:
            regions.append({
                "x": int(r.x),
                "y": int(r.y),
                "width": int(r.width),
                "height": int(r.height),
                "reason": str(r.reason),
                "confidence": float(r.confidence),
                "needs_review": bool(r.needs_review)
            })
        
        return {
            "filename": result.filename,
            "original_path": os.path.relpath(result.original_path, self.output_dir) if result.original_path else "",
            "backup_path": os.path.relpath(result.backup_path, self.output_dir) if result.backup_path else "",
            "output_path": os.path.relpath(result.output_path, self.output_dir) if result.output_path else "",
            "overlay_path": os.path.relpath(
                os.path.join(os.path.dirname(result.output_path), f"overlay_{result.filename}"),
                self.output_dir
            ) if result.output_path else "",
            "status": result.status,
            "needs_review": bool(result.needs_review),
            "review_reasons": list(result.review_reasons),
            "error_message": result.error_message,
            "image_size": f"{int(result.image_size[0])}x{int(result.image_size[1])}",
            "is_dark_theme": bool(result.is_dark_theme),
            "mask_count": len(result.mask_regions),
            "regions": regions,
            "process_time": f"{result.process_time:.2f}s"
        }
    
    def _generate_summary(self, results: List[ProcessResult]) -> dict:
        total = len(results)
        success = sum(1 for r in results if r.status == "success")
        failed = sum(1 for r in results if r.status == "failed")
        needs_review = sum(1 for r in results if r.needs_review and r.status == "success")
        confirmed = success - needs_review
        
        total_masks = sum(len(r.mask_regions) for r in results)
        suspect_masks = sum(sum(1 for m in r.mask_regions if m.needs_review) for r in results)
        confirmed_masks = total_masks - suspect_masks
        
        dark_theme_count = sum(1 for r in results if r.is_dark_theme)
        
        return {
            "total": total,
            "success": success,
            "failed": failed,
            "confirmed": confirmed,
            "needs_review": needs_review,
            "total_masks": total_masks,
            "confirmed_masks": confirmed_masks,
            "suspect_masks": suspect_masks,
            "dark_theme_count": dark_theme_count
        }
    
    def _generate_simple_html(self, results: List[ProcessResult]) -> str:
        summary = self._generate_summary(results)
        
        html_parts = [
            "<!DOCTYPE html>",
            '<html lang="zh-CN">',
            "<head>",
            '<meta charset="UTF-8">',
            "<title>截图隐私遮罩预览</title>",
            '<style>',
            self._get_css(),
            '</style>',
            "</head>",
            "<body>",
            '<div class="container">',
            '<header class="header">',
            '<h1>📸 截图隐私遮罩预览清单</h1>',
            f'<p class="subtitle">生成时间: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>',
            "</header>",
            self._generate_summary_section(summary),
            '<div class="filter-bar">',
            '<button class="filter-btn active" data-filter="all">全部</button>',
            '<button class="filter-btn" data-filter="success">处理成功</button>',
            '<button class="filter-btn" data-filter="review">待确认</button>',
            '<button class="filter-btn" data-filter="failed">处理失败</button>',
            "</div>",
            '<div class="images-grid">',
        ]
        
        for result in results:
            card_class = "image-card"
            if result.status == "failed":
                card_class += " failed"
            elif result.needs_review:
                card_class += " review"
            else:
                card_class += " success"
            
            html_parts.append(f'<div class="{card_class}" data-status="{result.status}" data-review="{str(result.needs_review).lower()}">')
            html_parts.append(f'<div class="card-header">')
            html_parts.append(f'<span class="filename">{result.filename}</span>')
            html_parts.append(f'<span class="status-badge {result.status}">')
            html_parts.append("❌ 失败" if result.status == "failed" else ("⚠️ 待确认" if result.needs_review else "✅ 成功"))
            html_parts.append("</span>")
            html_parts.append("</div>")
            
            if result.status == "success":
                overlay_rel = os.path.relpath(
                    os.path.join(os.path.dirname(result.output_path), f"overlay_{result.filename}"),
                    self.output_dir
                )
                html_parts.append(f'<div class="image-wrapper">')
                html_parts.append(f'<img src="{overlay_rel}" alt="{result.filename}" class="preview-img">')
                html_parts.append("</div>")
            else:
                html_parts.append(f'<div class="error-msg">错误: {result.error_message}</div>')
            
            html_parts.append(f'<div class="card-info">')
            html_parts.append(f'<div class="info-item"><span>尺寸:</span> {result.image_size[0]}x{result.image_size[1]}</div>')
            html_parts.append(f'<div class="info-item"><span>遮罩数:</span> {len(result.mask_regions)}</div>')
            html_parts.append(f'<div class="info-item"><span>深色主题:</span> {"是" if result.is_dark_theme else "否"}</div>')
            html_parts.append(f'<div class="info-item"><span>处理时间:</span> {result.process_time:.2f}s</div>')
            html_parts.append("</div>")
            
            if result.review_reasons:
                html_parts.append('<div class="review-reasons">')
                html_parts.append("<h4>待确认原因:</h4>")
                html_parts.append("<ul>")
                for reason in result.review_reasons:
                    html_parts.append(f"<li>{reason}</li>")
                html_parts.append("</ul>")
                html_parts.append("</div>")
            
            html_parts.append("</div>")
        
        html_parts.extend([
            "</div>",
            "</div>",
            '<script>',
            self._get_js(),
            '</script>',
            "</body>",
            "</html>"
        ])
        
        html_content = "\n".join(html_parts)
        output_path = os.path.join(self.output_dir, "preview.html")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        
        return output_path
    
    def _generate_summary_section(self, summary: dict) -> str:
        return f'''
        <div class="summary">
            <div class="summary-card total">
                <div class="summary-value">{summary["total"]}</div>
                <div class="summary-label">总图片数</div>
            </div>
            <div class="summary-card success">
                <div class="summary-value">{summary["success"]}</div>
                <div class="summary-label">处理成功</div>
            </div>
            <div class="summary-card confirmed">
                <div class="summary-value">{summary["confirmed"]}</div>
                <div class="summary-label">已确认</div>
            </div>
            <div class="summary-card review">
                <div class="summary-value">{summary["needs_review"]}</div>
                <div class="summary-label">待人工复查</div>
            </div>
            <div class="summary-card failed">
                <div class="summary-value">{summary["failed"]}</div>
                <div class="summary-label">处理失败</div>
            </div>
            <div class="summary-card masks">
                <div class="summary-value">{summary["confirmed_masks"]} / {summary["total_masks"]}</div>
                <div class="summary-label">确认遮罩/总数</div>
            </div>
        </div>
        '''
    
    def _get_css(self) -> str:
        return '''
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #1a1a2e;
            color: #e0e0e0;
            min-height: 100vh;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 24px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 32px;
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 8px;
            color: #fff;
        }
        
        .subtitle {
            color: #888;
            font-size: 14px;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        
        .summary-card {
            background: #16213e;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            border: 1px solid #0f3460;
        }
        
        .summary-card.total { border-color: #3498db; }
        .summary-card.success { border-color: #2ecc71; }
        .summary-card.confirmed { border-color: #27ae60; }
        .summary-card.review { border-color: #f39c12; }
        .summary-card.failed { border-color: #e74c3c; }
        .summary-card.masks { border-color: #9b59b6; }
        
        .summary-value {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 4px;
        }
        
        .summary-card.total .summary-value { color: #3498db; }
        .summary-card.success .summary-value { color: #2ecc71; }
        .summary-card.confirmed .summary-value { color: #27ae60; }
        .summary-card.review .summary-value { color: #f39c12; }
        .summary-card.failed .summary-value { color: #e74c3c; }
        .summary-card.masks .summary-value { color: #9b59b6; }
        
        .summary-label {
            font-size: 13px;
            color: #888;
        }
        
        .filter-bar {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
            flex-wrap: wrap;
        }
        
        .filter-btn {
            padding: 10px 20px;
            border: 1px solid #0f3460;
            background: #16213e;
            color: #e0e0e0;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        
        .filter-btn:hover {
            background: #0f3460;
        }
        
        .filter-btn.active {
            background: #e94560;
            border-color: #e94560;
            color: white;
        }
        
        .images-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 20px;
        }
        
        .image-card {
            background: #16213e;
            border-radius: 12px;
            overflow: hidden;
            border: 2px solid #0f3460;
            transition: transform 0.2s;
        }
        
        .image-card:hover {
            transform: translateY(-2px);
        }
        
        .image-card.success { border-color: #2ecc71; }
        .image-card.review { border-color: #f39c12; }
        .image-card.failed { border-color: #e74c3c; }
        
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: #0f3460;
        }
        
        .filename {
            font-weight: 500;
            font-size: 14px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 200px;
        }
        
        .status-badge {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .status-badge.success { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }
        .status-badge.failed { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
        .status-badge.review { background: rgba(243, 156, 18, 0.2); color: #f39c12; }
        
        .image-wrapper {
            aspect-ratio: 16/10;
            overflow: hidden;
            background: #0a0a1a;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .preview-img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        
        .card-info {
            padding: 12px 16px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            font-size: 13px;
        }
        
        .info-item span {
            color: #888;
        }
        
        .review-reasons {
            padding: 12px 16px;
            border-top: 1px solid #0f3460;
            font-size: 12px;
        }
        
        .review-reasons h4 {
            color: #f39c12;
            margin-bottom: 6px;
        }
        
        .review-reasons ul {
            padding-left: 20px;
            color: #aaa;
        }
        
        .review-reasons li {
            margin-bottom: 4px;
        }
        
        .error-msg {
            padding: 24px;
            color: #e74c3c;
            text-align: center;
            font-size: 14px;
        }
        '''
    
    def _get_js(self) -> str:
        return '''
        document.addEventListener("DOMContentLoaded", function() {
            const filterBtns = document.querySelectorAll(".filter-btn");
            const cards = document.querySelectorAll(".image-card");
            
            filterBtns.forEach(btn => {
                btn.addEventListener("click", function() {
                    filterBtns.forEach(b => b.classList.remove("active"));
                    this.classList.add("active");
                    
                    const filter = this.dataset.filter;
                    
                    cards.forEach(card => {
                        let show = false;
                        switch(filter) {
                            case "all":
                                show = true;
                                break;
                            case "success":
                                show = card.dataset.status === "success";
                                break;
                            case "review":
                                show = card.dataset.review === "true";
                                break;
                            case "failed":
                                show = card.dataset.status === "failed";
                                break;
                        }
                        card.style.display = show ? "block" : "none";
                    });
                });
            });
        });
        '''
    
    def generate_text_report(self, results: List[ProcessResult]) -> str:
        summary = self._generate_summary(results)
        
        lines = []
        lines.append("=" * 60)
        lines.append("  截图隐私遮罩处理报告")
        lines.append("=" * 60)
        lines.append(f"生成时间: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")
        
        lines.append("【统计概览】")
        lines.append(f"  总图片数: {summary['total']}")
        lines.append(f"  处理成功: {summary['success']}")
        lines.append(f"  已确认:   {summary['confirmed']}")
        lines.append(f"  待复查:   {summary['needs_review']}")
        lines.append(f"  处理失败: {summary['failed']}")
        lines.append(f"  遮罩总数: {summary['total_masks']} (确认: {summary['confirmed_masks']}, 疑似: {summary['suspect_masks']})")
        lines.append(f"  深色主题: {summary['dark_theme_count']} 张")
        lines.append("")
        
        lines.append("-" * 60)
        lines.append("【处理成功 - 待人工复查】")
        lines.append("-" * 60)
        review_results = [r for r in results if r.needs_review and r.status == "success"]
        if review_results:
            for i, r in enumerate(review_results, 1):
                lines.append(f"\n  {i}. {r.filename}")
                lines.append(f"     尺寸: {r.image_size[0]}x{r.image_size[1]}")
                lines.append(f"     遮罩数: {len(r.mask_regions)}")
                lines.append(f"     待确认原因:")
                for reason in r.review_reasons:
                    lines.append(f"       - {reason}")
        else:
            lines.append("  (无)")
        lines.append("")
        
        lines.append("-" * 60)
        lines.append("【处理成功 - 已确认】")
        lines.append("-" * 60)
        confirmed_results = [r for r in results if not r.needs_review and r.status == "success"]
        if confirmed_results:
            for i, r in enumerate(confirmed_results, 1):
                lines.append(f"  {i}. {r.filename} ({r.image_size[0]}x{r.image_size[1]}, {len(r.mask_regions)} 个遮罩)")
        else:
            lines.append("  (无)")
        lines.append("")
        
        lines.append("-" * 60)
        lines.append("【处理失败】")
        lines.append("-" * 60)
        failed_results = [r for r in results if r.status == "failed"]
        if failed_results:
            for i, r in enumerate(failed_results, 1):
                lines.append(f"  {i}. {r.filename}")
                lines.append(f"     错误: {r.error_message}")
        else:
            lines.append("  (无)")
        lines.append("")
        
        lines.append("=" * 60)
        lines.append("  报告结束")
        lines.append("=" * 60)
        
        report_text = "\n".join(lines)
        output_path = os.path.join(self.output_dir, "report.txt")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(report_text)
        
        return output_path
    
    def generate_json_report(self, results: List[ProcessResult]) -> str:
        summary = self._generate_summary(results)
        
        report = {
            "generate_time": datetime.datetime.now().isoformat(),
            "summary": summary,
            "results": [self._result_to_dict(r) for r in results]
        }
        
        output_path = os.path.join(self.output_dir, "report.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        return output_path


def get_image_files(input_dir: str) -> List[str]:
    image_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff", ".webp"}
    image_files = []
    
    for root, dirs, files in os.walk(input_dir):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in image_extensions:
                image_files.append(os.path.join(root, file))
    
    return sorted(image_files)


def main():
    parser = argparse.ArgumentParser(description="桌面截图隐私遮罩工具")
    parser.add_argument("-i", "--input", required=True, help="输入图片目录")
    parser.add_argument("-o", "--output", default="output", help="输出目录 (默认: output)")
    parser.add_argument("-c", "--config", default="config.yaml", help="配置文件路径 (默认: config.yaml)")
    parser.add_argument("-b", "--backup-dir", default=None, help="备份目录 (默认: output/backup)")
    parser.add_argument("--no-preview", action="store_true", help="不生成HTML预览")
    parser.add_argument("--no-text-report", action="store_true", help="不生成文本报告")
    parser.add_argument("--no-json-report", action="store_true", help="不生成JSON报告")
    
    args = parser.parse_args()
    
    input_dir = os.path.abspath(args.input)
    if not os.path.isdir(input_dir):
        print(f"错误: 输入目录不存在: {input_dir}")
        sys.exit(1)
    
    config_path = os.path.abspath(args.config)
    if not os.path.isfile(config_path):
        print(f"警告: 配置文件不存在，将使用默认配置: {config_path}")
        print("提示: 可使用 --config 指定配置文件路径")
        config_path = _create_default_config(config_path)
    
    output_dir = os.path.abspath(args.output)
    backup_dir = os.path.abspath(args.backup_dir) if args.backup_dir else os.path.join(output_dir, "backup")
    
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(backup_dir, exist_ok=True)
    
    print("=" * 60)
    print("  桌面截图隐私遮罩工具")
    print("=" * 60)
    print(f"输入目录: {input_dir}")
    print(f"输出目录: {output_dir}")
    print(f"备份目录: {backup_dir}")
    print(f"配置文件: {config_path}")
    print()
    
    image_files = get_image_files(input_dir)
    if not image_files:
        print("错误: 未找到图片文件")
        sys.exit(1)
    
    print(f"找到 {len(image_files)} 张图片")
    print()
    
    masker = PrivacyMasker(config_path)
    report_gen = ReportGenerator(output_dir, masker.config)
    
    results = []
    for i, img_path in enumerate(image_files, 1):
        filename = os.path.basename(img_path)
        print(f"[{i}/{len(image_files)}] 处理: {filename}", end=" ")
        
        result = masker.process_image(img_path, output_dir, backup_dir)
        results.append(result)
        
        if result.status == "success":
            status = "⚠️ 待确认" if result.needs_review else "✅ 成功"
            print(f"{status} ({len(result.mask_regions)} 个遮罩, {result.process_time:.2f}s)")
        else:
            print(f"❌ 失败: {result.error_message}")
    
    print()
    print("-" * 60)
    print("  处理完成，生成报告中...")
    print("-" * 60)
    print()
    
    if not args.no_preview:
        preview_path = report_gen.generate_preview_html(results)
        print(f"📄 HTML预览: {preview_path}")
    
    if not args.no_text_report:
        text_report_path = report_gen.generate_text_report(results)
        print(f"📝 文本报告: {text_report_path}")
    
    if not args.no_json_report:
        json_report_path = report_gen.generate_json_report(results)
        print(f"📊 JSON报告: {json_report_path}")
    
    summary = report_gen._generate_summary(results)
    print()
    print("=" * 60)
    print("  统计汇总")
    print("=" * 60)
    print(f"  总数: {summary['total']} 张")
    print(f"  成功: {summary['success']} 张 (已确认: {summary['confirmed']}, 待复查: {summary['needs_review']})")
    print(f"  失败: {summary['failed']} 张")
    print(f"  遮罩: {summary['total_masks']} 个 (确认: {summary['confirmed_masks']}, 疑似: {summary['suspect_masks']})")
    print("=" * 60)


def _create_default_config(config_path: str) -> str:
    default_config = {
        "mask_color": [0, 0, 0],
        "mask_padding": 4,
        "dark_theme_threshold": 80,
        "min_text_confidence": 0.6,
        "mask_suspect_regions": True,
        "regex_rules": [
            {
                "name": "手机号",
                "pattern": r"1[3-9]\d{9}",
                "priority": 1.0,
                "needs_review": False
            },
            {
                "name": "身份证号",
                "pattern": r"\d{17}[\dXx]",
                "priority": 1.0,
                "needs_review": False
            },
            {
                "name": "邮箱",
                "pattern": r"[\w.-]+@[\w.-]+\.\w+",
                "priority": 0.8,
                "needs_review": False
            },
            {
                "name": "订单号",
                "pattern": r"(?:订单号?|order[_\s]?id)[:：\s]*[A-Za-z0-9_-]{8,}",
                "priority": 0.9,
                "needs_review": True
            },
            {
                "name": "姓名",
                "pattern": r"(?:姓名|name)[:：\s]*[\u4e00-\u9fa5]{2,4}",
                "priority": 0.7,
                "needs_review": True
            }
        ],
        "area_rules": [
            {
                "name": "顶部用户信息栏",
                "type": "relative",
                "x": 0.0,
                "y": 0.0,
                "width": 1.0,
                "height": 0.08,
                "needs_review": True
            },
            {
                "name": "底部状态栏",
                "type": "relative",
                "x": 0.0,
                "y": 0.92,
                "width": 1.0,
                "height": 0.08,
                "needs_review": True
            }
        ]
    }
    
    os.makedirs(os.path.dirname(config_path) or ".", exist_ok=True)
    
    if config_path.endswith((".yaml", ".yml")):
        try:
            import yaml
            with open(config_path, "w", encoding="utf-8") as f:
                yaml.dump(default_config, f, allow_unicode=True, default_flow_style=False)
        except ImportError:
            json_path = os.path.splitext(config_path)[0] + ".json"
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(default_config, f, ensure_ascii=False, indent=2)
            return json_path
    else:
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(default_config, f, ensure_ascii=False, indent=2)
    
    return config_path


if __name__ == "__main__":
    main()
