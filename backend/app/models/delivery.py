from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.bill import Bill
    from app.models.user import User


class Delivery(Base, TimestampMixin):
    __tablename__ = "deliveries"

    id: Mapped[int] = mapped_column(primary_key=True)
    tracking_number: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)

    sender_name: Mapped[str | None] = mapped_column(String, nullable=True)
    sender_address: Mapped[str | None] = mapped_column(String, nullable=True)
    sender_phone: Mapped[str | None] = mapped_column(String, nullable=True)

    recipient_name: Mapped[str] = mapped_column(String, nullable=False)
    recipient_address: Mapped[str] = mapped_column(String, nullable=False)
    recipient_phone: Mapped[str | None] = mapped_column(String, nullable=True)

    # pending / shipped / in_transit / delivered / cancelled
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")

    weight: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    delivery_fee: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    user: Mapped["User"] = relationship(back_populates="deliveries")
    bills: Mapped[list["Bill"]] = relationship(back_populates="delivery")
