import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models import Delivery, User

DELIVERY_DATA = [
    {
        "tracking_number": "TRK-001",
        "sender_name": "山田太郎",
        "sender_address": "東京都渋谷区神南1-2-3",
        "sender_phone": "03-1234-5678",
        "recipient_name": "鈴木花子",
        "recipient_address": "大阪府大阪市中央区1-2-3",
        "recipient_phone": "06-1234-5678",
        "status": "pending",
        "weight": 1.5,
        "delivery_fee": 800,
    },
    {
        "tracking_number": "TRK-002",
        "sender_name": "佐藤次郎",
        "sender_address": "大阪府大阪市中央区1-2-3",
        "sender_phone": "06-9876-5432",
        "recipient_name": "田中一郎",
        "recipient_address": "福岡県福岡市博多区1-2-3",
        "recipient_phone": "092-1234-5678",
        "status": "in_transit",
        "weight": 2.0,
        "delivery_fee": 1200,
    },
    {
        "tracking_number": "TRK-003",
        "sender_name": "伊藤三郎",
        "sender_address": "福岡県福岡市博多区1-2-3",
        "sender_phone": "092-9876-5432",
        "recipient_name": "渡辺四郎",
        "recipient_address": "東京都新宿区1-2-3",
        "recipient_phone": "03-9876-5432",
        "status": "delivered",
        "weight": 0.5,
        "delivery_fee": 600,
    },
]


async def find_or_create_user(session, email: str, password: str, name: str, role: str) -> User:
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(email=email, encrypted_password=hash_password(password), name=name, role=role)
        session.add(user)
        await session.flush()
        print(f"{'管理者' if role == 'admin' else 'テスト'}ユーザーを作成しました: {user.email}")
    else:
        print(f"既存ユーザーをスキップしました: {user.email}")
    return user


async def find_or_create_delivery(session, data: dict, owner: User) -> Delivery:
    result = await session.execute(select(Delivery).where(Delivery.tracking_number == data["tracking_number"]))
    delivery = result.scalar_one_or_none()
    if delivery is None:
        delivery = Delivery(user_id=owner.id, **data)
        session.add(delivery)
        await session.flush()
        print(f"デリバリー: {delivery.tracking_number} ({delivery.status})")
    else:
        print(f"既存デリバリーをスキップしました: {delivery.tracking_number}")
    return delivery


async def main():
    print("テストデータを作成します...")
    async with AsyncSessionLocal() as session:
        test_user = await find_or_create_user(session, "test@example.com", "password", "テストユーザー", "user")
        await find_or_create_user(session, "admin@example.com", "admin123", "管理者", "admin")

        print("デリバリーデータを作成します...")
        for data in DELIVERY_DATA:
            await find_or_create_delivery(session, data, owner=test_user)

        await session.commit()
    print("シードデータの作成が完了しました。")


if __name__ == "__main__":
    asyncio.run(main())
