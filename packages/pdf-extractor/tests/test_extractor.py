from __future__ import annotations

import unittest
from pathlib import Path
from unittest.mock import patch

from slashcash_pdf_extractor.extractor import extract_pdf


FIXTURES = Path(__file__).parent / "fixtures"


class ExtractorTests(unittest.TestCase):
    def test_extracts_raw_text_from_swiggy_fixture(self) -> None:
        result = extract_pdf(FIXTURES / "swiggy-sample.pdf")

        self.assertEqual(result.merchant, "swiggy")
        self.assertIn("Order ID: SWG-PDF-1001", result.raw.text)
        self.assertIn("Total: INR 512.40", result.raw.text)
        self.assertEqual(result.schema_version, "2")
        self.assertEqual(result.fields, {})
        self.assertEqual(result.confidence, 0)
        self.assertEqual(result.source_quality.kind, "text")

    def test_extracts_raw_text_from_non_transaction_fixture(self) -> None:
        result = extract_pdf(FIXTURES / "newsletter.pdf")

        self.assertEqual(result.merchant, "swiggy")
        self.assertIn("Local newsletter", result.raw.text)
        self.assertEqual(result.fields, {})
        self.assertEqual(result.source_quality.kind, "text")

    def test_can_skip_docling_for_fast_fixture_proof(self) -> None:
        with patch.dict("os.environ", {"SLASHCASH_PDF_EXTRACTOR_SKIP_DOCLING": "1"}):
            result = extract_pdf(FIXTURES / "swiggy-sample.pdf")

        self.assertIn("Order ID: SWG-PDF-1001", result.raw.text)
        self.assertIn("pdfplumber", result.source_quality.parsers_used)
        self.assertIn(
            "Docling is disabled by environment.",
            result.source_quality.warnings,
        )
