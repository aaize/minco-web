"""Shared pytest fixtures: isolated temp SQLite DB + test client.

DATABASE is set before importing app, so init_db() seeds a throwaway file.
Each test registers unique users (counter-suffixed emails) to stay isolated.
"""
import itertools
import os
import sys
import tempfile

import pytest

_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
os.environ["DATABASE"] = _tmp.name
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app as app_module  # noqa: E402


@pytest.fixture()
def client():
    app_module.app.config["TESTING"] = True
    with app_module.app.test_client() as c:
        yield c


_counter = itertools.count()


def register(client, name="T"):
    """Register a fresh user; return (auth_headers, email)."""
    i = next(_counter)
    email = f"t{i}@t.co"
    r = client.post("/api/register", json={
        "name": f"{name}{i}", "email": email, "password": "secret123",
    })
    assert r.status_code == 201, r.get_json()
    token = r.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}, email
