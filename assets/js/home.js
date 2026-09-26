// ==========================================================
// home.js — User page: Instagram visuals × Reddit mechanics
// Backend-first (Flask /api/…) with localStorage fallback,
// so the feed works offline and syncs when the backend runs.
// ==========================================================

const SESSION_KEY = "minco_session";
const POSTS_KEY = "minco_posts_v2"; // v2 = new vote/reply/image model

const session = (() => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
})();
if (!session) window.location.replace("login.html");

// ---------- backend (optional, graceful fallback) ----------
const API = () => window.MincoAPI;
let useBackend = false;

async function initBackend() {
  try {
    if (!API() || !API().getToken()) return false;
    if (!(await API().available())) return false;
    await API().req("/api/me", { auth: true });
    useBackend = true;
    await pullFromBackend();
  } catch {
    useBackend = false;
  }
  return useBackend;
}

async function pullFromBackend() {
  const { posts } = await API().req(
    `/api/posts?sort=${activeSort}&community=${activeCommunity}`, { auth: true }
  );
  // Server shape already matches the local model
  savePosts(posts);
  renderFeed();
  refreshNotifications().catch(() => {});
}
// Fire-and-forget mutation helper: run backend call, then refresh that post
async function syncMutation(promise) {
  if (!useBackend) return;
  try {
    const { post } = await promise;
    const posts = getPosts().map((p) => (p.id === post.id ? post : p));
    savePosts(posts);
    renderFeed();
  } catch {
    /* keep local state on backend error */
  }
}

let activeSort = "hot";       // hot | new | top
let activeCommunity = "all";  // all | calm | sleep | stress | wins
let searchQuery = "";         // live search text (lowercased, trimmed)
let pendingImage = null;      // dataURL waiting to be posted

// ---------- storage ----------
const getPosts = () => {
  try { return JSON.parse(localStorage.getItem(POSTS_KEY)) || []; }
  catch { return []; }
};
const savePosts = (p) => localStorage.setItem(POSTS_KEY, JSON.stringify(p));

// ---------- seed ----------
if (getPosts().length === 0) {
  const now = Date.now();
  savePosts([
    {
      id: 1, name: "Ama", time: "2h ago", ts: now - 2 * 360e4,
      community: "stress", tag: "Support",
      text: "Today felt heavy, but reading everyone's kind words here helped me breathe a little easier.",
      image: null, ups: 26, downs: 2, userVote: 0, loves: 24, loved: false,
      replies: [
        { id: 11, name: "Jordan", time: "1h ago", text: "Holding space for you. One breath at a time — you matter here." },
        { id: 12, name: "Demo Member", time: "44m ago", text: "Thank you for sharing this. It helped me feel less alone too." },
      ],
    },
    {
      id: 2, name: "Jordan", time: "5h ago", ts: now - 5 * 360e4,
      community: "sleep", tag: "Sleep",
      text: "Small win: phone away 30 min before bed. My calm corner tonight 🌙 What helps you wind down?",
      image: "https://picsum.photos/seed/mincocalm/800/500",
      ups: 18, downs: 1, userVote: 0, loves: 12, loved: false,
      replies: [{ id: 21, name: "Ama", time: "3h ago", text: "Herbal tea + no scrolling works for me. Great win!" }],
    },
    {
      id: 3, name: "Rae", time: "8h ago", ts: now - 8 * 360e4,
      community: "wins", tag: "Win",
      text: "Got out for a 10-minute walk even though I didn't feel like it. Proud of that.",
      image: "https://picsum.photos/seed/mincowalk/800/500",
      ups: 42, downs: 3, userVote: 0, loves: 35, loved: false,
      replies: [],
    },
    {
      id: 4, name: "Minco Team", time: "1d ago", ts: now - 24 * 360e4,
      community: "calm", tag: "Welcome",
      text: "Welcome to Minco. Be kind, no medical advice, and it's always okay to just read quietly.",
      image: null, ups: 55, downs: 2, userVote: 0, loves: 48, loved: false,
      replies: [],
    },
  ]);
}

// ---------- helpers ----------
const esc = (s = "") => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const score = (p) => p.ups - p.downs + p.loves * 0.5;

