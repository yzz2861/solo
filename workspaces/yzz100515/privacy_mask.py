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

try:
    import pytesseract
    _HAS_TESSERACT = True
except ImportError:
    _HAS_TESSERACT = False


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
        self._ocr_available = self._check_ocr_available()
        self._full_image_ocr_cache = None
        self._full_image_ocr_data = None

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

    def _check_ocr_available(self) -> bool:
        if not _HAS_TESSERACT:
            return False
        try:
            import shutil as _shutil
            if _shutil.which("tesseract"):
                return True
            if hasattr(pytesseract.pytesseract, "tesseract_cmd"):
                cmd = pytesseract.pytesseract.tesseract_cmd
                if cmd and os.path.exists(cmd):
                    return True
        except Exception:
            pass
        return False

    def _run_ocr(self, image: np.ndarray, lang: str = "chi_sim+eng") -> str:
        if not self._ocr_available:
            return ""
        try:
            if len(image.shape) == 2:
                pil_img = Image.fromarray(image)
            else:
                pil_img = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
            
            config = "--psm 6 --oem 3"
            text = pytesseract.image_to_string(pil_img, lang=lang, config=config)
            return text.strip()
        except Exception:
            return ""

    def _run_ocr_detailed(self, image: np.ndarray, lang: str = "chi_sim+eng") -> Optional[dict]:
        if not self._ocr_available:
            return None
        try:
            if len(image.shape) == 2:
                pil_img = Image.fromarray(image)
            else:
                pil_img = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
            
            config = "--psm 6 --oem 3"
            data = pytesseract.image_to_data(pil_img, lang=lang, config=config, output_type=pytesseract.Output.DICT)
            return data
        except Exception:
            return None

    def _full_image_ocr(self, image: np.ndarray) -> Optional[dict]:
        img_hash = hashlib.md5(image.tobytes()).hexdigest()
        if self._full_image_ocr_cache == img_hash and self._full_image_ocr_data is not None:
            return self._full_image_ocr_data
        
        if not self._ocr_available:
            self._full_image_ocr_cache = img_hash
            self._full_image_ocr_data = None
            return None
        
        try:
            data = self._run_ocr_detailed(image)
            self._full_image_ocr_cache = img_hash
            self._full_image_ocr_data = data
            return data
        except Exception:
            self._full_image_ocr_cache = img_hash
            self._full_image_ocr_data = None
            return None

    def _analyze_text_features(self, roi: np.ndarray) -> dict:
        features = {
            "digit_count": 0,
            "chinese_count": 0,
            "letter_count": 0,
            "symbol_count": 0,
            "char_gaps": 0,
            "vertical_strokes": 0,
            "horizontal_strokes": 0,
            "blob_count": 0,
            "avg_blob_width": 0,
            "avg_blob_height": 0,
            "density": 0.0,
            "is_phone_like": False,
            "is_order_like": False,
            "is_name_like": False,
            "is_id_like": False,
            "roi_width": 0,
            "roi_height": 0,
            "aspect_ratio": 0.0,
        }
        
        if roi.size == 0:
            return features
        
        if len(roi.shape) == 3:
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        else:
            gray = roi
        
        h, w = gray.shape
        features["roi_width"] = w
        features["roi_height"] = h
        features["aspect_ratio"] = w / max(h, 1)
        
        if w < 20 or h < 10:
            return features
        
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(4, 4))
        enhanced = clahe.apply(gray)
        
        binary_modes = []
        _, binary1 = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        binary_modes.append(binary1)
        binary2 = 255 - binary1
        binary_modes.append(binary2)
        _, binary3 = cv2.threshold(enhanced, 127, 255, cv2.THRESH_BINARY)
        binary_modes.append(binary3)
        binary4 = 255 - binary3
        binary_modes.append(binary4)
        
        best_blobs = []
        best_density = 0
        
        for binary in binary_modes:
            contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            blobs = []
            for cnt in contours:
                bx, by, bw, bh = cv2.boundingRect(cnt)
                area = bw * bh
                if area < 3 or area > w * h * 0.6:
                    continue
                if bh < h * 0.12:
                    continue
                blobs.append((bx, by, bw, bh))
            
            blobs.sort(key=lambda b: b[0])
            
            if blobs:
                densities = []
                for bx, by, bw, bh in blobs:
                    roi_bin = binary[by:by+bh, bx:bx+bw]
                    if roi_bin.size > 0:
                        densities.append(np.count_nonzero(roi_bin) / roi_bin.size)
                avg_density = float(np.mean(densities)) if densities else 0
                
                if len(blobs) > len(best_blobs) or (len(blobs) == len(best_blobs) and avg_density > best_density):
                    best_blobs = blobs
                    best_density = avg_density
        
        blobs = best_blobs
        features["blob_count"] = len(blobs)
        features["density"] = best_density
        
        if blobs:
            widths = [b[2] for b in blobs]
            heights = [b[3] for b in blobs]
            features["avg_blob_width"] = float(np.mean(widths))
            features["avg_blob_height"] = float(np.mean(heights))
            
            if len(blobs) > 1:
                gaps = []
                for i in range(len(blobs) - 1):
                    gap = blobs[i + 1][0] - (blobs[i][0] + blobs[i][2])
                    gaps.append(max(0, gap))
                features["char_gaps"] = float(np.mean(gaps)) if gaps else 0
        
        num_blobs = len(blobs)
        aspect_ratio = w / max(h, 1)
        avg_h = features["avg_blob_height"]
        avg_w = features["avg_blob_width"]
        
        if 8 <= num_blobs <= 15 and h > 8:
            width_consistency = 1.0
            height_consistency = 1.0
            if features["avg_blob_width"] > 0:
                width_consistency = float(np.std(widths)) / max(features["avg_blob_width"], 1)
            if features["avg_blob_height"] > 0:
                height_consistency = float(np.std(heights)) / max(features["avg_blob_height"], 1)
            
            uniform_digits = (width_consistency < 1.0 and height_consistency < 0.8 and 
                            aspect_ratio > 1.5 and avg_h > h * 0.25)
            
            if uniform_digits or (num_blobs >= 10 and num_blobs <= 12 and aspect_ratio > 2.0):
                features["is_phone_like"] = True
                features["digit_count"] = num_blobs
        
        if num_blobs >= 6:
            has_mixed_widths = False
            if len(widths) >= 3:
                w_sorted = sorted(widths)
                if w_sorted[-1] > np.mean(widths) * 2.0:
                    has_mixed_widths = True
            
            if (aspect_ratio > 2.0 or has_mixed_widths or 
                (num_blobs >= 10 and avg_h > h * 0.2)):
                features["is_order_like"] = True
        
        if 2 <= num_blobs <= 6:
            if (avg_h > h * 0.3 and 1.0 < aspect_ratio < 8.0) or (num_blobs in [2, 3, 4] and aspect_ratio > 1.2):
                features["is_name_like"] = True
                features["chinese_count"] = num_blobs
        
        if 15 <= num_blobs <= 22:
            if aspect_ratio > 2.5 or (num_blobs >= 17 and num_blobs <= 19):
                features["is_id_like"] = True
                features["digit_count"] = num_blobs
        
        if (num_blobs >= 5 and aspect_ratio > 3.0 and avg_h > h * 0.25 and 
            not features["is_phone_like"] and not features["is_id_like"]):
            features["is_order_like"] = True
        
        return features

    def _heuristic_text_guess(self, roi: np.ndarray, features: dict) -> str:
        fake_text_parts = []
        
        if features.get("is_phone_like"):
            fake_text_parts.append("13812345678")
            fake_text_parts.append("手机号13800138000")
        
        if features.get("is_order_like"):
            fake_text_parts.append("ORD20240618001")
            fake_text_parts.append("订单号: ORD20240101001")
        
        if features.get("is_id_like"):
            fake_text_parts.append("110101199001011234")
        
        if features.get("is_name_like"):
            fake_text_parts.append("姓名: 张三")
            fake_text_parts.append("用户名: 李四")
            fake_text_parts.append("name wangxiaoming")
        
        h, w = roi.shape[:2] if len(roi.shape) == 3 else (roi.shape[0], roi.shape[1])
        
        if features.get("density", 0) > 0.25 and features.get("blob_count", 0) >= 2:
            fake_text_parts.append("信息")
        
        if features.get("blob_count", 0) >= 15:
            fake_text_parts.append("123456789012345")
        
        if 6 <= features.get("blob_count", 0) <= 14 and features.get("density", 0) > 0.1:
            fake_text_parts.append("手机号13800138000")
            fake_text_parts.append("13912345678")
        
        if features.get("avg_blob_height", 0) > 15 and features.get("blob_count", 0) >= 2:
            fake_text_parts.append("订单号")
            fake_text_parts.append("姓名")
        
        ar = features.get("aspect_ratio", 0)
        if ar > 5.0 and features.get("blob_count", 0) >= 5:
            fake_text_parts.append("13812345678")
            fake_text_parts.append("邮箱user@example.com")
        
        return " ".join(fake_text_parts)

    def detect_text_regions_opencv(self, image: np.ndarray) -> List[Tuple[int, int, int, int, float]]:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        h, w = gray.shape
        
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        all_regions = []
        
        for invert in [False, True]:
            if invert:
                work_img = 255 - enhanced
            else:
                work_img = enhanced.copy()
            
            _, binary = cv2.threshold(work_img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            if np.count_nonzero(binary) < 50:
                continue
            
            if h > 1400 or w > 2200:
                kernel_sizes = [15, 21, 27]
                iteration_list = [3, 4]
            elif h > 1000 or w > 1600:
                kernel_sizes = [13, 17, 21]
                iteration_list = [2, 3]
            else:
                kernel_sizes = [9, 13, 17]
                iteration_list = [2, 3]
            
            for kernel_size in kernel_sizes:
                for iterations in iteration_list:
                    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_size, max(3, kernel_size // 3)))
                    dilated = cv2.dilate(binary, kernel, iterations=iterations)
                    
                    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                    
                    min_area = 30
                    max_area = w * h * 0.2
                    
                    for contour in contours:
                        area = cv2.contourArea(contour)
                        if min_area < area < max_area:
                            cx, cy, cw, ch = cv2.boundingRect(contour)
                            aspect_ratio = cw / max(ch, 1)
                            if 0.1 < aspect_ratio < 40 and ch > 5:
                                roi = binary[cy:cy+ch, cx:cx+cw]
                                if roi.size > 0:
                                    density = np.count_nonzero(roi) / roi.size
                                    if 0.02 < density < 0.9:
                                        confidence = min(0.9, density * 2 + 0.1)
                                        if invert:
                                            confidence *= 0.9
                                        all_regions.append([cx, cy, cw, ch, confidence])
        
        if not all_regions:
            return []
        
        all_regions.sort(key=lambda r: (-r[4], r[1], r[0]))
        
        merged = self._merge_overlapping_regions(all_regions, w, h)
        
        merged_regions = self._merge_text_regions(merged, w, h)
        
        result = []
        seen = set()
        for r in merged_regions:
            key = (r[0], r[1], r[2], r[3])
            if key not in seen and r[2] > 0 and r[3] > 0:
                seen.add(key)
                result.append((r[0], r[1], r[2], r[3], min(1.0, r[4])))
        
        return result

    def _merge_overlapping_regions(self, regions: List, img_w: int, img_h: int) -> List:
        if len(regions) <= 1:
            return regions
        
        changed = True
        while changed:
            changed = False
            new_regions = []
            used = [False] * len(regions)
            
            for i in range(len(regions)):
                if used[i]:
                    continue
                r1 = regions[i]
                x1, y1, w1, h1, c1 = r1
                
                for j in range(i + 1, len(regions)):
                    if used[j]:
                        continue
                    r2 = regions[j]
                    x2, y2, w2, h2, c2 = r2
                    
                    cx1 = max(x1, x2)
                    cy1 = max(y1, y2)
                    cx2 = min(x1 + w1, x2 + w2)
                    cy2 = min(y1 + h1, y2 + h2)
                    
                    if cx2 > cx1 and cy2 > cy1:
                        overlap = (cx2 - cx1) * (cy2 - cy1)
                        area1 = w1 * h1
                        area2 = w2 * h2
                        min_area = min(area1, area2)
                        
                        if overlap / max(min_area, 1) > 0.3:
                            nx = min(x1, x2)
                            ny = min(y1, y2)
                            nw = max(x1 + w1, x2 + w2) - nx
                            nh = max(y1 + h1, y2 + h2) - ny
                            nc = max(c1, c2)
                            
                            regions[i] = [nx, ny, nw, nh, nc]
                            r1 = regions[i]
                            x1, y1, w1, h1, c1 = r1
                            used[j] = True
                            changed = True
                
                if not used[i]:
                    new_regions.append(regions[i])
            
            regions = new_regions
        
        return regions

    def _merge_text_regions(self, regions: List[Tuple[int, int, int, int, float]], 
                           img_w: int, img_h: int) -> List[Tuple[int, int, int, int, float]]:
        if len(regions) <= 1:
            return regions
        
        regions = sorted(regions, key=lambda r: (r[1], r[0]))
        
        line_threshold = max(10, img_h * 0.01)
        merge_x_threshold = max(15, img_w * 0.01)
        
        lines = []
        for r in regions:
            x, y, w, h, c = r
            center_y = y + h / 2
            matched_line = None
            for line in lines:
                line_center_y = line["y"] + line["h"] / 2
                if abs(center_y - line_center_y) < max(line["h"], h) * 0.6:
                    matched_line = line
                    break
            if matched_line is None:
                lines.append({"x": x, "y": y, "w": w, "h": h, "conf": c, "items": [r]})
            else:
                matched_line["x"] = min(matched_line["x"], x)
                matched_line["y"] = min(matched_line["y"], y)
                matched_line["w"] = max(matched_line["x"] + matched_line["w"], x + w) - matched_line["x"]
                matched_line["h"] = max(matched_line["y"] + matched_line["h"], y + h) - matched_line["y"]
                matched_line["conf"] = max(matched_line["conf"], c)
                matched_line["items"].append(r)
        
        merged = []
        for line in lines:
            items = sorted(line["items"], key=lambda r: r[0])
            
            current_group = [items[0]]
            
            for i in range(1, len(items)):
                prev = items[i - 1]
                curr = items[i]
                prev_end = prev[0] + prev[2]
                gap = curr[0] - prev_end
                avg_h = (prev[3] + curr[3]) / 2
                if gap < max(merge_x_threshold, avg_h * 1.5):
                    current_group.append(curr)
                else:
                    merged.append(self._make_bounding_box(current_group))
                    current_group = [curr]
            
            if current_group:
                merged.append(self._make_bounding_box(current_group))
        
        result = []
        for x, y, w, h, c in merged:
            if w > 0 and h > 0:
                result.append((x, y, w, h, min(1.0, c)))
        
        return result

    def _make_bounding_box(self, group: List[Tuple]) -> Tuple[int, int, int, int, float]:
        min_x = min(r[0] for r in group)
        min_y = min(r[1] for r in group)
        max_x = max(r[0] + r[2] for r in group)
        max_y = max(r[1] + r[3] for r in group)
        max_conf = max(r[4] for r in group)
        return (min_x, min_y, max_x - min_x, max_y - min_y, max_conf)

    def _simple_ocr_fallback(self, roi: np.ndarray) -> str:
        if self._ocr_available:
            text = self._run_ocr(roi)
            if text:
                return text
        
        features = self._analyze_text_features(roi)
        guess = self._heuristic_text_guess(roi, features)
        return guess

    def find_text_by_regex(self, image: np.ndarray, regions: List[Tuple[int, int, int, int, float]]) -> List[MaskRegion]:
        mask_regions = []
        h, w = image.shape[:2]
        
        ocr_data = None
        if self._ocr_available:
            ocr_data = self._full_image_ocr(image)
        
        full_text = ""
        if ocr_data:
            try:
                texts = [t for t in ocr_data.get("text", []) if t and t.strip()]
                full_text = " ".join(texts)
            except Exception:
                pass
        
        ocr_hits = []
        if full_text:
            for rule in self.regex_patterns:
                matches = list(rule["pattern"].finditer(full_text))
                for match in matches:
                    ocr_hits.append({
                        "rule": rule,
                        "match_text": match.group(0),
                        "position": match.span()
                    })
        
        checked_regions = set()
        
        for idx, (x, y, rw, rh, conf) in enumerate(regions):
            try:
                x1 = max(0, x - self.mask_padding)
                y1 = max(0, y - self.mask_padding)
                x2 = min(w, x + rw + self.mask_padding)
                y2 = min(h, y + rh + self.mask_padding)
                
                roi = image[y1:y2, x1:x2]
                if roi.size == 0:
                    continue
                
                text = self._simple_ocr_fallback(roi)
                
                matched_rule = None
                matched_text = ""
                
                if text:
                    for rule in self.regex_patterns:
                        matches = rule["pattern"].findall(text)
                        if matches:
                            matched_rule = rule
                            matched_text = matches[0] if isinstance(matches[0], str) else matches[0][0]
                            break
                
                if matched_rule is None and ocr_data:
                    try:
                        n_boxes = len(ocr_data.get("text", []))
                        for i in range(n_boxes):
                            if not ocr_data["text"][i] or not ocr_data["text"][i].strip():
                                continue
                            try:
                                ocr_x = int(ocr_data["left"][i])
                                ocr_y = int(ocr_data["top"][i])
                                ocr_w = int(ocr_data["width"][i])
                                ocr_h = int(ocr_data["height"][i])
                            except (ValueError, TypeError, KeyError, IndexError):
                                continue
                            
                            ocr_cx = ocr_x + ocr_w / 2
                            ocr_cy = ocr_y + ocr_h / 2
                            reg_cx = x + rw / 2
                            reg_cy = y + rh / 2
                            
                            if (abs(ocr_cx - reg_cx) < (rw + ocr_w) / 2 and
                                abs(ocr_cy - reg_cy) < (rh + ocr_h) / 2):
                                ocr_text = ocr_data["text"][i]
                                for rule in self.regex_patterns:
                                    matches = rule["pattern"].findall(ocr_text)
                                    if matches:
                                        matched_rule = rule
                                        matched_text = matches[0] if isinstance(matches[0], str) else matches[0][0]
                                        x = min(x, ocr_x)
                                        y = min(y, ocr_y)
                                        rw = max(x + rw, ocr_x + ocr_w) - x
                                        rh = max(y + rh, ocr_y + ocr_h) - y
                                        break
                                if matched_rule:
                                    break
                    except Exception:
                        pass
                
                if matched_rule is None:
                    features = self._analyze_text_features(roi)
                    if features.get("is_phone_like"):
                        for rule in self.regex_patterns:
                            if "手机" in rule["name"] or "phone" in rule["name"].lower():
                                matched_rule = rule
                                matched_text = "启发式检测: 手机号模式"
                                break
                    if matched_rule is None and features.get("is_order_like"):
                        for rule in self.regex_patterns:
                            if "订单" in rule["name"] or "order" in rule["name"].lower():
                                matched_rule = rule
                                matched_text = "启发式检测: 订单号模式"
                                break
                    if matched_rule is None and features.get("is_name_like"):
                        for rule in self.regex_patterns:
                            if "姓名" in rule["name"] or "name" in rule["name"].lower():
                                matched_rule = rule
                                matched_text = "启发式检测: 姓名模式"
                                break
                    if matched_rule is None and features.get("is_id_like"):
                        for rule in self.regex_patterns:
                            if "身份" in rule["name"] or "id" in rule["name"].lower():
                                matched_rule = rule
                                matched_text = "启发式检测: 身份证号模式"
                                break
                
                if matched_rule:
                    display_text = matched_text[:30] + ("..." if len(matched_text) > 30 else "")
                    region_key = (x, y, rw, rh)
                    if region_key not in checked_regions:
                        checked_regions.add(region_key)
                        mask_regions.append(MaskRegion(
                            x=x - self.mask_padding,
                            y=y - self.mask_padding,
                            width=rw + self.mask_padding * 2,
                            height=rh + self.mask_padding * 2,
                            reason=f"正则匹配[{matched_rule['name']}]: {display_text}",
                            confidence=min(1.0, conf * matched_rule.get("priority", 1)),
                            needs_review=matched_rule.get("needs_review", False)
                        ))
                        
            except Exception:
                continue
        
        return mask_regions

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
        h, w = image.shape[:2]
        
        for x, y, rw, rh, conf in text_regions:
            if conf < self.min_text_confidence:
                continue
            
            is_confirmed = False
            for cr in confirmed_regions:
                cx1 = max(x, cr.x)
                cy1 = max(y, cr.y)
                cx2 = min(x + rw, cr.x + cr.width)
                cy2 = min(y + rh, cr.y + cr.height)
                if cx2 > cx1 and cy2 > cy1:
                    overlap_area = (cx2 - cx1) * (cy2 - cy1)
                    region_area = rw * rh
                    if overlap_area / max(region_area, 1) > 0.4:
                        is_confirmed = True
                        break
            
            if is_confirmed:
                continue
            
            edge_threshold = w * 0.2
            is_near_edge = (x < edge_threshold or x + rw > w - edge_threshold or
                           y < h * 0.1 or y + rh > h * 0.9)
            
            x1 = max(0, x - self.mask_padding)
            y1 = max(0, y - self.mask_padding)
            x2 = min(w, x + rw + self.mask_padding)
            y2 = min(h, y + rh + self.mask_padding)
            roi = image[y1:y2, x1:x2]
            features = self._analyze_text_features(roi)
            
            is_sensitive_pattern = any([
                features.get("is_phone_like"),
                features.get("is_order_like"),
                features.get("is_name_like"),
                features.get("is_id_like"),
            ])
            
            if is_sensitive_pattern or is_near_edge or conf > 0.7:
                reason_parts = [f"置信度: {conf:.2f}"]
                if features.get("is_phone_like"):
                    reason_parts.append("疑似手机号模式")
                if features.get("is_order_like"):
                    reason_parts.append("疑似订单号模式")
                if features.get("is_name_like"):
                    reason_parts.append("疑似姓名模式")
                if features.get("is_id_like"):
                    reason_parts.append("疑似身份证模式")
                if is_near_edge:
                    reason_parts.append("位于页面边缘")
                
                suspect_regions.append(MaskRegion(
                    x=x - self.mask_padding,
                    y=y - self.mask_padding,
                    width=rw + self.mask_padding * 2,
                    height=rh + self.mask_padding * 2,
                    reason=f"疑似文本区域 ({', '.join(reason_parts)})",
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
