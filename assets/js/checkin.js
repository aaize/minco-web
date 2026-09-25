// ==========================================================
// checkin.js — wellbeing questionnaires with reflection scores.
// PRIVACY: everything is scored on-device. Answers are never sent
// to any server and never stored — only an optional local score
// history (date + score + band) stays in this browser.
// Peer support only — results are reflection bands, NOT diagnoses.
// ==========================================================

// Login guard (same pattern as home.js)
const SESSION_KEY = "minco_session";
try {
  if (!JSON.parse(localStorage.getItem(SESSION_KEY))) window.location.replace("login.html");
} catch {
  window.location.replace("login.html");
}

const SCALE = [
  { label: "Not at all", value: 0 },
  { label: "Several days", value: 1 },
  { label: "More than half the days", value: 2 },
  { label: "Nearly every day", value: 3 },
];

const SCREENERS = {
  mood: {
    name: "Low-mood check",
    max: 27,
    questions: [
      "Little interest or pleasure in doing things",
      "Feeling down, depressed, or hopeless",
      "Trouble falling or staying asleep, or sleeping too much",
      "Feeling tired or having little energy",
      "Appetite changes — eating much less or much more than usual",
      "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
      "Trouble concentrating on things, such as reading or watching TV",
      "Moving or speaking noticeably slowly — or being unusually fidgety or restless",
      "Thoughts that you would be better off dead, or of hurting yourself in some way",
    ],
    selfHarmIndex: 8, // question 9 — crisis guardrail
    bands: [
      { upto: 4, label: "Minimal",
        guidance: "Your answers suggest few signs of low mood right now — a steady place to be.\n\nKeep doing whatever is helping: rest, daylight, small routines, kind connections. The mood calendar on your feed is a lovely way to keep noticing patterns." },
      { upto: 9, label: "Mild",
        guidance: "Your answers suggest some mild signs of low mood — worth paying attention to, not alarming on its own.\n\nGentle ideas: protect sleep, get daily daylight, share one honest post on the feed, and re-take this check in 2 weeks. If it lingers or deepens, talk to your GP or a counsellor." },
      { upto: 14, label: "Moderate",
        guidance: "Your answers suggest a moderate level of low-mood signs — please take this seriously and be kind to yourself.\n\nConsider talking to your GP or a counsellor about how you've been feeling — they can help far more than a website. Lean on the community, browse the resources library, and consider joining an awareness meeting." },
      { upto: 19, label: "Moderately severe",
        guidance: "Your answers suggest significant signs of low mood — please don't carry this alone.\n\nWe strongly recommend speaking to your GP, a counsellor, or a trusted support line soon. Minco is peer support, not care — a professional can understand your situation properly and help you plan next steps." },
      { upto: 27, label: "Severe",
        guidance: "Your answers suggest severe signs of low mood — please reach out for real support promptly.\n\nTalk to your GP, a counsellor, or a crisis helpline (US: 988, UK: Samaritans 116 123) — today if you can. You matter, and help is available. Minco's community is here alongside professional support, never instead of it." },
    ],
  },
  worry: {
    name: "Worry check",
    max: 21,
    questions: [
      "Feeling nervous, anxious, or on edge",
      "Not being able to stop or control worrying",
      "Worrying too much about different things",
      "Trouble relaxing",
      "Being so restless that it is hard to sit still",
      "Becoming easily annoyed or irritable",
      "Feeling afraid, as if something awful might happen",
    ],
    selfHarmIndex: -1, // no self-harm question in this screener
    bands: [
      { upto: 4, label: "Minimal",
        guidance: "Your answers suggest little worry right now — a calm stretch.\n\nNotice what keeps it that way: routines, rest, movement, connection. The breathing exercises on the Break page are great to keep in your pocket." },
      { upto: 9, label: "Mild",
        guidance: "Your answers suggest some mild worry — common, and worth soothing early.\n\nTry a 2-minute brain-dump of what's swirling, one tiny next step, and the 4-4-6 breathing on the Break page. Re-take this check in 2 weeks; if worry grows, talk to your GP or a counsellor." },
      { upto: 14, label: "Moderate",
        guidance: "Your answers suggest a moderate level of worry — please take it seriously.\n\nConsider talking to your GP or a counsellor about it. Daily wind-downs, less caffeine and late scrolling, and sharing with the community can help alongside professional guidance." },
      { upto: 21, label: "Severe",
        guidance: "Your answers suggest severe worry — please don't face this alone.\n\nWe strongly recommend speaking to your GP, a counsellor, or a trusted support line soon — today if things feel unmanageable. In crisis, call your local emergency number (US: 988, UK: Samaritans 116 123)." },
    ],
  },
};

