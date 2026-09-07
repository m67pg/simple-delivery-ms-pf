from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.deps import get_current_user
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, MessageResponse, UserOut

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(payload.password, user.encrypted_password):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": "Invalid email or password"},
        )

    token = create_access_token(user.id, user.email)

    return LoginResponse(user=UserOut.model_validate(user), token=token)


@router.delete("/logout", response_model=MessageResponse)
async def logout():
    return MessageResponse(message="Successfully logged out")


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)
