from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.api.v1.routes import router as main_router
from app.api.v1.special_routes import router as special_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="""
    城市书报亭补刊服务 API

    核心功能：
    - 网点、刊物、刊期、库存管理
    - 销量上报、退刊申请（过退刊期拒绝）
    - 补货申请（自动合并、库存不足需填原因）
    - 配送单管理与状态流转（配送失败需填原因）
    - 发行员今日补刊路线
    - 主管报表：缺刊投诉、退刊率、补货响应时间
    - 配送员按线路打印补刊/退清单
    - 亭主自助查询申请进度
    - 月底滞销刊核算
    """,
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(main_router, prefix=settings.API_V1_PREFIX)
app.include_router(special_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["系统"])
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "api_prefix": settings.API_V1_PREFIX
    }


@app.get("/health", tags=["系统"])
def health_check():
    return {"status": "ok", "timestamp": __import__("datetime").datetime.utcnow().isoformat()}
