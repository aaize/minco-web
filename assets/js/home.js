// ==========================================================
// home.js — User page: Instagram visuals × Reddit mechanics
// Concepts: localStorage model, voting, threaded replies,
// image upload (downscaled), sorting, filtering, lightbox
// Later this same shape becomes your Flask/SQL tables.
// ==========================================================

const SESSION_KEY = "minco_session";
const POSTS_KEY = "minco_posts_v2"; // v2 = new vote/reply/image model

const session = (() => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
})();
if (!session) window.location.replace("login.html");

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
  }
  if (act === "love") {
    post.loved = !post.loved;
    post.loves += post.loved ? 1 : -1;
    savePosts(posts);
    renderFeed();
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
  toast("Reply posted — thank you for showing up.");
});

// ---------- composer ----------
const box = document.getElementById("composerText");
const count = document.getElementById("charCount");
box.addEventListener("input", () => (count.textContent = `${box.value.length}/280`));

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

document.getElementById("postBtn").addEventListener("click", () => {
  const text = box.value.trim();
  if (!text && !pendingImage) {
    toast("Write something kind or add an image first.");
    return;
  }
  const posts = getPosts();
  posts.unshift({
    id: Date.now(),
    name: session.name,
    time: "Just now",
    ts: Date.now(),
    community: document.getElementById("composerCommunity").value,
    tag: "Shared",
    text: text.slice(0, 280) || "(shared a photo)",
    image: pendingImage,
    ups: 1, downs: 0, userVote: 1, loves: 0, loved: false,
    replies: [],
  });
  savePosts(posts);
  box.value = "";
  count.textContent = "0/280";
  pendingImage = null;
  document.getElementById("imgPreviewWrap").classList.add("hidden");
  renderFeed();
  toast("Shared with your community.");
});

// ---------- sort + communities ----------
document.getElementById("sortTabs").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-sort]");
  if (!btn) return;
  activeSort = btn.dataset.sort;
  document.querySelectorAll("#sortTabs button").forEach((b) => b.classList.toggle("active", b === btn));
  renderFeed();
});

document.getElementById("communityList").addEventListener("click", (e) => {
  const li = e.target.closest("li[data-community]");
  if (!li) return;
  activeCommunity = li.dataset.community;
  document.querySelectorAll("#communityList li").forEach((x) => x.classList.toggle("active", x === li));
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
    document.getElementById("lightbox").classList.add("hidden");
    if (document.activeElement === searchInput && searchQuery) clearSearch();
    searchInput.blur();
  }
});

// ---------- stories, notifs, lightbox, logout ----------
document.getElementById("stories").addEventListener("click", (e) => {
  const s = e.target.closest(".story");
  if (s) toast(`Opening "${s.querySelector("small").textContent}" — coming alive soon.`);
});
document.getElementById("notifBtn").addEventListener("click", () => toast("3 kind replies on your posts. You're appreciated."));
document.getElementById("lightboxClose").addEventListener("click", () =>
  document.getElementById("lightbox").classList.add("hidden")
);
document.getElementById("lightbox").addEventListener("click", (e) => {
  if (e.target.id === "lightbox") e.target.classList.add("hidden");
});
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  window.location.replace("login.html");
});

// init
renderUser();
renderFeed();
