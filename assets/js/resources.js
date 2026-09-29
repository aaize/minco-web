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

const SAVES_KEY = "minco_resource_saves_v1";
const RATINGS_KEY = "minco_resource_ratings_v1";
const getSaveIds = () => {
  try { return JSON.parse(localStorage.getItem(SAVES_KEY)) || []; }
  catch { return []; }
};
const setSaveIds = (ids) => {
  try { localStorage.setItem(SAVES_KEY, JSON.stringify(ids)); } catch {}
};
const getRatingMap = () => {
  try { return JSON.parse(localStorage.getItem(RATINGS_KEY)) || {}; }
  catch { return {}; }
};
const setRatingMap = (m) => {
  try { localStorage.setItem(RATINGS_KEY, JSON.stringify(m)); } catch {}
};

// Merge on-device saves/ratings over server state (offline-first)
function mergeLocalState() {
  const saves = new Set(getSaveIds().map(String));
  const ratings = getRatingMap();
  resources = resources.map((r) => {
    const key = String(r.id);
    const localSaved = saves.has(key);
    const localRating = Number(ratings[key]) || 0;
    return {
      ...r,
      saves: r.saves ?? 0,
      saved: Boolean(r.saved) || localSaved,
      ratingAvg: r.ratingAvg ?? 0,
      ratingCount: r.ratingCount ?? 0,
      myRating: r.myRating || localRating || 0,
    };
  });
}