const HISTORY_KEY = "minco_checkin_history";

let active = "mood";
let answers = {}; // question index -> 0..3 (reset per screener)
let lastResult = null;

// ---------- statistics dashboard state ----------
let statsScope = "all"; // all | mood | worry
let statsRange = 30; // days: 7 | 30 | 0 = all time
let breakMode = "latest"; // latest | avg

const BAND_COLORS = {
  "Minimal": "#22c55e",
  "Mild": "#a3c614",
  "Moderate": "#f59e0b",
  "Moderately severe": "#ef4444",
  "Severe": "#b91c1c",
};
const bandColor = (band) => BAND_COLORS[band] || "var(--primary)";

const $ = (id) => document.getElementById(id);
const esc = (s = "") =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}
function saveHistory(h) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-30))); } catch {}
}

// ---------- render questions ----------
function renderQuestions() {
  answers = {};
  const list = $("questionList");
  list.innerHTML = "";
  SCREENERS[active].questions.forEach((q, i) => {
    const div = document.createElement("div");
    div.className = "question";
    div.innerHTML = `<p class="question-text"><span class="q-num">${i + 1}</span>${esc(q)}</p>`;
    const opts = document.createElement("div");
    opts.className = "options";
    opts.setAttribute("role", "radiogroup");
    opts.setAttribute("aria-label", `Question ${i + 1}`);
    SCALE.forEach((s) => {
      const lab = document.createElement("label");
      lab.innerHTML = `<input type="radio" name="q${i}" value="${s.value}" aria-label="${esc(s.label)}" /><b>${s.value}</b>${esc(s.label)}`;
      lab.querySelector("input").addEventListener("change", () => {
        answers[i] = s.value;
        opts.querySelectorAll("label").forEach((l) => l.classList.remove("picked"));
        lab.classList.add("picked");
        updateProgress();
        hideError();
      });
      opts.appendChild(lab);
    });
    div.appendChild(opts);
    list.appendChild(div);
  });
  $("resultCard").classList.add("hidden");
  $("quizCard").classList.remove("hidden");
  lastResult = null;
  updateProgress();
  hideError();
}

function updateProgress() {
  const total = SCREENERS[active].questions.length;
  const done = Object.keys(answers).length;
  $("progressLabel").textContent = `${done} of ${total} answered`;
  $("progressFill").style.width = `${(done / total) * 100}%`;
}

function showError(msg) {
  const el = $("quizError");
  el.textContent = msg;
  el.classList.add("show");
}
function hideError() {
  $("quizError")?.classList.remove("show");
}

// ---------- scoring ----------
function bandFor(screener, score) {
  return screener.bands.find((b) => score <= b.upto) || screener.bands[screener.bands.length - 1];
}

