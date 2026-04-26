from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime

from .schema import SwiggyInvoiceFields, SwiggyLineItem


@dataclass
class ParsedSwiggy:
    fields: SwiggyInvoiceFields
    parse_success: bool
    confidence: float
    warnings: list[str] = field(default_factory=list)
    sources: dict[str, object] = field(default_factory=dict)


def extract_swiggy_invoice(text: str, subject: str = "") -> ParsedSwiggy:
    if not text.strip():
        return empty_result("No PDF invoice text was available.")

    invoice_text = first_invoice_text(text)
    lines = non_empty_lines(invoice_text)
    items = parse_invoice_item_rows(lines)

    order_id = value_after_label(lines, "Order ID")
    invoice_no = value_after_label(lines, "Invoice No")
    restaurant_name = strip_trailing_gstin(
        value_after_label(lines, "Restaurant Name")
        or value_after_label(lines, "Seller Name")
        or value_after_label(lines, "Restaurant")
    )
    customer_address = value_after_label(lines, "Customer Address")
    restaurant_address = value_after_label(lines, "Address")
    invoice_date = to_iso_date(value_after_label(lines, "Date of Invoice"))
    invoice_total = (
        table_amount_by_label(lines, "Invoice Total")
        or table_amount_by_any_cell(lines, "Invoice Value")
        or amount_after_label(invoice_text, "Total")
        or amount_after_label(invoice_text, "Invoice Total")
    )
    item_subtotal = table_subtotal(lines)
    tax_total = table_amount_by_label(lines, "Total taxes")
    packaging_fee = sum(
        item.net_amount or item.amount or 0
        for item in items
        if re.search(r"pack(ing|aging)", item.name, re.I)
    ) or None
    discount_total = sum(item.discount or 0 for item in items) or None
    pincode = (
        value_after_label(lines, "Pincode")
        or extract_pincode(customer_address)
        or extract_pincode(invoice_text)
    )
    payment_method = value_after_label(lines, "Payment Method")

    parse_success = bool(order_id and invoice_total)
    fields = SwiggyInvoiceFields(
        order_id=order_id,
        invoice_no=invoice_no,
        invoice_date=invoice_date,
        restaurant_name=restaurant_name,
        restaurant_address=restaurant_address,
        customer_address=customer_address,
        pincode=pincode,
        invoice_total=invoice_total,
        paid_amount=None,
        item_subtotal=item_subtotal,
        tax_total=tax_total,
        platform_fee=None,
        delivery_fee=None,
        packaging_fee=packaging_fee,
        discount_total=discount_total,
        payment_method=payment_method,
        service_type=service_type_from_text(subject, invoice_text),
        items=items,
    )
    return ParsedSwiggy(
        fields=fields,
        parse_success=parse_success,
        confidence=0.99 if parse_success else 0.2,
        warnings=[]
        if parse_success
        else ["PDF text did not include both order id and invoice total."],
        sources={"pdf": fields.model_dump()},
    )


def extract_swiggy_body(email_body: str, subject: str = "") -> ParsedSwiggy:
    text = f"{subject}\n{email_body}"
    order_id = regex_group(text, r"\bOrder ID\b\s*[:#-]?\s*([A-Z0-9-]{5,})")
    paid = re.search(
        r"\bPaid Via\s+(.+?)\s+₹?\s*([0-9]+(?:\.[0-9]{1,2})?)",
        text,
        re.I,
    )
    paid_amount = float(paid.group(2)) if paid else amount_after_label(text, "Paid")
    payment_method = paid.group(1).strip() if paid else None
    restaurant_name = (
        regex_group(text, r"\bRestaurant\b\s*:?\s*([^\n]+)")
        or regex_group(text, r"\bfrom\s+([A-Za-z0-9 &.'-]+)")
    )
    customer_address = regex_group(text, r"\b(?:Area|Address)\b\s*:?\s*([^\n]+)")
    parse_success = bool(order_id and paid_amount)
    fields = SwiggyInvoiceFields(
        order_id=order_id,
        invoice_no=None,
        invoice_date=None,
        restaurant_name=restaurant_name.strip() if restaurant_name else None,
        restaurant_address=None,
        customer_address=customer_address,
        pincode=extract_pincode(text),
        invoice_total=None,
        paid_amount=paid_amount,
        item_subtotal=None,
        tax_total=amount_after_label(text, "Taxes"),
        platform_fee=amount_after_label(text, "Platform fee with GST"),
        delivery_fee=free_fee_after_phrase(text, "Delivery Fee"),
        packaging_fee=None,
        discount_total=amount_after_label(text, "Discount Applied"),
        payment_method=payment_method,
        service_type=service_type_from_text(subject, text)
        if parse_success
        else "UNKNOWN",
        items=[],
    )
    return ParsedSwiggy(
        fields=fields,
        parse_success=parse_success,
        confidence=0.95 if parse_success else 0,
        warnings=[]
        if parse_success
        else ["Email body did not include both order id and paid amount."],
        sources={"body": fields.model_dump()},
    )


