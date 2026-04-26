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

    def test_extracts_multiline_instamart_labels_from_first_tax_invoice(self) -> None:
        result = extract_swiggy_invoice(
            "\n".join(
                [
                    "Amount in words: Four Hundred Eleven Rupees Only",
                    "## TAX INVOICE",
                    "Seller Name:",
                    "Greenmania Modern Retail Pvt Ltd Begur",
                    "Order ID:",
                    "228389492536121",
                    "Invoice No:",
                    "260126IM01400795",
                    "Invoice Value",
                    "411",
                    "Total taxes",
                    "1.26",
                    "Invoice Total",
                    "8.26",
                    "## TAX INVOICE",
                    "Invoice From:",
                    "Swiggy Limited",
                    "Invoice Total",
                    "8.26",
                ]
            ),
            "Your Instamart order was successfully delivered",
        )

        self.assertTrue(result.parse_success)
        self.assertEqual(result.fields.order_id, "228389492536121")
        self.assertEqual(result.fields.invoice_no, "260126IM01400795")
        self.assertEqual(
            result.fields.restaurant_name, "Greenmania Modern Retail Pvt Ltd Begur"
        )
        self.assertEqual(result.fields.invoice_total, 411)
        self.assertEqual(result.fields.tax_total, 1.26)

    def test_total_taxes_is_not_treated_as_invoice_total(self) -> None:
        result = extract_swiggy_invoice(
            "\n".join(
                [
                    "## TAX INVOICE",
                    "Order ID:",
                    "228389492536121",
                    "Total taxes",
                    "1.26",
                ]
            )
        )

        self.assertFalse(result.parse_success)
        self.assertIsNone(result.fields.invoice_total)

    def test_skips_blank_invoice_section_for_later_order_invoice(self) -> None:
        result = extract_swiggy_invoice(
            "\n".join(
                [
                    "## TAX INVOICE",
                    "Customer Address:",
                    "Order ID:",
                    "Document:",
                    "Invoice No:",
                    "Amount in words: Fifty Rupees Eleven Paise Only",
                    "| Sr No | Taxable Value | Total Amount (Rs.) |",
                    "| 1. | 45.71 | 48 |",
                    "## TAX INVOICE",
                    "Order ID:",
                    "234245867495469",
                    "Invoice No:",
                    "260404IMHKL00715",
                    "| Sr No | Description of Goods | Total Amount (Rs.) |",
                    "| 1. | Protein Bar | 193.6 |",
                    "| Invoice Value | Invoice Value | 193.6 |",
                    "| Handling Fee (Inclusive of GST) | Handling Fee (Inclusive of GST) | 8.51 |",
                    "| | | 202.11 |",
                    "Amount in words: Two Hundred Two Rupees Eleven Paise Only",
                ]
            )
        )

        self.assertTrue(result.parse_success)
        self.assertEqual(result.fields.order_id, "234245867495469")
        self.assertEqual(result.fields.invoice_no, "260404IMHKL00715")
        self.assertEqual(result.fields.invoice_total, 202.11)
