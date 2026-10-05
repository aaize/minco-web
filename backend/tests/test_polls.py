"""Polls: attach on create, one vote each (change allowed), cascade on delete."""
from conftest import register


def make_poll_post(client, headers, options=("Tea", "Walk", "Reading")):
    r = client.post("/api/posts", json={
        "text": "Best wind-down?", "community": "sleep", "poll": list(options),
    }, headers=headers)
    assert r.status_code == 201, r.get_json()
    return r.get_json()["post"]


def test_create_with_poll(client):
    h, _ = register(client)
    p = make_poll_post(client, h)
    assert p["poll"]["options"] == ["Tea", "Walk", "Reading"]
    assert p["poll"]["total"] == 0 and p["poll"]["myVote"] == -1


def test_poll_validation(client):
    h, _ = register(client)
    bad = lambda poll: client.post("/api/posts", json={
        "text": "q", "community": "calm", "poll": poll,
    }, headers=h).status_code
    assert bad(["only-one"]) == 400
    assert bad(["Same", "same"]) == 400
    assert bad(["a", "b", "c", "d", "e"]) == 400
    assert bad("not-a-list") == 400


def test_vote_and_change(client):
    ha, _ = register(client, name="PlA")
    hb, _ = register(client, name="PlB")
    p = make_poll_post(client, ha)
    v1 = client.post(f"/api/posts/{p['id']}/poll/vote", json={"option": 0},
                     headers=ha).get_json()["poll"]
    assert v1["votes"] == [1, 0, 0] and v1["myVote"] == 0
    v2 = client.post(f"/api/posts/{p['id']}/poll/vote", json={"option": 1},
                     headers=hb).get_json()["poll"]
    assert v2["total"] == 2
    v3 = client.post(f"/api/posts/{p['id']}/poll/vote", json={"option": 2},
                     headers=ha).get_json()["poll"]
    assert v3["votes"] == [0, 1, 1] and v3["total"] == 2 and v3["myVote"] == 2


def test_vote_errors(client):
    h, _ = register(client)
    p = make_poll_post(client, h)
    assert client.post(f"/api/posts/{p['id']}/poll/vote", json={
        "option": 9,
    }, headers=h).status_code == 400
    assert client.post(f"/api/posts/{p['id']}/poll/vote", json={
        "option": 0,
    }).status_code == 401
    plain = client.post("/api/posts", json={
        "text": "no poll", "community": "calm",
    }, headers=h).get_json()["post"]
    assert client.post(f"/api/posts/{plain['id']}/poll/vote", json={
        "option": 0,
    }, headers=h).status_code == 404
    assert client.post("/api/posts/999999/poll/vote", json={
        "option": 0,
    }, headers=h).status_code == 404


def test_poll_in_feed_and_deleted_with_post(client):
    h, _ = register(client)
    p = make_poll_post(client, h)
    feed = client.get("/api/posts", headers=h).get_json()["posts"]
    assert any(x["id"] == p["id"] and x["poll"]["total"] == 0 for x in feed)
    assert client.delete(f"/api/posts/{p['id']}", headers=h).get_json() == {"ok": True}
