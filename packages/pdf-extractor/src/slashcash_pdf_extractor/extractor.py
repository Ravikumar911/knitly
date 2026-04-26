from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from . import __version__
from .schema import (
    PdfExtraction,
    PdfExtractionRaw,
    SourceQuality,
)
from .swiggy import (
    ParsedSwiggy,
    empty_result,
    extract_swiggy_body,
    extract_swiggy_invoice,
    merge_swiggy_sources,
)

try:
    import fitz
except Exception:  # pragma: no cover - dependency boundary
    fitz = None

try:
    import pdfplumber
except Exception:  # pragma: no cover - dependency boundary
    pdfplumber = None

try:
    import docling as docling_package
    from docling.document_converter import DocumentConverter
except Exception:  # pragma: no cover - optional runtime dependency
    docling_package = None
    DocumentConverter = None


class PdfExtractorError(Exception):
    """Raised when a PDF cannot be classified or converted."""

    def __init__(self, message: str, *, reason: str = "corrupted") -> None:
        super().__init__(message)
        self.reason = reason


@dataclass(frozen=True)
class PdfProbe:
    page_count: int
    is_encrypted: bool
    has_text: bool
    first_page_image_ratio: float


@dataclass
class TextExtractionResult:
    text: str = ""
    tables: list[dict[str, Any]] = field(default_factory=list)
    parsers_used: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def extract_pdf(
    pdf_path: str | Path | None = None,
    *,
    email_body: str | None = None,
    subject: str = "",
) -> PdfExtraction:
    path = Path(pdf_path).expanduser().resolve() if pdf_path else None
    if path is not None and not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")
    if path is not None and path.suffix.lower() != ".pdf":
        raise PdfExtractorError(
            f"Unsupported file type: {path.suffix or '<none>'}",
            reason="corrupted",
        )

    text_result = TextExtractionResult()
    source_quality = SourceQuality(
        kind="empty",
        page_count=0,
        parsers_used=[],
        warnings=[],
    )
    pdf_parse: ParsedSwiggy | None = None

    if path is not None:
        probe = probe_pdf(path)
        source_quality.page_count = probe.page_count

        if probe.is_encrypted:
            text_result.warnings.append("PDF is encrypted and cannot be read.")
            source_quality.kind = "encrypted"
        elif probe.page_count == 0:
            text_result.warnings.append("PDF has no pages.")
            source_quality.kind = "empty"
        elif not probe.has_text:
            source_quality.kind = "scanned"
            text_result.warnings.append(
                "PDF appears image-only; OCR is disabled by default."
            )
            if should_run_ocr():
                text_result = extract_with_ocr(path, probe)
                source_quality.kind = "text" if text_result.text.strip() else "scanned"
        else:
            text_result = extract_text_backed_pdf(path)
            source_quality.kind = "text" if text_result.text.strip() else "empty"

        if text_result.text.strip():
            pdf_parse = extract_swiggy_invoice(text_result.text, subject)
        else:
            pdf_parse = empty_result(
                f"PDF source quality is {source_quality.kind}; no invoice text was available."
            )

    body_parse = (
        extract_swiggy_body(email_body, subject)
        if email_body and email_body.strip()
        else None
    )
    merged = merge_swiggy_sources(pdf_parse, body_parse)

    if path is None and body_parse is not None:
        source_quality.kind = "text"
        source_quality.parsers_used = ["email-body"]
        source_quality.page_count = 0
    else:
        source_quality.parsers_used = text_result.parsers_used
    source_quality.warnings = [*text_result.warnings, *merged.warnings]

    return PdfExtraction(
        extractor="slashcash_pdf_extractor",
        extractor_version=__version__,
        confidence=max(0, min(1, merged.confidence)),
        fields=merged.fields,
        raw=PdfExtractionRaw(
            page_count=source_quality.page_count,
            tables=text_result.tables,
            text=text_result.text,
            sources=merged.sources,
        ),
        source_quality=source_quality,
    )


def probe_pdf(path: Path) -> PdfProbe:
    if fitz is None:
        raise PdfExtractorError("PyMuPDF is not installed.", reason="corrupted")

    try:
        with fitz.open(path) as document:
            page_count = int(document.page_count or 0)
            is_encrypted = bool(getattr(document, "needs_pass", False))
            if is_encrypted or page_count == 0:
                return PdfProbe(
                    page_count=page_count,
                    is_encrypted=is_encrypted,
                    has_text=False,
                    first_page_image_ratio=0,
                )

            has_text = False
            first_page_image_ratio = 0.0
            for index, page in enumerate(document):
                text = page.get_text("text") or ""
                if text.strip():
                    has_text = True
                if index == 0:
                    first_page_image_ratio = image_area_ratio(page)
            return PdfProbe(
                page_count=page_count,
                is_encrypted=False,
                has_text=has_text,
                first_page_image_ratio=first_page_image_ratio,
            )
    except PdfExtractorError:
        raise
    except Exception as error:
        raise PdfExtractorError(
            f"Could not open PDF: {error}",
            reason="corrupted",
        ) from error


def image_area_ratio(page: Any) -> float:
    try:
        page_area = max(float(page.rect.width * page.rect.height), 1.0)
        image_area = 0.0
        for image in page.get_images(full=True):
            rects = page.get_image_rects(image[0])
            image_area += sum(float(rect.width * rect.height) for rect in rects)
        return max(0.0, min(1.0, image_area / page_area))
    except Exception:
        return 0.0


