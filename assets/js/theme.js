// ==========================================================
// theme.js — dark / light mode toggle.
// A tiny inline snippet in <head> sets data-theme pre-paint
// (stored choice, else OS preference); this file owns the
// toggle button + switching. Loaded on every page.
// ==========================================================
(() => {
  const KEY = "minco_theme";
  const root = document.documentElement;
  const current = () => (root.dataset.theme === "dark" ? "dark" : "light");

  function apply(t) {
    root.dataset.theme = t === "dark" ? "dark" : "light";
    try { localStorage.setItem(KEY, root.dataset.theme); } catch {}
    document.querySelectorAll(".theme-toggle").forEach((b) => {
      const dark = root.dataset.theme === "dark";
      b.textContent = dark ? "☀️" : "🌙";
      b.setAttribute("aria-pressed", dark ? "true" : "false");
      b.title = dark ? "Switch to light mode" : "Switch to dark mode";
      b.setAttribute("aria-label", b.title);
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = root.dataset.theme === "dark" ? "#14121f" : "#6c5ce7";
  }

  function build() {
    if (document.querySelector(".theme-toggle")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-toggle";
    btn.addEventListener("click", () => apply(current() === "dark" ? "light" : "dark"));
    const actions = document.querySelector(".app-nav-inner .nav-actions");
    if (actions) {
      actions.prepend(btn);
    } else {
      const inner = document.querySelector(".nav-inner");
      if (!inner) return;
      const menu = inner.querySelector(".menu-btn");
      if (menu) inner.insertBefore(btn, menu);
      else inner.appendChild(btn);
    }
    apply(current());
  }

  window.MincoTheme = { apply, current };
  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", build)
    : build();
})();