// What the top search bar actually searches:
// post text + author + c/community + tag + reply text/names
function matchesSearch(p, q) {
  if (!q) return true;
  const hay = [p.text, p.name, p.community, `c/${p.community}`, p.tag,
    ...p.replies.flatMap((r) => [r.text, r.name])].join(" ").toLowerCase();
  return q.split(/\s+/).filter(Boolean).every((word) => hay.includes(word));
}

// Highlight matches with <mark> (escape HTML first, then mark)
function hi(text) {
  const safe = esc(text);
  const q = searchQuery.trim();
  if (!q) return safe;
  const words = q.split(/\s+/).filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!words.length) return safe;
  return safe.replace(new RegExp(`(${words.join("|")})`, "gi"), "<mark>$1</mark>");
}

function toast(msg) {
  const wrap = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.classList.add("out"), 2200);
  setTimeout(() => el.remove(), 2600);
}

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 6e4);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Downscale uploads so localStorage doesn't explode (learning: canvas resize)
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 4 * 1024 * 1024) return reject(new Error("Image too big — pick one under 4MB."));
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1000;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------- render: user ----------
function renderUser() {
  document.querySelectorAll("[data-user-name]").forEach((el) => (el.textContent = session.name));
  document.querySelectorAll("[data-user-initial]").forEach(
    (el) => (el.textContent = session.name[0].toUpperCase())
  );
  const mine = getPosts().filter((p) => p.name === session.name);
  const karma = mine.reduce((n, p) => n + (p.ups - p.downs + p.loves), 0);
  const k = document.getElementById("karmaCount");
  if (k) k.textContent = karma;
}

// ---------- render: feed ----------
function sortedFiltered() {
  let posts = getPosts();
  if (activeCommunity !== "all") posts = posts.filter((p) => p.community === activeCommunity);
  if (searchQuery) posts = posts.filter((p) => matchesSearch(p, searchQuery));
  const arr = [...posts];
  if (activeSort === "new") arr.sort((a, b) => b.ts - a.ts);
  else if (activeSort === "top") arr.sort((a, b) => (b.ups - b.downs + b.loves) - (a.ups - a.downs + a.loves));
  else arr.sort((a, b) => score(b) - score(a) || b.ts - a.ts); // hot
  return arr;
}

const ICON = {
  up: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  down: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>',
  comment: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  share: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
};

function replyHTML(r) {
  return `<div class="reply">
    <div class="reply-top"><strong>${hi(r.name)}</strong><span>${esc(r.time)}</span></div>
    <div>${hi(r.text)}</div>
  </div>`;
}

function postHTML(p, i) {
  return `
  <article class="post" style="animation-delay:${Math.min(i * 60, 400)}ms">
    <div class="vote-rail">
      <button class="vote-btn up ${p.userVote === 1 ? "active" : ""}" data-act="up" data-id="${p.id}" title="Upvote">${ICON.up}</button>
      <span class="vote-score">${p.ups - p.downs}</span>
      <button class="vote-btn down ${p.userVote === -1 ? "active" : ""}" data-act="down" data-id="${p.id}" title="Downvote">${ICON.down}</button>
    </div>
    <div class="post-body-col">
      <div class="post-top">
        <span class="community-pill">c/${hi(p.community)}</span>
        <span class="post-meta">Posted by <strong>${hi(p.name)}</strong> · ${esc(timeAgo(p.ts))} · ${hi(p.tag)}</span>
      </div>
      <p class="post-text">${hi(p.text)}</p>
      ${p.image ? `<img class="post-img" src="${p.image}" alt="Post image" loading="lazy" data-full="${p.image}" />` : ""}
      <div class="post-actions">
        <button class="action-btn" data-act="toggle-replies" data-id="${p.id}">${ICON.comment} ${p.replies.length} ${p.replies.length === 1 ? "reply" : "replies"}</button>
        <button class="action-btn ${p.loved ? "loved" : ""}" data-act="love" data-id="${p.id}">${ICON.heart} ${p.loves}</button>
        <button class="action-btn" data-act="share" data-id="${p.id}">${ICON.share} Share</button>
      </div>
      <div class="replies ${p.replies.length ? "" : "hidden"}" id="replies-${p.id}">
        ${p.replies.map(replyHTML).join("")}
        <form class="reply-form" data-id="${p.id}">
          <input placeholder="Write a kind reply..." maxlength="200" aria-label="Write a reply" />
          <button type="submit">Reply</button>
        </form>
      </div>
    </div>
  </article>`;
}

