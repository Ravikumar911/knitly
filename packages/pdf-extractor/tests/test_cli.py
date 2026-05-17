from __future__ import annotations

import json
import os
import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FIXTURES = Path(__file__).parent / "fixtures"


class CliTests(unittest.TestCase):
    def run_cli(self, *args: str) -> subprocess.CompletedProcess[str]:
        python_path_parts = []
        if os.environ.get("PYTHONPATH"):
            python_path_parts.append(os.environ["PYTHONPATH"])
        python_path_parts.append(str(ROOT / "src"))
        env = {
            **os.environ,
            "PYTHONPATH": os.pathsep.join(python_path_parts),
        }
        return subprocess.run(
            [sys.executable, "-m", "slashcash_pdf_extractor", *args],
            capture_output=True,
            text=True,
            env=env,
            check=False,
        )

    def test_version(self) -> None:
        result = self.run_cli("--version")
        self.assertEqual(result.returncode, 0)
        self.assertTrue(result.stdout.strip())

    def test_missing_file_returns_bad_argv_exit(self) -> None:
        result = self.run_cli(str(FIXTURES / "missing.pdf"))
        self.assertEqual(result.returncode, 2)

    def test_success_returns_json(self) -> None:
        result = self.run_cli(str(FIXTURES / "swiggy-sample.pdf"))
        self.assertEqual(result.returncode, 0)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["merchant"], "swiggy")
        self.assertIn("Total: INR 512.40", payload["raw"]["text"])
        self.assertEqual(payload["schema_version"], "2")
        self.assertEqual(payload["fields"], {})
        self.assertEqual(payload["confidence"], 0)

    def test_email_body_argument_merges_sources(self) -> None:
        body = FIXTURES / "body.txt"
        body.write_text(
            "Order ID: SWG-PDF-1001\nPaid Via UPI ₹512.40\n",
            encoding="utf8",
        )
        try:
            result = self.run_cli(
                str(FIXTURES / "swiggy-sample.pdf"),
                "--email-body",
                str(body),
                "--subject",
                "Your Swiggy order",
            )
        finally:
            body.unlink(missing_ok=True)
        self.assertEqual(result.returncode, 0)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["fields"], {})
        self.assertIn("Total: INR 512.40", payload["raw"]["text"])
