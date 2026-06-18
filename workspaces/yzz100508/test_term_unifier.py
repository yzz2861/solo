#!/usr/bin/env python3
"""term_unifier 测试用例"""
from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from term_unifier.models import (
    TermEntry, TermStatus, FileType,
    DocumentSegment, Document, Match, ConflictReport, ReplacementRecord, AuditLog,
)
from term_unifier.glossary_loader import load_glossary
from term_unifier.document_loader import load_document, detect_file_type
from term_unifier.matcher import find_matches
from term_unifier.reporter import build_conflict_report, generate_preview, generate_report_text
from term_unifier.writer import write_revised, write_audit_log


TEST_GLOSSARY_CSV = """\
source,preferred,status,alternatives,forbidden,context,exceptions,case_sensitive,match_plural,word_boundary,priority,notes
Transcoder,转码器,standard,转码程序;转码工具,编码器;编码工具,,,,true,true,5,课程S2统一译名
Keyframe,关键帧,standard,关键影格,I帧;I-Frame;内部帧,,第1章=关键画面,false,true,true,4,第1章回顾篇保留旧译名
Neural Network,神经网络,standard,,神经网;NN模型,,第5章=神经网路,false,true,false,3,台版第5章沿用繁体旧译
GPU,GPU,standard,图形处理器;显示卡,显卡;绘图卡,,,true,false,true,3,作为专有名词保留大写
Pipeline,流水线,standard,管线;工作流,管道;链路,,,false,true,true,2,
Tensor,张量,needs_review,,张量器;Tensor运算,计算图,,false,true,true,3,仅在涉及计算图上下文时译张量
Dataset,数据集,standard,资料集;数据集合,数据组,,第2章=资料集,false,true,true,2,
Gradient Descent,梯度下降,standard,,梯度递减;最速下降法,,,false,true,true,3,
Batch Normalization,批量归一化,standard,,批归一化;批标准化;BN,BN层,,false,true,false,4,禁止使用缩写 BN
"""


SRT_SAMPLE = """\
1
00:00:01,000 --> 00:00:05,500
大家好，本节课我们使用 编码器 来处理视频。

2
00:00:06,000 --> 00:00:10,000
首先你需要一个 显卡 来加速，推荐使用 GPU 集群。

3
00:00:11,000 --> 00:00:15,500
关键影格 也就是 I帧 在压缩中非常重要。

4
00:00:21,000 --> 00:00:25,500
神经网 模型的结构里，批归一化 必须有。

5
00:00:31,000 --> 00:00:35,500
Tensor 在计算图中执行 Tensor运算。
"""


MD_SAMPLE = """\
# 课程笔记

## 第1章：课程回顾

这里我们用的是 关键影格 术语（本章应替换为章节例外的"关键画面"）。

## 第2章：数据准备

资料集 要先清洗。

## 第3章：模型构建

神经网 要改成 神经网络。 梯度递减 改为 梯度下降。

## 第5章：台版复习

这里保留 神经网路 写法。
"""


class TestGlossaryLoader(unittest.TestCase):
    def test_load_csv(self):
        with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False, encoding="utf-8") as f:
            f.write(TEST_GLOSSARY_CSV)
            path = f.name
        try:
            terms = load_glossary(path)
            self.assertEqual(len(terms), 9)
            self.assertEqual(terms[0].source, "Transcoder")
            self.assertEqual(terms[0].preferred, "转码器")
            self.assertIn("编码器", terms[0].forbidden_variants)
            self.assertTrue(terms[0].match_plural)

            gpu = next(t for t in terms if t.source == "GPU")
            self.assertTrue(gpu.case_sensitive)
            self.assertFalse(gpu.match_plural)

            keyframe = next(t for t in terms if t.source == "Keyframe")
            self.assertIn("第1章", keyframe.chapter_exceptions)
            self.assertEqual(keyframe.chapter_exceptions["第1章"], "关键画面")

            tensor = next(t for t in terms if t.source == "Tensor")
            self.assertEqual(tensor.status, TermStatus.NEEDS_REVIEW)
            self.assertEqual(tensor.context_hint, "计算图")
        finally:
            os.unlink(path)

    def test_load_json(self):
        data = [{
            "source": "Test",
            "preferred": "测试",
            "alternatives": ["测"],
            "forbidden_variants": ["坏译"],
            "priority": 3,
        }]
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
            json.dump(data, f)
            path = f.name
        try:
            terms = load_glossary(path)
            self.assertEqual(len(terms), 1)
            self.assertEqual(terms[0].preferred, "测试")
            self.assertEqual(terms[0].alternatives, ["测"])
            self.assertEqual(terms[0].priority, 3)
        finally:
            os.unlink(path)