function showResult() {
  const screener = SCREENERS[active];
  const total = screener.questions.length;
  const missing = [];
  for (let i = 0; i < total; i++) if (!(i in answers)) missing.push(i + 1);
  if (missing.length) {
    showError(
      missing.length === total
        ? "Tap one answer per question first — there are no wrong answers here."
        : `Almost there — question${missing.length === 1 ? "" : "s"} ${missing.join(", ")} still need${missing.length === 1 ? "s" : ""} an answer.`
    );
    document.querySelectorAll(".question")[missing[0] - 1]?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  hideError();
  const score = Object.values(answers).reduce((n, v) => n + v, 0);
  const band = bandFor(screener, score);
  const crisis = screener.selfHarmIndex >= 0 && (answers[screener.selfHarmIndex] || 0) > 0;
  // Snapshot answers in question order so statistics can break down symptoms later.
  const orderedAnswers = screener.questions.map((_, i) => answers[i] ?? 0);
  lastResult = { screener: active, name: screener.name, score, max: screener.max, band: band.label, crisis, ts: Date.now(), answers: orderedAnswers };

  $("resultKicker").textContent = `${screener.name} · answered just now`;
  $("resultScore").textContent = score;
  $("resultBand").textContent = band.label;
  $("resultRange").textContent = `out of ${screener.max} · ${screener.name.toLowerCase()}`;
  $("resultGuidance").textContent = band.guidance;
  $("resultCrisis").classList.toggle("hidden", !crisis);
  requestAnimationFrame(() => {
    $("resultFill").style.width = "0";
    requestAnimationFrame(() => {
      $("resultFill").style.width = `${(score / screener.max) * 100}%`;
    });
  });

  $("quizCard").classList.add("hidden");
  $("resultCard").classList.remove("hidden");
  $("resultCard").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------- history ----------
function renderHistory() {
  const list = $("historyList");
  const h = getHistory().slice().reverse();
  if (!h.length) {
    list.innerHTML = `<p class="history-empty">Nothing saved yet. After a result, tap “Save to my history” to track how your check-ins change over time.</p>`;
  } else {
    list.innerHTML = "";
    h.slice(0, 10).forEach((r) => {
      const d = new Date(r.ts);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const row = document.createElement("div");
      row.className = "history-row";
      row.innerHTML =
        `<span class="h-date">${date}</span><span class="h-name">${esc(r.name)}</span>` +
        `<span class="history-bar"><i style="width:${Math.round((r.score / r.max) * 100)}%;background:${bandColor(r.band)}"></i></span>` +
        `<span class="h-score">${r.score}/${r.max} · ${esc(r.band)}</span>`;
      list.appendChild(row);
    });
  }
  renderStats();
}

// ==========================================================
// ---------- statistics dashboard ----------
// Everything reads from the same local-only history.
// ==========================================================

function filteredHistory() {
  const all = getHistory();
  const now = Date.now();
  return all.filter((r) => {
    if (statsScope !== "all" && r.screener !== statsScope) return false;
    if (statsRange > 0 && now - r.ts > statsRange * 86400000) return false;
    return true;
  });
}

function severityPct(r) {
  return r.max ? (r.score / r.max) * 100 : 0;
}

function trendOf(rowsAsc) {
  // Linear-regression slope over severity %, normalised per check-in step.
  if (rowsAsc.length < 2) return { label: "—", sub: "save 2+ check-ins", dir: "flat" };
  if (rowsAsc.length === 2) {
    const diff = severityPct(rowsAsc[1]) - severityPct(rowsAsc[0]);
    if (diff <= -7) return { label: "Improving ↘", sub: "scores easing", dir: "down" };
    if (diff >= 7) return { label: "Rising ↗", sub: "scores climbing", dir: "up" };
    return { label: "Steady →", sub: "no big shift", dir: "flat" };
  }
  const n = rowsAsc.length;
  const xs = rowsAsc.map((_, i) => i);
  const ys = rowsAsc.map(severityPct);
  const mx = (n - 1) / 2;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) * (x - mx); });
  const slope = den ? num / den : 0; // severity-% points per check-in
  if (slope <= -2) return { label: "Improving ↘", sub: "trending gentler", dir: "down" };
  if (slope >= 2) return { label: "Rising ↗", sub: "trending heavier", dir: "up" };
  return { label: "Steady →", sub: "holding roughly level", dir: "flat" };
}

