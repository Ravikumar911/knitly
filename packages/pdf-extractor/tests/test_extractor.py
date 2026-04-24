from __future__ import annotations

import unittest
from pathlib import Path

from slashcash_pdf_extractor.extractor import extract_pdf


FIXTURES = Path(__file__).parent / "fixtures"


class ExtractorTests(unittest.TestCase):
    def test_extracts_raw_text_from_swiggy_fixture(self) -> None:
        result = extract_pdf(FIXTURES / "swiggy-sample.pdf")

        self.assertEqual(result.merchant, "swiggy")
        self.assertIn("Order ID: SWG-PDF-1001", result.raw.text)
        self.assertIn("Total: INR 512.40", result.raw.text)
        self.assertIsNone(result.fields.orderId)
        self.assertIsNone(result.fields.totalAmount)

    def test_extracts_raw_text_from_non_transaction_fixture(self) -> None:
        result = extract_pdf(FIXTURES / "newsletter.pdf")

        self.assertEqual(result.merchant, "swiggy")
        self.assertIn("Local newsletter", result.raw.text)
        self.assertIsNone(result.fields.totalAmount)
