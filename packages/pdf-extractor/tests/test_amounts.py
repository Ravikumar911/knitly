from __future__ import annotations

import unittest

from slashcash_pdf_extractor.extractor import parse_swiggy_fields


class AmountParsingTests(unittest.TestCase):
    def test_combines_instamart_goods_and_handling_fee_invoices(self) -> None:
        fields, warnings = parse_swiggy_fields(
            "\n".join(
                [
                    "Amount in words: Two Hundred Ninety Eight Rupees Only",
                    "Seller Name:",
                    "Greenmania Modern Retail Pvt Ltd Begur",
                    "Order ID:",
                    "231062848998537",
                    "Invoice Value",
                    "298",
                    "Invoice Total",
                    "10.62",
                    "Handling Fees for Order 231062848998537",
                    "Pincode:",
                    "560103",
                ],
            ),
        )

        self.assertEqual(fields.orderId, "231062848998537")
        self.assertEqual(fields.totalAmount, 308.62)
        self.assertEqual(
            fields.restaurantName, "Greenmania Modern Retail Pvt Ltd Begur"
        )
        self.assertEqual(warnings, [])


if __name__ == "__main__":
    unittest.main()
