"""POST /api/advisor/chat: grounded chat about the figures the user entered."""
from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from . import llm
from .context import ChatRequest, build_system_prompt, to_chat_messages

router = APIRouter()

# Free-tier LLM keys sit behind this endpoint, so it is rate limited per client.
RATE_LIMIT = 20
RATE_WINDOW_S = 600
_hits: dict[str, deque[float]] = defaultdict(deque)
_lock = threading.Lock()


def _client_id(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    return fwd.split(",")[0].strip() or (request.client.host if request.client else "unknown")


def _check_rate(client: str, now: float | None = None) -> bool:
    now = time.monotonic() if now is None else now
    with _lock:
        q = _hits[client]
        while q and now - q[0] > RATE_WINDOW_S:
            q.popleft()
        if len(q) >= RATE_LIMIT:
            return False
        q.append(now)
        if len(_hits) > 5000:  # keep the table bounded
            for k in [k for k, v in _hits.items() if not v or now - v[-1] > RATE_WINDOW_S]:
                del _hits[k]
        return True


class ChatResponse(BaseModel):
    reply: str
    provider: str


@router.post("/api/advisor/chat", response_model=ChatResponse)
def chat(req: ChatRequest, request: Request) -> ChatResponse:
    if not llm.providers():
        raise HTTPException(503, "The advisor is not configured on this server (no LLM key).")
    if not _check_rate(_client_id(request)):
        raise HTTPException(429, "Too many questions in a short time. Please wait a few minutes.")
    try:
        reply, provider = llm.complete(build_system_prompt(req.context), to_chat_messages(req))
    except llm.NoProviderConfigured as e:
        raise HTTPException(503, str(e)) from e
    except Exception as e:
        raise HTTPException(502, f"The advisor could not answer right now ({type(e).__name__}).") from e
    return ChatResponse(reply=reply, provider=provider)