class TestDocumentLoader(unittest.TestCase):
    def test_detect_file_type(self):
        self.assertEqual(detect_file_type("a.srt"), FileType.SRT)
        self.assertEqual(detect_file_type("a.vtt"), FileType.VTT)
        self.assertEqual(detect_file_type("a.md"), FileType.MARKDOWN)
        self.assertEqual(detect_file_type("a.markdown"), FileType.MARKDOWN)
        self.assertEqual(detect_file_type("a.txt"), FileType.UNKNOWN)

    def test_load_srt(self):
        with tempfile.NamedTemporaryFile("w", suffix=".srt", delete=False, encoding="utf-8") as f:
            f.write(SRT_SAMPLE)
            path = f.name
        try:
            doc = load_document(path)
            self.assertEqual(len(doc.segments), 5)
            self.assertEqual(doc.segments[0].index, 1)
            self.assertIn("-->", doc.segments[0].timestamp or "")
            self.assertIn("编码器", doc.segments[0].content)
            self.assertIn("关键影格", doc.segments[2].content)
        finally:
            os.unlink(path)

    def test_load_markdown_with_chapters(self):
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as f:
            f.write(MD_SAMPLE)
            path = f.name
        try:
            doc = load_document(path)
            chapters = {seg.chapter for seg in doc.segments if seg.chapter}
            self.assertIn("第1章：课程回顾", chapters)
            self.assertIn("第2章：数据准备", chapters)
            self.assertIn("第5章：台版复习", chapters)
        finally:
            os.unlink(path)


class TestMatcher(unittest.TestCase):
    def _make_terms(self):
        with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False, encoding="utf-8") as f:
            f.write(TEST_GLOSSARY_CSV)
            path = f.name
        try:
            return load_glossary(path)
        finally:
            os.unlink(path)

    def _make_srt_doc(self):
        with tempfile.NamedTemporaryFile("w", suffix=".srt", delete=False, encoding="utf-8") as f:
            f.write(SRT_SAMPLE)
            path = f.name
        try:
            return load_document(path)
        finally:
            os.unlink(path)

    def _make_md_doc(self):
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as f:
            f.write(MD_SAMPLE)
            path = f.name
        try:
            return load_document(path)
        finally:
            os.unlink(path)

    def test_find_forbidden_matches(self):
        terms = self._make_terms()
        doc = self._make_srt_doc()
        matches = find_matches(doc, terms)
        forbidden = [m for m in matches if m.status == TermStatus.FORBIDDEN]
        originals = {m.original for m in forbidden}
        self.assertIn("编码器", originals)
        self.assertIn("显卡", originals)
        self.assertIn("I帧", originals)
        self.assertIn("神经网", originals)
        self.assertIn("批归一化", originals)
        self.assertIn("Tensor运算", originals)

    def test_case_sensitive_gpu(self):
        terms = self._make_terms()
        doc = self._make_srt_doc()
        matches = find_matches(doc, terms)
        gpu_matches = [m for m in matches if m.term_source == "GPU"]
        for m in gpu_matches:
            if m.original == "GPU":
                self.assertEqual(m.suggested, "GPU")

    def test_chapter_exception_keyframe(self):
        terms = self._make_terms()
        doc = self._make_md_doc()
        matches = find_matches(doc, terms)
        ch1_matches = [m for m in matches
                       if doc.segments[m.segment_index].chapter == "第1章：课程回顾"
                       and m.term_source == "Keyframe"]
        self.assertTrue(len(ch1_matches) >= 1)
        for m in ch1_matches:
            self.assertEqual(m.suggested, "关键画面")

    def test_chapter_exception_dataset_in_ch2(self):
        terms = self._make_terms()
        doc = self._make_md_doc()
        matches = find_matches(doc, terms)
        ch2_matches = [m for m in matches
                       if doc.segments[m.segment_index].chapter == "第2章：数据准备"
                       and m.term_source == "Dataset"]
        for m in ch2_matches:
            if m.original == "资料集":
                self.assertEqual(m.suggested, "资料集")

    def test_chapter_exception_neural_in_ch5(self):
        terms = self._make_terms()
        doc = self._make_md_doc()
        matches = find_matches(doc, terms)
        ch5 = [m for m in matches
               if doc.segments[m.segment_index].chapter == "第5章：台版复习"
               and m.term_source == "Neural Network"]
        for m in ch5:
            self.assertEqual(m.suggested, "神经网路")

    def test_context_hint_tensor_needs_review(self):
        terms = self._make_terms()
        doc = self._make_srt_doc()
        matches = find_matches(doc, terms)
        tensor_matches = [m for m in matches if m.term_source == "Tensor"]
        need_review = [m for m in tensor_matches if m.needs_manual_review]
        self.assertEqual(len(need_review), 0)

    def test_cjk_boundary_protects_embedded_word(self):
        terms = [TermEntry(
            source="Test",
            preferred="正确",
            forbidden_variants=["错误词", "错误词汇"],
            word_boundary=False,
        )]
        seg = DocumentSegment(index=1, content="这是错误词汇，和错误词，的测试")
        doc = Document(path=Path("x"), file_type=FileType.MARKDOWN,
                       segments=[seg], raw_content=seg.content)
        matches = find_matches(doc, terms)
        originals = sorted([m.original for m in matches])
        self.assertIn("错误词汇", originals)
        self.assertIn("错误词", originals)
        self.assertEqual(len([m for m in matches if m.original == "错误词"]), 1)

    def test_plural_match(self):
        terms = [TermEntry(
            source="network",
            preferred="网络",
            match_plural=True,
            word_boundary=True,
        )]
        seg = DocumentSegment(index=1, content="There are many networks and one network.")
        doc = Document(path=Path("x"), file_type=FileType.MARKDOWN,
                       segments=[seg], raw_content=seg.content)
        matches = find_matches(doc, terms)
        originals = sorted([m.original.lower() for m in matches])
        self.assertIn("network", originals)
        self.assertIn("networks", originals)


