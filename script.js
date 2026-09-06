// ==========================================================
// MINCO PRO — interactivity
// You learn: events, 3D transforms, IntersectionObserver
// ==========================================================

// --- 1. Mobile menu ---
const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

menuBtn.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", isOpen);
});

navLinks.addEventListener("click", (event) => {
  if (event.target.tagName === "A") {
    navLinks.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  }
});

// --- 2. Navbar shadow ---
const navbar = document.getElementById("navbar");
window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 10);
});

// --- 3. 3D tilt on hero card ---
// Idea: track mouse position over the card wrapper,
// convert to rotateX / rotateY degrees (-10 to +10).
const tiltCard = document.getElementById("tiltCard");
const tiltWrap = tiltCard?.parentElement;

if (tiltWrap && tiltCard && window.matchMedia("(hover: hover)").matches) {
  tiltWrap.addEventListener("mousemove", (e) => {
    const rect = tiltWrap.getBoundingClientRect();
    // 0 → 1 across the card
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    // center it: -0.5 → +0.5, then * 16deg max tilt
    const rotateY = (px - 0.5) * 16;
    const rotateX = (0.5 - py) * 16;
    tiltCard.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
  });

  tiltWrap.addEventListener("mouseleave", () => {
    // ease back to flat
    tiltCard.style.transform = "rotateX(0deg) rotateY(0deg)";
  });
}

// --- 4. Scroll reveal ---
// IntersectionObserver fires when .reveal enters the viewport.
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target); // animate once
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// --- 5. Footer year ---
document.getElementById("year").textContent = new Date().getFullYear();
