from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class JwtDenylist(Base):
    __tablename__ = "jwt_denylists"

    id: Mapped[int] = mapped_column(primary_key=True)
    jti: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    exp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
