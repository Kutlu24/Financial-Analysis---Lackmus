"""Structured field extraction from already-readable text (a text-layer PDF)
via GLM - the free-tier text LLM already used elsewhere in this account.
"""
from __future__ import annotations

import json
import re

from ..config import settings
from .fields import EXTRACTION_INSTRUCTIONS, FIELD_IDS

_JSON_BLOCK_RE = re.compile(r"\{.*\}", re.DOTALL)


def _parse_json_object(text: str) -> dict:
    """LLMs sometimes wrap JSON in ```json fences or add stray prose despite
    instructions not to - pull out the first {...} block rather than fail
    outright on a strict json.loads of the raw response."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = _JSON_BLOCK_RE.search(text)
        if not m:
            raise
        return json.loads(m.group(0))


def _clean_fields(raw: dict) -> dict[str, float]:
    out: dict[str, float] = {}
    for key in FIELD_IDS:
        if key not in raw:
            continue
        try:
            out[key] = float(raw[key])
        except (TypeError, ValueError):
            continue  # a non-numeric value from the model - drop it, don't crash the request
    return out


def extract_from_text(document_text: str) -> dict[str, float]:
    from openai import OpenAI

    if not settings.glm_api_key:
        raise RuntimeError("GLM_API_KEY not set in .env")
    client = OpenAI(api_key=settings.glm_api_key, base_url=settings.glm_base_url)
    response = client.chat.completions.create(
        model=settings.glm_model,
        messages=[
            {"role": "system", "content": EXTRACTION_INSTRUCTIONS},
            {"role": "user", "content": f"Document text:\n\n{document_text[:20000]}"},
        ],
    )
    content = response.choices[0].message.content or "{}"
    raw = _parse_json_object(content)
    return _clean_fields(raw)
