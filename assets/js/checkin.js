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
  lastResult = { screener: active, name: screener.name, score, max: screener.max, band: band.label, crisis, ts: Date.now() };

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
    return;
  }
  list.innerHTML = "";
  h.slice(0, 10).forEach((r) => {
    const d = new Date(r.ts);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const row = document.createElement("div");
    row.className = "history-row";
    row.innerHTML =
      `<span class="h-date">${date}</span><span class="h-name">${esc(r.name)}</span>` +
      `<span class="history-bar"><i style="width:${Math.round((r.score / r.max) * 100)}%"></i></span>` +
      `<span class="h-score">${r.score}/${r.max} · ${esc(r.band)}</span>`;
    list.appendChild(row);
  });
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

// init
renderQuestions();
renderHistory();