function streakDays(rows) {
  const days = new Set(
    rows.map((r) => {
      const d = new Date(r.ts);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })
  );
  if (!days.size) return 0;
  let streak = 0;
  const cur = new Date();
  const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (!days.has(key(cur))) cur.setDate(cur.getDate() - 1); // allow today to be missing
  while (days.has(key(cur))) { streak++; cur.setDate(cur.getDate() - 1); }
  return streak;
}

function renderStats() {
  if (!$("statsBody")) return;
  const all = getHistory();
  const rows = filteredHistory().slice().sort((a, b) => a.ts - b.ts);
  const empty = !rows.length;
  $("statsEmpty").classList.toggle("hidden", !empty);
  $("statsBody").classList.toggle("hidden", empty);
  if (empty) return;

  const latest = rows[rows.length - 1];
  const avgSev = rows.reduce((s, r) => s + severityPct(r), 0) / rows.length;
  const wellness = Math.max(0, Math.round(100 - avgSev));
  const trend = trendOf(rows);
  const streak = streakDays(rows);

  // --- current mental-health snapshot (latest saved check-in) ---
  const latestDate = new Date(latest.ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  $("stateDot").style.background = bandColor(latest.band);
  $("stateTitle").textContent = `${latest.band} · ${latest.name} ${latest.score}/${latest.max}`;
  const stateMsg = {
    "Minimal": "Right now your answers paint a fairly steady picture. Keep noticing what helps.",
    "Mild": "Right now there's a mild load showing — worth soothing early, not alarming on its own.",
    "Moderate": "Right now there's a moderate load showing — please take it seriously and lean on support.",
    "Moderately severe": "Right now the load looks significant — please don't carry this alone; reach out.",
    "Severe": "Right now the load looks severe — please reach out for real support promptly.",
  }[latest.band] || "Based on your most recent saved check-in.";
  $("stateDesc").textContent = `${stateMsg} (saved ${latestDate} · ${latest.name.toLowerCase()}). This is reflection, not diagnosis.`;
  $("wellnessScore").textContent = wellness;
  const C = 213.6;
  requestAnimationFrame(() => {
    $("wellnessArc").style.transition = "stroke-dashoffset 0.8s ease";
    $("wellnessArc").style.strokeDashoffset = String(C * (1 - wellness / 100));
  });

  // --- KPI tiles ---
  const scopeLabel = statsScope === "all" ? "both checks" : SCREENERS[statsScope].name.toLowerCase();
  $("statTotal").textContent = rows.length;
  $("statTotalSub").textContent = `${scopeLabel} · ${streak}-day streak`;
  $("statLatest").textContent = `${latest.score}/${latest.max}`;
  $("statLatestSub").textContent = `${latest.band} · ${latestDate}`;
  $("statAvg").textContent = `${avgSev.toFixed(0)}%`;
  $("statAvgSub").textContent = "avg severity (lower is steadier)";
  $("statTrend").textContent = trend.label;
  $("statTrendSub").textContent = trend.sub;
  $("statTrend").dataset.dir = trend.dir;

  $("trendHint").textContent = `· ${statsRange === 0 ? "all time" : `last ${statsRange} days`} · severity %`;
  drawTrend(rows);
  renderBandDist(rows, streak);
  renderSymptomBars();
  renderInsights(rows, { avgSev, wellness, trend, latest });
}

// ---------- trend line chart (no dependencies, canvas) ----------
function drawTrend(rows) {
  const canvas = $("trendChart");
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || canvas.parentElement.clientWidth || 300;
  const cssH = 180;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = "100%";
  canvas.style.height = cssH + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssW, cssH);

  const pad = { l: 34, r: 10, t: 12, b: 24 };
  const W = cssW - pad.l - pad.r, H = cssH - pad.t - pad.b;
  // gridlines at 0/25/50/75/100%
  ctx.font = "10px system-ui"; ctx.fillStyle = "#8a89a3"; ctx.strokeStyle = "#eceaf7"; ctx.lineWidth = 1;
  [0, 25, 50, 75, 100].forEach((v) => {
    const y = pad.t + H - (v / 100) * H;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + W, y); ctx.stroke();
    ctx.fillText(v + "%", 4, y + 3);
  });
  if (!rows.length) return;

  const t0 = rows[0].ts, t1 = rows[rows.length - 1].ts, span = Math.max(1, t1 - t0);
  const X = (ts) => pad.l + (rows.length === 1 ? W / 2 : ((ts - t0) / span) * W);
  const Y = (pct) => pad.t + H - (Math.min(100, Math.max(0, pct)) / 100) * H;

  const series = (key, color) => {
    const pts = rows.filter((r) => r.screener === key);
    if (!pts.length) return;
    // soft area
    ctx.beginPath();
    pts.forEach((r, i) => { const x = X(r.ts), y = Y(severityPct(r)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
    pts.forEach((r) => {
      const x = X(r.ts), y = Y(severityPct(r));
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    });
  };
  if (statsScope === "all" || statsScope === "mood") series("mood", "#6c5ce7");
  if (statsScope === "all" || statsScope === "worry") series("worry", "#4fa3e3");

  // x labels: first / middle / last date
  ctx.fillStyle = "#8a89a3";
  const fmt = (ts) => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()}`; };
  const picks = rows.length === 1 ? [rows[0]] : [rows[0], rows[Math.floor(rows.length / 2)], rows[rows.length - 1]];
  picks.forEach((r) => {
    const label = fmt(r.ts);
    const x = Math.min(pad.l + W - 20, Math.max(pad.l - 4, X(r.ts) - 10));
    ctx.fillText(label, x, cssH - 8);
  });
}

// ---------- band distribution ----------
function renderBandDist(rows, streak) {
  const box = $("bandDist");
  const order = ["Minimal", "Mild", "Moderate", "Moderately severe", "Severe"];
  const counts = {};
  rows.forEach((r) => { counts[r.band] = (counts[r.band] || 0) + 1; });
  box.innerHTML = order
    .map((b) => {
      const c = counts[b] || 0;
      const pct = Math.round((c / rows.length) * 100);
      if (!c && (b === "Moderately severe" || b === "Severe")) return ""; // keep calm bands tidy
      return `<div class="dist-row"><span class="dist-label">${b}</span>` +
        `<span class="dist-track"><i style="width:${pct}%;background:${bandColor(b)}"></i></span>` +
        `<span class="dist-val">${c}× · ${pct}%</span></div>`;
    })
    .join("");
  $("streakLine").textContent =
    streak >= 2
      ? `🔥 ${streak}-day check-in streak — noticing patterns is the skill that matters.`
      : rows.length >= 3
        ? `Saved ${rows.length} check-ins in view. Save regularly to grow your streak.`
        : `Saved ${rows.length} check-in${rows.length === 1 ? "" : "s"} in view — save a couple more to unlock trends.`;
}

// ---------- per-question symptom breakdown ----------
function entriesWithAnswers(key) {
  return getHistory().filter((r) => r.screener === key && Array.isArray(r.answers) && r.answers.length === SCREENERS[key].questions.length);
}

function avgAnswers(key) {
  const es = entriesWithAnswers(key);
  if (!es.length) return null;
  const n = SCREENERS[key].questions.length;
  const sums = new Array(n).fill(0);
  es.forEach((r) => r.answers.forEach((v, i) => { sums[i] += v; }));
  return { means: sums.map((s) => s / es.length), count: es.length };
}

function symptomSection(key, values, countLabel, highlightTop = true) {
  const qs = SCREENERS[key].questions;
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  const topIdx = order.length ? order[0].i : -1;
  return `<p class="break-screener">${key === "mood" ? "🌧️ Low-mood check" : "🌊 Worry check"} <span>· ${countLabel}</span></p>` +
    order.map(({ v, i }) => {
      const pct = Math.round((v / 3) * 100);
      const hot = highlightTop && i === topIdx && v >= 1.5;
      return `<div class="sym-row${hot ? " hot" : ""}">` +
        `<span class="sym-q"><b>${i + 1}</b> ${esc(qs[i])}</span>` +
        `<span class="sym-track"><i style="width:${pct}%"></i></span>` +
        `<span class="sym-val">${v.toFixed(1)}/3</span></div>`;
    }).join("");
}

function renderSymptomBars() {
  const box = $("symptomBars");
  const keys = statsScope === "all" ? ["mood", "worry"] : [statsScope];
  let html = "";
  keys.forEach((key) => {
    if (breakMode === "latest") {
      const scoped = getHistory().filter((r) => r.screener === key);
      const withAns = scoped.filter((r) => Array.isArray(r.answers) && r.answers.length);
      const src = withAns.length ? withAns[withAns.length - 1] : null;
      if (!src) {
        html += `<p class="break-screener">${key === "mood" ? "🌧️ Low-mood check" : "🌊 Worry check"}</p>` +
          `<p class="history-empty">No per-question detail saved for this check yet — retake it and tap “Save to my history”.</p>`;
      } else {
        const d = new Date(src.ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
        html += symptomSection(key, src.answers.map(Number), `latest · ${src.score}/${src.max} · ${d}`);
      }
    } else {
      const agg = avgAnswers(key);
      if (!agg) {
        html += `<p class="break-screener">${key === "mood" ? "🌧️ Low-mood check" : "🌊 Worry check"}</p>` +
          `<p class="history-empty">No per-question detail saved for this check yet — retake it and tap “Save to my history”.</p>`;
      } else {
        html += symptomSection(key, agg.means, `average of ${agg.count} saved`);
      }
    }
  });
  box.innerHTML = html;
}

// ---------- auto-written gentle insights ----------
function renderInsights(rows, { avgSev, trend, latest }) {
  const ul = $("insightsList");
  const items = [];
  const bandOf = (sev) => (sev <= 15 ? "Minimal" : sev <= 33 ? "Mild" : sev <= 52 ? "Moderate" : sev <= 70 ? "Moderately severe" : "Severe");

  // 1. Overall state
  items.push(`<strong>Current picture: ${bandOf(avgSev).toLowerCase()}</strong> — averaging ${avgSev.toFixed(0)}% severity across ${rows.length} saved check-in${rows.length === 1 ? "" : "s"} in view. Latest: ${esc(latest.name.toLowerCase())} ${latest.score}/${latest.max} (${esc(latest.band)}).`);

  // 2. Trend
  if (rows.length >= 2) {
    const first = severityPct(rows[0]).toFixed(0), last = severityPct(rows[rows.length - 1]).toFixed(0);
    const verb = trend.dir === "down" ? "easing" : trend.dir === "up" ? "climbing" : "holding steady";
    items.push(`<strong>Direction: ${trend.label.replace(/[^A-Za-z ]/g, "").trim().toLowerCase()}</strong> — from ${first}% to ${last}% severity (${verb}). ${trend.dir === "up" ? "Be extra gentle with yourself and consider talking to someone you trust." : trend.dir === "down" ? "Whatever you've been doing seems to be helping — keep it up." : "Consistency will reveal the pattern; keep saving check-ins."}`);
  } else {
    items.push(`<strong>Direction:</strong> save one more check-in and we'll chart whether things are easing, steady, or climbing.`);
  }

  // 3. Top symptom + most improved (needs per-question answers)
  const keys = [...new Set(rows.map((r) => r.screener))];
  keys.forEach((key) => {
    const agg = avgAnswers(key);
    if (!agg) return;
    const qs = SCREENERS[key].questions;
    let top = 0;
    agg.means.forEach((v, i) => { if (v > agg.means[top]) top = i; });
    if (agg.means[top] >= 1) {
      items.push(`<strong>Heaviest ${key === "mood" ? "low-mood" : "worry"} area:</strong> “${esc(qs[top])}” — averaging ${agg.means[top].toFixed(1)}/3 across ${agg.count} saved. Small steps here matter most; the Resources library and Meetings can help.`);
    }
    if (agg.count >= 2) {
      const es = entriesWithAnswers(key);
      const a = es[0].answers, b = es[es.length - 1].answers;
      let best = -1, bestDiff = 0;
      a.forEach((v, i) => { const d = v - b[i]; if (d > bestDiff) { bestDiff = d; best = i; } });
      if (best >= 0 && bestDiff >= 1) {
        items.push(`<strong>Most improved:</strong> “${esc(qs[best])}” eased by ${bestDiff} point${bestDiff === 1 ? "" : "s"} since your first saved ${key === "mood" ? "low-mood" : "worry"} check. Notice what changed.`);
      }
    }
  });

  // 4. Crisis / professional nudge (never a diagnosis)
  const crisisCount = rows.filter((r) => r.crisis).length;
  if (crisisCount > 0) {
    items.push(`<strong>💜 Please reach out:</strong> ${crisisCount} saved check-in${crisisCount === 1 ? "" : "s"} mentioned thoughts of harm. You deserve real support — talk to your GP, a counsellor, or a crisis helpline (US: <strong>988</strong>, UK: Samaritans <strong>116 123</strong>).`);
  } else if (avgSev >= 33) {
    items.push(`<strong>Consider professional support:</strong> your average sits in the ${bandOf(avgSev).toLowerCase()} range. Minco is peer support, not care — a GP or counsellor can understand your situation properly.`);
  } else {
    items.push(`<strong>Keep noticing:</strong> steady check-ins are the best early-warning system. Re-take in 2 weeks, protect sleep and daylight, and share honestly on the feed.`);
  }

  ul.innerHTML = items.map((t) => `<li>${t}</li>`).join("");
}

