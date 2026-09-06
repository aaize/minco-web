// ==========================================================
// auth.js — frontend-only auth (no backend yet)
// Default demo account + localStorage session.
// Later: replace this with Flask fetch() calls.
// ==========================================================

const DEMO_USER = {
  name: "Demo Member",
  email: "demo@minco.app",
  password: "minco123",
};

const SESSION_KEY = "minco_session";
const USERS_KEY = "minco_users";

// Seed demo user once so login works on first load
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
if (!getUsers().some((u) => u.email === DEMO_USER.email)) {
  saveUsers([...getUsers(), DEMO_USER]);
}

function setSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ name: user.name, email: user.email, at: Date.now() }));
}
function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

// If already logged in, skip auth pages
if (getSession()) {
  window.location.replace("home.html");
}

function showError(msg) {
  const el = document.getElementById("formError");
  if (el) {
    el.textContent = msg;
    el.classList.add("show");
  }
}

// --- Login form ---
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  // One-click demo fill
  document.getElementById("fillDemo")?.addEventListener("click", () => {
    document.getElementById("email").value = DEMO_USER.email;
    document.getElementById("password").value = DEMO_USER.password;
  });

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    const user = getUsers().find((u) => u.email.toLowerCase() === email && u.password === password);
    if (!user) {
      showError("Hmm, that email/password didn't match. Try the demo login below.");
      return;
    }
    setSession(user);
    window.location.replace("home.html");
  });
}

// --- Register form ---
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    if (name.length < 2) return showError("Please enter a display name (2+ characters).");
    if (password.length < 6) return showError("Password needs at least 6 characters.");
    if (getUsers().some((u) => u.email.toLowerCase() === email)) {
      return showError("That email is already registered. Try logging in.");
    }

    const user = { name, email, password };
    saveUsers([...getUsers(), user]);
    setSession(user);
    window.location.replace("home.html");
  });
}
