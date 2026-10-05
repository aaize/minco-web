"""Meta: health, wellness, support, chat, stats, security headers, PWA routes."""
from conftest import register


def test_health_and_wellness(client):
    assert client.get("/api/health").get_json()["ok"] is True
    daily = client.get("/api/wellness/daily").get_json()
    assert daily["affirmation"] and daily["breathing"] and daily["tip"]
    assert daily["gratitude"]
    support = client.get("/api/support").get_json()
    assert any("988" in str(c) for c in support["crisis"])


def test_chat_crisis_and_intents(client):
    crisis = client.post("/api/chat", json={"message": "I want to end my life"}).get_json()
    assert crisis["crisis"] is True
    assert "988" in crisis["reply"] and "116 123" in crisis["reply"]
    for msg, needle in [
        ("I cant sleep at night", "wind-down"),
        ("so stressed and overwhelmed", "brain-dump"),
        ("feeling lonely and sad", "valid"),
        ("no motivation to study", "5-minute"),
    ]:
        reply = client.post("/api/chat", json={"message": msg}).get_json()
        assert reply["crisis"] is False
        assert needle in reply["reply"], (msg, reply["reply"][:80])
    assert client.post("/api/chat", json={"message": "   "}).status_code == 400
    assert client.post("/api/chat", json={"message": "x" * 600}).status_code == 200


def test_stats_me_and_community(client):
    h, _ = register(client)
    me = client.get("/api/stats/me", headers=h).get_json()
    assert {"posts", "karma", "streakDays"} <= set(me)
    community = client.get("/api/stats/community").get_json()
    assert community["posts"] >= 4  # seeded starter posts
    assert client.get("/api/stats/me").status_code == 401


def test_security_headers_and_pwa_routes(client):
    for path in ["/", "/index.html", "/api/health", "/api/support"]:
        r = client.get(path)
        assert r.status_code == 200, path
        assert r.headers["X-Content-Type-Options"] == "nosniff"
        assert r.headers["X-Frame-Options"] == "SAMEORIGIN"
        assert "youtube" in r.headers["Content-Security-Policy"].lower()
    sw = client.get("/sw.js")
    assert sw.status_code == 200 and sw.mimetype == "application/javascript"
    mf = client.get("/manifest.webmanifest")
    assert mf.status_code == 200 and mf.mimetype == "application/manifest+json"
    assert mf.get_json()["short_name"] == "Minco"
    assert client.get("/pages/habits.html").status_code == 200
