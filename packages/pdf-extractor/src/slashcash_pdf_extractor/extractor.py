from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from . import __version__
from .schema import (
    PdfExtraction,
    PdfExtractionDelivery,
    PdfExtractionFields,
    PdfExtractionRaw,
    PdfExtractionTaxes,
)

try:
    import docling as docling_package
    from docling.document_converter import DocumentConverter
except Exception:  # pragma: no cover - optional runtime dependency
    docling_package = None
    DocumentConverter = None


class PdfExtractorError(Exception):
    """Raised when a PDF cannot be deterministically parsed."""


@dataclass(frozen=True)
class ExtractorRuntime:
    name: str
    version: str
    used_docling: bool


def resolve_runtime() -> ExtractorRuntime:
    if docling_package is not None and DocumentConverter is not None:
        return ExtractorRuntime(
            name="docling",
            version=getattr(docling_package, "__version__", "unknown"),
            used_docling=True,
        )
    return ExtractorRuntime(
        name="docling-fallback",
        version=__version__,
        used_docling=False,
    )


def extract_pdf(pdf_path: str | Path) -> PdfExtraction:
    path = Path(pdf_path).expanduser().resolve()
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")
    if path.suffix.lower() != ".pdf":
        raise PdfExtractorError(
            f"Unsupported file type: {path.suffix or '<none>'}"
        )

    runtime = resolve_runtime()
    raw_text, raw_tables, page_count = load_document_text(path, runtime)
    fields, warnings = parse_swiggy_fields(raw_text)

    if fields.totalAmount is None:
        raise PdfExtractorError("Could not find a total amount in the PDF.")

    confidence = compute_confidence(fields, warnings)
    return PdfExtraction(
        extractor=runtime.name,
        extractorVersion=runtime.version,
        confidence=confidence,
        fields=fields,
        warnings=warnings,
        raw=PdfExtractionRaw(
            pageCount=page_count,
            tables=raw_tables,
            text=raw_text,
        ),
    )


def load_document_text(
    path: Path,
    runtime: ExtractorRuntime,
) -> tuple[str, list[dict[str, Any]], int]:
    if runtime.used_docling:
        try:
            converter = DocumentConverter()
            result = converter.convert(path)
            document = result.document

            text_parts: list[str] = []
            for export_name in ("export_to_markdown", "export_to_text"):
                export_fn = getattr(document, export_name, None)
                if callable(export_fn):
                    try:
                        value = export_fn()
                    except TypeError:
                        value = export_fn(doc=document)
                    if isinstance(value, str) and value.strip():
                        text_parts.append(value)

            tables: list[dict[str, Any]] = []
            for index, table in enumerate(getattr(document, "tables", []) or []):
                markdown = None
                export_fn = getattr(table, "export_to_markdown", None)
                if callable(export_fn):
                    try:
                        markdown = export_fn(doc=document)
                    except TypeError:
                        markdown = export_fn()
                tables.append(
                    {
                        "index": index,
                        "markdown": markdown or "",
                    }
                )

            text = "\n".join(part for part in text_parts if part).strip()
            if text:
                return text, tables, len(getattr(result, "pages", []) or []) or 1
        except Exception:
            # The deterministic fallback still keeps the CLI useful when Docling
            # is unavailable or rejects a tiny synthetic test fixture.
            pass

    return extract_text_from_pdf_bytes(path), [], 1


def extract_text_from_pdf_bytes(path: Path) -> str:
    raw_bytes = path.read_bytes()
    raw_text = raw_bytes.decode("latin1", errors="ignore")
    matches = re.findall(r"\(([^()]*)\)", raw_text)
    lines = [decode_pdf_string(match).strip() for match in matches]
    return "\n".join(line for line in lines if line)


def decode_pdf_string(value: str) -> str:
    return (
        value.replace(r"\\", "\\")
        .replace(r"\(", "(")
        .replace(r"\)", ")")
        .replace(r"\n", "\n")
        .replace(r"\r", "\r")
        .replace(r"\t", "\t")
    )


