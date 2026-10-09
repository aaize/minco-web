"""Safety: mute/block filtering, report status, auth/chat rate limits."""
import app as app_module
from conftest import register


def make_post(client, headers, text="safety post"):
    r = client.post("/api/posts", json={"text": text, "community": "calm"},
                    headers=headers)
    assert r.status_code == 201, r.get_json()
    return r.get_json()["post"]


def user_id(client, headers):
    return client.get("/api/me", headers=headers).get_json()["user"]["id"]


def test_mute_unmute_and_validation(client):
    ha, _ = register(client, name="MuA")
    hb, _ = register(client, name="MuB")
    aid = user_id(client, ha)
    ok = client.post("/api/blocks", json={"user_id": aid}, headers=hb)
    assert ok.status_code == 201
    assert ok.get_json()["muted"]["id"] == aid
    # idempotent re-mute, single row listed
    assert client.post("/api/blocks", json={"user_id": aid}, headers=hb).status_code == 201
    listed = client.get("/api/blocks", headers=hb).get_json()["blocked"]
    assert [b["id"] for b in listed] == [aid]
    # can't mute yourself or strangers
    bid = user_id(client, hb)
    assert client.post("/api/blocks", json={"user_id": bid}, headers=hb).status_code == 400
    assert client.post("/api/blocks", json={"user_id": 999999}, headers=hb).status_code == 404
    assert client.get("/api/blocks").status_code == 401
    # unmute restores
    assert client.delete(f"/api/blocks/{aid}", headers=hb).get_json() == {"ok": True}
    assert client.get("/api/blocks", headers=hb).get_json()["blocked"] == []


def test_muted_posts_and_replies_hidden(client):
    ha, _ = register(client, name="HdA")
    hb, _ = register(client, name="HdB")
    hc, _ = register(client, name="HdC")
    pa = make_post(client, ha, text="aaa-visible-test")
    pb = make_post(client, hb, text="bbb-visible-test")
    client.post(f"/api/posts/{pb['id']}/replies", json={"text": "reply-by-aaa"},
                headers=ha)
    aid = user_id(client, ha)
    client.post("/api/blocks", json={"user_id": aid}, headers=hc)
    feed_c = client.get("/api/posts", headers=hc).get_json()["posts"]
    assert not any(p["id"] == pa["id"] for p in feed_c)
    assert any(p["id"] == pb["id"] for p in feed_c)
    got_b = next(p for p in feed_c if p["id"] == pb["id"])
    assert not any(r["text"] == "reply-by-aaa" for r in got_b["replies"])
    # blocker-free viewer still sees everything
    feed_b = client.get("/api/posts", headers=hb).get_json()["posts"]
    assert any(p["id"] == pa["id"] for p in feed_b)
    # saved posts by muted authors are hidden too
    client.post(f"/api/posts/{pa['id']}/save", headers=hc)
    assert client.get("/api/saves", headers=hc).get_json()["posts"] == []
    # authorId exposed for mute/report buttons (null for legacy seed posts)
    assert pa["authorId"] == aid


def test_report_status_lifecycle(client):
    ha, _ = register(client, name="RpS1")
    hb, _ = register(client, name="RpS2")
    p = make_post(client, ha, text="status lifecycle post")
    client.post(f"/api/posts/{p['id']}/report", json={"reason": "spam"}, headers=hb)
    one = client.get("/api/reports/mine", headers=hb).get_json()["reports"][0]
    assert one["postId"] == p["id"] and one["status"] == "received"
    assert one["reportCount"] == 1 and "lifecycle" in one["preview"]
    hc, _ = register(client, name="RpS3")
    client.post(f"/api/posts/{p['id']}/report", json={"reason": "unkind"}, headers=hc)
    two = client.get("/api/reports/mine", headers=hb).get_json()["reports"][0]
    assert two["status"] == "under review" and two["reportCount"] == 2
    # deleting the post marks the report gone instead of vanishing
    assert client.delete(f"/api/posts/{p['id']}", headers=ha).get_json() == {"ok": True}
    gone = client.get("/api/reports/mine", headers=hb).get_json()["reports"][0]
    assert gone["gone"] is True and gone["preview"] == "(post removed)"


def test_rate_limits_429(client, monkeypatch):
    app_module._RATE_BUCKETS.clear()
    monkeypatch.setattr(app_module, "RATE_LIMIT_MAX", 3)
    try:
        hs = []
        for i in range(3):
            h, _ = register(client, name=f"Rl{i}")
            hs.append(h)
        assert len(hs) == 3
        r = client.post("/api/register", json={
            "name": "RlBlocked", "email": "rlblocked@t.co", "password": "secret123",
        })
        assert r.status_code == 429
        assert "Retry-After" in r.headers
        assert "Too many" in r.get_json()["error"]
    finally:
        monkeypatch.setattr(app_module, "RATE_LIMIT_MAX", 120)
        app_module._RATE_BUCKETS.clear()


def test_chat_rate_limit_and_public(client, monkeypatch):
    app_module._RATE_BUCKETS.clear()
    monkeypatch.setattr(app_module, "RATE_LIMIT_MAX", 2)
    try:
        assert client.post("/api/chat", json={"message": "hi"}).status_code == 200
        assert client.post("/api/chat", json={"message": "hi"}).status_code == 200
        limited = client.post("/api/chat", json={"message": "hi"})
        assert limited.status_code == 429
    finally:
        monkeypatch.setattr(app_module, "RATE_LIMIT_MAX", 120)
        app_module._RATE_BUCKETS.clear()
