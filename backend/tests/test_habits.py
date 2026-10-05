"""Habits: create / toggle streaks / privacy / cap / delete."""
from conftest import register


def test_create_and_validation(client):
    h, _ = register(client)
    ok = client.post("/api/habits", json={"title": "10-minute walk", "icon": "🚶"},
                     headers=h)
    assert ok.status_code == 201
    habit = ok.get_json()["habit"]
    assert habit["streak"] == 0 and habit["doneToday"] is False
    assert len(habit["week"]) == 7
    assert client.post("/api/habits", json={"title": "x"}, headers=h).status_code == 400
    assert client.post("/api/habits", json={
        "title": "ok title", "icon": "💩",
    }, headers=h).status_code == 400
    assert client.post("/api/habits", json={"title": "ok title"}).status_code == 401


def test_toggle_and_streak(client):
    h, _ = register(client, name="Hb")
    hid = client.post("/api/habits", json={"title": "read a page"},
                      headers=h).get_json()["habit"]["id"]
    on = client.post(f"/api/habits/{hid}/check", headers=h).get_json()
    assert on["done"] is True
    assert on["habit"]["streak"] == 1 and on["habit"]["doneToday"] is True
    off = client.post(f"/api/habits/{hid}/check", headers=h).get_json()
    assert off["done"] is False and off["habit"]["streak"] == 0


def test_private_to_owner_and_cap(client):
    ha, _ = register(client, name="HbA")
    hb, _ = register(client, name="HbB")
    hid = client.post("/api/habits", json={"title": "mine"},
                      headers=ha).get_json()["habit"]["id"]
    assert client.post(f"/api/habits/{hid}/check", headers=hb).status_code == 404
    assert client.delete(f"/api/habits/{hid}", headers=hb).status_code == 404
    assert client.delete(f"/api/habits/{hid}", headers=ha).get_json() == {"ok": True}
    for i in range(12):
        r = client.post("/api/habits", json={"title": f"habit number {i}"}, headers=ha)
        assert r.status_code == 201, r.get_json()
    assert client.post("/api/habits", json={"title": "one too many"},
                       headers=ha).status_code == 400
    assert client.get("/api/habits").status_code == 401
