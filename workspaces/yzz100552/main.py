from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.database import engine, Base
from app.routers import vehicles, photos, safety

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="施工车辆洗轮排队服务 API",
    description=(
        "## 业务流程\n"
        "进场登记 → 装载完成 → 开始洗轮 → 完成洗轮 → 检查放行 → 出场登记\n\n"
        "## 业务规则\n"
        "- 未洗轮不能出场\n"
        "- 同一车未出场不能再次进场\n"
        "- 篷布照片缺失 / 检查不通过 → 自动拦截并说明原因\n\n"
        "## 角色功能\n"
        "- **门岗**: 实时排队查询、交班流水\n"
        "- **安全员**: 导出 Excel（出场 / 被拦 / 返洗 / 环保异常）\n"
        "- **环保员**: 车牌抽查、查看洗轮照片与放行原因\n"
    ),
    version="1.0.0",
    contact={"name": "项目组", "email": "support@example.com"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vehicles.router)
app.include_router(photos.router)
app.include_router(safety.router)


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/api/health", tags=["系统"])
def health_check():
    return {"status": "ok", "service": "施工车辆洗轮排队服务"}
