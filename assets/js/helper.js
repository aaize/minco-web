// ==========================================================
// helper.js — Minco Helper chat widget (global floating panel).
// Self-contained, no deps. Tries POST /api/chat first (crisis-safe
// offline rules on the backend), falls back to built-in answers so
// it works even on file:// or with the backend down.
// Crisis replies escalate to the SOS panel.
// Include on every page: <script src=".../helper.js" defer></script>
// ==========================================================
(() => {
  const HISTORY_KEY = "minco_helper_history_v1";
  const MAX_HISTORY = 30;

  const QUICK = [
    { label: "😴 Sleep", msg: "I can't sleep lately, any ideas?" },
    { label: "😟 Stress", msg: "I'm feeling really stressed and overwhelmed." },
    { label: "💙 Low mood", msg: "I've been feeling lonely and down." },
    { label: "🌱 Motivation", msg: "I have zero motivation to do anything." },
    { label: "🌬️ Breathing", msg: "Can you talk me through a calming breath?" },
  ];

  const esc = (s = "") =>
    String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const historyKey = () => {
    try {
      const s = JSON.parse(localStorage.getItem("minco_session") || "null");
      return `${HISTORY_KEY}_${s?.email || "anon"}`;
    } catch {
      return `${HISTORY_KEY}_anon`;
    }
  };
  const loadHistory = () => {
    try { return JSON.parse(localStorage.getItem(historyKey())) || []; }
    catch { return []; }
  };
  const saveHistory = (items) => {
    try { localStorage.setItem(historyKey(), JSON.stringify(items.slice(-MAX_HISTORY))); } catch {}
  };

  function apiBase() {
    try {
      const override = localStorage.getItem("minco_api_base");
      if (override) return override.replace(/\/$/, "");
      if (window.location.protocol.startsWith("http")) return window.location.origin;
      return "http://127.0.0.1:5000";
    } catch {
      return "http://127.0.0.1:5000";
    }
  }

  // ---------- offline fallback (compact mirror of backend chat_reply) ----------
  function offlineReply(message) {
    const t = ` ${(message || "").toLowerCase()} `;
    const has = (...words) => words.some((w) => t.includes(w));
    if (has("suicide", "kill myself", "end my life", "want to die", "self-harm",
      "self harm", "hurt myself", "dont want to live", "don't want to live")) {
      return { crisis: true, text: "I'm really glad you told me — you deserve real support right now. I'm just a demo helper, not a professional. Please call your local emergency number, or a crisis helpline (US: 988, UK: Samaritans 116 123). If you can, stay with someone you trust." };
    }
    if (has("hello", "hi", "hey", "morning", "evening") && message.trim().length < 20) {
      return { crisis: false, text: "Hey, glad you're here. 💜 I'm Minco Helper — peer support, not professional care. I share ideas for sleep, stress, low mood and motivation, or I can just listen. What's on your mind?" };
    }
    if (has("thank", "thanks", "helpful", "better")) {
      return { crisis: false, text: "You're so welcome. Glad that helped a little. I'm here whenever you need. 💜" };
    }
    if (has("sleep", "insomnia", "awake", "nightmare", "tired", "exhausted", "can't sleep", "cant sleep")) {
      return { crisis: false, text: "Sleep struggles are exhausting. Ideas: same wind-down nightly, screens off 30 min before bed, dim lights. If awake over ~20 min, get up briefly then retry. What's hardest — falling asleep, staying asleep, or racing thoughts?" };
    }
    if (has("stress", "anxious", "anxiety", "overwhelm", "worried", "worry", "pressure", "burnout", "panic", "breathe")) {
      return { crisis: false, text: "That heavy, buzzing feeling makes sense. Try a 2-minute brain-dump of everything swirling, circle ONE tiny 5–10 min next step, then do it. Slow breathing helps too — ask me for a calming breath. What's weighing on you most?" };
    }
    if (has("lonely", "alone", "isolated", "no friends", "nobody", "sad", "down", "depress", "cry", "empty")) {
      return { crisis: false, text: "I'm sorry it feels like that. Your feelings are valid. Small steps: share one honest post in c/calm, or step out for 5 minutes of daylight. What's been the hardest part of today?" };
    }
    if (has("motivat", "lazy", "procrastinat", "focus", "stuck", "give up", "study", "work")) {
      return { crisis: false, text: "Low motivation is usually tiredness or overwhelm, not laziness. Try the 5-minute trick: pick something tiny, set a 5-min timer, start — stopping after is allowed. What's one tiny thing you'd feel good having done?" };
    }
    if (has("breath", "calm me", "relax", "meditat", "grounding", "overthink")) {
      return { crisis: false, text: "Let's do 60 seconds: breathe in… 2… 3… 4… hold… out… 2… 3… 4… 5… 6… Again — drop your shoulders as you breathe out. Notice your feet, one sound near you. How do you feel after that round?" };
    }
    if (has("food", "eat", "medicat", "pill", "drug", "diagnos", "therapy", "pain", "headache", "sick")) {
      return { crisis: false, text: "Body stuff affects mood a lot, and I need to be careful: I'm not qualified for medical or medication advice — please check with a doctor or pharmacist. I can listen, though. What's hardest about this?" };
    }
    return { crisis: false, text: "Thanks for trusting me with that. I give the best ideas on sleep, stress, low mood and motivation — which feels closest right now? (I'm peer support, not medical care.)" };
  }

  async function askBackend(message) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(`${apiBase()}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "chat failed");
      return { crisis: !!data.crisis, text: data.reply, offline: false };
    } finally {
      clearTimeout(timer);
    }
  }

  // ---------- DOM ----------
  function build() {
    if (document.getElementById("helperFab")) return;

    const fab = document.createElement("button");
    fab.id = "helperFab";
    fab.className = "helper-fab";
    fab.setAttribute("aria-label", "Chat with Minco Helper");
    fab.setAttribute("aria-haspopup", "dialog");
    fab.innerHTML = '<span class="helper-fab-icon">💜</span><span>Helper</span>';

    const overlay = document.createElement("div");
    overlay.id = "helperOverlay";
    overlay.className = "helper-overlay hidden";
    overlay.innerHTML = `
      <section class="helper-panel" role="dialog" aria-label="Minco Helper chat" aria-modal="false">
        <div class="helper-head">
          <div>
            <h2>💜 Minco Helper</h2>
            <p class="helper-sub">Peer support, not professional care · <span id="helperMode">connecting…</span></p>
          </div>
          <button id="helperClose" aria-label="Close helper chat">✕</button>
        </div>
        <div class="helper-msgs" id="helperMsgs" aria-live="polite"></div>
        <div class="helper-chips" id="helperChips"></div>
        <form class="helper-form" id="helperForm">
          <input id="helperInput" type="text" maxlength="500" placeholder="What's on your mind?" autocomplete="off" aria-label="Message Minco Helper" />
          <button type="submit" id="helperSend" aria-label="Send message">➤</button>
        </form>
      </section>`;

    document.body.append(fab, overlay);

    const msgs = overlay.querySelector("#helperMsgs");
    const chips = overlay.querySelector("#helperChips");
    const form = overlay.querySelector("#helperForm");
    const input = overlay.querySelector("#helperInput");
    const mode = overlay.querySelector("#helperMode");
    let busy = false;
    let history = loadHistory();

    QUICK.forEach((q) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "helper-chip";
      b.textContent = q.label;
      b.addEventListener("click", () => send(q.msg));
      chips.appendChild(b);
    });

    function scrollDown() {
      msgs.scrollTop = msgs.scrollHeight;
    }

    function bubble(who, text, crisis = false) {
      const div = document.createElement("div");
      div.className = `helper-msg ${who}${crisis ? " crisis" : ""}`;
      if (crisis) {
        div.innerHTML = `<strong>💜 Please reach out right now</strong>` +
          `<p>${esc(text)}</p>` +
          `<div class="helper-crisis-btns">` +
          `<a href="tel:988">📞 US: 988</a>` +
          `<a href="tel:116123">📞 UK: 116 123</a>` +
          `<button type="button" class="helper-sos-btn">🆘 Open SOS panel</button>` +
          `</div>`;
        div.querySelector(".helper-sos-btn")?.addEventListener("click", () => {
          document.getElementById("sosFab")?.click();
        });
      } else {
        div.textContent = text;
      }
      msgs.appendChild(div);
      scrollDown();
      return div;
    }

    function renderHistory() {
      msgs.innerHTML = "";
      if (!history.length) {
        bubble("bot", "Hey, glad you're here. 💜 I'm Minco Helper — a wellness companion (not a professional). I share ideas for sleep, stress, low mood and motivation — or I can just listen. What's on your mind?");
        return;
      }
      history.forEach((m) => bubble(m.who, m.text, m.crisis));
    }

    function remember(who, text, crisis) {
      history.push({ who, text, crisis: !!crisis });
      saveHistory(history);
    }

    async function send(raw) {
      const message = (raw ?? input.value).trim().slice(0, 500);
      if (!message || busy) return;
      busy = true;
      input.value = "";
      bubble("user", message);
      remember("user", message, false);
      const typing = document.createElement("div");
      typing.className = "helper-msg bot typing";
      typing.innerHTML = "<span></span><span></span><span></span>";
      msgs.appendChild(typing);
      scrollDown();
      let reply;
      try {
        reply = await askBackend(message);
        mode.textContent = "online";
      } catch {
        reply = { ...offlineReply(message), offline: true };
        mode.textContent = "offline answers";
      }
      typing.remove();
      bubble("bot", reply.text, reply.crisis);
      remember("bot", reply.text, reply.crisis);
      busy = false;
      input.focus();
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      send();
    });

    const close = () => {
      overlay.classList.add("hidden");
      fab.focus();
    };
    fab.addEventListener("click", () => {
      const opening = overlay.classList.contains("hidden");
      overlay.classList.toggle("hidden");
      if (opening) {
        if (!msgs.children.length) renderHistory();
        // Refresh online/offline label quietly (cheap health probe, no chat side effects)
        (async () => {
          try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 2000);
            const res = await fetch(`${apiBase()}/api/health`, { signal: ctrl.signal });
            clearTimeout(t);
            mode.textContent = res.ok ? "online" : "offline answers";
          } catch {
            if (mode.textContent === "connecting…") mode.textContent = "offline answers";
          }
        })();
        setTimeout(() => input.focus(), 50);
      } else {
        fab.focus();
      }
    });
    overlay.querySelector("#helperClose").addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !overlay.classList.contains("hidden")) close();
    });
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", build)
    : build();
})();
