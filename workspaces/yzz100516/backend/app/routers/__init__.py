from fastapi import APIRouter
from .samples import router as samples_router
from .compliance import router as compliance_router

api_router = APIRouter()
api_router.include_router(samples_router)
api_router.include_router(compliance_router)

__all__ = ["api_router"]
