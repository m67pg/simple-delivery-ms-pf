import secrets
import time

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.deps import get_current_user
from app.models.delivery import Delivery
from app.models.user import User
from app.schemas.delivery import ALLOWED_STATUSES, DeliveryCreate, DeliveryOut, DeliveryUpdate
from app.services.pdf_generator import generate_delivery_pdf

router = APIRouter()


def _generate_tracking_number() -> str:
    return f"DL-{int(time.time())}-{secrets.token_hex(3).upper()}"


def _validate_delivery(
    recipient_name: str | None, recipient_address: str | None, status_value: str | None
) -> dict[str, list[str]]:
    errors: dict[str, list[str]] = {}

    if not recipient_name:
        errors["recipient_name"] = ["can't be blank"]
    if not recipient_address:
        errors["recipient_address"] = ["can't be blank"]

    if not status_value:
        errors["status"] = ["can't be blank"]
    elif status_value not in ALLOWED_STATUSES:
        errors["status"] = ["is not included in the list"]

    return errors


@router.get("", response_model=list[DeliveryOut])
async def list_deliveries(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Delivery).options(selectinload(Delivery.user)).order_by(Delivery.created_at.desc())
    )
    deliveries = result.scalars().all()
    return [DeliveryOut.model_validate(d) for d in deliveries]


@router.get("/{delivery_id}", response_model=DeliveryOut)
async def get_delivery(
    delivery_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Delivery).options(selectinload(Delivery.user)).where(Delivery.id == delivery_id)
    )
    delivery = result.scalar_one_or_none()
    if delivery is None:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"error": "Not found"})
    return DeliveryOut.model_validate(delivery)


@router.post("", response_model=DeliveryOut, status_code=status.HTTP_201_CREATED)
async def create_delivery(
    payload: DeliveryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    status_value = payload.status or "pending"
    errors = _validate_delivery(payload.recipient_name, payload.recipient_address, status_value)
    if errors:
        return JSONResponse(status_code=422, content={"errors": errors})

    delivery = Delivery(
        tracking_number=_generate_tracking_number(),
        sender_name=payload.sender_name or "",
        sender_address=payload.sender_address or "",
        recipient_name=payload.recipient_name,
        recipient_address=payload.recipient_address,
        recipient_phone=payload.recipient_phone,
        status=status_value,
        weight=payload.weight,
        delivery_fee=payload.delivery_fee,
        user_id=current_user.id,
    )
    db.add(delivery)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        return JSONResponse(
            status_code=422,
            content={"errors": {"tracking_number": ["has already been taken"]}},
        )

    result = await db.execute(
        select(Delivery).options(selectinload(Delivery.user)).where(Delivery.id == delivery.id)
    )
    delivery = result.scalar_one()
    return DeliveryOut.model_validate(delivery)


@router.patch("/{delivery_id}", response_model=DeliveryOut)
@router.put("/{delivery_id}", response_model=DeliveryOut)
async def update_delivery(
    delivery_id: int,
    payload: DeliveryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Delivery).options(selectinload(Delivery.user)).where(Delivery.id == delivery_id)
    )
    delivery = result.scalar_one_or_none()
    if delivery is None:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"error": "Not found"})

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(delivery, field, value)

    errors = _validate_delivery(delivery.recipient_name, delivery.recipient_address, delivery.status)
    if errors:
        await db.rollback()
        return JSONResponse(status_code=422, content={"errors": errors})

    await db.commit()

    result = await db.execute(
        select(Delivery).options(selectinload(Delivery.user)).where(Delivery.id == delivery_id)
    )
    delivery = result.scalar_one()
    return DeliveryOut.model_validate(delivery)


@router.get("/{delivery_id}/print")
async def print_delivery(
    delivery_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Delivery).where(Delivery.id == delivery_id))
    delivery = result.scalar_one_or_none()
    if delivery is None:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"error": "Not found"})

    pdf_bytes = generate_delivery_pdf(delivery)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="delivery_{delivery.id}.pdf"'},
    )
