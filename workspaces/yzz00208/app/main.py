from fastapi import FastAPI
from app.api.inventory import router as inventory_router

app = FastAPI(
    title="门店盘点盈亏API",
    description="门店盘点盈亏规则判定、异常解释与处理留痕一体化服务",
    version="1.0.0",
)

app.include_router(inventory_router)


@app.get("/health", tags=["系统"])
async def health_check():
    return {"status": "ok", "service": "门店盘点盈亏API"}


@app.get("/", tags=["系统"])
async def root():
    return {
        "service": "门店盘点盈亏API",
        "version": "1.0.0",
        "endpoints": {
            "盘点判定": "POST /api/v1/inventory/check",
            "追溯查询": "GET /api/v1/inventory/trace/{trace_id}",
            "业务历史": "GET /api/v1/inventory/business/{business_no}",
            "人工复核": "POST /api/v1/inventory/review/{trace_id}",
            "历史回放": "GET /api/v1/inventory/replay/{business_no}",
            "规则版本": "GET /api/v1/inventory/rules/versions",
        },
    }