function renderFeed() {
  const feed = document.getElementById("feed");
  const meta = document.getElementById("searchMeta");
  const posts = sortedFiltered();

  if (meta) {
    if (searchQuery) {
      meta.classList.remove("hidden");
      const scope = activeCommunity === "all" ? "all communities" : `c/${activeCommunity}`;
      meta.innerHTML = `${posts.length} result${posts.length === 1 ? "" : "s"} for “${esc(searchQuery)}” in ${esc(scope)} · <button id="clearSearchLink">Clear</button>`;
      document.getElementById("clearSearchLink")?.addEventListener("click", clearSearch);
    } else {
      meta.classList.add("hidden");
      meta.innerHTML = "";
    }
  }

  if (!posts.length) {
    feed.innerHTML = searchQuery
      ? `<div class="post"><div></div><div class="post-body-col empty-state">
           <h3>No matches for “${esc(searchQuery)}”</h3>
           <p>Try fewer words, check spelling, or browse ${activeCommunity === "all" ? "another" : "all communities"}.</p>
           <button class="btn btn-outline btn-small" id="emptyClear">Clear search</button>
         </div></div>`
      : `<div class="post"><div></div><div class="post-body-col"><p class="post-text">Nothing here yet in c/${esc(activeCommunity)}. Be the first to share something kind.</p></div></div>`;
    document.getElementById("emptyClear")?.addEventListener("click", clearSearch);
  } else {
    feed.innerHTML = posts.map(postHTML).join("");
  }
  renderUser();
}

function clearSearch() {
  searchQuery = "";
  const input = document.getElementById("searchInput");
  if (input) input.value = "";
  document.getElementById("clearSearch")?.classList.add("hidden");
  renderFeed();
}

// ---------- feed interactions (one listener = cleaner) ----------
document.getElementById("feed").addEventListener("click", (e) => {
  const img = e.target.closest(".post-img");
  if (img) {
    document.getElementById("lightboxImg").src = img.dataset.full;
    document.getElementById("lightbox").classList.remove("hidden");
    return;
  }
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const act = btn.dataset.act;
  let posts = getPosts();
  const post = posts.find((p) => p.id === id);
  if (!post) return;

  if (act === "up" || act === "down") {
    const v = act === "up" ? 1 : -1;
    if (post.userVote === v) {
      // toggle off
      post.userVote = 0;
      v === 1 ? post.ups-- : post.downs--;
    } else {
      if (post.userVote === 1) post.ups--;
      if (post.userVote === -1) post.downs--;
      post.userVote = v;
      v === 1 ? post.ups++ : post.downs++;
      btn.classList.remove("pop");
      void btn.offsetWidth; // restart animation
      btn.classList.add("pop");
    }
    savePosts(posts);
    renderFeed();
    if (useBackend && typeof post.id === "number" && post.id < 1e12) {
      // Real backend id (local-only posts use Date.now()) → sync vote
      syncMutation(API().req(`/api/posts/${post.id}/vote`, {
        method: "POST", auth: true, body: { value: post.userVote },
      }));
    }
  }
  if (act === "love") {
    post.loved = !post.loved;
    post.loves += post.loved ? 1 : -1;
    savePosts(posts);
    renderFeed();
    if (useBackend && typeof post.id === "number" && post.id < 1e12) {
      syncMutation(API().req(`/api/posts/${post.id}/love`, { method: "POST", auth: true }));
    }
    if (post.loved) toast("Support sent — kindness counts double here.");
  }
  if (act === "toggle-replies") {
    document.getElementById(`replies-${id}`)?.classList.toggle("hidden");
  }
  if (act === "share") {
    navigator.clipboard?.writeText(`${location.href.split("?")[0]}#post-${id}`).catch(() => {});
    toast("Link copied — invite someone who needs this.");
  }
});

// Replies (submit delegates too)
document.getElementById("feed").addEventListener("submit", (e) => {
  const form = e.target.closest(".reply-form");
  if (!form) return;
  e.preventDefault();
  const input = form.querySelector("input");
  const text = input.value.trim();
  if (!text) return;
  const id = Number(form.dataset.id);
  const posts = getPosts();
  const post = posts.find((p) => p.id === id);
  post.replies.push({ id: Date.now(), name: session.name, time: "Just now", text: text.slice(0, 200) });
  savePosts(posts);
  renderFeed();
  if (typeof post.id === "number" && post.id < 1e12 && useBackend) {
    syncMutation(API().req(`/api/posts/${post.id}/replies`, {
      method: "POST", auth: true, body: { text },
    }));
  }
  toast("Reply posted — thank you for showing up.");
});

