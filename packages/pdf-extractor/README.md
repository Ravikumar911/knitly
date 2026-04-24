# slashcash PDF extractor

This package exposes the Python entrypoint that `packages/tasks/src/extract/pdf-extractor.ts`
spawns for receipt parsing:

```bash
python -m slashcash_pdf_extractor /absolute/path/to/receipt.pdf
```

The Node side validates stdout against the mirrored Zod schema in
`packages/tasks/src/extract/pdf-extractor-schema.ts`.

## Local development

Workspace source mode:

```bash
PYTHONPATH=packages/pdf-extractor/src python -m slashcash_pdf_extractor --version
PYTHONPATH=packages/pdf-extractor/src python -m unittest discover -s packages/pdf-extractor/tests
```

Managed venv mode:

```bash
python3 -m venv ~/.slashcash/py-venv
~/.slashcash/py-venv/bin/pip install -r packages/pdf-extractor/requirements.txt
~/.slashcash/py-venv/bin/python -m slashcash_pdf_extractor --self-check
```