def merge_swiggy_sources(
    pdf: ParsedSwiggy | None,
    body: ParsedSwiggy | None,
) -> ParsedSwiggy:
    pdf_fields = pdf.fields if pdf else SwiggyInvoiceFields()
    body_fields = body.fields if body else SwiggyInvoiceFields()
    warnings = [*(pdf.warnings if pdf else []), *(body.warnings if body else [])]
    sources: dict[str, object] = {}
    if pdf:
        sources.update(pdf.sources)
    if body:
        sources.update(body.sources)

    if (
        pdf_fields.invoice_total is not None
        and body_fields.paid_amount is not None
        and abs(pdf_fields.invoice_total - body_fields.paid_amount) > 0.01
    ):
        warnings.append(
            "PDF invoice total and email paid amount differ; storing both in raw.sources."
        )

    fields = SwiggyInvoiceFields(
        order_id=pdf_fields.order_id or body_fields.order_id,
        invoice_no=pdf_fields.invoice_no,
        invoice_date=pdf_fields.invoice_date,
        restaurant_name=pdf_fields.restaurant_name or body_fields.restaurant_name,
        restaurant_address=pdf_fields.restaurant_address,
        customer_address=pdf_fields.customer_address or body_fields.customer_address,
        pincode=pdf_fields.pincode or body_fields.pincode,
        invoice_total=pdf_fields.invoice_total,
        paid_amount=body_fields.paid_amount or pdf_fields.invoice_total,
        item_subtotal=pdf_fields.item_subtotal,
        tax_total=pdf_fields.tax_total or body_fields.tax_total,
        platform_fee=body_fields.platform_fee,
        delivery_fee=body_fields.delivery_fee,
        packaging_fee=pdf_fields.packaging_fee,
        discount_total=body_fields.discount_total or pdf_fields.discount_total,
        payment_method=body_fields.payment_method or pdf_fields.payment_method,
        service_type=pdf_fields.service_type
        if pdf_fields.service_type != "UNKNOWN"
        else body_fields.service_type,
        items=pdf_fields.items,
    )
    parse_success = bool(fields.order_id and (fields.paid_amount or fields.invoice_total))
    confidence = max(pdf.confidence if pdf else 0, body.confidence if body else 0)
    if not parse_success and not warnings:
        warnings.append("No completed Swiggy transaction was found.")
    return ParsedSwiggy(
        fields=fields,
        parse_success=parse_success,
        confidence=confidence if parse_success else min(confidence, 0.2),
        warnings=unique_strings(warnings if not parse_success else warnings),
        sources=sources,
    )


def empty_result(warning: str) -> ParsedSwiggy:
    return ParsedSwiggy(
        fields=SwiggyInvoiceFields(),
        parse_success=False,
        confidence=0,
        warnings=[warning],
    )


def first_invoice_text(text: str) -> str:
    match = re.search(r"(^|\n)(#+\s*)?TAX INVOICE\b", text, re.I)
    start = match.start() if match else 0
    sliced = text[start:]
    end_markers = [
        m.start()
        for pattern in [r"\n#+\s*Details of ECO\b", r"\nDetails of ECO\b"]
        for m in [re.search(pattern, sliced, re.I)]
        if m
    ]
    second_invoice = sliced.find("\nTAX INVOICE", 20)
    if second_invoice > 0:
        end_markers.append(second_invoice)
    end = min(end_markers) if end_markers else len(sliced)
    return sliced[:end]


def non_empty_lines(text: str) -> list[str]:
    return [
        line.strip()
        for line in text.splitlines()
        if line.strip() and line.strip() != "<!-- image -->"
    ]


def value_after_label(lines: list[str], label: str) -> str | None:
    target = normalize_label(label)
    for index, line in enumerate(lines):
        same_line = re.match(rf"^{re.escape(label)}\s*:?\s*(.+)$", line, re.I)
        if same_line and same_line.group(1).strip():
            return same_line.group(1).strip()
        if normalize_label(line) == target:
            value = lines[index + 1] if index + 1 < len(lines) else None
            if not value or looks_like_label(value) or value.startswith("|"):
                return None
            return value.strip()
    return None


