"""配送伝票PDF生成サービス。"""
import io
from pathlib import Path

import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

from app.models.delivery import Delivery

FONT_PATH = Path(__file__).resolve().parent.parent.parent / "fonts" / "ipag.ttf"
FONT_NAME = "JapaneseFont"

_font_registered = False


def _ensure_font_registered() -> str:
    """IPAゴシックフォントを登録する。見つからない場合はHelveticaにフォールバックする。"""
    global _font_registered
    if _font_registered:
        return FONT_NAME if FONT_PATH.exists() else "Helvetica"

    if FONT_PATH.exists():
        pdfmetrics.registerFont(TTFont(FONT_NAME, str(FONT_PATH)))
        _font_registered = True
        return FONT_NAME

    _font_registered = True
    return "Helvetica"


STATUS_LABELS = {
    "pending": "受付中",
    "shipped": "発送済み",
    "in_transit": "配送中",
    "delivered": "完了",
    "cancelled": "キャンセル",
}


def _format_status(status: str | None) -> str:
    if status is None:
        return "不明"
    return STATUS_LABELS.get(status, status)


def _format_currency(amount) -> str:
    value = int(amount or 0)
    return f"{value:,}円"


def _format_weight(weight) -> str:
    return f"{float(weight or 0):.1f}"


def _format_delivery_number(delivery_id: int) -> str:
    return f"DL-{str(delivery_id).rjust(6, '0')}"


def _format_date(dt) -> str:
    return dt.strftime("%Y年%m月%d日 %H:%M")


def _safe_text(text: str | None) -> str:
    return text if text else "N/A"


def _generate_qr_image_bytes(delivery_id: int) -> bytes:
    qr_data = f"DL-{delivery_id}"
    img = qrcode.make(qr_data)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.read()


def generate_delivery_pdf(delivery: Delivery) -> bytes:
    """配送伝票のPDFをバイト列として生成する。"""
    font_name = _ensure_font_registered()

    buf = io.BytesIO()
    page_width, page_height = A4
    c = canvas.Canvas(buf, pagesize=A4)

    margin = 15 * mm
    content_width = page_width - 2 * margin

    def y_from_top(mm_from_top: float) -> float:
        return page_height - margin - mm_from_top * mm

    # --- ヘッダー ---
    c.setFont(font_name, 24)
    c.drawCentredString(page_width / 2, y_from_top(10), "配送伝票")

    c.setFont(font_name, 14)
    c.drawCentredString(
        page_width / 2, y_from_top(20), f"伝票番号: {_format_delivery_number(delivery.id)}"
    )

    # --- QRコード(右上) ---
    qr_bytes = _generate_qr_image_bytes(delivery.id)
    from reportlab.lib.utils import ImageReader

    qr_image = ImageReader(io.BytesIO(qr_bytes))
    qr_size = 25 * mm
    qr_x = page_width - margin - qr_size
    qr_y = y_from_top(35)
    c.drawImage(qr_image, qr_x, qr_y, width=qr_size, height=qr_size)

    c.setFont(font_name, 8)
    c.drawCentredString(qr_x + qr_size / 2, qr_y - 10, "QR Code")
    c.setFont(font_name, 6)
    c.drawCentredString(qr_x + qr_size / 2, qr_y - 18, _format_delivery_number(delivery.id))

    # --- 荷受人情報(左) / 配送情報(右) ---
    section_top = y_from_top(50)
    col1_x = margin
    col2_x = margin + content_width / 2 + 5 * mm

    c.setFont(font_name, 16)
    c.drawString(col1_x, section_top, "荷受人情報")
    c.drawString(col2_x, section_top, "配送情報")

    c.setFont(font_name, 11)
    line_height = 7 * mm

    recipient_lines = [
        f"お名前: {_safe_text(delivery.recipient_name)}",
        f"電話番号: {_safe_text(delivery.recipient_phone)}",
        f"配送先: {_safe_text(delivery.recipient_address)}",
    ]
    for i, line in enumerate(recipient_lines):
        c.drawString(col1_x, section_top - (i + 2) * line_height, line)

    delivery_lines = [
        f"ステータス: {_format_status(delivery.status)}",
        f"配送料金: {_format_currency(delivery.delivery_fee)}",
        f"重量: {_format_weight(delivery.weight)}kg",
        f"作成日時: {_format_date(delivery.created_at)}",
    ]
    for i, line in enumerate(delivery_lines):
        c.drawString(col2_x, section_top - (i + 2) * line_height, line)

    # --- フッター ---
    footer_y = margin + 15 * mm
    c.setLineWidth(0.5)
    c.line(margin, footer_y, page_width - margin, footer_y)
    c.setFont(font_name, 10)
    c.setFillGray(0.4)
    c.drawCentredString(
        page_width / 2, footer_y - 8, "この伝票は配送管理システムにより自動生成されました"
    )
    c.setFillGray(0)

    c.showPage()
    c.save()
    buf.seek(0)
    return buf.read()
