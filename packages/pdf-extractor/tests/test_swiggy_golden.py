from __future__ import annotations

import json
import unittest
from pathlib import Path

from slashcash_pdf_extractor.extractor import extract_pdf


FIXTURES = Path(__file__).parent / "fixtures"


class SwiggyGoldenTests(unittest.TestCase):
    def test_swiggy_sample_matches_golden_fields(self) -> None:
        expected = json.loads(
            (FIXTURES / "swiggy-sample.expected.json").read_text(encoding="utf8")
        )
        result = extract_pdf(FIXTURES / "swiggy-sample.pdf")
        actual = result.fields.model_dump()

        self.assertGreaterEqual(len(actual["items"]), len(expected["items"]))
        actual["items"] = actual["items"][: len(expected["items"])]
        self.assertEqual(actual, expected)
