from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import ProductModel, FAQ, ManualSection, QueryRecord, AgentDecision
from .. import schemas
from ..services.qa_engine import (
    match_faq, match_manual_section, check_product_model,
    extract_keywords_by_category
)

router = APIRouter(prefix="/api/qa", tags=["qa"])

SIMILARITY_THRESHOLD = 0.3


@router.post("/query", response_model=schemas.QueryResponse)
def query_answer(req: schemas.QueryRequest, db: Session = Depends(get_db)):
    need_followup = []
    is_missing_model = False
    is_old_model = False
    is_warranty_question = False
    is_model_diff_question = False

    q_info = extract_keywords_by_category(req.question)
    is_warranty_question = q_info['is_warranty']
    is_model_diff_question = q_info['is_model_diff']

    product_model = None
    if req.product_model_id or req.product_model_name:
        product_model = check_product_model(
            db, name=req.product_model_name, model_id=req.product_model_id
        )
    if not product_model:
        is_missing_model = True
        if req.product_model_id or req.product_model_name:
            need_followup.append(f"指定的产品型号未在系统中找到（{req.product_model_name or req.product_model_id}），请核实型号是否正确，或联系主管添加该型号。")
        else:
            need_followup.append("请补问用户具体的产品型号（如：XX-2024 款），不同型号的操作和保修政策可能不同。")

    if product_model and product_model.is_old:
        is_old_model = True
        need_followup.append(f"注意：{product_model.name} 为旧型号，部分配件和功能可能已更新，如涉及更换零件请确认是否仍有库存。")

    if is_warranty_question:
        need_followup.append("保修条款存在例外情况：人为损坏、非正常使用、自行拆解不在保修范围内，请向用户确认。")

    if is_model_diff_question:
        need_followup.append("涉及新旧型号差异，如需对比请先确认两个具体型号，再提供针对性说明。")

    best_faq, faq_score = match_faq(db, req.question, product_model.id if product_model else None)
    best_section, section_score = match_manual_section(db, req.question, product_model.id if product_model else None)

    matched_faq = best_faq if faq_score >= SIMILARITY_THRESHOLD and faq_score >= section_score else None
    matched_section = best_section if (not matched_faq) and section_score >= SIMILARITY_THRESHOLD else None

    answer = ""
    source = ""
    matched_question = ""
    notes = ""
    answer_type = "answered"
    is_no_answer = False

    if matched_faq:
        answer = matched_faq.answer
        source = matched_faq.source_page
        matched_question = matched_faq.question
        notes = matched_faq.notes
        if matched_faq.is_warranty_exception:
            notes += "（此为保修例外事项，请特别说明）"
        if matched_faq.is_model_difference:
            notes += "（涉及新旧型号差异，请确认用户的具体型号）"
    elif matched_section:
        preview = matched_section.content[:200]
        if len(matched_section.content) > 200:
            preview += "..."
        answer = preview
        source = f"《{matched_section.manual.title}》第{matched_section.page_number}页「{matched_section.section_title}」"
    else:
        answer_type = "no_answer"
        is_no_answer = True
        answer = "抱歉，该问题在当前产品说明书和 FAQ 中未找到明确答案，请不要凭经验回答。建议：1) 转至产品/技术部门查询；2) 记录用户问题并反馈主管补充文档。"
        source = "无匹配文档"
        notes = "请不要凭经验作答，该问题已记录供产品补充文档。"

    query_record = QueryRecord(
        product_model_id=product_model.id if product_model else None,
        question=req.question,
        answer_type=answer_type,
        matched_question=matched_question,
        matched_answer=answer,
        matched_source=source,
        notes=notes,
        is_no_answer=is_no_answer,
        is_old_model=is_old_model,
        is_missing_model=is_missing_model,
        is_warranty_question=is_warranty_question,
        is_model_diff_question=is_model_diff_question,
        agent_id=req.agent_id,
    )
    db.add(query_record)
    db.commit()
    db.refresh(query_record)

    return schemas.QueryResponse(
        query_id=query_record.id,
        answer_type=answer_type,
        answer=answer,
        source=source,
        notes=notes,
        matched_question=matched_question if matched_question else None,
        need_followup=need_followup,
        is_no_answer=is_no_answer,
        is_missing_model=is_missing_model,
        is_old_model=is_old_model,
    )


@router.post("/decision", response_model=schemas.AgentDecisionResponse)
def submit_decision(data: schemas.AgentDecisionCreate, db: Session = Depends(get_db)):
    query = db.query(QueryRecord).filter(QueryRecord.id == data.query_record_id).first()
    if not query:
        raise HTTPException(status_code=404, detail="查询记录不存在")

    existing = db.query(AgentDecision).filter(AgentDecision.query_record_id == data.query_record_id).first()
    if existing:
        existing.adopted = data.adopted
        existing.modified_answer = data.modified_answer
        existing.modify_reason = data.modify_reason
        db.commit()
        db.refresh(existing)
        return existing

    decision = AgentDecision(**data.dict())
    db.add(decision)
    db.commit()
    db.refresh(decision)
    return decision


@router.get("/records", response_model=List[schemas.QueryRecordResponse])
def list_query_records(
    agent_id: str = None,
    is_no_answer: bool = None,
    is_old_model: bool = None,
    db: Session = Depends(get_db),
):
    query = db.query(QueryRecord)
    if agent_id:
        query = query.filter(QueryRecord.agent_id == agent_id)
    if is_no_answer is not None:
        query = query.filter(QueryRecord.is_no_answer == is_no_answer)
    if is_old_model is not None:
        query = query.filter(QueryRecord.is_old_model == is_old_model)
    return query.order_by(QueryRecord.created_at.desc()).limit(500).all()
