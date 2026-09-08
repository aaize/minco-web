// ==========================================================
// profile.js — My profile: header, stats, tabs, editing.
// Backend-first (Flask /api/…) with localStorage fallback.
// ==========================================================

const SESSION_KEY = "minco_session";
const USERS_KEY = "minco_users";
const POSTS_KEY = "minco_posts_v2";

const session = (() => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
})();
if (!session) window.location.replace("login.html");

const API = () => window.MincoAPI;
let useBackend = false;
let me = { name: session.name, email: session.email, bio: "", avatar: "", joined: null };
let allPosts = [];
let activeTab = "posts";
let pendingAvatar = null; // dataURL chosen in the edit form, not yet saved

const esc = (s = "") =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------- local fallback store ----------
const getUsers = () => {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
  catch { return []; }
};
const saveUsers = (u) => localStorage.setItem(USERS_KEY, JSON.stringify(u));
const getPosts = () => {
  try { return JSON.parse(localStorage.getItem(POSTS_KEY)) || []; }
  catch { return []; }
};
const savePosts = (p) => localStorage.setItem(POSTS_KEY, JSON.stringify(p));

// ---------- backend ----------
async function initBackend() {
  try {
    if (!API() || !API().getToken()) return false;
    if (!(await API().available())) return false;
    const { user } = await API().req("/api/me", { auth: true });
    useBackend = true;
    me = { ...me, ...user };
    const { posts } = await API().req("/api/posts", { auth: true });
    allPosts = posts;
    savePosts(posts);
  } catch {
    useBackend = false;
  }
  return useBackend;
}

function loadLocal() {
  const rec = getUsers().find((u) => u.email === session.email);
  if (rec) me = { ...me, name: rec.name, bio: rec.bio || "", avatar: rec.avatar || "" };
  allPosts = getPosts();
}

// ---------- derived ----------
const myPosts = () => useBackend ? allPosts.filter((p) => p.mine) : allPosts.filter((p) => p.name === me.name);
const supportedPosts = () => allPosts.filter((p) => p.loved);
const karmaOf = (posts) => posts.reduce((n, p) => n + (p.ups - p.downs + p.loves), 0);

// ---------- render ----------
function avatarHTML() {
  if (me.avatar) return `<img src="${me.avatar}" alt="${esc(me.name)}'s profile photo" />`;
  return esc((me.name || "M")[0].toUpperCase());
}

function renderHeader() {
  document.getElementById("profileAvatar").innerHTML = avatarHTML();
  document.getElementById("profileName").textContent = me.name;
  const bioEl = document.getElementById("profileBio");
  if (me.bio) {
    bioEl.textContent = me.bio;
    bioEl.classList.remove("empty");
  } else {
    bioEl.textContent = "No bio yet — tap Edit profile to add one.";
    bioEl.classList.add("empty");
  }
  document.getElementById("profileMeta").textContent =
    me.joined
      ? `Member since ${new Date(me.joined).toLocaleDateString(undefined, { month: "long", year: "numeric" })} · c/calm, c/sleep, c/stress, c/wins`
      : "Safe space member";
  const mine = myPosts();
  document.getElementById("statPosts").textContent = mine.length;
  document.getElementById("statKarma").textContent = karmaOf(mine);
  document.getElementById("statSupported").textContent = supportedPosts().length;
}

function miniPostHTML(p) {
  return `
  <article class="mini-post">
    <div class="mini-post-top">
      <span class="community-pill">c/${esc(p.community)}</span>
      <span class="mini-post-meta">${esc(p.time || "")} · ${esc(p.tag || "")}</span>
    </div>
    <p>${esc(p.text)}</p>
    ${p.image ? `<img class="post-img" src="${p.image}" alt="Post image" loading="lazy" />` : ""}
    <div class="mini-post-stats">
      <span>▲ ${p.ups - p.downs}</span><span>♥ ${p.loves}</span><span>💬 ${p.replies.length}</span>
    </div>
  </article>`;
}

function renderTab() {
  document.querySelectorAll("#profileTabs button").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === activeTab)
  );
  const box = document.getElementById("tabContent");
  if (activeTab === "posts") {
    const mine = [...myPosts()].sort((a, b) => b.ts - a.ts);
    box.innerHTML = mine.length
      ? mine.map(miniPostHTML).join("")
      : `<div class="empty-tab"><h3>No posts yet</h3><p>Share your first thought with the community — even "today is hard" is enough.</p><a href="home.html" class="btn btn-small btn-primary">Go to feed</a></div>`;
  } else if (activeTab === "supported") {
    const loved = supportedPosts();
    box.innerHTML = loved.length
      ? loved.map(miniPostHTML).join("")
      : `<div class="empty-tab"><h3>Nothing supported yet</h3><p>Tap the ♥ on kind posts in the feed and they'll collect here.</p><a href="home.html" class="btn btn-small btn-primary">Find kind posts</a></div>`;
  } else {
    const communities = [...new Set(myPosts().map((p) => `c/${p.community}`))].join(" · ") || "—";
    box.innerHTML = `
    <div class="about-card">
      <div class="about-row"><strong>Display name</strong><span>${esc(me.name)}</span></div>
      <div class="about-row"><strong>Bio</strong><span>${me.bio ? esc(me.bio) : "—"}</span></div>
      <div class="about-row"><strong>Email</strong><span class="private">${esc(me.email)} (only you can see this)</span></div>
      <div class="about-row"><strong>Member since</strong><span>${me.joined ? esc(new Date(me.joined).toLocaleDateString(undefined, { month: "long", year: "numeric" })) : "—"}</span></div>
      <div class="about-row"><strong>Active in</strong><span>${esc(communities)}</span></div>
    </div>`;
  }
}