async function initBackend() {
  try {
    if (!API() || !API().getToken()) return false;
    if (!(await API().available())) return false;
    await API().req("/api/me", { auth: true });
    useBackend = true;
    const { resources: remote } = await API().req("/api/resources", { auth: true });
    resources = remote;
    saveLocal(remote);
    mergeLocalState();
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
  const avg = Number(r.ratingAvg) || 0;
  const litAt = r.myRating || Math.round(avg);
  const stars = [1, 2, 3, 4, 5].map((n) =>
    `<button class="star ${n <= litAt ? "lit" : ""}" data-rate="${r.id}" data-stars="${n}" title="Rate ${n} star${n === 1 ? "" : "s"}" aria-label="Rate ${n} out of 5">⭐</button>`
  ).join("");
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
    <div class="rate-row" title="Community rating">
      <span class="stars">${stars}</span>
      <span class="rate-meta">★ ${avg.toFixed(1)} (${r.ratingCount || 0})${r.myRating ? ` · you: ${r.myRating}` : ""}</span>
      <span class="save-meta">${r.saves ? `🔖 ${r.saves} saved` : ""}</span>
    </div>
    <div class="res-actions">
      <a class="btn btn-small ${player ? "btn-outline" : "btn-primary"}" href="${escAttr(r.url)}" target="_blank" rel="noopener">${openLabel}</a>
      <button class="save-btn ${r.saved ? "saved" : ""}" data-save="${r.id}">${r.saved ? "🔖 Saved" : "🔖 Save"}</button>
      ${r.mine ? `<button class="del-btn" data-del="${r.id}">Remove</button>` : ""}
    </div>
  </article>`;
}

function filtered() {
  const topic = document.getElementById("topicFilter").value;
  const sort = document.getElementById("sortSel")?.value || "new";
  const q = document.getElementById("searchBox").value.trim().toLowerCase();
  let list = resources.filter((r) => {
    if (activeKind === "saved") {
      if (!r.saved) return false;
    } else if (activeKind !== "all" && r.kind !== activeKind) return false;
    if (topic !== "all" && r.topic !== topic) return false;
    if (q && !(r.title + " " + (r.description || "")).toLowerCase().includes(q)) return false;
    return true;
  });
  if (sort === "top") {
    list = [...list].sort((a, b) =>
      (b.ratingAvg - a.ratingAvg) || ((b.ratingCount || 0) - (a.ratingCount || 0)) || (b.ts - a.ts));
  } else if (sort === "saved") {
    list = [...list].sort((a, b) => ((b.saves || 0) - (a.saves || 0)) || (b.ts - a.ts));
  } else {
    list = [...list].sort((a, b) => b.ts - a.ts);
  }
  return list;
}

function render() {
  const list = filtered();
  document.getElementById("resultMeta").textContent =
    `${list.length} resource${list.length === 1 ? "" : "s"}`;
  document.getElementById("resList").innerHTML = list.length
    ? list.map(cardHTML).join("")
    : `<div class="empty-tab"><h3>${activeKind === "saved" ? "No saved resources yet" : "Nothing here yet"}</h3><p>${activeKind === "saved" ? "Tap 🔖 Save on anything helpful and it will collect here." : "Try another filter — or share the first resource for this mix."}</p></div>`;
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
document.getElementById("sortSel")?.addEventListener("change", render);

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
    saves: 0, saved: false, ratingAvg: 0, ratingCount: 0, myRating: 0,
  }, ...resources];
  saveLocal(resources);
  form.reset();
  paintKindHint();
  render();
  done();
});

// ---------- save + rate + delete (one delegated listener) ----------
function swapResource(updated) {
  resources = resources.map((r) => (String(r.id) === String(updated.id) ? { ...r, ...updated } : r));
  saveLocal(resources);
  mergeLocalState();
  render();
}

document.getElementById("resList").addEventListener("click", async (e) => {
  const saveBtn = e.target.closest("[data-save]");
  if (saveBtn) {
    const id = saveBtn.dataset.save;
    const cur = resources.find((r) => String(r.id) === String(id));
    if (!cur) return;
    const realId = Number(id) < 1e12;
    if (useBackend && realId) {
      try {
        const { resource } = await API().toggleResourceSave(Number(id));
        const ids = new Set(getSaveIds().map(String));
        resource.saved ? ids.add(String(id)) : ids.delete(String(id));
        setSaveIds([...ids]);
        swapResource(resource);
        return;
      } catch {
        /* fall through to local toggle */
      }
    }
    const ids = new Set(getSaveIds().map(String));
    const nowSaved = !cur.saved;
    nowSaved ? ids.add(String(id)) : ids.delete(String(id));
    setSaveIds([...ids]);
    resources = resources.map((r) => String(r.id) === String(id)
      ? { ...r, saved: nowSaved, saves: Math.max(0, (r.saves || 0) + (nowSaved ? 1 : -1)) }
      : r);
    saveLocal(resources);
    render();
    return;
  }

  const rateBtn = e.target.closest("[data-rate]");
  if (rateBtn) {
    const id = rateBtn.dataset.rate;
    const picked = Number(rateBtn.dataset.stars);
    const cur = resources.find((r) => String(r.id) === String(id));
    if (!cur || !(picked >= 1 && picked <= 5)) return;
    const stars = picked === cur.myRating ? 0 : picked; // tap again to clear
    const realId = Number(id) < 1e12;
    if (useBackend && realId) {
      try {
        const { resource } = await API().rateResource(Number(id), stars);
        const map = getRatingMap();
        if (stars) map[String(id)] = stars;
        else delete map[String(id)];
        setRatingMap(map);
        swapResource(resource);
        return;
      } catch {
        /* fall through to local */
      }
    }
    const map = getRatingMap();
    if (stars) map[String(id)] = stars;
    else delete map[String(id)];
    setRatingMap(map);
    resources = resources.map((r) => {
      if (String(r.id) !== String(id)) return r;
      if (Number(id) >= 1e12) {
        // Local-only resource: single-user average
        return { ...r, myRating: stars, ratingAvg: stars, ratingCount: stars ? 1 : 0 };
      }
      return { ...r, myRating: stars };
    });
    saveLocal(resources);
    render();
    return;
  }

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
  setSaveIds(getSaveIds().filter((x) => String(x) !== String(id)));
  const map = getRatingMap();
  delete map[String(id)];
  setRatingMap(map);
  render();
});

// ---------- init ----------
resources = getLocal();
mergeLocalState();
render();
(async () => {
  await initBackend();
  render();
})();
