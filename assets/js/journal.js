// ==========================================================
// journal.js — private journal (per-account, never shared).
// Backend-first (Flask /api/journal) with localStorage fallback.
// ==========================================================

const SESSION_KEY = "minco_session";
const JOURNAL_KEY = "minco_journal_v1";

const session = (() => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
})();
if (!session) window.location.replace("login.html");

const API = () => window.MincoAPI;
let useBackend = false;
let entries = [];
let editingId = null;

const $ = (id) => document.getElementById(id);
const esc = (s = "") =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------- gentle writing prompts (private, on-device only) ----------
const PROMPTS = [
  "3 good things today, however small:\n1.\n2.\n3.",
  "What weighed on me most today, and what would feel kinder?",
  "What helped even a little today? (a person, a pause, a small habit)",
  "A kind thing I did for someone — or for myself:",
  "Right now I feel… because… What I need most is…",
  "A letter to future me: what do I want to remember from today?",
  "What am I letting go of tonight?",
  "Tomorrow, one tiny thing that would feel good:",
];
const MOOD_EMOJI = { awful: "😭", low: "😟", okay: "😐", good: "🙂", great: "🤩" };
const MOOD_SCORE = { awful: 1, low: 2, okay: 3, good: 4, great: 5 };

function paintPrompt() {
  const el = $("promptText");
  if (!el) return;
  let next = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  if (PROMPTS.length > 1 && next === el.textContent) {
    next = PROMPTS[(PROMPTS.indexOf(next) + 1) % PROMPTS.length];
  }
  el.textContent = `“${next}”`;
}

