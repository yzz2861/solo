from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os

from .database import engine, Base
from .routers import products, qa, supervisor

Base.metadata.create_all(bind=engine)

import jieba
jieba.initialize()

app = FastAPI(title="产品说明书问答校验系统")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(qa.router)
app.include_router(supervisor.router)

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "frontend")


@app.get("/")
def serve_index():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "产品说明书问答校验系统 API 已启动", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}


if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
