// ==========================================================
// chat.js — Minco Helper (offline demo, no backend / no API key)
// Rule-based Wellness Q&A widget. Peer support only.
// To go "real AI" later: replace getReply() with a fetch()
// to your backend endpoint, keep the crisis guardrails.
// ==========================================================
(() => {
  const STORE_KEY = "minco_chat_v1";
  const MAX_HISTORY = 60;

  const QUICK = ["Can't sleep 😴", "Feeling stressed", "Low motivation", "Calm me down"];

  const esc = (s = "") =>
    String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const getHistory = () => {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || [];
    } catch {
      return [];
    }
  };
  const saveHistory = (h) => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(h.slice(-MAX_HISTORY)));
    } catch {}
  };

  // ---------- Offline answer engine ----------
  function getReply(raw) {
    const t = raw.toLowerCase();

    const has = (...words) => words.some((w) => t.includes(w));

    // 0. Crisis — always first, never skipped
    if (
      has(
        "suicide", "kill myself", "end my life", "don't want to live", "dont want to live",
        "want to die", "self-harm", "self harm", "hurt myself", "cutting myself"
      )
    ) {
      return {
        crisis: true,
        text:
          "I'm really glad you told me — that sounds incredibly heavy, and you deserve real support right now.\n\n" +
          "I'm just a demo helper, not a professional, and I can't help in a crisis. Please reach out right now:\n" +
          "• Call your local emergency number, or\n" +
          "• Contact a crisis helpline in your country (e.g. US: 988, UK: Samaritans 116 123)\n\n" +
          "If you can, stay with someone you trust. You matter, and help is available 24/7.",
      };
    }

    if (has("panic attack", "can't breathe", "cant breathe", "hyperventilat")) {
      return {
        text:
          "That sounds frightening — let's slow down together for one minute.\n\n" +
          "Try this with me:\n" +
          "1. Breathe in through your nose for 4 counts\n" +
          "2. Hold for 4\n" +
          "3. Out slowly through your mouth for 6\n\n" +
          "Repeat 4 times. Plant your feet, name 3 things you can see, 2 you can hear, 1 you can touch.\n\n" +
          "If it feels unmanageable or happens often, please talk to a doctor or counsellor — they can help much more than I can.",
      };
    }

    if (has("sleep", "insomnia", "can't sleep", "cant sleep", "awake", "nightmare", "tired", "exhausted")) {
      return {
        text:
          "Sleep struggles are exhausting — you're not alone in this.\n\n" +
          "A few gentle ideas that help many people:\n" +
          "• Same wind-down time nightly, screens off 30 min before bed\n" +
          "• Dim lights + something calm (tea, shower, slow breathing)\n" +
          "• If awake >20 min, get up briefly, do something boring, then retry\n" +
          "• Keep naps short (20 min) and earlier in the day\n\n" +
          "What part is hardest — falling asleep, staying asleep, or racing thoughts? " +
          "Also try c/sleep on the feed — others share what worked for them.",
      };
    }

    if (has("stress", "anxious", "anxiety", "overwhelm", "worried", "worry", "pressure", "burnout", "burnt out")) {
      return {
        text:
          "That heavy, buzzing feeling makes sense — a lot is on your plate.\n\n" +
          "One small reset that often helps:\n" +
          "1. Write down everything swirling in your head (2 min brain-dump)\n" +
          "2. Circle just ONE tiny next step (5–10 min)\n" +
          "3. Do it, then pause and breathe\n\n" +
          "The 4-4-6 breathing on the Break page is great for this too.\n\n" +
          "Want to tell me what's weighing on you most today? Sometimes naming it shrinks it a little.",
      };
    }

    if (has("lonely", "alone", "isolated", "no friends", "nobody", "sad", "down", "depress", "cry", "crying", "empty")) {
      return {
        text:
          "I'm really sorry it feels like that right now. Feeling alone in a crowded world hurts.\n\n" +
          "Two things are true: your feelings are valid, and this feeling can shift.\n\n" +
          "Small steps people here find comforting:\n" +
          "• Share one honest post on the feed — even \"today is hard\" is enough\n" +
          "• Reply to one person in c/calm — connection goes both ways\n" +
          "• Step outside for 5 min of daylight if you can\n\n" +
          "I'm here to listen. What's been the hardest part of today?",
      };
    }

    if (has("motivat", "lazy", "procrastinat", "focus", "concentrat", "study", "work", "give up", "stuck")) {
      return {
        text:
          "Low motivation isn't laziness — it's usually tiredness or overwhelm in disguise.\n\n" +
          "Try the 5-minute trick:\n" +
          "• Pick something laughably small (open the doc, put shoes on)\n" +
          "• Set a 5-min timer and start — stopping after is allowed\n" +
          "• Most people keep going once started\n\n" +
          "Also: sleep, food, and daylight affect focus more than willpower.\n\n" +
          "What's one tiny thing you'd feel good having done today? I can help break it down.",
      };
    }

    if (has("breath", "calm me", "relax", "meditat", "grounding", "overthink")) {
      return {
        text:
          "Let's do 60 seconds of calm together 🌿\n\n" +
          "Breathe in… 2… 3… 4… hold… and out… 2… 3… 4… 5… 6…\n" +
          "Again — in… hold… and let your shoulders drop as you breathe out.\n\n" +
          "One more. Notice: feet on the floor, air in your nose, one sound near you.\n\n" +
          "The guided circle on the Break page follows this rhythm. How do you feel after that round?",
      };
    }

    if (has("thank", "thanks", "helpful", "better")) {
      return { text: "You're so welcome. I'm glad that helped, even a little. I'm here whenever you need a breather or a sounding board. 💜" };
    }

    if (has("hello", "hi", "hey", "yo", "morning", "evening")) {
      return {
        text:
          "Hey, I'm glad you're here. I'm Minco Helper — a demo wellness companion (offline, not a professional).\n\n" +
          "I can share coping ideas for sleep, stress, low mood, or motivation — or just listen for a bit.\n\n" +
          "What's on your mind today?",
      };
    }

    if (has("who are you", "what are you", "what can you", "help me", "what do you do")) {
      return {
        text:
          "I'm Minco Helper — an offline demo companion for wellness questions.\n\n" +
          "I can:\n" +
          "• Share sleep wind-down ideas\n" +
          "• Talk through stress or overwhelm\n" +
          "• Suggest small motivation steps\n" +
          "• Guide a 1-minute calming breath\n\n" +
          "I'm peer support, not medical care — no diagnosis or prescriptions. For anything serious, please talk to a professional. What would help most right now?",
      };
    }

    if (has("food", "eat", "appetite", "exercise", "headache", "sick", "pain", "medicat", "pill", "drug", "diagnos", "therapy")) {
      return {
        text:
          "I hear you — body stuff affects mood a lot, and I want to be careful here.\n\n" +
          "I'm not qualified to give medical, nutrition, or medication advice. For anything about symptoms, medication, or diagnoses, please check with a doctor, pharmacist, or trusted health professional.\n\n" +
          "What I can do: listen, share general comfort ideas (rest, routine, talking it out), or point you to the feed where peers share lived experience. What's feeling hardest about this?",
      };
    }

    // Fallback — reflective + route to topics
    const fallbacks = [
      "Thanks for trusting me with that. I may be a simple demo, but I'm listening.\n\nI give the best ideas on sleep, stress, low mood, and motivation — could you tell me a little more about which of those feels closest?",
      "That sounds like a lot to carry. I'm here with you.\n\nIf it helps, try: \"I feel ___ because ___, and I wish ___.\" I'll share a coping idea that fits. Or tap a shortcut below to start somewhere.",
      "I hear you. Some days just naming it out loud (even to a demo helper) lightens it a touch.\n\nWould it help to talk about winding down to sleep, easing stress in your body, or one tiny motivated step?",
    ];
    return { text: fallbacks[raw.length % fallbacks.length] };
  }

  // ---------- Build DOM ----------
  function build() {
    if (document.getElementById("chatFab")) return;

    const fab = document.createElement("button");
    fab.id = "chatFab";
    fab.className = "chat-fab";
    fab.setAttribute("aria-label", "Open Minco Helper chat");
    fab.innerHTML =
      '<span class="chat-fab-icon">💜</span><span class="chat-fab-label">Minco Helper</span><span class="chat-fab-dot hidden" id="chatDot"></span>';

    const panel = document.createElement("section");
    panel.id = "chatPanel";
    panel.className = "chat-panel hidden";
    panel.setAttribute("aria-label", "Minco Helper chat");
    panel.innerHTML = `
      <div class="chat-head">
        <span class="chat-avatar">💜</span>
        <div><strong>Minco Helper</strong><small><span class="online">●</span> Wellness Q&amp;A · demo (offline)</small></div>
        <div class="chat-head-actions">
          <button id="chatClear" title="Clear chat">Clear</button>
          <button id="chatClose" aria-label="Close chat">✕</button>
        </div>
      </div>
      <div class="chat-disclaimer">Peer support only — not medical care. In crisis, call your local emergency number now.</div>
      <div class="chat-body" id="chatBody" role="log" aria-live="polite"></div>
      <div class="chat-quick" id="chatQuick"></div>
      <form class="chat-form" id="chatForm">
        <input id="chatInput" type="text" placeholder="Ask about sleep, stress, motivation…" maxlength="500" autocomplete="off" aria-label="Message Minco Helper" />
        <button type="submit">Send</button>
      </form>`;

    document.body.append(fab, panel);

    const body = panel.querySelector("#chatBody");
    const form = panel.querySelector("#chatForm");
    const input = panel.querySelector("#chatInput");
    const quick = panel.querySelector("#chatQuick");
    const dot = fab.querySelector("#chatDot");

    QUICK.forEach((q) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = q;
      b.addEventListener("click", () => {
        open();
        send(q);
      });
      quick.appendChild(b);
    });

    function scrollDown() {
      body.scrollTop = body.scrollHeight;
    }

    function bubble(role, text, crisis = false) {
      const d = document.createElement("div");
      d.className = `chat-msg ${role}${crisis ? " crisis" : ""}`;
      d.textContent = text;
      body.appendChild(d);
      scrollDown();
    }

    function renderHistory() {
      body.innerHTML = "";
      const h = getHistory();
      if (!h.length) {
        bubble(
          "bot",
          "Hey, I'm Minco Helper 💜 — your offline wellness companion.\n\nAsk me about sleep, stress, low mood, or motivation. I'm peer support, not a professional — and in any crisis, please call emergency help right away.\n\nWhat's on your mind?"
        );
        return;
      }
      h.forEach((m) => bubble(m.role === "user" ? "user" : "bot", m.text, !!m.crisis));
    }

    function push(role, text, crisis = false) {
      const h = [...getHistory(), { role, text, crisis, ts: Date.now() }];
      saveHistory(h);
    }

    let openedOnce = getHistory().length > 0;

    function open() {
      panel.classList.remove("hidden");
      dot.classList.add("hidden");
      if (!openedOnce) {
        openedOnce = true;
      }
      setTimeout(() => input.focus(), 60);
    }
    function close() {
      panel.classList.add("hidden");
      fab.focus();
    }
    function toggle() {
      panel.classList.contains("hidden") ? open() : close();
    }

    async function backendReply(text) {
      try {
        if (!window.MincoAPI || !(await window.MincoAPI.available())) return null;
        const data = await window.MincoAPI.req("/api/chat", {
          method: "POST",
          body: { message: text },
        });
        return data && data.reply ? { text: data.reply, crisis: !!data.crisis } : null;
      } catch {
        return null;
      }
    }

    function send(text) {
      const clean = text.trim().slice(0, 500);
      if (!clean) return;
      bubble("user", clean);
      push("user", clean);
      input.value = "";

      const typing = document.createElement("div");
      typing.className = "chat-typing";
      typing.innerHTML = "<span></span><span></span><span></span>";
      body.appendChild(typing);
      scrollDown();

      setTimeout(async () => {
        const r = (await backendReply(clean)) || getReply(clean);
        typing.remove();
        bubble("bot", r.text, !!r.crisis);
        push("bot", r.text, !!r.crisis);
        if (panel.classList.contains("hidden")) dot.classList.remove("hidden");
      }, 650 + Math.random() * 450);
    }

    fab.addEventListener("click", toggle);
    panel.querySelector("#chatClose").addEventListener("click", close);
    panel.querySelector("#chatClear").addEventListener("click", () => {
      saveHistory([]);
      renderHistory();
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      send(input.value);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !panel.classList.contains("hidden")) close();
    });

    renderHistory();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", build)
    : build();
})();
