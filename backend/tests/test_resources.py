"""Resources: share / save toggle / ratings / filters / delete."""
from conftest import register


def make_resource(client, headers, title="Test guide"):
    r = client.post("/api/resources", json={
        "kind": "article", "topic": "calm", "title": title,
        "url": "https://example.com/a", "description": "nice",
    }, headers=headers)
    assert r.status_code == 201, r.get_json()
    return r.get_json()["resource"]


def test_share_validation(client):
    h, _ = register(client)
    assert make_resource(client, h)["saves"] == 0
    assert client.post("/api/resources", json={
        "kind": "article", "topic": "calm", "title": "x", "url": "https://e.com",
    }, headers=h).status_code == 400
    assert client.post("/api/resources", json={
        "kind": "article", "topic": "calm", "title": "Valid title",
        "url": "not-a-url",
    }, headers=h).status_code == 400


def test_save_toggle(client):
    h, _ = register(client)
    rid = make_resource(client, h)["id"]
    assert client.post(f"/api/resources/{rid}/save", headers=h).get_json()["saved"] is True
    assert client.post(f"/api/resources/{rid}/save", headers=h).get_json()["saved"] is False
    assert client.post("/api/resources/999999/save", headers=h).status_code == 404


def test_ratings_average_and_clear(client):
    ha, _ = register(client, name="RsA")
    hb, _ = register(client, name="RsB")
    rid = make_resource(client, ha)["id"]
    assert client.post(f"/api/resources/{rid}/rate", json={"stars": 5},
                       headers=ha).get_json()["resource"]["ratingAvg"] == 5.0
    res = client.post(f"/api/resources/{rid}/rate", json={"stars": 3},
                      headers=hb).get_json()["resource"]
    assert res["ratingAvg"] == 4.0 and res["ratingCount"] == 2 and res["myRating"] == 3
    assert client.post(f"/api/resources/{rid}/rate", json={
        "stars": 9,
    }, headers=ha).status_code == 400
    cleared = client.post(f"/api/resources/{rid}/rate", json={"stars": 0},
                          headers=hb).get_json()["resource"]
    assert cleared["ratingCount"] == 1 and cleared["myRating"] == 0


def test_saved_filter_sort_and_delete(client):
    ha, _ = register(client, name="RsC")
    hb, _ = register(client, name="RsD")
    rid = make_resource(client, ha)["id"]
    client.post(f"/api/resources/{rid}/save", headers=hb)
    mine = client.get("/api/resources?saved=1", headers=hb).get_json()["resources"]
    assert any(r["id"] == rid for r in mine)
    not_mine = client.get("/api/resources?saved=1", headers=ha).get_json()["resources"]
    assert not any(r["id"] == rid for r in not_mine)
    assert client.get("/api/resources?saved=1").status_code == 401
    assert client.get("/api/resources?sort=top", headers=ha).status_code == 200
    other = make_resource(client, hb, title="Other")
    assert client.delete(f"/api/resources/{other['id']}", headers=ha).status_code == 403
    assert client.delete(f"/api/resources/{rid}", headers=ha).get_json() == {"ok": True}