// ---------- wiring ----------
document.querySelectorAll("#screenerTabs button").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.screener === active) return;
    active = btn.dataset.screener;
    document.querySelectorAll("#screenerTabs button").forEach((b) => {
      const on = b === btn;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    renderQuestions();
  });
});

$("seeResultBtn").addEventListener("click", showResult);
$("retakeBtn").addEventListener("click", renderQuestions);
$("saveHistoryBtn").addEventListener("click", () => {
  if (!lastResult) return;
  const h = getHistory();
  // Avoid double-saving the same result twice
  if (!h.length || h[h.length - 1].ts !== lastResult.ts) {
    saveHistory([...h, lastResult]);
    renderHistory();
  }
  $("saveHistoryBtn").textContent = "Saved ✓";
  setTimeout(() => ($("saveHistoryBtn").textContent = "Save to my history"), 2000);
});
$("clearHistoryBtn").addEventListener("click", () => {
  saveHistory([]);
  renderHistory();
});

// ---------- statistics controls ----------
document.querySelectorAll("#statsScreenerSeg button").forEach((btn) => {
  btn.addEventListener("click", () => {
    statsScope = btn.dataset.scope;
    document.querySelectorAll("#statsScreenerSeg button").forEach((b) => {
      const on = b === btn;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    renderStats();
  });
});
document.querySelectorAll("#statsRangeSeg button").forEach((btn) => {
  btn.addEventListener("click", () => {
    statsRange = Number(btn.dataset.range);
    document.querySelectorAll("#statsRangeSeg button").forEach((b) => {
      const on = b === btn;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    renderStats();
  });
});
$("breakLatestBtn")?.addEventListener("click", () => {
  breakMode = "latest";
  $("breakLatestBtn").classList.add("active");
  $("breakAvgBtn").classList.remove("active");
  renderSymptomBars();
});
$("breakAvgBtn")?.addEventListener("click", () => {
  breakMode = "avg";
  $("breakAvgBtn").classList.add("active");
  $("breakLatestBtn").classList.remove("active");
  renderSymptomBars();
});
let resizeT = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => renderStats(), 150);
});

// init
renderQuestions();
renderHistory();
