"""The exact field-id schema the frontend's ratio calculator consumes (see
script.js's `fields` arrays and `rasyolar` computation) - the extraction
prompt below must emit JSON keys matching these ids EXACTLY, since the
frontend just does `document.getElementById(fieldId).value = obj[fieldId]`
for each one. Do not rename these - they're the frontend's contract, not
free choice on the backend side.
"""
from __future__ import annotations

# field_id -> plain-English description, used to build the extraction
# prompt so it works regardless of the source document's own language or
# exact line-item naming.
FIELD_DESCRIPTIONS: dict[str, str] = {
    "donenVarliklar": "Total current assets",
    "stoklar": "Inventory / stock",
    "nakit": "Cash and cash equivalents",
    "toplamAktif": "Total assets",
    "kisaVadeliBorclar": "Total current liabilities (short-term debt)",
    "uzunVadeliBorclar": "Total long-term / non-current liabilities",
    "toplamBorclar": "Total liabilities (short-term + long-term debt combined)",
    "ozkaynak": "Total equity / shareholders' equity",
    "netSatislar": "Net sales / net revenue",
    "brutKar": "Gross profit",
    "faaliyetKari": "Operating profit / EBIT",
    "netKar": "Net profit / net income",
    "alacaklar": "Trade accounts receivable",
    "faizGiderleri": "Interest expense",
    "eps": "Earnings per share (EPS), if disclosed",
    "hisseFiyati": "Current share price, if disclosed",
}

FIELD_IDS: list[str] = list(FIELD_DESCRIPTIONS.keys())

_FIELD_LIST_BLOCK = "\n".join(f'- "{k}": {v}' for k, v in FIELD_DESCRIPTIONS.items())

EXTRACTION_INSTRUCTIONS = f"""You are extracting structured financial data from a company balance \
sheet / income statement document (which may be in any language and any layout).

Find values for as many of the following fields as the document actually contains. Use these \
EXACT field-id keys in your JSON output (not translations, not the description text):

{_FIELD_LIST_BLOCK}

Rules:
- Output ONLY a single JSON object, no markdown fences, no commentary before or after it.
- Every value must be a plain number (no currency symbols, no thousands separators, no quotes) \
in whatever the document's base currency unit is (do not divide by 1000 even if the document is \
itself already in thousands - use the numbers as printed).
- If a field is not present in the document, OMIT that key entirely - do not guess, do not \
output 0 for a missing field.
- toplamBorclar (total liabilities) should be short-term + long-term liabilities combined if the \
document states both separately and a combined total isn't explicitly printed - only compute this \
one derived sum; do not derive any other field.
- If the document text is unreadable/garbled/not a financial statement at all, output {{}}."""