// ---------- composer (shared by bottom box + quick-post popup) ----------
async function publishPost({ text, community, image, clear }) {
  if (!text && !image) {
    toast("Write something kind or add an image first.");
    return false;
  }
  // Backend first (real shared post), local fallback otherwise
  if (useBackend) {
    try {
      const { post } = await API().req("/api/posts", {
        method: "POST", auth: true, body: { text, community, image },
      });
      const posts = getPosts();
      posts.unshift(post);
      savePosts(posts);
      clear();
      renderFeed();
      toast("Shared with your community.");
      document.getElementById("feed").scrollIntoView({ behavior: "smooth", block: "start" });
      return true;
    } catch (err) {
      toast(err.message || "Backend unreachable — saved on this device only.");
    }
  }
  const posts = getPosts();
  posts.unshift({
    id: Date.now(),
    name: session.name,
    time: "Just now",
    ts: Date.now(),
    community,
    tag: "Shared",
    text: text.slice(0, 280) || "(shared a photo)",
    image,
    ups: 1, downs: 0, userVote: 1, loves: 0, loved: false,
    replies: [],
  });
  savePosts(posts);
  clear();
  renderFeed();
  toast("Shared with your community.");
  document.getElementById("feed").scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

// ---------- composer (bottom box) ----------
const box = document.getElementById("composerText");
const count = document.getElementById("charCount");
box.addEventListener("input", () => (count.textContent = `${box.value.length}/280`));
function clearBottomComposer() {
  box.value = "";
  count.textContent = "0/280";
  pendingImage = null;
  document.getElementById("imgPreviewWrap").classList.add("hidden");
}

document.getElementById("composerImage").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    pendingImage = await fileToDataURL(file);
    document.getElementById("imgPreview").src = pendingImage;
    document.getElementById("imgPreviewWrap").classList.remove("hidden");
  } catch (err) {
    toast(err.message || "Couldn't read that image.");
  }
  e.target.value = "";
});
document.getElementById("removeImg").addEventListener("click", () => {
  pendingImage = null;
  document.getElementById("imgPreviewWrap").classList.add("hidden");
});

document.getElementById("postBtn").addEventListener("click", async () => {
  await publishPost({
    text: box.value.trim(),
    community: document.getElementById("composerCommunity").value,
    image: pendingImage,
    clear: clearBottomComposer,
  });
});

// ---------- quick-post popup (floating button, no scrolling needed) ----------
const quickText = document.getElementById("quickText");
const quickCount = document.getElementById("quickCharCount");
let quickPendingImage = null;

function openCompose() {
  document.getElementById("composeOverlay")?.classList.remove("hidden");
  quickText?.focus();
}
function closeCompose() {
  document.getElementById("composeOverlay")?.classList.add("hidden");
  document.getElementById("composeFab")?.focus();
}
function clearQuickComposer() {
  quickText.value = "";
  quickCount.textContent = "0/280";
  quickPendingImage = null;
  document.getElementById("quickImgPreviewWrap")?.classList.add("hidden");
  const fileInput = document.getElementById("quickImage");
  if (fileInput) fileInput.value = "";
}

quickText?.addEventListener("input", () => (quickCount.textContent = `${quickText.value.length}/280`));
document.getElementById("composeFab")?.addEventListener("click", openCompose);
document.getElementById("composeClose")?.addEventListener("click", closeCompose);
document.getElementById("composeOverlay")?.addEventListener("click", (e) => {
  if (e.target.id === "composeOverlay") closeCompose();
});
document.getElementById("quickImage")?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    quickPendingImage = await fileToDataURL(file);
    document.getElementById("quickImgPreview").src = quickPendingImage;
    document.getElementById("quickImgPreviewWrap").classList.remove("hidden");
  } catch (err) {
    toast(err.message || "Couldn't read that image.");
  }
  e.target.value = "";
});
document.getElementById("quickRemoveImg")?.addEventListener("click", () => {
  quickPendingImage = null;
  document.getElementById("quickImgPreviewWrap").classList.add("hidden");
});
document.getElementById("quickPostBtn")?.addEventListener("click", async () => {
  const ok = await publishPost({
    text: quickText.value.trim(),
    community: document.getElementById("quickCommunity").value,
    image: quickPendingImage,
    clear: clearQuickComposer,
  });
  if (ok) closeCompose();
});

