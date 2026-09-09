// ==========================================================
// meetings.js — awareness meetings board.
// Backend-first (Flask /api/meetings) with localStorage fallback.
// ==========================================================

const SESSION_KEY = "minco_session";
const MEETINGS_KEY = "minco_meetings_v1";

const session = (() => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
})();
if (!session) window.location.replace("login.html");

const API = () => window.MincoAPI;
let useBackend = false;
let meetings = [];

const esc = (s = "") =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------- storage ----------
const getLocal = () => {
  try { return JSON.parse(localStorage.getItem(MEETINGS_KEY)) || []; }
  catch { return []; }
};
const saveLocal = (m) => localStorage.setItem(MEETINGS_KEY, JSON.stringify(m));

async function initBackend() {
  try {
    if (!API() || !API().getToken()) return false;
    if (!(await API().available())) return false;
    await API().req("/api/me", { auth: true });
    useBackend = true;
    const { meetings: remote } = await API().req("/api/meetings", { auth: true });
    meetings = remote;
    saveLocal(remote);
  } catch {
    useBackend = false;
  }
  return useBackend;
}

// ---------- time helpers ----------
function fmtWhen(ts) {
  const d = new Date(ts);
  const date = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}
function statusOf(m) {
  const now = Date.now();
  const end = m.startsAt + m.durationMin * 60000;
  if (now >= m.startsAt && now <= end) return { label: "● Live now", cls: "live" };
  if (m.past || now > end) return { label: "Ended", cls: "over" };
  const mins = Math.round((m.startsAt - now) / 60000);
  if (mins < 60) return { label: `In ${mins} min`, cls: "" };
  const hours = Math.round(mins / 60);
  if (hours < 24) return { label: `In ${hours}h`, cls: "" };
  return { label: `In ${Math.round(hours / 24)}d`, cls: "" };
}

// ---------- render ----------
function cardHTML(m) {
  const st = statusOf(m);
  const isPast = st.cls === "over";
  return `
  <article class="meet-card ${isPast ? "past" : ""}">
    <div class="meet-top">
      <span class="community-pill">c/${esc(m.topic)}</span>
      <span class="when-pill ${st.cls}">${esc(st.label)}</span>
      <span class="meet-by">${esc(fmtWhen(m.startsAt))} · ${m.durationMin} min</span>
    </div>
    <h3>${esc(m.title)}</h3>
    <p class="meet-by">Hosted by <strong>${esc(m.name)}</strong></p>
    ${m.description ? `<p class="desc">${esc(m.description)}</p>` : ""}
    <div class="meet-actions">
      ${isPast
        ? `<span class="meet-by">This meeting has ended.</span>`
        : `<a class="btn btn-small btn-primary join-btn" href="${esc(m.link)}" target="_blank" rel="noopener">Join meeting →</a>
           <button class="rsvp-btn ${m.rsvped ? "on" : ""}" data-rsvp="${m.id}">${m.rsvped ? "✓ You're in" : "🙋 I'm in"} · ${m.rsvps}</button>`}
      ${m.mine ? `<button class="del-btn" data-del="${m.id}">Remove</button>` : ""}
    </div>
  </article>`;
}

function render() {
  const up = meetings.filter((m) => statusOf(m).cls !== "over").sort((a, b) => a.startsAt - b.startsAt);
  const past = meetings.filter((m) => statusOf(m).cls === "over").sort((a, b) => b.startsAt - a.startsAt);
  document.getElementById("upcomingCount").textContent = up.length;
  document.getElementById("upcomingList").innerHTML = up.length
    ? up.map(cardHTML).join("")
    : `<div class="empty-tab"><h3>No upcoming meetings</h3><p>Be the first — host a gentle session and spread some awareness.</p></div>`;
  document.getElementById("pastList").innerHTML = past.length
    ? past.map(cardHTML).join("")
    : `<div class="empty-tab"><p>Nothing here yet.</p></div>`;
}

