// ==========================================================
// api.js — tiny backend client with offline fallback.
// If the Flask backend is running it is used; otherwise the
// pages keep working on localStorage demo data.
// Override: localStorage.setItem("minco_api_base", "http://…:5000")
// ==========================================================
(() => {
  const DEFAULT_BASE = "http://127.0.0.1:5000";
  const TOKEN_KEY = "minco_token";

  const getBase = () => {
    try {
      // Explicit override always wins
      const override = localStorage.getItem("minco_api_base");
      if (override) return override.replace(/\/$/, "");
      // Online (or backend-served locally): talk to the same server
      // that served the page — zero config after deploy.
      if (window.location.protocol.startsWith("http")) return window.location.origin;
      return DEFAULT_BASE; // file:// preview → local backend
    } catch {
      return DEFAULT_BASE;
    }
  };
  const getToken = () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  };
  const setToken = (t) => {
    try {
      t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);
    } catch {}
  };

  let backendOk = null; // cached health check
  async function available(timeoutMs = 1500) {
    if (backendOk !== null) return backendOk;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(`${getBase()}/api/health`, { signal: ctrl.signal });
      clearTimeout(t);
      backendOk = res.ok;
    } catch {
      backendOk = false;
    }
    return backendOk;
  }
  const resetCache = () => (backendOk = null);

  async function req(path, { method = "GET", body, auth = false } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
    const res = await fetch(`${getBase()}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  window.MincoAPI = {
    getBase, getToken, setToken, available, resetCache, req,
    // REST helpers (backend-first; caller falls back to localStorage if needed)
    deletePost: (id) => req(`/api/posts/${id}`, { method: "DELETE", auth: true }),
    toggleSave: (id) => req(`/api/posts/${id}/save`, { method: "POST", auth: true }),
    getSaved: () => req("/api/saves", { auth: true }),
    reportPost: (id, reason, detail) =>
      req(`/api/posts/${id}/report`, { method: "POST", auth: true, body: { reason, detail } }),
    myReports: () => req("/api/reports/mine", { auth: true }),
    dailyWellness: () => req("/api/wellness/daily"),
    supportInfo: () => req("/api/support"),
    myStats: () => req("/api/stats/me", { auth: true }),
    communityStats: () => req("/api/stats/community"),
  };
})();
