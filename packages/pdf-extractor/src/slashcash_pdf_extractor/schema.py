from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class PdfExtractionItem(BaseModel):
    name: str | None = None
    quantity: float | None = None
    unitPrice: float | None = None
    lineTotal: float | None = None


class PdfExtractionTaxes(BaseModel):
    gst: float | None = None
    serviceCharge: float | None = None


class PdfExtractionDelivery(BaseModel):
    address: str | None = None
    pincode: str | None = None
    fee: float | None = None


class PdfExtractionFields(BaseModel):
    orderId: str | None = None
    totalAmount: float | None = None
    currency: str = "INR"
    transactionDate: str | None = None
    items: list[PdfExtractionItem] = Field(default_factory=list)
    taxes: PdfExtractionTaxes | None = None
    delivery: PdfExtractionDelivery | None = None
    paymentMethod: str | None = None
    restaurantName: str | None = None


class PdfExtractionRaw(BaseModel):
    pageCount: int | None = None
    tables: list[dict[str, Any]] = Field(default_factory=list)
    text: str = ""


class PdfExtraction(BaseModel):
    schemaVersion: Literal["1"] = "1"
    extractor: str
    extractorVersion: str
    merchant: Literal["swiggy"] = "swiggy"
    confidence: float
    fields: PdfExtractionFields
    warnings: list[str] = Field(default_factory=list)
    raw: PdfExtractionRaw
