from fastapi import APIRouter

from app.api.v1 import deliveries, health_check, sessions

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(health_check.router, tags=["health"])
api_v1_router.include_router(sessions.router, tags=["auth"])
api_v1_router.include_router(deliveries.router, prefix="/deliveries", tags=["deliveries"])
