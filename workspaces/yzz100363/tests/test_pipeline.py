"""测试完整处理管道"""

import pytest
from refcleaner.parsers import parse_text
from refcleaner.pipeline import process_references
from refcleaner.formatter import OutputFormat


def test_preserve_original_order():
    text = """
[1] Smith, J. Deep Learning. Nature 2020; 500: 100-110. DOI: 10.1038/abc123.

[2] Wang, F. Machine Learning. Science 2021; 600: 200-210. DOI: 10.1126/def456.

[3] Li, M. Artificial Intelligence. Cell 2019; 400: 300-310.
"""

    entries = parse_text(text)
    result = process_references(entries, preserve_original_order=True)

    output_entries = result.get_output_order_entries()
    assert len(output_entries) == 3
    assert output_entries[0].original_position == 0
    assert output_entries[1].original_position == 1
    assert output_entries[2].original_position == 2
    assert output_entries[0].output_position == 0
    assert output_entries[1].output_position == 1
    assert output_entries[2].output_position == 2


def test_stable_order_on_rerun():
    text = """
Smith, J. Deep Learning. Nature 2020; 500: 100-110. DOI: 10.1038/abc123.

Wang, F. Machine Learning. Science 2021; 600: 200-210. DOI: 10.1126/def456.

Chen, H. Neural Networks. PNAS 2022; 700: 400-410.
"""

    entries1 = parse_text(text)
    result1 = process_references(entries1, preserve_original_order=True)

    entries2 = parse_text(text)
    result2 = process_references(entries2, preserve_original_order=True)

    for e1, e2 in zip(result1.get_output_order_entries(), result2.get_output_order_entries()):
        assert e1.original_position == e2.original_position
        assert e1.output_position == e2.output_position


def test_doi_normalization_in_pipeline():
    text = """
[1] Smith, J. Test Article. Nature 2020. DOI: 10.1038/NATURE12345.

[2] Li, M. Another Article. Science 2021. DOI: https://doi.org/10.1126/SCIENCE67890.
"""

    entries = parse_text(text)
    result = process_references(entries)

    assert result.entries[0].doi == "10.1038/nature12345"
    assert result.entries[1].doi == "10.1126/science67890"
    assert result.report.auto_fixed_entries == 2


def test_duplicate_detection_in_pipeline():
    text = """
[1] Smith, J. Deep Learning. Nature 2020. DOI: 10.1038/abc123.

[2] Smith, J. Deep Learning. Nature 2020. DOI: 10.1038/ABC123.

[3] Wang, F. Machine Learning. Science 2021.
"""

    entries = parse_text(text)
    result = process_references(entries)

    assert len(result.report.duplicate_groups) == 1
    assert result.report.duplicate_entries == 1

    output_entries = result.get_output_order_entries()
    assert len(output_entries) == 2


def test_report_statistics():
    text = """
[1] Smith, John. Test Article. Nature 2020. DOI: 10.1038/test123.

[2] 王芳，张伟。机器学习研究。计算机学报，2022年，第45卷，第3期，567-580。DOI: https://doi.org/10.11897/SP.J.1016.2022.00567.

[3] Li, Xiao-Ming. Neural Networks. Journal of Machine Learning Research, 2021.
"""

    entries = parse_text(text)
    result = process_references(entries)

    assert result.report.total_entries == 3
    assert result.report.processed_entries + result.report.duplicate_entries + result.report.error_entries == 3
    assert result.report.duplicate_entries == 0


def test_output_formatting():
    text = """
[1] Smith, J., and Li, X. M. Deep Learning for Image Recognition. Nature 2020; 521: 436-444. DOI: 10.1038/nature14539.
"""

    entries = parse_text(text)
    result = process_references(entries, output_format=OutputFormat.GB7714)

    from refcleaner.pipeline import ReferencePipeline

    pipeline = ReferencePipeline(output_format=OutputFormat.GB7714)
    output = pipeline.format_output(result)

    assert "[1]" in output
    assert "10.1038/nature14539" in output
    assert "2020" in output


def test_original_position_tracking():
    text = """
Entry at position 1.

Entry at position 2.

Entry at position 3.
"""

    entries = parse_text(text)
    result = process_references(entries)

    for i, entry in enumerate(result.entries):
        assert entry.original_position == i

    output_entries = result.get_output_order_entries()
    for i, entry in enumerate(output_entries):
        assert entry.output_position == i
