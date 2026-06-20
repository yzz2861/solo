from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base
from .routers import auth, cabinets, rack_requests, reports

app = FastAPI(
    title="机房机柜上架申请API",
    description="管理机房机柜服务器上架申请流程，包括设备型号、高度、机柜、U位、电源、网络端口和审批状态管理。支持U位冲突检测、供电超额预警、端口占用校验等核心功能。",
    version="1.0.0",
    contact={
        "name": "运维团队",
        "email": "ops@company.com",
    },
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(cabinets.router)
app.include_router(rack_requests.router)
app.include_router(reports.router)


@app.get("/", tags=["根路径"])
async def root():
    return {
        "name": "机房机柜上架申请API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health", tags=["健康检查"])
async def health_check():
    return {
        "status": "healthy",
        "timestamp": "2026-06-20T00:00:00Z"
    }
