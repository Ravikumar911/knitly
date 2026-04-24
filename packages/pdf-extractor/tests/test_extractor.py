from __future__ import annotations

import unittest
from pathlib import Path

from slashcash_pdf_extractor.extractor import PdfExtractorError, extract_pdf


FIXTURES = Path(__file__).parent / "fixtures"


class ExtractorTests(unittest.TestCase):
    def test_extracts_amount_and_order_id_from_swiggy_fixture(self) -> None:
        result = extract_pdf(FIXTURES / "swiggy-sample.pdf")

        self.assertEqual(result.merchant, "swiggy")
        self.assertEqual(result.fields.orderId, "SWG-PDF-1001")
        self.assertEqual(result.fields.totalAmount, 512.40)
        self.assertEqual(result.fields.paymentMethod, "UPI")
        self.assertEqual(result.fields.delivery.pincode, "560038")

    def test_rejects_non_transaction_fixture(self) -> None:
        with self.assertRaises(PdfExtractorError):
            extract_pdf(FIXTURES / "newsletter.pdf")
