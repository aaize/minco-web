// landing.js — landing-only: 3D tilt + scroll reveal
const tiltCard = document.getElementById("tiltCard");
const tiltWrap = tiltCard?.parentElement;

if (tiltWrap && tiltCard && window.matchMedia("(hover: hover)").matches) {
  tiltWrap.addEventListener("mousemove", (e) => {
    const rect = tiltWrap.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    tiltCard.style.transform = `rotateX(${(0.5 - py) * 16}deg) rotateY(${(px - 0.5) * 16}deg)`;
  });
  tiltWrap.addEventListener("mouseleave", () => {
    tiltCard.style.transform = "rotateX(0deg) rotateY(0deg)";
  });
}

const observer = new IntersectionObserver(
  (entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  }),
  { threshold: 0.15 }
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