function usePrompt() {
  const raw = ($("promptText")?.textContent || "").replace(/^“|”$/g, "");
  if (!raw) return;
  const ta = $("entryText");
  ta.value = ta.value.trim() ? `${ta.value.trim()}\n\n${raw}\n` : `${raw}\n`;
  $("charCount").textContent = `${ta.value.length}/2000`;
  ta.focus();
}

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function logMoodForToday(mood) {
  if (!MOOD_SCORE[mood]) return false;
  if (useBackend) {
    try {
      await API().req("/api/moods", {
        method: "POST", auth: true, body: { date: todayStr(), mood, note: "" },
      });
      return true;
    } catch {
      // fall through to local so the streak still counts offline
    }
  }
  try {
    const key = "minco_moods_v1";
    const all = JSON.parse(localStorage.getItem(key)) || {};
    all[todayStr()] = { mood, score: MOOD_SCORE[mood], note: "" };
    localStorage.setItem(key, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

function flashSaved(msg) {
  const el = $("savedMsg");
  if (!el) return;
  el.textContent = msg;
  setTimeout(() => {
    if (el.textContent === msg) el.textContent = "";
  }, 3000);
}

// ---------- export (100% on-device) ----------
function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

function exportTxt() {
  if (!entries.length) return showError("Nothing to export yet — write your first entry above.");
  const stamp = todayStr();
  const sorted = [...entries].sort((a, b) => a.ts - b.ts);
  const body = sorted.map((e) => {
    const head = `[${new Date(e.ts).toLocaleString()}]${e.title ? ` ${e.title}` : " Untitled"}${e.mood ? ` (${e.mood})` : ""}`;
    return `${head}\n${e.text || ""}\n---`;
  }).join("\n\n");
  downloadFile(`minco-journal-${stamp}.txt`,
    `Minco Journal Export — ${stamp}\nPrivate to you. Keep it somewhere safe.\n===\n\n${body}\n`, "text/plain");
  flashSaved(`Exported ${entries.length} ${entries.length === 1 ? "entry" : "entries"} as .txt 💜`);
}

function exportJson() {
  if (!entries.length) return showError("Nothing to export yet — write your first entry above.");
  downloadFile(`minco-journal-${todayStr()}.json`,
    JSON.stringify({ exportedAt: new Date().toISOString(), count: entries.length, entries }, null, 2),
    "application/json");
  flashSaved(`Exported ${entries.length} ${entries.length === 1 ? "entry" : "entries"} as .json 💜`);
}

const getLocal = () => {
  try { return JSON.parse(localStorage.getItem(JOURNAL_KEY)) || []; }
  catch { return []; }
};
const saveLocal = (list) => {
  try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(list)); } catch {}
};

function showError(msg) {
  const el = $("formError");
  el.textContent = msg || "";
  el.classList.toggle("show", !!msg);
}

async function initBackend() {
  try {
    if (!API() || !API().getToken()) return false;
    if (!(await API().available())) return false;
    await API().req("/api/me", { auth: true });
    useBackend = true;
    const { entries: remote } = await API().listJournal();
    entries = remote;
    saveLocal(remote);
    $("backendHint").textContent = "Saved to your Minco account — private to you.";
  } catch {
    useBackend = false;
    entries = getLocal();
    $("backendHint").textContent = "Offline demo mode — saved in this browser only.";
  }
  return useBackend;
}

function fmtDate(ts) {
  return new Date(ts).toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function render(filter = "") {
  const list = $("entryList");
  const q = filter.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const shown = entries.filter((e) =>
    !q.length || q.every((w) => `${e.title || ""} ${e.text}`.toLowerCase().includes(w)));
  if (!shown.length) {
    list.innerHTML = `<p class="entry-empty">${entries.length ? "No entries match your search." : "No entries yet — write your first one above. 💜"}</p>`;
    return;
  }
  list.innerHTML = shown.map((e) => `
    <article class="entry" data-id="${e.id}">
      <div class="entry-top">
        ${e.title ? `<strong>${esc(e.title)}</strong>` : `<strong>Untitled</strong>`}
        ${e.mood ? `<span class="mood-pill">${MOOD_EMOJI[e.mood] || ""} ${esc(e.mood)}</span>` : ""}
        <span class="entry-date">${esc(fmtDate(e.ts))}</span>
      </div>
      <p class="entry-text">${esc(e.text)}</p>
      <div class="entry-actions">
        <button data-act="edit" type="button">Edit</button>
        <button data-act="del" class="danger" type="button">Delete</button>
      </div>
    </article>`).join("");
}

async function saveEntry() {
  showError("");
  const title = $("entryTitle").value.trim().slice(0, 80);
  const text = $("entryText").value.trim();
  const mood = $("entryMood").value;
  const linkMood = $("logMoodChk")?.checked && !!mood;
  if (!text) return showError("Write something first — entry can't be empty.");
  if (text.length > 2000) return showError("Entry too long — keep it under 2000 characters.");
  try {
    if (useBackend) {
      if (editingId) {
        const { entry } = await API().updateJournal(editingId, { title, text, mood });
        entries = entries.map((e) => (String(e.id) === String(editingId) ? entry : e));
      } else {
        const { entry } = await API().createJournal({ title, text, mood });
        entries = [entry, ...entries];
      }
      saveLocal(entries);
    } else {
      const now = Date.now();
      if (editingId) {
        entries = entries.map((e) => (String(e.id) === String(editingId)
          ? { ...e, title, text, mood, updated: now } : e));
      } else {
        entries = [{ id: `local-${now}`, title, text, mood, ts: now, updated: now }, ...entries];
      }
      saveLocal(entries);
    }
    resetForm();
    render($("searchInput").value);
    if (linkMood) {
      const ok = await logMoodForToday(mood);
      flashSaved(ok ? "Saved + mood logged for today 💜" : "Saved 💜 (mood log didn't stick — try again)");
    } else {
      flashSaved("Saved 💜");
    }
  } catch (err) {
    showError(err.message || "Couldn't save — try again.");
  }
}

function resetForm() {
  editingId = null;
  $("entryTitle").value = "";
  $("entryText").value = "";
  $("entryMood").value = "";
  $("charCount").textContent = "0/2000";
  $("formTitle").textContent = "New entry";
  $("saveBtn").textContent = "Save entry";
  $("cancelEditBtn").classList.add("hidden");
}

async function onListClick(ev) {
  const btn = ev.target.closest("button[data-act]");
  if (!btn) return;
  const card = ev.target.closest(".entry");
  const id = card?.dataset.id;
  const entry = entries.find((e) => String(e.id) === String(id));
  if (!entry) return;
  if (btn.dataset.act === "edit") {
    editingId = entry.id;
    $("entryTitle").value = entry.title || "";
    $("entryText").value = entry.text || "";
    $("entryMood").value = entry.mood || "";
    $("charCount").textContent = `${$("entryText").value.length}/2000`;
    $("formTitle").textContent = "Edit entry";
    $("saveBtn").textContent = "Save changes";
    $("cancelEditBtn").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (btn.dataset.act === "del") {
    if (!confirm("Delete this entry? This can't be undone.")) return;
    try {
      if (useBackend && !String(id).startsWith("local-")) await API().deleteJournal(id);
      entries = entries.filter((e) => String(e.id) !== String(id));
      saveLocal(entries);
      if (String(editingId) === String(id)) resetForm();
      render($("searchInput").value);
    } catch (err) {
      alert(err.message || "Couldn't delete — try again.");
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  $("privacyWho").textContent = session?.name || session?.email || "you";
  $("saveBtn").addEventListener("click", saveEntry);
  $("cancelEditBtn").addEventListener("click", resetForm);
  $("newPromptBtn")?.addEventListener("click", paintPrompt);
  $("usePromptBtn")?.addEventListener("click", usePrompt);
  $("exportTxtBtn")?.addEventListener("click", exportTxt);
  $("exportJsonBtn")?.addEventListener("click", exportJson);
  $("printBtn")?.addEventListener("click", () => window.print());
  paintPrompt();
  $("entryText").addEventListener("input", (e) => {
    $("charCount").textContent = `${e.target.value.length}/2000`;
  });
  $("searchInput").addEventListener("input", (e) => render(e.target.value));
  $("entryList").addEventListener("click", onListClick);
  entries = getLocal();
  render("");
  await initBackend();
  render($("searchInput").value);
});
