# Financial Compass — Lackmus

A financial ratio analysis tool for evaluating a company's financial statements, with an English-language interface.

🇩🇪 German version: [README.de.md](README.de.md)

## What it does

- Manual entry, CSV/JSON upload, or **document upload** (PDF/image) of a company's balance sheet and income statement.
- Document upload is read by an AI model - text-layer PDFs go through GLM (text extraction), scanned PDFs and plain
  images go through Gemini's vision input (no text layer needed) - and the extracted numbers are dropped straight
  into the same manual-entry fields the calculator already reads. Always double-check AI-extracted numbers against
  the source document before trusting the analysis - the UI says so too.
- Computes standard financial ratios: liquidity (current, acid-test/quick, cash), leverage (debt/equity, financial
  leverage, debt/assets, interest coverage), profitability (gross/operating/net margin, ROE, ROA), activity (asset/
  receivables/inventory turnover), and market (P/E) ratios.
- Multi-tab dashboard: **Dashboard**, **Data Entry**, **Ratio Analysis**, **Charts** (via Chart.js), **Report**, and
  a **Glossary** of the financial terms used.

## Tech stack

**Frontend** (`frontend/`): plain HTML, CSS and vanilla JavaScript - all the ratio math and charting still runs
entirely client-side, unchanged from the original no-backend version. Two libraries loaded from CDN:
[PapaParse](https://www.papaparse.com/) for CSV parsing and [Chart.js](https://www.chartjs.org/) for the
visualisations.

**Backend** (`src/lackmus/`): FastAPI, added solely to support document upload (a browser can't reliably OCR a
scanned PDF or call an LLM with a real API key on its own). Serves the frontend at `/ui` and exposes
`POST /api/extract-balance-sheet`. PDF handling via [PyMuPDF](https://pymupdf.readthedocs.io/) (text extraction and,
for scanned PDFs, rasterizing page 1 to an image - no system dependency like poppler needed).

## Running it

Frontend only, no document upload (original behaviour):
```bash
npx serve frontend
```

With the document-upload backend:
```bash
pip install -e .
uvicorn lackmus.api.app:app --reload
# then open http://127.0.0.1:8000/ui/
```
Needs `GLM_API_KEY` and `GEMINI_API_KEY` in a local `.env` (see `render.yaml` for the expected variable names).

## Relationship to other repositories

Independent project — no shared code or data with the German/French vocabulary trainers elsewhere in this account.
