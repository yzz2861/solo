from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import schemas, crud

router = APIRouter(prefix="/operators", tags=["操作人员"])


@router.post("", response_model=schemas.OperatorOut, summary="登记操作人员（机房老师/财务/审批老师）")
def create_operator(data: schemas.OperatorCreate, db: Session = Depends(get_db)):
    return crud.create_operator(db, data)
