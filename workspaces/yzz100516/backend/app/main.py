from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .routers import api_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="保税样品出入审批 API",
    description="保税仓样品出入区审批管理系统，支持样品登记、审批、出区、归还、销毁、超期追踪等功能",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "保税样品出入审批 API 运行正常"}
