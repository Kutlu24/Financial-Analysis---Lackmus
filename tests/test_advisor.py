"""Advisor chat: context sanitising, prompt grounding, rate limit, provider
fallback and the HTTP endpoint. LLM calls are faked; no key is needed."""
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from lackmus.advisor import llm, router
from lackmus.advisor.context import (
    MAX_HISTORY,
    AdvisorContext,
    ChatRequest,
    build_system_prompt,
)
from lackmus.api.app import app

CTX = {
    "figures": {"netSatislar": 3_200_000, "ozkaynak": 1_300_000, "evil_key": 1},
    "ratios": [
        {"key": "cariOran", "name": "Current Ratio", "value": 2.02, "display": "2.02", "status": "ok", "note": "Excellent liquidity."},
        {"key": "netKarMarji", "name": "Net Profit Margin", "value": 0.106, "display": "10.6%", "status": "ok", "note": ""},
    ],
    "score": 64,
    "score_label": "Good",
}


def payload(question="What are my biggest risks?", **ctx):
    return {"messages": [{"role": "user", "content": question}], "context": {**CTX, **ctx}}


def test_unknown_figure_keys_are_dropped():
    ctx = AdvisorContext(**CTX)
    assert "evil_key" not in ctx.figures
    assert ctx.figures["netSatislar"] == 3_200_000


def test_prompt_is_grounded_and_carries_the_rules():
    p = build_system_prompt(AdvisorContext(**CTX))
    assert "Current Ratio: 2.02 | ok" in p
    assert "Health score: 64/100 (Good)" in p
    assert "not investment" in p.lower()
    assert "no currency" in p.lower()
    assert p.index("<data>") < p.index("netSatislar=3,200,000") < p.index("</data>")


def test_prompt_includes_periods_and_scenario_when_present():
    ctx = AdvisorContext(
        **CTX,
        periods=[
            {"label": "FY2024", "score": 55, "ratios": {"cariOran": 1.66}},
            {"label": "FY2025", "score": 64, "ratios": {"cariOran": 2.02}},
        ],
        scenario={"levers": {"sales": -15, "gm": 0}, "base_score": 64, "scenario_score": 50, "warnings": ["Cash turns negative"]},
    )
    p = build_system_prompt(ctx)
    assert "FY2024: score=55" in p and "FY2025: score=64" in p
    assert "sales=-15" in p and "gm=" not in p
    assert "64 -> 50" in p and "Cash turns negative" in p


def test_single_period_is_not_a_trend():
    ctx = AdvisorContext(**CTX, periods=[{"label": "FY2025", "score": 64, "ratios": {}}])
    assert "Periods (oldest to newest)" not in build_system_prompt(ctx)


def test_control_characters_are_stripped_from_user_text():
    req = ChatRequest.model_validate(payload("hello\x00\x07 there"))
    assert req.messages[-1].content == "hello there"


def test_history_is_capped_and_last_message_must_be_the_users():
    msgs = [{"role": "user" if i % 2 == 0 else "assistant", "content": f"m{i}"} for i in range(21)]
    req = ChatRequest.model_validate({"messages": msgs, "context": CTX})
    assert len(req.messages) == MAX_HISTORY and req.messages[-1].content == "m20"
    with pytest.raises(ValidationError):
        ChatRequest.model_validate({"messages": [{"role": "assistant", "content": "hi"}], "context": CTX})


def test_oversized_message_rejected():
    with pytest.raises(ValidationError):
        ChatRequest.model_validate(payload("x" * 2001))


def test_rate_limit_window():
    router._hits.clear()
    assert all(router._check_rate("a", now=100.0 + i) for i in range(router.RATE_LIMIT))
    assert not router._check_rate("a", now=150.0)
    assert router._check_rate("b", now=150.0)
    assert router._check_rate("a", now=100.0 + router.RATE_WINDOW_S + 30)  # window slid past the first hits
    router._hits.clear()


def test_provider_fallback_skips_empty_and_failing(monkeypatch):
    def empty(*_): return ""
    def boom(*_): raise TimeoutError
    def ok(*_): return "answer"
    monkeypatch.setattr(llm, "providers", lambda: [("glm", empty), ("x", boom), ("gemini", ok)])
    assert llm.complete("sys", [{"role": "user", "content": "q"}]) == ("answer", "gemini")
    monkeypatch.setattr(llm, "providers", lambda: [("glm", empty), ("x", boom)])
    with pytest.raises(RuntimeError):
        llm.complete("sys", [{"role": "user", "content": "q"}])
    monkeypatch.setattr(llm, "providers", lambda: [])
    with pytest.raises(llm.NoProviderConfigured):
        llm.complete("sys", [])


@pytest.fixture()
def client():
    router._hits.clear()
    yield TestClient(app)
    router._hits.clear()


def test_endpoint_returns_reply_and_sends_grounded_prompt(client, monkeypatch):
    seen = {}

    def fake(system, messages):
        seen["system"], seen["messages"] = system, messages
        return "Liquidity is strong.", "glm"

    monkeypatch.setattr(llm, "providers", lambda: [("glm", None)])
    monkeypatch.setattr(llm, "complete", fake)
    r = client.post("/api/advisor/chat", json=payload())
    assert r.status_code == 200 and r.json() == {"reply": "Liquidity is strong.", "provider": "glm"}
    assert "Current Ratio: 2.02" in seen["system"]
    assert seen["messages"] == [{"role": "user", "content": "What are my biggest risks?"}]


def test_endpoint_503_without_keys_and_422_on_bad_input(client, monkeypatch):
    monkeypatch.setattr(llm, "providers", lambda: [])
    assert client.post("/api/advisor/chat", json=payload()).status_code == 503
    assert client.post("/api/advisor/chat", json={"messages": [], "context": CTX}).status_code == 422


def test_endpoint_429_and_502(client, monkeypatch):
    monkeypatch.setattr(llm, "providers", lambda: [("glm", None)])
    monkeypatch.setattr(llm, "complete", lambda *_: (_ for _ in ()).throw(RuntimeError("down")))
    assert client.post("/api/advisor/chat", json=payload()).status_code == 502
    monkeypatch.setattr(router, "RATE_LIMIT", 0)
    assert client.post("/api/advisor/chat", json=payload()).status_code == 429