// ---------- sort + communities ----------
document.getElementById("sortTabs").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-sort]");
  if (!btn) return;
  activeSort = btn.dataset.sort;
  document.querySelectorAll("#sortTabs button").forEach((b) => b.classList.toggle("active", b === btn));
  renderFeed();
});

document.getElementById("communityFilter").addEventListener("change", (e) => {
  activeCommunity = e.target.value;
  renderFeed();
});

// ---------- search (top bar does the filtering) ----------
const searchInput = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearSearch");
let searchTimer = null;

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  // Debounce: wait 150ms after typing stops before re-rendering
  searchTimer = setTimeout(() => {
    searchQuery = searchInput.value.trim().toLowerCase();
    clearBtn.classList.toggle("hidden", !searchQuery);
    renderFeed();
  }, 150);
});
clearBtn.addEventListener("click", () => {
  clearSearch();
  searchInput.focus();
});

// Press "/" anywhere to jump to search, Escape to clear/unfocus
document.addEventListener("keydown", (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
  if (e.key === "/" && !typing) {
    e.preventDefault();
    searchInput.focus();
  }
  if (e.key === "Escape") {
    if (notifOpen) { setNotifOpen(false); return; }
    if (!document.getElementById("composeOverlay")?.classList.contains("hidden")) { closeCompose(); return; }
    document.getElementById("lightbox").classList.add("hidden");
    if (document.activeElement === searchInput && searchQuery) clearSearch();
    searchInput.blur();
  }
});

// ---------- notifications: replies + loves on YOUR posts ----------
let notifications = [];
let notifFirstLoad = true;
let notifOpen = false;

const snippet = (s = "", n = 60) => {
  const t = String(s ?? "").trim().replace(/\s+/g, " ");
  return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t;
};
const notifSeenKey = () => `minco_notif_seen_${session?.email || session?.name || "anon"}`;
const getLastSeen = () => {
  try { return Number(localStorage.getItem(notifSeenKey())) || 0; }
  catch { return 0; }
};
const setLastSeen = (ts) => {
  try { localStorage.setItem(notifSeenKey(), String(ts)); } catch {}
};

// Offline fallback: derive reply notifications from local posts.
// (Local loves carry counts only, no actor names — replies only offline.)
function localNotifications() {
  const seen = getLastSeen();
  const mine = getPosts().filter((p) => p.name === session.name);
  const list = [];
  mine.forEach((p) => {
    (p.replies || []).forEach((r) => {
      if (r.name === session.name) return; // only other people's activity
      const ts = typeof r.id === "number" && r.id > 1e12 ? r.id : p.ts || Date.now();
      list.push({
        id: `local-${p.id}-${r.id}`, type: "reply", actor: r.name,
        postId: p.id, preview: snippet(r.text, 60),
        ts, time: timeAgo(ts), read: ts <= seen,
      });
    });
  });
  list.sort((a, b) => b.ts - a.ts);
  return { notifications: list.slice(0, 20), unread: list.filter((n) => !n.read).length };
}

async function refreshNotifications() {
  if (useBackend) {
    try {
      const data = await API().listNotifications(20);
      notifications = (data.notifications || []).map((n) => ({
        ...n, preview: snippet(n.preview, 60),
      }));
      const unread = data.unread ?? notifications.filter((n) => !n.read).length;
      // Gentle nudge when something new arrives after first load
      if (!notifFirstLoad && unread > 0) {
        const prevIds = new Set(refreshNotifications._ids || []);
        const fresh = notifications.filter((n) => !n.read && !prevIds.has(n.id))[0];
        if (fresh) {
          toast(fresh.type === "reply"
            ? `${fresh.actor} replied to your post 💬`
            : `${fresh.actor} liked your post ❤️`);
        }
      }
      refreshNotifications._ids = notifications.map((n) => n.id);
      notifFirstLoad = false;
      renderNotifications(unread);
      return;
    } catch { /* fall through to local */ }
  }
  const local = localNotifications();
  notifications = local.notifications;
  if (!notifFirstLoad && local.unread > (refreshNotifications._localUnread || 0)) {
    const fresh = notifications.filter((n) => !n.read)[0];
    if (fresh) toast(`${fresh.actor} replied to your post 💬`);
  }
  refreshNotifications._localUnread = local.unread;
  notifFirstLoad = false;
  renderNotifications(local.unread);
}

