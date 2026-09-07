from fastapi import APIRouter

router = APIRouter()


@router.get("/health_check")
def health_check():
    return {
        "status": "Online",
        "message": "Simple Delivery MS API (FastAPI)",
        "endpoints": {
            "login": "/api/v1/login",
            "deliveries": "/api/v1/deliveries",
        },
    }
