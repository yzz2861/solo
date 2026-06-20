import jieba
import re
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from ..models import FAQ, ManualSection, ProductModel


STOPWORDS = {'的', '了', '是', '我', '你', '他', '她', '它', '们', '在', '和', '与', '或', '及', '等', '也', '都', '就', '要', '会', '能', '可以', '吗', '呢', '啊', '吧', '怎么', '什么', '为什么', '如何', '怎样', '多少', '几', '请', '请问', '麻烦', '帮'}

WARRANTY_KEYWORDS = {'保修', '质保', '维修', '售后', '退换', '换货', '退货', '赔偿', '三包', '保修期', '质保期'}
MODEL_DIFF_KEYWORDS = {'区别', '差异', '不同', '对比', '比较', '新旧', '老款', '新款', '升级', '改进'}
INSTALL_KEYWORDS = {'安装', '装', '组装', '搭建', '装配', '固定', '安装步骤', '怎么装'}
MAINTENANCE_KEYWORDS = {'保养', '维护', '清洁', '清洗', '擦拭', '保养方法', '如何保养'}


def tokenize(text: str) -> set:
    text = re.sub(r'[^\w\s]', '', text)
    words = jieba.lcut(text)
    return {w for w in words if w.strip() and w not in STOPWORDS and len(w) > 1}


def calc_similarity(tokens1: set, tokens2: set) -> float:
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1 & tokens2
    union = tokens1 | tokens2
    return len(intersection) / len(union) if union else 0.0


def extract_keywords_by_category(text: str) -> dict:
    tokens = tokenize(text)
    return {
        'is_warranty': bool(tokens & WARRANTY_KEYWORDS),
        'is_model_diff': bool(tokens & MODEL_DIFF_KEYWORDS),
        'is_install': bool(tokens & INSTALL_KEYWORDS),
        'is_maintenance': bool(tokens & MAINTENANCE_KEYWORDS),
        'tokens': tokens
    }


def match_faq(db: Session, question: str, product_model_id: Optional[int] = None) -> Tuple[Optional[FAQ], float]:
    q_info = extract_keywords_by_category(question)
    q_tokens = q_info['tokens']

    query = db.query(FAQ)
    if product_model_id:
        query = query.filter(FAQ.product_model_id == product_model_id)
    faqs = query.all()

    best_faq = None
    best_score = 0.0

    for faq in faqs:
        f_tokens = tokenize(faq.question)
        score = calc_similarity(q_tokens, f_tokens)

        if q_info['is_warranty'] and faq.is_warranty_exception:
            score += 0.15
        if q_info['is_model_diff'] and faq.is_model_difference:
            score += 0.15

        if score > best_score:
            best_score = score
            best_faq = faq

    return best_faq, best_score


def match_manual_section(db: Session, question: str, product_model_id: Optional[int] = None) -> Tuple[Optional[ManualSection], float]:
    q_info = extract_keywords_by_category(question)
    q_tokens = q_info['tokens']

    query = db.query(ManualSection).join(ManualSection.manual)
    if product_model_id:
        from ..models import Manual
        query = query.filter(Manual.product_model_id == product_model_id)
    sections = query.all()

    best_section = None
    best_score = 0.0

    for section in sections:
        text = f"{section.section_title} {section.content} {section.keywords}"
        s_tokens = tokenize(text)
        score = calc_similarity(q_tokens, s_tokens)
        if score > best_score:
            best_score = score
            best_section = section

    return best_section, best_score


def check_product_model(db: Session, name: Optional[str] = None, model_id: Optional[int] = None) -> Optional[ProductModel]:
    if model_id:
        return db.query(ProductModel).filter(ProductModel.id == model_id).first()
    if name:
        return db.query(ProductModel).filter(ProductModel.name == name).first()
    return None
