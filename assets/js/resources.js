// ==========================================================
// resources.js — article/video/podcast library.
// YouTube + Spotify links play inline; the rest opens externally.
// Backend-first (Flask /api/resources) with localStorage fallback.
// ==========================================================

const SESSION_KEY = "minco_session";
const RES_KEY = "minco_resources_v1";

const session = (() => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
})();
if (!session) window.location.replace("login.html");

const API = () => window.MincoAPI;
let useBackend = false;
let resources = [];
let activeKind = "all";

const esc = (s = "") =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s = "") => esc(s).replace(/"/g, "&quot;");

// ---------- link → embed ----------
function youTubeId(url) {
  const m = String(url).match(
    /(?:youtube\.com\/(?:watch\?[^#]*v=|shorts\/|live\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}
function spotifyParts(url) {
  const m = String(url).match(/open\.spotify\.com\/(episode|show|track|playlist)\/([A-Za-z0-9]+)/);
  return m ? { type: m[1], id: m[2] } : null;
}

const KIND_LABEL = { article: "📄 Article", video: "🎥 Video", podcast: "🎙️ Podcast" };

// ---------- storage ----------
const getLocal = () => {
  try { return JSON.parse(localStorage.getItem(RES_KEY)) || []; }
  catch { return []; }
};
const saveLocal = (r) => localStorage.setItem(RES_KEY, JSON.stringify(r));

async function initBackend() {
  try {
    if (!API() || !API().getToken()) return false;
    if (!(await API().available())) return false;
    await API().req("/api/me", { auth: true });
    useBackend = true;
    const { resources: remote } = await API().req("/api/resources", { auth: true });
    resources = remote;
    saveLocal(remote);
  } catch {
    useBackend = false;
  }
  return useBackend;
}

// ---------- render ----------
function playerHTML(r) {
  if (r.kind === "video") {
    const id = youTubeId(r.url);
    if (id) {
      return `<div class="player player-16x9"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${escAttr(r.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    }
  }
  if (r.kind === "podcast") {
    const sp = spotifyParts(r.url);
    if (sp) {
      const tall = sp.type === "show" || sp.type === "playlist";
      return `<div class="player"><iframe class="spotify" src="https://open.spotify.com/embed/${sp.type}/${sp.id}" height="${tall ? 352 : 152}" title="${escAttr(r.title)}" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe></div>`;
    }
  }
  return "";
}

function cardHTML(r) {
  const player = playerHTML(r);
  const openLabel =
    r.kind === "article" ? "Read article →" : r.kind === "video" ? "Watch on YouTube →" : "Listen →";
  return `
  <article class="res-card">
    <div class="res-top">
      <span class="kind-badge">${KIND_LABEL[r.kind] || r.kind}</span>
      <span class="community-pill">c/${esc(r.topic)}</span>
    </div>
    <h3>${esc(r.title)}</h3>
    <p class="res-by">Shared by <strong>${esc(r.name)}</strong></p>
    ${r.description ? `<p class="desc">${esc(r.description)}</p>` : ""}
    ${player}
    <div class="res-actions">
      <a class="btn btn-small ${player ? "btn-outline" : "btn-primary"}" href="${escAttr(r.url)}" target="_blank" rel="noopener">${openLabel}</a>
      ${r.mine ? `<button class="del-btn" data-del="${r.id}">Remove</button>` : ""}
    </div>
  </article>`;
}

function filtered() {
  const topic = document.getElementById("topicFilter").value;
  const q = document.getElementById("searchBox").value.trim().toLowerCase();
  return resources.filter((r) => {
    if (activeKind !== "all" && r.kind !== activeKind) return false;
    if (topic !== "all" && r.topic !== topic) return false;
    if (q && !(r.title + " " + (r.description || "")).toLowerCase().includes(q)) return false;
    return true;
  });
}

function render() {
  const list = filtered();
  document.getElementById("resultMeta").textContent =
    `${list.length} resource${list.length === 1 ? "" : "s"}`;
  document.getElementById("resList").innerHTML = list.length
    ? list.map(cardHTML).join("")
    : `<div class="empty-tab"><h3>Nothing here yet</h3><p>Try another filter — or share the first resource for this mix.</p></div>`;
}

// ---------- filters ----------
document.getElementById("kindTabs").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-kind]");
  if (!btn) return;
  activeKind = btn.dataset.kind;
  document.querySelectorAll("#kindTabs button").forEach((b) =>
    b.classList.toggle("active", b === btn)
  );
  render();
});
document.getElementById("topicFilter").addEventListener("change", render);
document.getElementById("searchBox").addEventListener("input", render);

// ---------- form ----------
const form = document.getElementById("resourceForm");
const kindSel = document.getElementById("rKind");
const urlInput = document.getElementById("rUrl");
const urlHint = document.getElementById("urlHint");

const URL_HINTS = {
  article: "Link to a helpful article or guide.",
  video: "YouTube link — it will play right here in the page.",
  podcast: "Spotify episode or show link — it will play right here. Other hosts open externally.",
};
const URL_PLACEHOLDERS = {
  article: "https://…",
  video: "https://www.youtube.com/watch?v=…",
  podcast: "https://open.spotify.com/episode/…",
};
function paintKindHint() {
  urlHint.textContent = URL_HINTS[kindSel.value];
  urlInput.placeholder = URL_PLACEHOLDERS[kindSel.value];
}
kindSel.addEventListener("change", paintKindHint);
paintKindHint();

function showError(msg) {
  const el = document.getElementById("formError");
  el.textContent = msg;
  el.classList.add("show");
  el.scrollIntoView({ behavior: "smooth", block: "center" });
}
function clearError() {
  document.getElementById("formError").classList.remove("show");
}
form.addEventListener("input", clearError);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  const btn = document.getElementById("shareBtn");
  const kind = kindSel.value;
  const topic = document.getElementById("rTopic").value;
  const title = document.getElementById("rTitle").value.trim();
  const url = urlInput.value.trim();
  const description = document.getElementById("rDesc").value.trim().slice(0, 500);

  if (title.length < 3 || title.length > 100) return showError("Give it a title (3–100 characters).");
  if (!/^https?:\/\/\S+$/.test(url)) return showError("Add a valid link starting with https://.");
  if (kind === "video" && !youTubeId(url)) {
    return showError("That doesn't look like a YouTube link — check it, or share as an article instead.");
  }
  if (!document.getElementById("rAgree").checked) {
    return showError("Please confirm the resource is supportive and safe.");
  }

  btn.disabled = true;
  btn.textContent = "Sharing…";
  const done = () => {
    btn.disabled = false;
    btn.textContent = "Share resource";
  };

  if (useBackend) {
    try {
      const { resource } = await API().req("/api/resources", {
        method: "POST", auth: true, body: { kind, topic, title, url, description },
      });
      resources = [resource, ...resources];
      saveLocal(resources);
      form.reset();
      paintKindHint();
      render();
      done();
      return;
    } catch (err) {
      done();
      return showError(err.message || "Couldn't share — is the backend running?");
    }
  }

  resources = [{
    id: Date.now(), name: session.name, kind, topic, title, url, description,
    mine: true, ts: Date.now(),
  }, ...resources];
  saveLocal(resources);
  form.reset();
  paintKindHint();
  render();
  done();
});

// ---------- delete ----------
document.getElementById("resList").addEventListener("click", async (e) => {
  const delBtn = e.target.closest("[data-del]");
  if (!delBtn) return;
  const id = Number(delBtn.dataset.del);
  if (!window.confirm("Remove this resource from the library?")) return;
  if (useBackend && id < 1e12) {
    try {
      await API().req(`/api/resources/${id}`, { method: "DELETE", auth: true });
    } catch (err) {
      showError(err.message);
      return;
    }
  }
  resources = resources.filter((r) => r.id !== id);
  saveLocal(resources);
  render();
});

// ---------- init ----------
resources = getLocal();
render();
(async () => {
  await initBackend();
  render();
})();
