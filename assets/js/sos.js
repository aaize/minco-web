// ==========================================================
// sos.js — Global SOS safety button + crisis modal.
// Self-contained, no deps. Works offline with built-in list,
// tries GET /api/support for freshness when backend is on.
// Include on every page: <script src=".../sos.js" defer></script>
// ==========================================================
(() => {
  const FALLBACK = {
    note: "Minco is peer support, not professional care. In crisis, contact local pros now.",
    crisis: [
      { label: "Emergency", detail: "Call your local emergency number" },
      { label: "US — 988 Lifeline", detail: "Call or text 988, 24/7", tel: "988" },
      { label: "UK — Samaritans", detail: "Call 116 123, 24/7", tel: "116123" },
      { label: "CA — 988", detail: "Call or text 988, 24/7", tel: "988" },
      { label: "AU — Lifeline", detail: "Call 13 11 14, 24/7", tel: "131114" },
      { label: "International", detail: "findahelpline.org", url: "https://findahelpline.org/" },
    ],
  };

  const esc = (s = "") =>
    String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  function basePrefix() {
    // pages/*.html are one level deep; index.html is at root
    return window.location.pathname.includes("/pages/") ? "../" : "";
  }

  function build() {
    if (document.getElementById("sosFab")) return;
    const prefix = basePrefix();

    const fab = document.createElement("button");
    fab.id = "sosFab";
    fab.className = "sos-fab";
    fab.setAttribute("aria-label", "Get urgent help");
    fab.setAttribute("aria-haspopup", "dialog");
    fab.innerHTML = '<span class="sos-fab-icon">🆘</span><span>SOS</span>';

    const overlay = document.createElement("div");
    overlay.id = "sosOverlay";
    overlay.className = "sos-overlay hidden";
    overlay.innerHTML = `
      <section class="sos-panel" role="dialog" aria-label="Urgent help" aria-modal="true">
        <div class="sos-head">
          <div><h2>Need urgent help? 💜</h2><p class="sos-sub">You deserve real support right now.</p></div>
          <button id="sosClose" aria-label="Close urgent help">✕</button>
        </div>
        <div class="sos-note" id="sosNote"></div>
        <ul class="sos-list" id="sosList"></ul>
        <div class="sos-links">
          <a class="btn btn-outline btn-small" href="${prefix}pages/games.html">🌬️ Breathing reset</a>
          <a class="btn btn-outline btn-small" href="${prefix}pages/resources.html">📚 Resources</a>
          <a class="btn btn-outline btn-small" href="${prefix}pages/meetings.html">🤝 Meetings</a>
        </div>
      </section>`;

    document.body.append(fab, overlay);

    const close = () => {
      overlay.classList.add("hidden");
      fab.focus();
    };
    const open = () => overlay.classList.remove("hidden");

    fab.addEventListener("click", open);
    overlay.querySelector("#sosClose").addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !overlay.classList.contains("hidden")) close();
    });

    render(FALLBACK);
    refreshFromBackend().catch(() => {});
  }

  function render(data) {
    const note = document.getElementById("sosNote");
    const list = document.getElementById("sosList");
    if (!note || !list) return;
    note.textContent = data.note || FALLBACK.note;
    list.innerHTML = (data.crisis || FALLBACK.crisis)
      .map((c) => {
        const body = `<span><strong>${esc(c.label)}</strong><small>${esc(c.detail || "")}</small></span>`;
        if (c.tel) return `<li><a href="tel:${esc(c.tel)}"><span>📞</span>${body}</a></li>`;
        if (c.url) return `<li><a href="${esc(c.url)}" target="_blank" rel="noopener"><span>🌍</span>${body}</a></li>`;
        return `<li><div class="sos-row"><span>🚨</span>${body}</div></li>`;
      })
      .join("");
  }

  async function refreshFromBackend() {
    try {
      let base = "";
      try {
        const override = localStorage.getItem("minco_api_base");
        if (override) base = override.replace(/\/$/, "");
        else if (window.location.protocol.startsWith("http")) base = window.location.origin;
        else base = "http://127.0.0.1:5000";
      } catch {
        base = "http://127.0.0.1:5000";
      }
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 1500);
      const res = await fetch(`${base}/api/support`, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) return;
      render(await res.json());
    } catch {
      /* offline — keep fallback list */
    }
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", build)
    : build();
})();
