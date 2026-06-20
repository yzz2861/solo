from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict
from collections import Counter, defaultdict
import csv
import io
from fastapi.responses import StreamingResponse

from ..database import get_db
from ..models import QueryRecord, AgentDecision, FAQ, ProductModel
from .. import schemas

router = APIRouter(prefix="/api/supervisor", tags=["supervisor"])


def normalize_question(q: str) -> str:
    return q.strip().lower().replace(" ", "")


@router.get("/stats", response_model=schemas.StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    total_queries = db.query(QueryRecord).count()
    answered_count = db.query(QueryRecord).filter(QueryRecord.is_no_answer == False).count()
    no_answer_count = total_queries - answered_count

    total_decisions = db.query(AgentDecision).count()
    adoption_count = db.query(AgentDecision).filter(AgentDecision.adopted == True).count()
    adoption_rate = (adoption_count / total_decisions) if total_decisions > 0 else 0.0
    modification_count = db.query(AgentDecision).filter(AgentDecision.adopted == False).count()

    missing_model_count = db.query(QueryRecord).filter(QueryRecord.is_missing_model == True).count()
    old_model_count = db.query(QueryRecord).filter(QueryRecord.is_old_model == True).count()
    warranty_count = db.query(QueryRecord).filter(QueryRecord.is_warranty_question == True).count()
    model_diff_count = db.query(QueryRecord).filter(QueryRecord.is_model_diff_question == True).count()

    no_answer_records = db.query(QueryRecord).filter(QueryRecord.is_no_answer == True).all()

    counter = Counter()
    q_map = defaultdict(list)
    old_q_map = defaultdict(list)
    for r in no_answer_records:
        norm = normalize_question(r.question)
        counter[norm] += 1
        q_map[norm].append(r)
        if r.is_old_model:
            old_q_map[norm].append(r)

    top_no_answer = []
    for norm, count in counter.most_common(20):
        samples = q_map[norm][:3]
        top_no_answer.append(schemas.NoAnswerStats(
            question=samples[0].question,
            count=count,
            is_old_model=any(r.is_old_model for r in samples),
            sample_query_ids=[r.id for r in samples]
        ))

    old_model_problems = []
    for norm, records in old_q_map.items():
        if records:
            old_model_problems.append(schemas.NoAnswerStats(
                question=records[0].question,
                count=len(records),
                is_old_model=True,
                sample_query_ids=[r.id for r in records[:3]]
            ))
    old_model_problems.sort(key=lambda x: -x.count)

    all_faq_categories = set([f[0] for f in db.query(FAQ.category).distinct().all() if f[0]])
    answered_records = db.query(QueryRecord).filter(QueryRecord.is_no_answer == False).all()
    covered_categories = set()
    for r in answered_records:
        if r.matched_answer:
            for cat in all_faq_categories:
                if cat in r.matched_answer or cat in (r.notes or ""):
                    covered_categories.add(cat)
    uncovered_categories = sorted(list(all_faq_categories - covered_categories))

    return schemas.StatsResponse(
        total_queries=total_queries,
        answered_count=answered_count,
        no_answer_count=no_answer_count,
        adoption_rate=round(adoption_rate, 4),
        modification_count=modification_count,
        missing_model_count=missing_model_count,
        old_model_count=old_model_count,
        warranty_question_count=warranty_count,
        model_diff_count=model_diff_count,
        top_no_answer=top_no_answer,
        uncovered_categories=uncovered_categories,
        old_model_problems=old_model_problems[:20],
    )


@router.get("/decisions")
def get_all_decisions(db: Session = Depends(get_db)):
    decisions = db.query(AgentDecision).order_by(AgentDecision.created_at.desc()).limit(500).all()
    result = []
    for d in decisions:
        result.append({
            "id": d.id,
            "query_id": d.query_record_id,
            "question": d.query.question if d.query else "",
            "matched_answer": d.query.matched_answer if d.query else "",
            "adopted": d.adopted,
            "modified_answer": d.modified_answer,
            "modify_reason": d.modify_reason,
            "supervisor_reviewed": d.supervisor_reviewed,
            "supervisor_note": d.supervisor_note,
            "agent_id": d.query.agent_id if d.query else "",
            "created_at": d.created_at.isoformat(),
        })
    return result


@router.post("/decisions/{decision_id}/review")
def review_decision(decision_id: int, note: str = "", reviewed: bool = True, db: Session = Depends(get_db)):
    decision = db.query(AgentDecision).filter(AgentDecision.id == decision_id).first()
    if not decision:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="记录不存在")
    decision.supervisor_reviewed = reviewed
    decision.supervisor_note = note
    db.commit()
    return {"message": "审核完成", "decision_id": decision_id}


@router.get("/export/no-answer.csv")
def export_no_answer(db: Session = Depends(get_db)):
    stats = get_stats(db)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["问题", "出现次数", "是否旧型号", "样例查询ID"])
    for item in stats.top_no_answer:
        writer.writerow([
            item.question,
            item.count,
            "是" if item.is_old_model else "否",
            ",".join(map(str, item.sample_query_ids))
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": "attachment; filename=no_answer_questions.csv"}
    )


@router.get("/export/old-model.csv")
def export_old_model_problems(db: Session = Depends(get_db)):
    stats = get_stats(db)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["旧型号问题", "出现次数", "样例查询ID"])
    for item in stats.old_model_problems:
        writer.writerow([
            item.question,
            item.count,
            ",".join(map(str, item.sample_query_ids))
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": "attachment; filename=old_model_problems.csv"}
    )