class TestReporter(unittest.TestCase):
    def test_build_conflict_report(self):
        m1 = Match(segment_index=0, start=0, end=1, original="", term_source="",
                   suggested="", status=TermStatus.FORBIDDEN)
        m2 = Match(segment_index=0, start=0, end=1, original="", term_source="",
                   suggested="", status=TermStatus.STANDARD)
        m3 = Match(segment_index=0, start=0, end=1, original="", term_source="",
                   suggested="", status=TermStatus.NEEDS_REVIEW, needs_manual_review=True)
        report = build_conflict_report([m1, m2, m3])
        self.assertEqual(report.total_forbidden, 1)
        self.assertEqual(report.total_needs_review, 1)
        self.assertEqual(report.total_inconsistent, 1)
        self.assertEqual(report.total_replacements, 3)


class TestWriter(unittest.TestCase):
    def setUp(self):
        self._tmp_files = []
        with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False, encoding="utf-8") as f:
            f.write(TEST_GLOSSARY_CSV)
            self.gpath = Path(f.name)
            self._tmp_files.append(self.gpath)
        with tempfile.NamedTemporaryFile("w", suffix=".srt", delete=False, encoding="utf-8") as f:
            f.write(SRT_SAMPLE)
            self.dpath = Path(f.name)
            self._tmp_files.append(self.dpath)

    def tearDown(self):
        for p in self._tmp_files:
            try:
                p.unlink()
            except Exception:
                pass

    def test_write_revised_and_audit(self):
        terms = load_glossary(self.gpath)
        doc = load_document(self.dpath)
        matches = find_matches(doc, terms)
        approved = {}
        for m in matches:
            if m.needs_manual_review:
                m.approved = False
            else:
                m.approved = True
            approved[id(m)] = m

        with tempfile.TemporaryDirectory() as td:
            rev, bak, audit = write_revised(
                doc, matches, approved, out_dir=Path(td),
                reviewer="测试员", reason_default="统测原因",
            )
            self.assertTrue(rev.exists())
            self.assertTrue(bak.exists())
            text = rev.read_text(encoding="utf-8")
            self.assertIn("转码器", text)
            self.assertNotIn("编码器", text)
            self.assertIn("GPU", text)

            self.assertGreater(len(audit.entries), 0)
            e0 = audit.entries[0]
            self.assertEqual(e0.reviewer, "测试员")
            self.assertIn(e0.status, {TermStatus.FORBIDDEN, TermStatus.STANDARD})

            csv_path = write_audit_log(audit, Path(td), doc_path=doc.path)
            self.assertTrue(csv_path.exists())
            csv_text = csv_path.read_text(encoding="utf-8-sig")
            self.assertIn("timestamp", csv_text)
            self.assertIn("转码器", csv_text)


class TestAuditLog(unittest.TestCase):
    def test_to_csv(self):
        log = AuditLog()
        log.entries.append(ReplacementRecord(
            timestamp="2026-01-01T00:00:00",
            document_path="x.srt",
            segment_index=1,
            original_text="编码器",
            revised_text="转码器",
            term_source="Transcoder",
            original_variant="编码器",
            replacement="转码器",
            status=TermStatus.FORBIDDEN,
            reason="禁用",
            reviewer="A",
            chapter="第一章",
            line_number=5,
            context="上下文",
        ))
        csv_text = log.to_csv()
        self.assertIn("编码器", csv_text)
        self.assertIn("转码器", csv_text)
        self.assertIn("forbidden", csv_text.lower())
        self.assertIn("reviewer", csv_text.lower())


if __name__ == "__main__":
    unittest.main(verbosity=2)
