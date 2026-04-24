from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import __version__


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="slashcash_pdf_extractor")
    parser.add_argument("pdf", nargs="?")
    parser.add_argument("--version", action="store_true")
    parser.add_argument("--self-check", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.version:
        print(__version__)
        return 0

    if args.self_check:
        print(json.dumps({"ok": True, "version": __version__}))
        return 0

    if not args.pdf:
        parser.print_usage(sys.stderr)
        return 2

    pdf_path = Path(args.pdf)
    if not pdf_path.exists():
        print(f"File not found: {pdf_path}", file=sys.stderr)
        return 2

    from .extractor import PdfExtractorError, extract_pdf

    try:
        extraction = extract_pdf(pdf_path)
    except FileNotFoundError as error:
        print(str(error), file=sys.stderr)
        return 2
    except PdfExtractorError as error:
        print(str(error), file=sys.stderr)
        return 1
    except Exception as error:  # pragma: no cover - defensive CLI boundary
        print(f"Unexpected extractor failure: {error}", file=sys.stderr)
        return 3

    print(extraction.model_dump_json())
    return 0