function renderNotifications(unread) {
  const dot = document.getElementById("notifDot");
  const count = document.getElementById("notifCount");
  const list = document.getElementById("notifList");
  const n = unread ?? notifications.filter((x) => !x.read).length;
  dot?.classList.toggle("hidden", n === 0);
  if (count) {
    count.textContent = n > 9 ? "9+" : String(n);
    count.classList.toggle("hidden", n === 0);
  }
  document.getElementById("notifBtn")?.setAttribute("aria-label",
    n ? `${n} unread notifications` : "Notifications");

  if (!notifications.length) {
    list.innerHTML = `<div class="notif-empty">No replies or likes on your posts yet.<br />Share something kind — support will find you. 💜</div>`;
    return;
  }
  list.innerHTML = "";
  notifications.forEach((item) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "notif-item" + (item.read ? "" : " unread");
    b.dataset.type = item.type;
    const verb = item.type === "reply" ? "replied to your post" : "liked your post";
    const icon = item.type === "reply" ? "💬" : "❤️";
    b.innerHTML = `<span class="notif-emoji">${icon}</span>` +
      `<span class="notif-body"><span class="notif-text"><strong>${esc(item.actor)}</strong> ${verb}` +
      `<span class="notif-preview">“${esc(item.preview)}”</span></span><br />` +
      `<span class="notif-time">${esc(item.time || "")}</span></span>`;
    b.addEventListener("click", () => jumpToPost(item.postId));
    list.appendChild(b);
  });
}

function setNotifOpen(open) {
  notifOpen = open;
  document.getElementById("notifPanel")?.classList.toggle("hidden", !open);
  document.getElementById("notifBtn")?.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) markNotificationsRead(true); // viewing clears the badge
}

async function markNotificationsRead(silent = false) {
  if (useBackend) {
    try {
      const data = await API().markNotificationsRead();
      notifications = notifications.map((n) => ({ ...n, read: true }));
      renderNotifications(data.unread ?? 0);
      return;
    } catch { if (!silent) toast("Couldn't update notifications."); return; }
  }
  // Offline: remember newest seen timestamp
  const newest = notifications.length ? Math.max(...notifications.map((n) => n.ts)) : Date.now();
  setLastSeen(newest);
  notifications = notifications.map((n) => ({ ...n, read: true }));
  renderNotifications(0);
}

function jumpToPost(postId) {
  setNotifOpen(false);
  const replies = document.getElementById(`replies-${postId}`);
  const card = replies?.closest(".post");
  if (card) {
    replies.classList.remove("hidden");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.style.transition = "box-shadow 0.3s ease";
    card.style.boxShadow = "0 0 0 3px rgba(108, 92, 231, 0.45)";
    setTimeout(() => { card.style.boxShadow = ""; }, 1600);
  } else {
    document.getElementById("feed")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

document.getElementById("notifBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  setNotifOpen(!notifOpen);
});
document.getElementById("notifReadAll")?.addEventListener("click", (e) => {
  e.stopPropagation();
  markNotificationsRead();
});
document.addEventListener("click", (e) => {
  if (notifOpen && !e.target.closest(".notif-wrap")) setNotifOpen(false);
});

// ---------- stories, lightbox, logout ----------
document.getElementById("stories").addEventListener("click", (e) => {
  const s = e.target.closest(".story");
  if (s) toast(`Opening "${s.querySelector("small").textContent}" — coming alive soon.`);
});
document.getElementById("lightboxClose").addEventListener("click", () =>
  document.getElementById("lightbox").classList.add("hidden")
);
document.getElementById("lightbox").addEventListener("click", (e) => {
  if (e.target.id === "lightbox") e.target.classList.add("hidden");
});
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    if (useBackend) await API().req("/api/logout", { method: "POST", auth: true });
  } catch {}
  API()?.setToken(null);
  localStorage.removeItem(SESSION_KEY);
  window.location.replace("login.html");
});

// init
renderUser();
renderFeed();
refreshNotifications().catch(() => {});
initBackend().catch(() => {});
// Poll for new replies/loves while the page is open
setInterval(() => {
  if (!document.hidden) refreshNotifications().catch(() => {});
}, 30000);
