import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.models import VehicleRecord
from app.schemas import PhotoInfo, ApiResponse
from app.services import save_photo, get_photos, get_record, BusinessRuleError

UPLOAD_DIR = os.path.abspath("./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_TYPES = {"entry", "wheel_before", "wheel_after", "tarp", "body", "plate", "exit"}
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}

router = APIRouter(prefix="/api/photos", tags=["照片管理"])


def _safe_ext(filename: str) -> str:
    ext = os.path.splitext(filename or "")[1].lower()
    return ext if ext in ALLOWED_EXT else ".jpg"


@router.post("/upload", response_model=ApiResponse, summary="上传车辆照片")
async def api_upload_photo(
    record_id: int = Form(..., description="车辆记录ID"),
    photo_type: str = Form(..., description=f"照片类型: {', '.join(ALLOWED_TYPES)}"),
    file: UploadFile = File(..., description="照片文件"),
    uploaded_by: Optional[str] = Form(None, description="上传人"),
    remark: Optional[str] = Form(None, description="备注"),
    db: Session = Depends(get_db),
):
    if photo_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"不支持的照片类型，允许: {', '.join(ALLOWED_TYPES)}")

    record = get_record(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="车辆记录不存在")

    ext = _safe_ext(file.filename)
    stored_name = f"{record_id}_{photo_type}_{uuid.uuid4().hex}{ext}"
    stored_path = os.path.join(UPLOAD_DIR, stored_name)

    content = await file.read()
    file_size = len(content)
    with open(stored_path, "wb") as f:
        f.write(content)

    photo = save_photo(
        db, record_id=record_id, photo_type=photo_type,
        file_path=stored_path, file_name=file.filename or stored_name,
        file_size=file_size, uploaded_by=uploaded_by, remark=remark,
    )
    db.commit()
    db.refresh(photo)

    return ApiResponse(
        message="照片上传成功",
        data={
            "photo_id": photo.id,
            "photo_type": photo_type,
            "file_name": file.filename,
            "file_size": file_size,
            "stored_path": stored_path,
            "access_url": f"/api/photos/{photo.id}/view",
        }
    )


@router.get("/vehicle/{record_id}", response_model=List[PhotoInfo], summary="获取车辆所有照片")
def api_get_vehicle_photos(
    record_id: int,
    photo_type: Optional[str] = Query(None, description="按类型过滤"),
    db: Session = Depends(get_db),
):
    if photo_type and photo_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"不支持的类型过滤")
    return get_photos(db, record_id, photo_type)


@router.get("/{photo_id}/view", summary="查看单张照片（原始文件）")
def api_view_photo(photo_id: int, db: Session = Depends(get_db)):
    from app.models import VehiclePhoto
    photo = db.query(VehiclePhoto).filter(VehiclePhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="照片不存在")
    if not os.path.exists(photo.file_path):
        raise HTTPException(status_code=404, detail="照片文件已丢失")
    return FileResponse(
        photo.file_path,
        filename=photo.file_name,
        media_type="image/jpeg" if photo.file_name.lower().endswith((".jpg", ".jpeg")) else "application/octet-stream",
    )


@router.get("/{photo_id}/info", response_model=PhotoInfo, summary="获取照片信息")
def api_get_photo_info(photo_id: int, db: Session = Depends(get_db)):
    from app.models import VehiclePhoto
    photo = db.query(VehiclePhoto).filter(VehiclePhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="照片不存在")
    return photo
