"""Structured field extraction directly from a page IMAGE (scanned PDF page
or a plain photo/screenshot of a balance sheet, with no usable text layer)
via Gemini's multimodal input - GLM's chat endpoint has no documented image
support, Gemini's does via google-genai's types.Part.from_bytes.
"""
from __future__ import annotations

from ..config import settings
from .fields import EXTRACTION_INSTRUCTIONS
from .text_extract import _clean_fields, _parse_json_object


def extract_from_image(image_bytes: bytes, mime_type: str) -> dict[str, float]:
    from google import genai
    from google.genai import types

    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY not set in .env")
    client = genai.Client(api_key=settings.gemini_api_key)
    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=[image_part, EXTRACTION_INSTRUCTIONS],
    )
    content = response.text or "{}"
    raw = _parse_json_object(content)
    return _clean_fields(raw)