def parse_invoice_item_rows(lines: list[str]) -> list[SwiggyLineItem]:
    rows: list[SwiggyLineItem] = []
    for line in lines:
        if not line.startswith("|"):
            continue
        cells = markdown_cells(line)
        row_number = cells[0] if cells else ""
        if not re.match(r"^\d+\.?$", row_number):
            continue
        name = cells[1] if len(cells) > 1 else ""
        if not name or re.search("description", name, re.I):
            continue
        if len(cells) >= 16:
            rows.append(
                SwiggyLineItem(
                    name=name,
                    quantity=number_from_text(cells[2]),
                    unit_price=None,
                    amount=money_from_text(cells[5]),
                    discount=money_from_text(cells[6]),
                    net_amount=money_from_text(cells[15]),
                    tax_total=None,
                )
            )
        else:
            rows.append(
                SwiggyLineItem(
                    name=name,
                    quantity=number_from_text(cells[3] if len(cells) > 3 else None),
                    unit_price=money_from_text(cells[4] if len(cells) > 4 else None),
                    amount=money_from_text(cells[5] if len(cells) > 5 else None),
                    discount=money_from_text(cells[6] if len(cells) > 6 else None),
                    net_amount=money_from_text(cells[7] if len(cells) > 7 else None),
                    tax_total=None,
                )
            )
    return rows


def markdown_cells(line: str) -> list[str]:
    return [cell.strip() for cell in line.split("|")[1:-1]]


def table_amount_by_label(lines: list[str], label: str) -> float | None:
    target = normalize_label(label)
    for line in lines:
        if not line.startswith("|"):
            continue
        cells = markdown_cells(line)
        if cells and normalize_label(cells[0]) == target:
            return amount_from_cells(cells)
    return None


def table_amount_by_any_cell(lines: list[str], label: str) -> float | None:
    target = normalize_label(label)
    for line in lines:
        if not line.startswith("|"):
            continue
        cells = markdown_cells(line)
        for index, cell in enumerate(cells):
            if normalize_label(cell) == target:
                return amount_from_cells(cells[index + 1 :])
    return None


def table_subtotal(lines: list[str]) -> float | None:
    for line in lines:
        if not line.startswith("|"):
            continue
        cells = markdown_cells(line)
        if any(normalize_label(cell) == "subtotal" for cell in cells):
            return amount_from_cells(cells)
    return None


def amount_from_cells(cells: list[str]) -> float | None:
    for cell in reversed(cells):
        amount = money_from_text(cell)
        if amount is not None:
            return amount
    return None


def amount_after_label(text: str, label: str) -> float | None:
    escaped = re.escape(label)
    match = re.search(
        rf"{escaped}[^₹\d-]*-?\s*(?:₹|INR)?\s*([0-9]+(?:\.[0-9]{{1,2}})?)",
        text,
        re.I,
    )
    return float(match.group(1)) if match else None


def free_fee_after_phrase(text: str, phrase: str) -> float | None:
    escaped = re.escape(phrase)
    match = re.search(
        rf"{escaped}[^₹]*₹\s*([0-9]+(?:\.[0-9]{{1,2}})?)(?:\s*FREE)?",
        text,
        re.I,
    )
    if not match:
        return None
    return 0 if re.search(r"\bFREE\b", match.group(0), re.I) else float(match.group(1))


def money_from_text(value: str | None) -> float | None:
    if not value:
        return None
    match = re.search(r"-?\d+(?:\.\d+)?", value.replace(",", ""))
    if not match:
        return None
    amount = float(match.group(0))
    return amount if amount == amount else None


def number_from_text(value: str | None) -> float | None:
    return money_from_text(value)


def normalize_label(value: str) -> str:
    return value.strip().rstrip(":").lower()


def looks_like_label(value: str) -> bool:
    return value.strip().endswith(":")


def strip_trailing_gstin(value: str | None) -> str | None:
    if not value:
        return None
    return re.sub(
        r"\s+\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$",
        "",
        value,
        flags=re.I,
    ).strip()


def to_iso_date(value: str | None) -> str | None:
    if not value:
        return None
    stripped = value.strip()
    match = re.match(r"^(\d{2})-(\d{2})-(\d{4})$", stripped)
    if match:
        day, month, year = match.groups()
        return f"{year}-{month}-{day}"
    try:
        return datetime.fromisoformat(stripped).date().isoformat()
    except ValueError:
        return None


def extract_pincode(value: str | None) -> str | None:
    if not value:
        return None
    match = re.search(r"\b\d{6}\b", value)
    return match.group(0) if match else None


def regex_group(text: str, pattern: str) -> str | None:
    match = re.search(pattern, text, re.I)
    return match.group(1).strip() if match else None


def service_type_from_text(subject: str, text: str) -> str:
    combined = f"{subject}\n{text}"
    if re.search(r"instamart|instamaxx|description of goods|seller name", combined, re.I):
        return "INSTAMART"
    if re.search(r"dineout", combined, re.I):
        return "DINEOUT"
    if re.search(r"genie", combined, re.I):
        return "GENIE"
    if re.search(r"restaurant|food|order", combined, re.I):
        return "FOOD_DELIVERY"
    return "UNKNOWN"


def unique_strings(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return result
