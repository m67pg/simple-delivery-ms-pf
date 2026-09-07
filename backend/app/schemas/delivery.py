from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.auth import UserOut

ALLOWED_STATUSES = ["pending", "shipped", "in_transit", "delivered"]


class DeliveryCreate(BaseModel):
    recipient_name: str | None = None
    recipient_phone: str | None = None
    recipient_address: str | None = None
    sender_name: str | None = None
    sender_address: str | None = None
    delivery_fee: float | None = None
    weight: float | None = None
    status: str | None = None


class DeliveryUpdate(DeliveryCreate):
    pass


class DeliveryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tracking_number: str
    sender_name: str | None
    sender_address: str | None
    sender_phone: str | None
    recipient_name: str
    recipient_address: str
    recipient_phone: str | None
    status: str
    weight: float | None
    delivery_fee: float | None
    user_id: int
    created_at: datetime
    updated_at: datetime
    user: UserOut
