from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


PdfExtractionFields = dict[str, Any]


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
    fields: PdfExtractionFields = Field(default_factory=dict)
    raw: PdfExtractionRaw
    source_quality: SourceQuality
