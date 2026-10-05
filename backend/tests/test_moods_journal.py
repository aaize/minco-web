"""Moods + journal: private per-account CRUD and validation."""
import datetime

from conftest import register


def test_mood_save_and_future_rejected(client):
    h, _ = register(client)
    ok = client.post("/api/moods", json={"mood": "good", "note": "steady"},
                     headers=h)
    assert ok.status_code == 201
    assert ok.get_json()["mood"]["score"] == 4
    tomorrow = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
    assert client.post("/api/moods", json={"mood": "good", "date": tomorrow},
                       headers=h).status_code == 400
    assert client.post("/api/moods", json={"mood": "ecstatic"},
                       headers=h).status_code == 400
    listed = client.get("/api/moods", headers=h).get_json()
    assert listed["moods"] and listed["weekly"]["count"] >= 1


def test_journal_crud_and_privacy(client):
    ha, _ = register(client, name="JrA")
    hb, _ = register(client, name="JrB")
    created = client.post("/api/journal", json={
        "title": "Today", "text": "private words", "mood": "okay",
    }, headers=ha)
    assert created.status_code == 201
    jid = created.get_json()["entry"]["id"]
    assert client.post("/api/journal", json={"title": "Empty", "text": "  "},
                       headers=ha).status_code == 400
    # other user sees nothing (404, not 403 — no existence leak)
    assert client.get(f"/api/journal/{jid}", headers=hb).status_code == 404
    updated = client.put(f"/api/journal/{jid}", json={
        "title": "Today", "text": "edited words", "mood": "good",
    }, headers=ha).get_json()["entry"]
    assert updated["text"] == "edited words"
    assert client.put(f"/api/journal/{jid}", json={
        "title": "x", "text": "y",
    }, headers=hb).status_code == 404
    assert client.delete(f"/api/journal/{jid}", headers=ha).get_json() == {"ok": True}
    assert client.get("/api/journal", headers=ha).get_json()["entries"] == []
