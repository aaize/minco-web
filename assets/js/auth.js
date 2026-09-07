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
function clearError() {
  document.getElementById("formError")?.classList.remove("show");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function passwordScore(pw) {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s; // 0-5
}

// --- Show/hide password toggles (login + register) ---
document.querySelectorAll(".pw-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.toggle);
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.textContent = show ? "Hide" : "Show";
    btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    input.focus();
  });
});

// --- Live strength meter (register) ---
const pwInput = document.getElementById("password");
const strengthBar = document.getElementById("strengthBar");
const strengthLabel = document.getElementById("strengthLabel");
if (pwInput && strengthBar) {
  const wrap = strengthBar.parentElement;
  pwInput.addEventListener("input", () => {
    const v = pwInput.value;
    clearError();
    pwInput.classList.remove("invalid");
    if (!v) {
      wrap.className = "strength";
      if (strengthLabel) strengthLabel.textContent = "Use 6+ characters with a mix of letters & numbers.";
      return;
    }
    const s = passwordScore(v);
    if (s <= 2) {
      wrap.className = "strength weak";
      if (strengthLabel) strengthLabel.textContent = "Weak — add more characters, numbers or symbols.";
    } else if (s <= 3) {
      wrap.className = "strength fair";
      if (strengthLabel) strengthLabel.textContent = "Fair — getting better. Add capitals or symbols for extra strength.";
    } else {
      wrap.className = "strength strong";
      if (strengthLabel) strengthLabel.textContent = "Strong — nice, that password looks solid.";
    }
  });
}

// --- Login form ---
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  // One-click demo fill
  document.getElementById("fillDemo")?.addEventListener("click", () => {
    document.getElementById("email").value = DEMO_USER.email;
    document.getElementById("password").value = DEMO_USER.password;
    clearError();
  });

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    clearError();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    if (!isValidEmail(email)) return showError("Please enter a valid email address.");
    if (!password) return showError("Please enter your password.");

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
  const confirmInput = document.getElementById("confirm");
  confirmInput?.addEventListener("input", () => {
    clearError();
    confirmInput.classList.remove("invalid");
  });
  document.getElementById("name")?.addEventListener("input", (e) => {
    clearError();
    e.target.classList.remove("invalid");
  });
  document.getElementById("email")?.addEventListener("input", (e) => {
    clearError();
    e.target.classList.remove("invalid");
  });

  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    clearError();
    const nameEl = document.getElementById("name");
    const emailEl = document.getElementById("email");
    const pwEl = document.getElementById("password");
    const agreeEl = document.getElementById("agree");
    const btn = document.getElementById("registerBtn");

    const name = nameEl.value.trim();
    const email = emailEl.value.trim().toLowerCase();
    const password = pwEl.value;
    const confirm = confirmInput ? confirmInput.value : "";

    const fail = (el, msg) => {
      showError(msg);
      el?.classList.add("invalid");
      el?.focus();
    };

    if (name.length < 2 || name.length > 30) return fail(nameEl, "Please enter a display name (2–30 characters).");
    if (!isValidEmail(email)) return fail(emailEl, "Please enter a valid email address.");
    if (password.length < 6) return fail(pwEl, "Password needs at least 6 characters.");
    if (confirmInput && password !== confirm) return fail(confirmInput, "Passwords don't match yet — please check both fields.");
    if (agreeEl && !agreeEl.checked) return showError("Please accept the safe-space guidelines to continue.");
    if (getUsers().some((u) => u.email.toLowerCase() === email)) {
      return fail(emailEl, "That email is already registered. Try logging in.");
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = "Creating your account…";
    }
    const user = { name, email, password };
    saveUsers([...getUsers(), user]);
    setSession(user);
    window.location.replace("home.html");
  });
}
