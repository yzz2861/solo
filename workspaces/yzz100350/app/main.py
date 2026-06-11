from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.database import engine, Base
from app.routers import appointment, gate, dashboard


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="港口空箱预约放行服务",
    description="登记船公司、箱型、提箱日期、司机和车辆，预约通过后占用库存。支持闸口放行/撤销、超时签到、车牌重复校验、经理看板和船名筛选。",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(appointment.router)
app.include_router(gate.router)
app.include_router(dashboard.router)


@app.get("/health", summary="健康检查")
def health():
    return {"status": "ok"}
