from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import students, tasks, refunds, subsidies, finance, operators

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="共享打印额度服务 API",
    description=(
        "学校机房共享打印额度管理服务，支持学生余额查询、打印扣费（幂等防重复）、"
        "异常退款审批、课程补贴管理（不可提现、超额提醒）、财务报表导出。\n\n"
        "核心能力：\n"
        "- 学生账户：现金余额 + 补贴余额独立记账，补贴不可提现\n"
        "- 打印任务：基于 idempotency_key 幂等扣费，防卡纸重复扣款\n"
        "- 退款：必须绑定原打印任务，机房老师申请 → 审批老师批准 → 自动原路返还（现金/补贴分别记账）\n"
        "- 课程补贴：老师发放到学生补贴账户，打印时优先使用；补贴不足时提醒并混合扣费\n"
        "- 异常处理：任务上报异常后自动锁定，等待退款审批\n"
        "- 财务导出：扣费、退款、补贴发放/消耗、被锁定任务，支持 JSON / CSV"
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(students.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(refunds.router, prefix="/api/v1")
app.include_router(subsidies.router, prefix="/api/v1")
app.include_router(finance.router, prefix="/api/v1")
app.include_router(operators.router, prefix="/api/v1")


@app.get("/health", tags=["系统"], summary="健康检查")
def health_check():
    return {"status": "ok", "service": "print-quota-service"}
