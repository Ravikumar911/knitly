from __future__ import annotations

import unittest

from slashcash_pdf_extractor.swiggy import (
    extract_swiggy_body,
    extract_swiggy_invoice,
    merge_swiggy_sources,
)


class SwiggyParserTests(unittest.TestCase):
    def test_extracts_simple_invoice_fields(self) -> None:
        result = extract_swiggy_invoice(
            "\n".join(
                [
                    "Swiggy Invoice",
                    "Order ID: SWG-PDF-1001",
                    "Restaurant: Millet Bowl Co",
                    "Total: INR 512.40",
                    "Payment Method: UPI",
                    "Pincode: 560038",
                ]
            )
        )

        self.assertTrue(result.parse_success)
        self.assertEqual(result.fields.order_id, "SWG-PDF-1001")
        self.assertEqual(result.fields.invoice_total, 512.4)
        self.assertEqual(result.fields.restaurant_name, "Millet Bowl Co")

    def test_body_wins_for_paid_amount_and_payment_method(self) -> None:
        pdf = extract_swiggy_invoice(
            "Order ID: SWG-PDF-1001\nRestaurant: Millet Bowl Co\nTotal: INR 500.00"
        )
        body = extract_swiggy_body(
            "Order ID: SWG-PDF-1001\nPaid Via UPI ₹512.40",
            "Your Swiggy order",
        )

        merged = merge_swiggy_sources(pdf, body)

        self.assertTrue(merged.parse_success)
        self.assertEqual(merged.fields.invoice_total, 500.0)
        self.assertEqual(merged.fields.paid_amount, 512.4)
        self.assertEqual(merged.fields.payment_method, "UPI")
        self.assertTrue(merged.warnings)
