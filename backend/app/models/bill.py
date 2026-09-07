from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.delivery import Delivery


class Bill(Base, TimestampMixin):
    __tablename__ = "bills"

    id: Mapped[int] = mapped_column(primary_key=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    # pending / paid / overdue
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    issued_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)

    delivery_id: Mapped[int] = mapped_column(ForeignKey("deliveries.id"), nullable=False)

    delivery: Mapped["Delivery"] = relationship(back_populates="bills")
