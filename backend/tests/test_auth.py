"""Auth: register / login / session gates."""
from conftest import register


def test_register_ok(client):
    h, email = register(client)
    me = client.get("/api/me", headers=h).get_json()["user"]
    assert me["email"] == email


def test_register_duplicate_email(client):
    h, email = register(client)
    r = client.post("/api/register", json={
        "name": "Dupe", "email": email, "password": "secret123",
    })
    assert r.status_code == 409


def test_register_validation(client):
    assert client.post("/api/register", json={
        "name": "X", "email": "v@t.co", "password": "secret123",
    }).status_code == 400  # name too short
    assert client.post("/api/register", json={
        "name": "Valid", "email": "not-an-email", "password": "secret123",
    }).status_code == 400
    assert client.post("/api/register", json={
        "name": "Valid", "email": "v2@t.co", "password": "123",
    }).status_code == 400  # password too short


def test_login_ok_and_wrong_password(client):
    _, email = register(client, name="Log")
    ok = client.post("/api/login", json={"email": email, "password": "secret123"})
    assert ok.status_code == 200 and ok.get_json()["token"]
    bad = client.post("/api/login", json={"email": email, "password": "nope-nope"})
    assert bad.status_code == 401


def test_me_requires_auth(client):
    assert client.get("/api/me").status_code == 401
    h, _ = register(client)
    assert client.get("/api/me", headers=h).status_code == 200


def test_logout_invalidates_token(client):
    h, _ = register(client)
    assert client.post("/api/logout", headers=h).status_code == 200
    assert client.get("/api/me", headers=h).status_code == 401
