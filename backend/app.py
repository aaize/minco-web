"""Minco backend — Flask + SQLite (stdlib sqlite3, no ORM).

Run:  python app.py   (from backend/)
API:  http://127.0.0.1:5000/api/...
Also serves the frontend at http://127.0.0.1:5000/ for convenience.
"""
import os
import re
import secrets
import sqlite3
import time
from functools import wraps

from flask import Flask, g, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.dirname(BASE_DIR)  # Minco-Web/
DB_PATH = os.path.join(BASE_DIR, os.environ.get("DATABASE", "minco.db"))

app = Flask(__name__, static_folder=os.path.join(WEB_DIR, "assets"), static_url_path="/assets")
CORS(app, supports_credentials=True)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")
COMMUNITIES = {"calm", "sleep", "stress", "wins"}


# ---------------- db ----------------
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_exc=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          name TEXT NOT NULL,
          community TEXT NOT NULL DEFAULT 'calm',
          tag TEXT NOT NULL DEFAULT 'Shared',
          text TEXT NOT NULL,
          image TEXT,
          ups INTEGER NOT NULL DEFAULT 1,
          downs INTEGER NOT NULL DEFAULT 0,
          loves INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS votes (
          post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          value INTEGER NOT NULL,
          PRIMARY KEY (post_id, user_id)
        );
        CREATE TABLE IF NOT EXISTS loves (
          post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          PRIMARY KEY (post_id, user_id)
        );
        CREATE TABLE IF NOT EXISTS replies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          name TEXT NOT NULL,
          text TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
        """
    )
    db.commit()

    # Seed demo user + starter posts (mirrors the old localStorage demo)
    now = int(time.time() * 1000)
    cur = db.execute("SELECT id FROM users WHERE email = ?", ("demo@minco.app",))
    demo = cur.fetchone()
    if not demo:
        db.execute(
            "INSERT INTO users (name, email, password_hash, created_at) VALUES (?,?,?,?)",
            ("Demo Member", "demo@minco.app", generate_password_hash("minco123"), now),
        )
        db.commit()
    if db.execute("SELECT COUNT(*) c FROM posts").fetchone()["c"] == 0:
        seeds = [
            ("Ama", "stress", "Support",
             "Today felt heavy, but reading everyone's kind words here helped me breathe a little easier.",
             None, 26, 2, 24),
            ("Jordan", "sleep", "Sleep",
             "Small win: phone away 30 min before bed. My calm corner tonight. What helps you wind down?",
             None, 18, 1, 12),
            ("Rae", "wins", "Win",
             "Got out for a 10-minute walk even though I didn't feel like it. Proud of that.",
             None, 42, 3, 35),
            ("Minco Team", "calm", "Welcome",
             "Welcome to Minco. Be kind, no medical advice, and it's always okay to just read quietly.",
             None, 55, 2, 48),
        ]
        for i, (name, comm, tag, text, img, ups, downs, loves) in enumerate(seeds):
            db.execute(
                "INSERT INTO posts (user_id, name, community, tag, text, image, ups, downs, loves, created_at)"
                " VALUES (NULL,?,?,?,?,?,?,?, ?,?)",
                (name, comm, tag, text, img, ups, downs, loves, now - (i + 2) * 3600 * 1000),
            )
        db.execute(
            "INSERT INTO replies (post_id, user_id, name, text, created_at) VALUES (1, NULL, ?, ?, ?)",
            ("Jordan", "Holding space for you. One breath at a time.", now - 3600 * 1000),
        )
        db.commit()
    db.close()


def public_user(row):
    return {"id": row["id"], "name": row["name"], "email": row["email"]}


def auth_user(optional=False):
    """Return user row from Bearer token, or None. Aborts 401 unless optional."""
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else None
    if not token:
        if optional:
            return None
        return None, jsonify({"error": "Login required"}), 401
    db = get_db()
    sess = db.execute("SELECT user_id FROM sessions WHERE token = ?", (token,)).fetchone()
    if not sess:
        if optional:
            return None
        return None, jsonify({"error": "Invalid or expired session"}), 401
    user = db.execute("SELECT * FROM users WHERE id = ?", (sess["user_id"],)).fetchone()
    if not user:
        if optional:
            return None
        return None, jsonify({"error": "User not found"}), 401
    return user


def require_auth(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        res = auth_user()
        if isinstance(res, tuple):  # error response
            return res[1], res[2]
        g.user = res
        return fn(*a, **kw)

    return wrapper


def post_to_dict(p, viewer_id=None):
    db = get_db()
    replies = [
        dict(id=r["id"], name=r["name"], text=r["text"],
             time=time_ago(r["created_at"]), ts=r["created_at"])
        for r in db.execute(
            "SELECT * FROM replies WHERE post_id = ? ORDER BY created_at ASC", (p["id"],)
        ).fetchall()
    ]
    user_vote, loved = 0, False
    if viewer_id:
        v = db.execute(
            "SELECT value FROM votes WHERE post_id = ? AND user_id = ?", (p["id"], viewer_id)
        ).fetchone()
        user_vote = v["value"] if v else 0
        loved = (
            db.execute(
                "SELECT 1 FROM loves WHERE post_id = ? AND user_id = ?", (p["id"], viewer_id)
            ).fetchone()
            is not None
        )
    return {
        "id": p["id"], "name": p["name"], "community": p["community"], "tag": p["tag"],
        "text": p["text"], "image": p["image"], "ups": p["ups"], "downs": p["downs"],
        "loves": p["loves"], "userVote": user_vote, "loved": loved,
        "time": time_ago(p["created_at"]), "ts": p["created_at"], "replies": replies,
    }


def time_ago(ts_ms):
    m = max(0, int((int(time.time() * 1000) - ts_ms) / 60000))
    if m < 1:
        return "Just now"
    if m < 60:
        return f"{m}m ago"
    h = m // 60
    if h < 24:
        return f"{h}h ago"
    return f"{h // 24}d ago"


# ---------------- chat engine (offline rules; swap for LLM later) ----------------
def chat_reply(message: str):
    t = (message or "").lower()

    def has(*words):
        return any(w in t for w in words)

    if has("suicide", "kill myself", "end my life", "don't want to live", "dont want to live",
           "want to die", "self-harm", "self harm", "hurt myself", "cutting myself"):
        return (True,
            "I'm really glad you told me — that sounds incredibly heavy, and you deserve real support right now.\n\n"
            "I'm just a demo helper, not a professional, and I can't help in a crisis. Please reach out right now:\n"
            "• Call your local emergency number, or\n"
            "• Contact a crisis helpline (US: 988, UK: Samaritans 116 123)\n\n"
            "If you can, stay with someone you trust. You matter, and help is available 24/7.")
    if has("panic attack", "can't breathe", "cant breathe", "hyperventilat"):
        return (False,
            "That sounds frightening — let's slow down together.\n\n"
            "Breathe in 4 counts, hold 4, out slowly for 6. Repeat 4 times. "
            "Plant your feet; name 3 things you see, 2 you hear, 1 you touch.\n\n"
            "If this happens often, please talk to a doctor or counsellor.")
    if has("sleep", "insomnia", "can't sleep", "cant sleep", "awake", "nightmare", "tired", "exhausted"):
        return (False,
            "Sleep struggles are exhausting — you're not alone.\n\n"
            "Ideas: same wind-down nightly, screens off 30 min before bed, dim lights + calm routine. "
            "If awake >20 min, get up briefly then retry. Short early naps only.\n\n"
            "What's hardest — falling asleep, staying asleep, or racing thoughts?")
    if has("stress", "anxious", "anxiety", "overwhelm", "worried", "worry", "pressure", "burnout", "burnt out"):
        return (False,
            "That heavy, buzzing feeling makes sense.\n\n"
            "Try a 2-min brain-dump of everything swirling, circle ONE tiny 5–10 min next step, "
            "do it, then breathe. The 4-4-6 breathing on the Break page helps too.\n\n"
            "What's weighing on you most today?")
    if has("lonely", "alone", "isolated", "no friends", "nobody", "sad", "down", "depress", "cry", "crying", "empty"):
        return (False,
            "I'm sorry it feels like that. Your feelings are valid, and this feeling can shift.\n\n"
            "Small steps: share one honest post, reply to someone in c/calm, or step out for 5 min of daylight.\n\n"
            "What's been the hardest part of today?")
    if has("motivat", "lazy", "procrastinat", "focus", "concentrat", "study", "work", "give up", "stuck"):
        return (False,
            "Low motivation is usually tiredness or overwhelm, not laziness.\n\n"
            "Try the 5-minute trick: pick something tiny, set a 5-min timer, start — stopping after is allowed.\n\n"
            "What's one tiny thing you'd feel good having done today?")
    if has("breath", "calm me", "relax", "meditat", "grounding", "overthink"):
        return (False,
            "Let's do 60 seconds together: breathe in… 2… 3… 4… hold… out… 2… 3… 4… 5… 6…\n"
            "Again — let your shoulders drop as you breathe out. Notice your feet, one sound near you.\n\n"
            "How do you feel after that round?")
    if has("thank", "thanks", "helpful", "better"):
        return (False, "You're so welcome. Glad that helped a little. I'm here whenever you need. 💜")
    if has("hello", "hi", "hey", "yo", "morning", "evening"):
        return (False,
            "Hey, glad you're here. I'm Minco Helper — a wellness companion (not a professional).\n\n"
            "I can share ideas for sleep, stress, low mood, or motivation — or just listen. What's on your mind?")
    if has("who are you", "what are you", "what can you", "help me", "what do you do"):
        return (False,
            "I'm Minco Helper — I share sleep wind-down ideas, stress resets, small motivation steps, "
            "and 1-minute calming breaths. Peer support, not medical care. What would help most?")
    if has("food", "eat", "appetite", "exercise", "headache", "sick", "pain", "medicat", "pill", "drug", "diagnos", "therapy"):
        return (False,
            "Body stuff affects mood a lot, and I need to be careful: I'm not qualified for medical, "
            "nutrition, or medication advice. Please check with a doctor or pharmacist.\n\n"
            "I can listen or share general comfort ideas. What's hardest about this?")
    return (False,
        "Thanks for trusting me with that. I give the best ideas on sleep, stress, low mood, and motivation — "
        "could you tell me which feels closest right now?")


# ---------------- api ----------------
@app.get("/api/health")
def health():
    return jsonify({"ok": True, "ai": os.environ.get("AI_PROVIDER", "") or "offline-rules"})


@app.post("/api/register")
def register():
    data = request.get_json(force=True, silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not (2 <= len(name) <= 30):
        return jsonify({"error": "Display name must be 2–30 characters."}), 400
    if not EMAIL_RE.match(email):
        return jsonify({"error": "Enter a valid email address."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password needs at least 6 characters."}), 400
    db = get_db()
    if db.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
        return jsonify({"error": "That email is already registered. Try logging in."}), 409
    cur = db.execute(
        "INSERT INTO users (name, email, password_hash, created_at) VALUES (?,?,?,?)",
        (name, email, generate_password_hash(password), int(time.time() * 1000)),
    )
    user = db.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
    token = secrets.token_urlsafe(32)
    db.execute("INSERT INTO sessions (token, user_id, created_at) VALUES (?,?,?)",
               (token, user["id"], int(time.time() * 1000)))
    db.commit()
    return jsonify({"user": public_user(user), "token": token}), 201


@app.post("/api/login")
def login():
    data = request.get_json(force=True, silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "That email/password didn't match."}), 401
    token = secrets.token_urlsafe(32)
    db.execute("INSERT INTO sessions (token, user_id, created_at) VALUES (?,?,?)",
               (token, user["id"], int(time.time() * 1000)))
    db.commit()
    return jsonify({"user": public_user(user), "token": token})


@app.get("/api/me")
@require_auth
def me():
    return jsonify({"user": public_user(g.user)})


@app.post("/api/logout")
@require_auth
def logout():
    auth = request.headers.get("Authorization", "")
    get_db().execute("DELETE FROM sessions WHERE token = ?", (auth[7:],))
    get_db().commit()
    return jsonify({"ok": True})


@app.get("/api/posts")
def list_posts():
    viewer = auth_user(optional=True)
    viewer_id = viewer["id"] if viewer else None
    community = (request.args.get("community") or "all").lower()
    q = (request.args.get("q") or "").lower().strip()
    sort = (request.args.get("sort") or "hot").lower()
    db = get_db()
    rows = db.execute("SELECT * FROM posts ORDER BY created_at DESC LIMIT 200").fetchall()
    posts = [post_to_dict(p, viewer_id) for p in rows]
    if community != "all":
        posts = [p for p in posts if p["community"] == community]
    if q:
        words = q.split()
        posts = [p for p in posts if all(
            w in (p["text"] + " " + p["name"] + " " + p["community"] + " " + p["tag"] + " " +
                  " ".join(r["text"] + " " + r["name"] for r in p["replies"])).lower()
            for w in words)]
    if sort == "new":
        posts.sort(key=lambda p: p["ts"], reverse=True)
    elif sort == "top":
        posts.sort(key=lambda p: (p["ups"] - p["downs"] + p["loves"]), reverse=True)
    else:
        posts.sort(key=lambda p: (p["ups"] - p["downs"] + p["loves"] * 0.5, p["ts"]), reverse=True)
    return jsonify({"posts": posts})


@app.post("/api/posts")
@require_auth
def create_post():
    data = request.get_json(force=True, silent=True) or {}
    text = (data.get("text") or "").strip()[:280]
    community = (data.get("community") or "calm").lower()
    image = (data.get("image") or None)
    if community not in COMMUNITIES:
        return jsonify({"error": "Unknown community."}), 400
    if not text and not image:
        return jsonify({"error": "Write something kind or add an image first."}), 400
    if image and len(image) > 1_500_000:
        return jsonify({"error": "Image too large — pick a smaller one."}), 400
    db = get_db()
    cur = db.execute(
        "INSERT INTO posts (user_id, name, community, tag, text, image, ups, downs, loves, created_at)"
        " VALUES (?,?,?,?,?,?,1,0,0,?)",
        (g.user["id"], g.user["name"], community, "Shared", text or "(shared a photo)",
         image, int(time.time() * 1000)),
    )
    db.execute("INSERT INTO votes (post_id, user_id, value) VALUES (?,?,1)", (cur.lastrowid, g.user["id"]))
    db.commit()
    p = db.execute("SELECT * FROM posts WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify({"post": post_to_dict(p, g.user["id"])}), 201


@app.post("/api/posts/<int:pid>/vote")
@require_auth
def vote(pid):
    data = request.get_json(force=True, silent=True) or {}
    try:
        value = int(data.get("value", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid vote."}), 400
    if value not in (-1, 0, 1):
        return jsonify({"error": "Invalid vote."}), 400
    db = get_db()
    p = db.execute("SELECT * FROM posts WHERE id = ?", (pid,)).fetchone()
    if not p:
        return jsonify({"error": "Post not found."}), 404
    old = db.execute("SELECT value FROM votes WHERE post_id = ? AND user_id = ?",
                     (pid, g.user["id"])).fetchone()
    old_val = old["value"] if old else 0
    if old_val == 1:
        db.execute("UPDATE posts SET ups = ups - 1 WHERE id = ?", (pid,))
    elif old_val == -1:
        db.execute("UPDATE posts SET downs = downs - 1 WHERE id = ?", (pid,))
    if value == 0:
        db.execute("DELETE FROM votes WHERE post_id = ? AND user_id = ?", (pid, g.user["id"]))
    else:
        db.execute("INSERT INTO votes (post_id, user_id, value) VALUES (?,?,?)"
                   " ON CONFLICT(post_id, user_id) DO UPDATE SET value=excluded.value",
                   (pid, g.user["id"], value))
        if value == 1:
            db.execute("UPDATE posts SET ups = ups + 1 WHERE id = ?", (pid,))
        else:
            db.execute("UPDATE posts SET downs = downs + 1 WHERE id = ?", (pid,))
    db.commit()
    p = db.execute("SELECT * FROM posts WHERE id = ?", (pid,)).fetchone()
    return jsonify({"post": post_to_dict(p, g.user["id"])})


@app.post("/api/posts/<int:pid>/love")
@require_auth
def love(pid):
    db = get_db()
    p = db.execute("SELECT * FROM posts WHERE id = ?", (pid,)).fetchone()
    if not p:
        return jsonify({"error": "Post not found."}), 404
    exists = db.execute("SELECT 1 FROM loves WHERE post_id = ? AND user_id = ?",
                        (pid, g.user["id"])).fetchone()
    if exists:
        db.execute("DELETE FROM loves WHERE post_id = ? AND user_id = ?", (pid, g.user["id"]))
        db.execute("UPDATE posts SET loves = loves - 1 WHERE id = ?", (pid,))
    else:
        db.execute("INSERT INTO loves (post_id, user_id) VALUES (?,?)", (pid, g.user["id"]))
        db.execute("UPDATE posts SET loves = loves + 1 WHERE id = ?", (pid,))
    db.commit()
    p = db.execute("SELECT * FROM posts WHERE id = ?", (pid,)).fetchone()
    return jsonify({"post": post_to_dict(p, g.user["id"])})


@app.post("/api/posts/<int:pid>/replies")
@require_auth
def reply(pid):
    data = request.get_json(force=True, silent=True) or {}
    text = (data.get("text") or "").strip()[:200]
    if not text:
        return jsonify({"error": "Reply can't be empty."}), 400
    db = get_db()
    if not db.execute("SELECT 1 FROM posts WHERE id = ?", (pid,)).fetchone():
        return jsonify({"error": "Post not found."}), 404
    db.execute(
        "INSERT INTO replies (post_id, user_id, name, text, created_at) VALUES (?,?,?,?,?)",
        (pid, g.user["id"], g.user["name"], text, int(time.time() * 1000)),
    )
    db.commit()
    p = db.execute("SELECT * FROM posts WHERE id = ?", (pid,)).fetchone()
    return jsonify({"post": post_to_dict(p, g.user["id"])}), 201


@app.post("/api/chat")
def chat():
    data = request.get_json(force=True, silent=True) or {}
    message = (data.get("message") or "").strip()[:500]
    if not message:
        return jsonify({"error": "Message can't be empty."}), 400
    # Later: if AI_PROVIDER set, call OpenAI/Anthropic here and keep crisis check first.
    crisis, text = chat_reply(message)
    return jsonify({"reply": text, "crisis": crisis, "provider": "offline-rules"})


# ---------------- serve frontend (one-command demo) ----------------
@app.get("/")
def serve_index():
    return send_from_directory(WEB_DIR, "index.html")


@app.get("/pages/<path:name>")
def serve_pages(name):
    return send_from_directory(os.path.join(WEB_DIR, "pages"), name)


# Run at import time too (not just `python app.py`), so production
# servers like gunicorn also get an initialised database.
init_db()

if __name__ == "__main__":
    # HOST 0.0.0.0 + $PORT is what hosts like Render expect.
    # Debug stays on for local dev, off in production (RENDER=1 or FLASK_DEBUG=0).
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "5000"))
    debug = os.environ.get("FLASK_DEBUG", "0" if os.environ.get("RENDER") else "1") == "1"
    print(f"Minco backend → http://{host}:{port}  (API at /api/…)")
    app.run(host=host, port=port, debug=debug)
