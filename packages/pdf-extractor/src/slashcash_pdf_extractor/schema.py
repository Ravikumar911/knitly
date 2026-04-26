from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class SwiggyLineItem(BaseModel):
    name: str
    quantity: float | None = None
    unit_price: float | None = None
    amount: float | None = None
    discount: float | None = None
    net_amount: float | None = None
    tax_total: float | None = None


class SwiggyInvoiceFields(BaseModel):
    order_id: str | None = None
    invoice_no: str | None = None
    invoice_date: str | None = None
    restaurant_name: str | None = None
    restaurant_address: str | None = None
    customer_address: str | None = None
    pincode: str | None = None
    invoice_total: float | None = None
    paid_amount: float | None = None
    item_subtotal: float | None = None
    tax_total: float | None = None
    platform_fee: float | None = None
    delivery_fee: float | None = None
    packaging_fee: float | None = None
    discount_total: float | None = None
    payment_method: str | None = None
    service_type: Literal[
        "FOOD_DELIVERY",
        "INSTAMART",
        "GENIE",
        "DINEOUT",
        "UNKNOWN",
    ] = "UNKNOWN"
    items: list[SwiggyLineItem] = Field(default_factory=list)


class PdfExtractionRaw(BaseModel):
    page_count: int | None = None
    tables: list[dict[str, Any]] = Field(default_factory=list)
    text: str = ""
    sources: dict[str, Any] = Field(default_factory=dict)


class SourceQuality(BaseModel):
    kind: Literal["text", "scanned", "empty", "encrypted", "corrupted"]
    page_count: int
    parsers_used: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class PdfExtraction(BaseModel):
    schema_version: Literal["2"] = "2"
    extractor: str
    extractor_version: str
    merchant: Literal["swiggy"] = "swiggy"
    confidence: float
    fields: SwiggyInvoiceFields
    raw: PdfExtractionRaw
    source_quality: SourceQuality
