// ==========================================================
// MINCO — Landing page interactivity
// Learning goals:
// 1. Select elements from HTML (getElementById)
// 2. React to events (addEventListener + click)
// 3. Change page dynamically (classList, textContent)
// ==========================================================

// --- 1. Mobile menu toggle ---
const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

menuBtn.addEventListener("click", () => {
  // Toggle the .open class defined in style.css
  const isOpen = navLinks.classList.toggle("open");

  // Accessibility: tell screen readers if menu is open
  menuBtn.setAttribute("aria-expanded", isOpen);
});

// Close menu when a link is clicked (better mobile UX)
navLinks.addEventListener("click", (event) => {
  if (event.target.tagName === "A") {
    navLinks.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  }
});

// --- 2. Navbar shadow on scroll ---
const navbar = document.getElementById("navbar");

window.addEventListener("scroll", () => {
  // window.scrollY = how far user scrolled down in pixels
  if (window.scrollY > 10) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

// --- 3. Auto-update footer year ---
document.getElementById("year").textContent = new Date().getFullYear();