function renderAll() {
  renderHeader();
  renderTab();
}

// ---------- edit form ----------
const editPanel = document.getElementById("editPanel");
const editName = document.getElementById("editName");
const editBio = document.getElementById("editBio");
const bioCount = document.getElementById("bioCount");
const editPreview = document.getElementById("editAvatarPreview");

function showError(msg) {
  const el = document.getElementById("formError");
  el.textContent = msg;
  el.classList.add("show");
}
function clearError() {
  document.getElementById("formError").classList.remove("show");
}

function openEdit() {
  clearError();
  pendingAvatar = me.avatar || null;
  editName.value = me.name;
  editBio.value = me.bio || "";
  bioCount.textContent = editBio.value.length;
  paintPreview();
  editPanel.classList.remove("hidden");
  editPanel.scrollIntoView({ behavior: "smooth", block: "center" });
}
function paintPreview() {
  editPreview.innerHTML = pendingAvatar
    ? `<img src="${pendingAvatar}" alt="Avatar preview" />`
    : esc((editName.value.trim() || me.name || "M")[0].toUpperCase());
}

document.getElementById("editBtn").addEventListener("click", openEdit);
document.getElementById("cancelEdit").addEventListener("click", () => {
  pendingAvatar = null;
  editPanel.classList.add("hidden");
});
editBio.addEventListener("input", () => (bioCount.textContent = editBio.value.length));
editName.addEventListener("input", () => { clearError(); paintPreview(); });

function fileToAvatar(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 4 * 1024 * 1024) return reject(new Error("Photo too big — pick one under 4MB."));
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 256;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("Couldn't read that photo."));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Couldn't read that photo."));
    reader.readAsDataURL(file);
  });
}

document.getElementById("avatarInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    pendingAvatar = await fileToAvatar(file);
    clearError();
    paintPreview();
  } catch (err) {
    showError(err.message);
  }
});
document.getElementById("removeAvatar").addEventListener("click", () => {
  pendingAvatar = null;
  clearError();
  paintPreview();
});

document.getElementById("saveEdit").addEventListener("click", async (e) => {
  clearError();
  const btn = e.target;
  const name = editName.value.trim();
  const bio = editBio.value.trim().slice(0, 150);
  if (name.length < 2 || name.length > 30) return showError("Display name must be 2–30 characters.");
  const oldName = me.name;
  btn.disabled = true;
  btn.textContent = "Saving…";

  if (useBackend) {
    try {
      const { user } = await API().req("/api/me", {
        method: "PUT", auth: true, body: { name, bio, avatar: pendingAvatar || "" },
      });
      me = { ...me, ...user };
      const { posts } = await API().req("/api/posts", { auth: true });
      allPosts = posts;
      savePosts(posts);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "Save changes";
      return showError(err.message || "Couldn't save — is the backend running?");
    }
  } else {
    // Offline: update local user record + rename own posts/replies
    const users = getUsers().map((u) =>
      u.email === me.email ? { ...u, name, bio, avatar: pendingAvatar || "" } : u
    );
    saveUsers(users);
    savePosts(
      getPosts().map((p) => ({
        ...p,
        name: p.name === oldName ? name : p.name,
        replies: p.replies.map((r) => ({ ...r, name: r.name === oldName ? name : r.name })),
      }))
    );
    me = { ...me, name, bio, avatar: pendingAvatar || "" };
    allPosts = getPosts();
  }

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ name: me.name, email: me.email, at: Date.now() }));
  } catch {}
  btn.disabled = false;
  btn.textContent = "Save changes";
  pendingAvatar = null;
  editPanel.classList.add("hidden");
  renderAll();
});

// ---------- tabs / share / logout ----------
document.getElementById("profileTabs").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-tab]");
  if (!btn) return;
  activeTab = btn.dataset.tab;
  renderTab();
});

document.getElementById("shareBtn").addEventListener("click", async (e) => {
  const btn = e.target;
  try {
    await navigator.clipboard.writeText(window.location.href);
    btn.textContent = "Copied!";
  } catch {
    btn.textContent = "Copy this URL ↑";
  }
  setTimeout(() => (btn.textContent = "Copy profile link"), 2000);
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    if (useBackend) await API().req("/api/logout", { method: "POST", auth: true });
  } catch {}
  API()?.setToken(null);
  localStorage.removeItem(SESSION_KEY);
  window.location.replace("login.html");
});

// ---------- init ----------
renderAll(); // instant paint from session/local cache
(async () => {
  loadLocal();
  renderAll();
  await initBackend();
  renderAll();
})();
