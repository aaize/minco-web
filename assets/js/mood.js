// ==========================================================
// mood.js — Daily mood check-in + calendar + weekly score.
// Backend-first (Flask /api/moods) with localStorage fallback.
// Auto-opens once per day when today's mood is missing.
// Low weekly average (< 2.5) surfaces professional-help guidance.
// Peer support only — never a diagnosis.
// ==========================================================
(() => {
  const MOODS = [
    { key: "awful", emoji: "😭", label: "Awful", score: 1 },
    { key: "low", emoji: "😟", label: "Low", score: 2 },
    { key: "okay", emoji: "😐", label: "Okay", score: 3 },
    { key: "good", emoji: "🙂", label: "Good", score: 4 },
    { key: "great", emoji: "😄", label: "Great", score: 5 },
  ];
  const STORE_KEY = "minco_moods_v1";
  const PROMPT_KEY = "minco_mood_prompt";
  const LOW_THRESHOLD = 2.5;

  const pad = (n) => String(n).padStart(2, "0");
  const dayStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayStr = () => dayStr(new Date());
  const esc = (s = "") =>
    String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const getLocal = () => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch { return {}; }
  };
  const saveLocal = (m) => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(m)); } catch {}
  };

  const api = () => window.MincoAPI;
  async function backendOn() {
    try {
      return api() && api().getToken() ? await api().available() : false;
    } catch { return false; }
  }

  let useBackend = false;
  let moodsByDate = {}; // "YYYY-MM-DD" -> {mood, score, note}
  let weekly = { avg: null, count: 0, low: false, days: [] };
  let selectedDate = todayStr();
  let viewYear, viewMonth; // calendar view
  let picked = null; // selected mood key for the check-in form

  function computeWeeklyLocal() {
    const days = [];
    let total = 0, count = 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = dayStr(d);
      const r = moodsByDate[k];
      if (r) { total += r.score; count++; days.push({ date: k, score: r.score, mood: r.mood }); }
      else days.push({ date: k, score: null, mood: null });
    }
    const avg = count ? Math.round((total / count) * 10) / 10 : null;
    weekly = { avg, count, low: count >= 2 && avg !== null && avg < LOW_THRESHOLD, days };
  }

  async function load() {
    if (await backendOn()) {
      try {
        const data = await api().req("/api/moods?days=90", { auth: true });
        useBackend = true;
        moodsByDate = {};
        (data.moods || []).forEach((m) => {
          moodsByDate[m.date] = { mood: m.mood, score: m.score, note: m.note || "" };
        });
        if (data.weekly) weekly = data.weekly;
        else computeWeeklyLocal();
        render();
        maybeAutoOpen();
        return;
      } catch { useBackend = false; }
    }
    moodsByDate = getLocal();
    computeWeeklyLocal();
    render();
    maybeAutoOpen();
  }

  async function save(date, moodKey, note) {
    const meta = MOODS.find((m) => m.key === moodKey);
    if (!meta) return;
    if (useBackend) {
      try {
        const data = await api().req("/api/moods", {
          method: "POST", auth: true, body: { date, mood: moodKey, note },
        });
        const m = data.mood;
        moodsByDate[m.date] = { mood: m.mood, score: m.score, note: m.note || "" };
        if (data.weekly) weekly = data.weekly;
        else computeWeeklyLocal();
      } catch {
        useBackend = false;
        moodsByDate = { ...getLocal(), [date]: { mood: moodKey, score: meta.score, note } };
        saveLocal(moodsByDate);
        computeWeeklyLocal();
      }
    } else {
      moodsByDate = { ...getLocal(), [date]: { mood: moodKey, score: meta.score, note } };
      saveLocal(moodsByDate);
      computeWeeklyLocal();
    }
    render();
  }

  // ---------- DOM ----------
  function build() {
    if (document.getElementById("moodFab")) return;

    const fab = document.createElement("button");
    fab.id = "moodFab";
    fab.className = "mood-fab";
    fab.setAttribute("aria-label", "Open mood calendar");
    fab.innerHTML =
      '<span class="mood-fab-icon">📅</span><span class="mood-fab-label">Mood</span><span class="mood-fab-dot hidden" id="moodDot"></span>';

    const overlay = document.createElement("div");
    overlay.id = "moodOverlay";
    overlay.className = "mood-overlay hidden";
    overlay.innerHTML = `
      <section class="mood-panel" role="dialog" aria-label="Mood calendar" aria-modal="true">
        <div class="mood-head">
          <div><h2>How are you feeling?</h2><p id="moodSub">One tap a day — your week tells the story.</p></div>
          <button id="moodClose" aria-label="Close mood calendar">✕</button>
        </div>
        <div class="mood-check">
          <h3 id="moodCheckTitle">How do you feel today?</h3>
          <div class="mood-row" id="moodRow"></div>
          <textarea class="mood-note" id="moodNote" maxlength="200" rows="2" placeholder="Add a short note (optional, just for you)…"></textarea>
          <button class="btn btn-primary btn-small mood-save" id="moodSave">Save today's mood</button>
          <div class="mood-saved-msg" id="moodSavedMsg"></div>
        </div>
        <div class="mood-week">
          <div class="mood-week-top">
            <h3>Weekly score</h3><strong id="moodAvg">—</strong><span id="moodCount"></span>
          </div>
          <div class="mood-dots" id="moodDots"></div>
          <div class="mood-week-msg" id="moodWeekMsg"></div>
        </div>
        <div class="mood-care hidden" id="moodCare">
          <h4>💜 Your week looks heavy — please be extra kind to yourself</h4>
          <p>Minco is peer support, not medical care. A low week doesn't diagnose anything, but it can be a good nudge to talk to a professional.</p>
          <ul>
            <li>Talk to your GP / primary-care doctor about how you've been feeling</li>
            <li>Reach out to a counsellor, therapist, or trusted support line</li>
            <li>In crisis now: call your local emergency number (US: 988, UK: Samaritans 116 123)</li>
          </ul>
          <div class="row">
            <a class="btn btn-outline btn-small" href="resources.html">Support resources</a>
            <a class="btn btn-outline btn-small" href="meetings.html">Join a meeting</a>
          </div>
        </div>
        <div class="mood-cal">
          <div class="mood-cal-top">
            <button id="moodPrev" aria-label="Previous month">‹</button>
            <strong id="moodMonthLabel"></strong>
            <button id="moodNext" aria-label="Next month" style="margin-left:auto">›</button>
          </div>
          <div class="mood-grid" id="moodGrid"></div>
        </div>
        <p class="mood-foot">Moods stay private to your account. Minco never diagnoses — low weeks just suggest talking to a professional.</p>
      </section>`;

    document.body.append(fab, overlay);

    const row = overlay.querySelector("#moodRow");
    MOODS.forEach((m) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mood-btn";
      b.dataset.mood = m.key;
      b.innerHTML = `<span>${m.emoji}</span><small>${m.label}<b>${m.score}/5</b></small>`;
      b.addEventListener("click", () => { picked = m.key; paintPicked(); });
      row.appendChild(b);
    });

    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();

    fab.addEventListener("click", toggle);
    overlay.querySelector("#moodClose").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !overlay.classList.contains("hidden")) close();
    });
    overlay.querySelector("#moodPrev").addEventListener("click", () => shiftMonth(-1));
    overlay.querySelector("#moodNext").addEventListener("click", () => shiftMonth(1));
    overlay.querySelector("#moodSave").addEventListener("click", async () => {
      const msg = overlay.querySelector("#moodSavedMsg");
      if (!picked) { msg.textContent = "Pick one — even a rough guess counts."; return; }
      const note = overlay.querySelector("#moodNote").value.trim().slice(0, 200);
      const btn = overlay.querySelector("#moodSave");
      btn.disabled = true;
      await save(selectedDate, picked, note);
      btn.disabled = false;
      const label = selectedDate === todayStr() ? "today" : selectedDate;
      msg.textContent = `Saved for ${label} — thank you for checking in. 💜`;
      setTimeout(() => { msg.textContent = ""; }, 3500);
    });
  }

  function paintPicked() {
    document.querySelectorAll("#moodRow .mood-btn").forEach((b) =>
      b.classList.toggle("selected", b.dataset.mood === picked));
  }

  function open() {
    selectedDate = todayStr();
    const t = new Date();
    viewYear = t.getFullYear();
    viewMonth = t.getMonth();
    const entry = moodsByDate[selectedDate];
    picked = entry ? entry.mood : null;
    document.getElementById("moodOverlay").classList.remove("hidden");
    try { localStorage.setItem(PROMPT_KEY, todayStr()); } catch {}
    render();
  }
  function close() {
    document.getElementById("moodOverlay")?.classList.add("hidden");
    document.getElementById("moodFab")?.focus();
  }
  function toggle() {
    document.getElementById("moodOverlay").classList.contains("hidden") ? open() : close();
  }

  function shiftMonth(d) {
    viewMonth += d;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderCalendar();
  }

  function maybeAutoOpen() {
    // Once per calendar day, shortly after login, if today is missing.
    if (moodsByDate[todayStr()]) { paintDot(); return; }
    let last = null;
    try { last = localStorage.getItem(PROMPT_KEY); } catch {}
    if (last === todayStr()) { paintDot(); return; }
    paintDot();
    setTimeout(() => {
      const ov = document.getElementById("moodOverlay");
      if (ov && ov.classList.contains("hidden") && !moodsByDate[todayStr()]) open();
    }, 1200);
  }

  function paintDot() {
    document.getElementById("moodDot")?.classList.toggle("hidden", !!moodsByDate[todayStr()]);
  }

  // ---------- render ----------
  function render() {
    if (!document.getElementById("moodOverlay")) return;
    paintDot();
    const entry = moodsByDate[selectedDate];
    picked = entry ? entry.mood : picked;
    paintPicked();
    const noteEl = document.getElementById("moodNote");
    if (noteEl && document.activeElement !== noteEl) noteEl.value = entry?.note || "";
    document.getElementById("moodCheckTitle").textContent =
      selectedDate === todayStr() ? "How do you feel today?" : `How did you feel on ${selectedDate}?`;
    document.getElementById("moodSave").textContent =
      selectedDate === todayStr() ? "Save today's mood" : `Save mood for ${selectedDate.slice(5)}`;
    renderWeekly();
    renderCalendar();
  }

  function renderWeekly() {
    const avgEl = document.getElementById("moodAvg");
    const countEl = document.getElementById("moodCount");
    const msgEl = document.getElementById("moodWeekMsg");
    const dotsEl = document.getElementById("moodDots");
    const careEl = document.getElementById("moodCare");

    avgEl.textContent = weekly.avg === null || weekly.avg === undefined ? "—" : `${weekly.avg}/5`;
    countEl.textContent = weekly.count ? `${weekly.count}/7 check-ins` : "no check-ins yet";

    dotsEl.innerHTML = "";
    (weekly.days || []).forEach((d) => {
      const meta = MOODS.find((m) => m.key === d.mood);
      const el = document.createElement("div");
      el.className = "mood-dot" + (d.score ? "" : " empty");
      el.title = `${d.date}${d.score ? ` — ${meta.label} (${d.score}/5)` : " — no check-in"}`;
      el.innerHTML = `${d.score ? meta.emoji : "·"}<small>${d.date.slice(5)}</small>`;
      dotsEl.appendChild(el);
    });

    const todayEntry = moodsByDate[todayStr()];
    const showCare = weekly.low || (todayEntry && todayEntry.score === 1);
    careEl.classList.toggle("hidden", !showCare);

    if (!weekly.count) {
      msgEl.textContent = "Log your first mood above — after a few days you'll see your weekly rhythm here.";
    } else if (weekly.low) {
      msgEl.textContent = `Weekly average ${weekly.avg}/5 is running low. Consider talking to a professional — details below. 💜`;
    } else if (weekly.avg >= 4) {
      msgEl.textContent = `Weekly average ${weekly.avg}/5 — a brighter week. Keep whatever is helping. ✨`;
    } else if (weekly.avg >= 3) {
      msgEl.textContent = `Weekly average ${weekly.avg}/5 — fairly steady. Small kind habits add up. 🌿`;
    } else {
      msgEl.textContent = `Weekly average ${weekly.avg}/5 — a tough stretch. Be gentle with yourself and lean on the community.`;
    }
  }

  function renderCalendar() {
    const label = document.getElementById("moodMonthLabel");
    const grid = document.getElementById("moodGrid");
    if (!label || !grid) return;
    const monthName = new Date(viewYear, viewMonth, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
    label.textContent = monthName;
    grid.innerHTML = "";
    ["M", "T", "W", "T", "F", "S", "S"].forEach((d) => {
      const el = document.createElement("div");
      el.className = "mood-dow";
      el.textContent = d;
      grid.appendChild(el);
    });
    // Monday-first offset
    let offset = new Date(viewYear, viewMonth, 1).getDay() - 1;
    if (offset < 0) offset = 6;
    for (let i = 0; i < offset; i++) {
      const b = document.createElement("div");
      b.className = "mood-day blank";
      grid.appendChild(b);
    }
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const today = todayStr();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;
      const future = key > today;
      const entry = moodsByDate[key];
      const meta = entry && MOODS.find((m) => m.key === entry.mood);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mood-day" + (key === today ? " today" : "") + (key === selectedDate ? " selected" : "");
      b.disabled = future;
      b.title = future ? "Future day" : entry ? `${key} — ${meta.label} (${meta.score}/5)` : `${key} — no check-in`;
      b.innerHTML = `${d}${entry ? `<small>${meta.emoji}</small>` : ""}`;
      if (!future) b.addEventListener("click", () => {
        selectedDate = key;
        picked = entry ? entry.mood : null;
        render();
      });
      grid.appendChild(b);
    }
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", () => { build(); load(); })
    : (build(), load());
})();
