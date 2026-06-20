from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import json

from ..database import get_db
from ..models import ProductModel, Manual, ManualSection, FAQ
from .. import schemas

router = APIRouter(prefix="/api/products", tags=["products"])


@router.post("/models", response_model=schemas.ProductModelResponse)
def create_product_model(data: schemas.ProductModelCreate, db: Session = Depends(get_db)):
    existing = db.query(ProductModel).filter(ProductModel.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="产品型号已存在")
    model = ProductModel(**data.dict())
    db.add(model)
    db.commit()
    db.refresh(model)
    return model


@router.get("/models", response_model=List[schemas.ProductModelResponse])
def list_product_models(db: Session = Depends(get_db)):
    return db.query(ProductModel).all()


@router.post("/manuals", response_model=schemas.ManualResponse)
def create_manual(data: schemas.ManualCreate, db: Session = Depends(get_db)):
    model = db.query(ProductModel).filter(ProductModel.id == data.product_model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="产品型号不存在")

    manual = Manual(
        product_model_id=data.product_model_id,
        title=data.title,
        content=data.content,
        source_type=data.source_type,
    )
    db.add(manual)
    db.flush()

    for sec_data in data.sections:
        section = ManualSection(manual_id=manual.id, **sec_data.dict())
        db.add(section)

    db.commit()
    db.refresh(manual)
    return manual


@router.get("/manuals", response_model=List[schemas.ManualResponse])
def list_manuals(product_model_id: int = None, db: Session = Depends(get_db)):
    query = db.query(Manual)
    if product_model_id:
        query = query.filter(Manual.product_model_id == product_model_id)
    return query.all()


@router.post("/faqs", response_model=schemas.FAQResponse)
def create_faq(data: schemas.FAQCreate, db: Session = Depends(get_db)):
    model = db.query(ProductModel).filter(ProductModel.id == data.product_model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="产品型号不存在")
    faq = FAQ(**data.dict())
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return faq


@router.post("/faqs/batch", response_model=List[schemas.FAQResponse])
def batch_create_faqs(data: schemas.BatchImportFAQ, db: Session = Depends(get_db)):
    result = []
    for item in data.items:
        model = db.query(ProductModel).filter(ProductModel.id == item.product_model_id).first()
        if not model:
            continue
        faq = FAQ(**item.dict())
        db.add(faq)
        db.flush()
        result.append(faq)
    db.commit()
    for f in result:
        db.refresh(f)
    return result


@router.get("/faqs", response_model=List[schemas.FAQResponse])
def list_faqs(product_model_id: int = None, db: Session = Depends(get_db)):
    query = db.query(FAQ)
    if product_model_id:
        query = query.filter(FAQ.product_model_id == product_model_id)
    return query.all()


@router.post("/import/json")
async def import_json(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="JSON格式错误")

    created_count = 0

    if "product_models" in data:
        for m in data["product_models"]:
            existing = db.query(ProductModel).filter(ProductModel.name == m["name"]).first()
            if not existing:
                db.add(ProductModel(**m))
                created_count += 1
        db.flush()

    if "faqs" in data:
        for f_item in data["faqs"]:
            model = db.query(ProductModel).filter(ProductModel.name == f_item.get("product_model_name", "")).first()
            if not model and f_item.get("product_model_id"):
                model = db.query(ProductModel).filter(ProductModel.id == f_item["product_model_id"]).first()
            if model:
                f_data = {k: v for k, v in f_item.items() if k not in ("product_model_name",)}
                f_data["product_model_id"] = model.id
                db.add(FAQ(**f_data))
                created_count += 1

    db.commit()
    return {"message": "导入成功", "created_count": created_count}
