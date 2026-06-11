#!/usr/bin/env python3

from src.refcleaner.parsers import TextParser

test_cases = [
    'Smith, John, and Li, Xiao-Ming. "Deep Learning for Image Recognition." Nature 521.7553 (2015): 436-444. DOI: 10.1038/NATURE14539.',
    '王芳，张伟。《机器学习算法研究》，计算机学报，第45卷，第3期，2022年，pp. 567-580。DOI: https://doi.org/10.11897/SP.J.1016.2022.00567.',
    'Smith J, Li XM. Deep learning for image recognition. Nature. 2015; 521(7553): 436-44.',
    'Johnson, A., Williams, B., & Brown, C. (2020). A Comprehensive Survey of Neural Network Architectures. Journal of the American Chemical Society, 142(15), 6984-7011. https://doi.org/10.1021/jacs.9b13456.',
    'Chen, Wei, et al. Attention is All You Need. Advances in Neural Information Processing Systems, 2017.',
    '李明. (2018). 基于深度学习的自然语言处理方法研究[博士论文]. 清华大学.',
    'Liu Y, Chen HB. Protein Structure Prediction Using AlphaFold. Nature, 2021, 596(7873): 871-876.',
    'Brown E, Miller S. Machine Learning Fundamentals. Cambridge University Press, 2019.',
    '10.1109/tpami.2020.2998028',
    'DOI: 10.1038/s41586-023-06291-w'
]

parser = TextParser()

for i, text in enumerate(test_cases, 1):
    print(f"\n=== 测试用例 {i} ===")
    print(f"原始文本: {text}")
    
    entries = parser.parse(text)
    if entries:
        entry = entries[0]
        print(f"作者: {entry.authors}")
        print(f"标题: {entry.title}")
        print(f"期刊: {entry.journal}")
        print(f"年份: {entry.year}")
        print(f"卷: {entry.volume}")
        print(f"期: {entry.number}")
        print(f"页码: {entry.pages}")
        print(f"DOI: {entry.doi}")
        print(f"类型: {entry.entry_type}")
    else:
        print("解析失败")
