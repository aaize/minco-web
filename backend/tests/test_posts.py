"""Posts: create / edit / vote / love / reply / save / report / delete."""
from conftest import register


def make_post(client, headers, text="hello world", community="calm", **kw):
    r = client.post("/api/posts", json={
        "text": text, "community": community, **kw,
    }, headers=headers)
    assert r.status_code == 201, r.get_json()
    return r.get_json()["post"]


def test_create_and_validation(client):
    h, _ = register(client)
    assert make_post(client, h)["text"] == "hello world"
    assert client.post("/api/posts", json={
        "text": "", "community": "calm",
    }, headers=h).status_code == 400
    assert client.post("/api/posts", json={
        "text": "x", "community": "nope",
    }, headers=h).status_code == 400
    assert client.post("/api/posts", json={
        "text": "x", "community": "calm",
    }).status_code == 401


def test_edit_owner_and_forbidden(client):
    ha, _ = register(client, name="EdA")
    hb, _ = register(client, name="EdB")
    p = make_post(client, ha, text="original")
    ok = client.put(f"/api/posts/{p['id']}", json={
        "text": "edited", "community": "sleep",
    }, headers=ha).get_json()["post"]
    assert ok["text"] == "edited" and ok["community"] == "sleep"
    assert client.put(f"/api/posts/{p['id']}", json={
        "text": "hijack",
    }, headers=hb).status_code == 403
    assert client.put(f"/api/posts/{p['id']}", json={
        "text": "   ",
    }, headers=ha).status_code == 400
    assert client.put("/api/posts/999999", json={
        "text": "x",
    }, headers=ha).status_code == 404


def test_vote_toggle(client):
    h, _ = register(client)
    p = make_post(client, h)
    base = p["ups"] - p["downs"]
    # author auto-upvoted at creation; toggling off then on
    off = client.post(f"/api/posts/{p['id']}/vote", json={"value": 0},
                      headers=h).get_json()["post"]
    assert off["ups"] - off["downs"] == base - 1
    on = client.post(f"/api/posts/{p['id']}/vote", json={"value": 1},
                     headers=h).get_json()["post"]
    assert on["userVote"] == 1
    assert client.post(f"/api/posts/{p['id']}/vote", json={
        "value": 5,
    }, headers=h).status_code == 400


def test_love_notifies_author(client):
    ha, _ = register(client, name="LvA")
    hb, _ = register(client, name="LvB")
    p = make_post(client, ha)
    loved = client.post(f"/api/posts/{p['id']}/love", headers=hb).get_json()["post"]
    assert loved["loved"] is True
    notifs = client.get("/api/notifications", headers=ha).get_json()
    assert notifs["unread"] >= 1
    assert any(n["type"] == "love" for n in notifs["notifications"])
    # self-love never notifies
    own = make_post(client, hb)
    client.post(f"/api/posts/{own['id']}/love", headers=hb)
    assert client.get("/api/notifications", headers=hb).get_json()["unread"] == 0


def test_reply_notifies_author(client):
    ha, _ = register(client, name="RpA")
    hb, _ = register(client, name="RpB")
    p = make_post(client, ha)
    r = client.post(f"/api/posts/{p['id']}/replies", json={"text": "holding space"},
                    headers=hb)
    assert r.status_code == 201
    assert any(x["text"] == "holding space" for x in r.get_json()["post"]["replies"])
    assert client.get("/api/notifications", headers=ha).get_json()["unread"] >= 1
    assert client.post(f"/api/posts/{p['id']}/replies", json={
        "text": " ",
    }, headers=hb).status_code == 400


def test_save_toggle_and_report_once(client):
    h, _ = register(client)
    p = make_post(client, h)
    s1 = client.post(f"/api/posts/{p['id']}/save", headers=h).get_json()
    assert s1["saved"] is True
    s2 = client.post(f"/api/posts/{p['id']}/save", headers=h).get_json()
    assert s2["saved"] is False
    r1 = client.post(f"/api/posts/{p['id']}/report",
                     json={"reason": "spam"}, headers=h)
    assert r1.status_code == 201
    r2 = client.post(f"/api/posts/{p['id']}/report",
                     json={"reason": "spam"}, headers=h)
    assert r2.status_code == 409


def test_delete_owner_only(client):
    ha, _ = register(client, name="DlA")
    hb, _ = register(client, name="DlB")
    p = make_post(client, ha)
    assert client.delete(f"/api/posts/{p['id']}", headers=hb).status_code == 403
    assert client.delete(f"/api/posts/{p['id']}", headers=ha).get_json() == {"ok": True}
    assert client.delete(f"/api/posts/{p['id']}", headers=ha).status_code == 404