def parse_swiggy_fields(text: str) -> tuple[PdfExtractionFields, list[str]]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    order_id = first_group(
        text,
        [
            r"\border\s*id\b\s*[:#-]?\s*([A-Z0-9-]{5,})",
            r"\border\s*number\b\s*[:#-]?\s*([A-Z0-9-]{5,})",
        ],
    )
    total_amount = infer_total_amount(text)
    restaurant_name = first_group(
        text,
        [
            r"\brestaurant\b\s*[:#-]?\s*([^\n]+)",
            r"\bseller\s*name\b\s*[:#-]?\s*([^\n]+)",
        ],
    )
    area = first_group(text, [r"\barea\b\s*[:#-]?\s*([^\n]+)"])
    pincode = first_group(text, [r"\bpincode\b\s*[:#-]?\s*([0-9]{6})"])
    payment_method = first_group(
        text,
        [r"\bpayment\s*method\b\s*[:#-]?\s*([^\n]+)"],
    )
    currency = "INR" if ("INR" in text or "₹" in text) else "INR"

    warnings: list[str] = []
    if order_id is None:
        warnings.append("order id missing")
    if restaurant_name is None:
        restaurant_name = infer_restaurant_name(lines)
    if payment_method is None:
        payment_method = infer_payment_method(text)

    address = area.strip() if area else None
    if address and pincode:
        address = f"{address} {pincode}".strip()

    return (
        PdfExtractionFields(
            orderId=order_id,
            totalAmount=total_amount,
            currency=currency,
            transactionDate=None,
            items=[],
            taxes=PdfExtractionTaxes(),
            delivery=PdfExtractionDelivery(
                address=address,
                pincode=pincode,
                fee=None,
            ),
            paymentMethod=payment_method,
            restaurantName=restaurant_name,
        ),
        warnings,
    )


def first_group(text: str, patterns: list[str]) -> str | None:
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            value = match.group(1).strip()
            if value:
                return value
    return None


def first_number(text: str, patterns: list[str]) -> float | None:
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                continue
    return None


def infer_total_amount(text: str) -> float | None:
    explicit = first_labelled_number(
        text,
        [
            "amount paid",
            "total paid",
            "grand total",
            "order total",
            "final amount",
            "paid",
        ],
    )
    if explicit is not None:
        return explicit

    invoice_values = labelled_numbers(text, ["invoice value"])
    invoice_totals = labelled_numbers(text, ["invoice total"])

    if invoice_values and invoice_totals and re.search(
        r"\bhandling\s+fees?\s+for\s+order\b", text, re.IGNORECASE
    ):
        primary_invoice = max(invoice_values)
        service_invoice = max(
            (value for value in invoice_totals if value < primary_invoice),
            default=max(invoice_totals),
        )
        return round(primary_invoice + service_invoice, 2)

    if invoice_values:
        return max(invoice_values)

    if invoice_totals:
        return max(invoice_totals)

    return first_number(
        text,
        [
            r"\btotal\b\s*[:#-]?\s*(?:INR|Rs\.?|₹)?\s*([0-9]+(?:\.[0-9]{1,2})?)",
            r"\bamount\s*paid\b\s*[:#-]?\s*(?:INR|Rs\.?|₹)?\s*([0-9]+(?:\.[0-9]{1,2})?)",
            r"\bpaid\b\s*[:#-]?\s*(?:INR|Rs\.?|₹)?\s*([0-9]+(?:\.[0-9]{1,2})?)",
        ],
    )


def first_labelled_number(text: str, labels: list[str]) -> float | None:
    values = labelled_numbers(text, labels)
    return values[0] if values else None


def labelled_numbers(text: str, labels: list[str]) -> list[float]:
    values: list[float] = []
    for label in labels:
        label_pattern = r"\s+".join(re.escape(part) for part in label.split())
        pattern = (
            rf"\b{label_pattern}\b\s*[:#-]?\s*"
            rf"(?:INR|Rs\.?|₹)?\s*([0-9]+(?:\.[0-9]{{1,2}})?)"
        )
        for match in re.finditer(pattern, text, re.IGNORECASE):
            try:
                value = float(match.group(1))
            except ValueError:
                continue
            if not any(abs(existing - value) < 0.005 for existing in values):
                values.append(value)
    return values


def infer_restaurant_name(lines: list[str]) -> str | None:
    for line in lines:
        lowered = line.lower()
        if "swiggy" in lowered or "invoice" in lowered:
            continue
        if lowered.startswith("amount in words"):
            continue
        if lowered.startswith("discounts mentioned"):
            continue
        if lowered.startswith("disclaimer"):
            continue
        if lowered in {"tax invoice", "invoice to:", "customer"}:
            continue
        if lowered.startswith("order ") or lowered.startswith("total"):
            continue
        if lowered.startswith("payment ") or lowered.startswith("area"):
            continue
        if lowered.startswith("pincode"):
            continue
        return line
    return None


def infer_payment_method(text: str) -> str | None:
    match = re.search(r"\b(UPI|CREDIT CARD|DEBIT CARD|CARD|CASH)\b", text, re.IGNORECASE)
    if not match:
        return None
    return match.group(1).upper()


def compute_confidence(fields: PdfExtractionFields, warnings: list[str]) -> float:
    score = 0.45
    if fields.totalAmount is not None:
        score += 0.35
    if fields.orderId:
        score += 0.1
    if fields.restaurantName:
        score += 0.05
    if fields.paymentMethod:
        score += 0.05
    if warnings:
        score -= 0.15 * len(warnings)
    return max(0.1, min(0.99, round(score, 2)))
