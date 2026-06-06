"""仲裁送达回证API启动入口"""
import uvicorn

from arbitration_service.api.main import app


if __name__ == "__main__":
    uvicorn.run(
        "arbitration_service.api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