def extract_text_backed_pdf(path: Path) -> TextExtractionResult:
    result = TextExtractionResult()

    docling = extract_with_docling(path)
    if docling.text.strip():
        result.text = docling.text
        result.tables.extend(docling.tables)
        result.parsers_used.extend(docling.parsers_used)
    result.warnings.extend(docling.warnings)

    if usable_character_count(result.text) >= 40:
        return result

    fallback = extract_with_pdfplumber(path)
    if fallback.text.strip():
        result.text = "\n\n".join(
            part for part in [result.text.strip(), fallback.text.strip()] if part
        )
    result.tables.extend(fallback.tables)
    result.parsers_used.extend(fallback.parsers_used)
    result.warnings.extend(fallback.warnings)

    if not result.text.strip():
        pymupdf = extract_with_pymupdf(path)
        result.text = pymupdf.text
        result.tables.extend(pymupdf.tables)
        result.parsers_used.extend(pymupdf.parsers_used)
        result.warnings.extend(pymupdf.warnings)

    result.parsers_used = unique(result.parsers_used)
    result.warnings = unique(result.warnings)
    return result


def extract_with_docling(path: Path) -> TextExtractionResult:
    if docling_package is None or DocumentConverter is None:
        return TextExtractionResult(warnings=["Docling is not installed."])

    try:
        converter = DocumentConverter()
        converted = converter.convert(path)
        document = converted.document
        text_parts: list[str] = []
        for export_name in ("export_to_markdown", "export_to_text"):
            export_fn = getattr(document, export_name, None)
            if callable(export_fn):
                try:
                    value = export_fn()
                except TypeError:
                    value = export_fn(doc=document)
                if isinstance(value, str) and value.strip():
                    text_parts.append(value.strip())

        tables: list[dict[str, Any]] = []
        for index, table in enumerate(getattr(document, "tables", []) or []):
            markdown = ""
            export_fn = getattr(table, "export_to_markdown", None)
            if callable(export_fn):
                try:
                    markdown = export_fn(doc=document)
                except TypeError:
                    markdown = export_fn()
            tables.append({"index": index, "parser": "docling", "markdown": markdown})

        return TextExtractionResult(
            text="\n\n".join(text_parts).strip(),
            tables=tables,
            parsers_used=["docling"],
        )
    except Exception as error:
        return TextExtractionResult(warnings=[f"Docling failed: {error}"])


def extract_with_pdfplumber(path: Path) -> TextExtractionResult:
    if pdfplumber is None:
        return TextExtractionResult(warnings=["pdfplumber is not installed."])

    try:
        text_parts: list[str] = []
        tables: list[dict[str, Any]] = []
        with pdfplumber.open(path) as pdf:
            for page_index, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                if text.strip():
                    text_parts.append(text.strip())
                for table_index, table in enumerate(page.extract_tables() or []):
                    markdown = table_to_markdown(table)
                    tables.append(
                        {
                            "page": page_index + 1,
                            "index": table_index,
                            "parser": "pdfplumber",
                            "markdown": markdown,
                        }
                    )
                    if markdown:
                        text_parts.append(markdown)
        return TextExtractionResult(
            text="\n\n".join(text_parts).strip(),
            tables=tables,
            parsers_used=["pdfplumber"],
        )
    except Exception as error:
        return TextExtractionResult(warnings=[f"pdfplumber failed: {error}"])


def extract_with_pymupdf(path: Path) -> TextExtractionResult:
    if fitz is None:
        return TextExtractionResult(warnings=["PyMuPDF is not installed."])

    try:
        with fitz.open(path) as document:
            text = "\n\n".join(
                page.get_text("text").strip()
                for page in document
                if page.get_text("text").strip()
            )
        return TextExtractionResult(text=text, parsers_used=["pymupdf"])
    except Exception as error:
        return TextExtractionResult(warnings=[f"PyMuPDF text extraction failed: {error}"])


def extract_with_ocr(path: Path, probe: PdfProbe) -> TextExtractionResult:
    return TextExtractionResult(
        warnings=[
            "OCR was requested but OCR dependencies are not bundled in this release.",
            f"firstPageImageRatio={probe.first_page_image_ratio:.2f}",
        ],
    )


def table_to_markdown(table: list[list[Any]]) -> str:
    rows = [
        [normalize_cell(cell) for cell in row]
        for row in table
        if any(normalize_cell(cell) for cell in row)
    ]
    if not rows:
        return ""
    width = max(len(row) for row in rows)
    padded = [row + [""] * (width - len(row)) for row in rows]
    lines = ["| " + " | ".join(row) + " |" for row in padded]
    if len(lines) > 1:
        lines.insert(1, "| " + " | ".join(["---"] * width) + " |")
    return "\n".join(lines)


def normalize_cell(value: Any) -> str:
    return " ".join(str(value or "").split())


def usable_character_count(value: str) -> int:
    return sum(1 for char in value if char.isalnum())


def should_run_ocr() -> bool:
    import os

    return os.environ.get("SLASHCASH_PDF_EXTRACTOR_OCR") == "1"


def unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value and value not in seen:
            result.append(value)
            seen.add(value)
    return result
