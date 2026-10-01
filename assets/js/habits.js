// ==========================================================
// habits.js — gentle habit tracker with streaks.
// Backend-first (Flask /api/habits) with localStorage fallback.
// Streaks celebrate, never punish. Private per account.
// ==========================================================

const SESSION_KEY = "minco_session";
const HABITS_KEY = "minco_habits_v1";

const session = (() => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
})();
if (!session) window.location.replace("login.html");

const API = () => window.MincoAPI;
let useBackend = false;
let habits = [];

const $ = (id) => document.getElementById(id);
const esc = (s = "") =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const pad = (n) => String(n).padStart(2, "0");
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = () => dayKey(new Date());

// ---------- storage ----------
const getLocal = () => {
  try { return JSON.parse(localStorage.getItem(HABITS_KEY)) || []; }
  catch { return []; }
};
const saveLocal = (list) => {
  try { localStorage.setItem(HABITS_KEY, JSON.stringify(list)); } catch {}
};

async function initBackend() {
  try {
    if (!API() || !API().getToken()) return false;
    if (!(await API().available())) return false;
    await API().req("/api/me", { auth: true });
    useBackend = true;
    const { habits: remote } = await API().listHabits();
    habits = remote;
    saveLocal(remote.map(({ week, ...rest }) => rest));
    $("backendHint").textContent = "Saved to your Minco account — private to you.";
  } catch {
    useBackend = false;
    habits = withLocalStats(getLocal());
    $("backendHint").textContent = "Offline demo mode — saved in this browser only.";
  }
  return useBackend;
}

// ---------- local stats (mirror of backend habit_to_dict) ----------
function withLocalStats(list) {
  return list.map((h) => {
    const dates = new Set(h.logs || []);
    let streak = 0;
    const day = new Date();
    if (!dates.has(dayKey(day))) day.setDate(day.getDate() - 1);
    while (dates.has(dayKey(day))) {
      streak++;
      day.setDate(day.getDate() - 1);
    }
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = dayKey(d);
      week.push({ date: k, done: dates.has(k) });
    }
    return {
      ...h, streak, total: dates.size,
      doneToday: dates.has(todayKey()), week,
    };
  });
}

// ---------- render ----------
function cardHTML(h) {
  const dots = (h.week || []).map((d) => {
    const label = new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "narrow" });
    return `<span class="habit-dot ${d.done ? "done" : ""}" title="${esc(d.date)}${d.done ? " — done" : ""}">${d.done ? "●" : "○"}<small>${label}</small></span>`;
  }).join("");
  return `
  <article class="habit ${h.doneToday ? "done" : ""}" data-id="${h.id}">
    <button class="habit-check" data-act="toggle" aria-label="${h.doneToday ? "Untick" : "Tick"} ${esc(h.title)} for today" aria-pressed="${h.doneToday}">
      ${h.doneToday ? "✓" : ""}
    </button>
    <div class="habit-body">
      <div class="habit-top">
        <strong>${esc(h.icon || "✨")} ${esc(h.title)}</strong>
        ${h.streak >= 2 ? `<span class="streak-pill">🔥 ${h.streak}-day</span>` : ""}
      </div>
      <div class="habit-week">${dots}</div>
      <p class="habit-meta">${h.total} check-in${h.total === 1 ? "" : "s"}${h.doneToday ? " · done today — nice" : ""}</p>
    </div>
    <button class="habit-del" data-act="del" aria-label="Remove ${esc(h.title)}" title="Remove habit">✕</button>
  </article>`;
}

function render() {
  const list = $("habitList");
  $("habitCount").textContent = habits.length
    ? `${habits.length}/12 · ${habits.filter((h) => h.doneToday).length} done today`
    : "";
  list.innerHTML = habits.length
    ? habits.map(cardHTML).join("")
    : `<div class="empty-tab"><h3>No habits yet</h3><p>Start with something tiny — "make the bed", "one glass of water", "step outside". Small counts double here.</p></div>`;
}

function showError(msg) {
  const el = $("formError");
  el.textContent = msg || "";
  el.classList.toggle("show", !!msg);
}

// ---------- actions ----------
async function addHabit(e) {
  e.preventDefault();
  showError("");
  const title = $("habitTitle").value.trim().slice(0, 40);
  const icon = $("habitIcon").value;
  if (title.length < 2) return showError("Name your habit (2–40 characters).");
  if (habits.length >= 12) return showError("12 habits max — remove one before adding another.");
  const btn = $("addBtn");
  btn.disabled = true;
  try {
    if (useBackend) {
      const { habit } = await API().createHabit({ title, icon });
      habits = [...habits, habit];
      saveLocal(habits.map(({ week, ...rest }) => rest));
    } else {
      habits = withLocalStats([
        ...getLocal(),
        { id: `local-${Date.now()}`, title, icon, ts: Date.now(), logs: [] },
      ]);
      saveLocal(habits.map(({ week, streak, total, doneToday, ...rest }) => rest));
    }
    $("habitTitle").value = "";
    $("habitIcon").value = "";
    render();
  } catch (err) {
    showError(err.message || "Couldn't add — try again.");
  }
  btn.disabled = false;
}

async function toggleHabit(id) {
  const local = String(id).startsWith("local-");
  if (useBackend && !local) {
    try {
      const { habit } = await API().toggleHabit(Number(id));
      habits = habits.map((h) => (String(h.id) === String(id) ? habit : h));
      saveLocal(habits.map(({ week, ...rest }) => rest));
      render();
      return;
    } catch {
      /* fall through to local toggle */
    }
  }
  const all = getLocal().map((h) => {
    if (String(h.id) !== String(id)) return h;
    const logs = new Set(h.logs || []);
    const today = todayKey();
    logs.has(today) ? logs.delete(today) : logs.add(today);
    return { ...h, logs: [...logs] };
  });
  saveLocal(all);
  habits = withLocalStats(all);
  render();
}

async function deleteHabit(id, card) {
  if (!window.confirm("Remove this habit and its history?")) return;
  const local = String(id).startsWith("local-");
  if (useBackend && !local) {
    try {
      await API().deleteHabit(Number(id));
    } catch (err) {
      showError(err.message || "Couldn't remove — try again.");
      return;
    }
  }
  saveLocal(getLocal().filter((h) => String(h.id) !== String(id)));
  habits = habits.filter((h) => String(h.id) !== String(id));
  if (!useBackend) habits = withLocalStats(getLocal());
  render();
}

document.addEventListener("DOMContentLoaded", async () => {
  $("habitForm").addEventListener("submit", addHabit);
  $("habitList").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const card = btn.closest(".habit");
    const id = card?.dataset.id;
    if (!id) return;
    if (btn.dataset.act === "toggle") toggleHabit(id);
    else if (btn.dataset.act === "del") deleteHabit(id, card);
  });
  habits = withLocalStats(getLocal());
  render();
  await initBackend();
  if (!useBackend) habits = withLocalStats(getLocal());
  render();
});