// ---------- form ----------
const form = document.getElementById("meetingForm");
const whenInput = document.getElementById("mWhen");
whenInput.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function showError(msg) {
  const el = document.getElementById("formError");
  el.textContent = msg;
  el.classList.add("show");
  el.scrollIntoView({ behavior: "smooth", block: "center" });
}
function clearError() {
  document.getElementById("formError").classList.remove("show");
}
form.addEventListener("input", clearError);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  const btn = document.getElementById("postMeetingBtn");
  const title = document.getElementById("mTitle").value.trim();
  const topic = document.getElementById("mTopic").value;
  const startsAt = new Date(whenInput.value).getTime();
  const durationMin = parseInt(document.getElementById("mDuration").value, 10);
  const link = document.getElementById("mLink").value.trim();
  const description = document.getElementById("mDesc").value.trim().slice(0, 500);
  const agree = document.getElementById("mAgree").checked;

  const fail = (msg) => showError(msg);
  if (title.length < 3 || title.length > 80) return fail("Give the meeting a title (3–80 characters).");
  if (!whenInput.value || Number.isNaN(startsAt)) return fail("Pick a date and time.");
  if (startsAt <= Date.now()) return fail("Pick a date and time in the future.");
  if (!/^https?:\/\/\S+$/.test(link)) return fail("Add a valid meeting link starting with https://.");
  if (!agree) return fail("Please confirm the meeting follows the safe-space guidelines.");

  btn.disabled = true;
  btn.textContent = "Posting…";
  const done = () => {
    btn.disabled = false;
    btn.textContent = "Post meeting";
  };

  if (useBackend) {
    try {
      const { meeting } = await API().req("/api/meetings", {
        method: "POST", auth: true,
        body: { title, topic, startsAt, durationMin, link, description },
      });
      meetings = [...meetings, meeting];
      saveLocal(meetings);
      form.reset();
      render();
      done();
      document.getElementById("upcomingList").scrollIntoView({ behavior: "smooth" });
      return;
    } catch (err) {
      done();
      return fail(err.message || "Couldn't post — is the backend running?");
    }
  }

  // Offline fallback
  meetings = [...meetings, {
    id: Date.now(), name: session.name, title, topic, startsAt, durationMin,
    link, description, rsvps: 0, rsvped: false, mine: true, past: false, ts: Date.now(),
  }];
  saveLocal(meetings);
  form.reset();
  render();
  done();
});

// ---------- rsvp + delete (event delegation) ----------
document.querySelector(".meetings-wrap").addEventListener("click", async (e) => {
  const rsvpBtn = e.target.closest("[data-rsvp]");
  const delBtn = e.target.closest("[data-del]");

  if (rsvpBtn) {
    const id = Number(rsvpBtn.dataset.rsvp);
    if (useBackend && id < 1e12) {
      try {
        const { meeting } = await API().req(`/api/meetings/${id}/rsvp`, { method: "POST", auth: true });
        meetings = meetings.map((m) => (m.id === id ? meeting : m));
        saveLocal(meetings);
        render();
      } catch {}
      return;
    }
    meetings = meetings.map((m) =>
      m.id === id ? { ...m, rsvped: !m.rsvped, rsvps: m.rsvps + (m.rsvped ? -1 : 1) } : m
    );
    saveLocal(meetings);
    render();
  }

  if (delBtn) {
    const id = Number(delBtn.dataset.del);
    if (!window.confirm("Remove this meeting? Attendees will just see it disappear.")) return;
    if (useBackend && id < 1e12) {
      try {
        await API().req(`/api/meetings/${id}`, { method: "DELETE", auth: true });
      } catch (err) {
        showError(err.message);
        return;
      }
    }
    meetings = meetings.filter((m) => m.id !== id);
    saveLocal(meetings);
    render();
  }
});

// ---------- init ----------
meetings = getLocal();
render();
(async () => {
  await initBackend();
  render();
})();
// Re-render countdowns every minute
setInterval(render, 60000);
