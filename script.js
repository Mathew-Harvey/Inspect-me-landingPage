(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Year ──
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ── Header scrolled state ──
  const header = document.querySelector(".site-header");
  const onScroll = () => header?.classList.toggle("scrolled", window.scrollY > 24);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ── Mobile nav ──
  const navToggle = document.querySelector(".nav-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  const setMenu = (open) => {
    if (!navToggle || !mobileMenu) return;
    navToggle.setAttribute("aria-expanded", String(open));
    mobileMenu.hidden = !open;
  };
  navToggle?.addEventListener("click", () => setMenu(navToggle.getAttribute("aria-expanded") !== "true"));
  mobileMenu?.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navToggle?.getAttribute("aria-expanded") === "true") { setMenu(false); navToggle.focus(); }
  });

  // ── 3D model switcher (single viewer, swap src) ──
  const viewer = document.getElementById("rov-viewer");
  const MODELS = {
    rov:       { src: "assets/models/rov.glb",       poster: "assets/images/rov-poster.png",       orbit: "-35deg 72deg 105%", role: "Pilot",   text: "the inspection ROV",        alt: "Interactive 3D model of a light inspection-class ROV" },
    submarine: { src: "assets/models/submarine.glb", poster: "assets/images/submarine-poster.png", orbit: "-35deg 80deg 110%", role: "Inspect", text: "a submarine hull",          alt: "Interactive 3D model of a submarine — an inspection target" },
    hull:      { src: "assets/models/hull.glb",      poster: "assets/images/hull-poster.png",      orbit: "-54deg 94deg 100%", role: "Inspect", text: "hull, propeller & rudder",  alt: "Interactive 3D model of a ship hull stern with propeller and rudder" },
  };

  if (viewer) {
    if (reduceMotion) viewer.removeAttribute("auto-rotate");

    const tabs = [...document.querySelectorAll(".switch-tab")];
    const caption = document.getElementById("stage-caption");
    const prefetched = new Set();

    const prefetch = (key) => {
      const m = MODELS[key];
      if (!m || prefetched.has(key)) return;
      prefetched.add(key);
      fetch(m.src).catch(() => {}); // warm the cache so the swap is instant
    };

    const select = (key) => {
      const m = MODELS[key];
      if (!m || viewer.getAttribute("src") === m.src) return;
      viewer.setAttribute("poster", m.poster);
      viewer.setAttribute("camera-orbit", m.orbit);
      viewer.setAttribute("alt", m.alt);
      viewer.setAttribute("src", m.src);
      if (caption) caption.innerHTML = `<span class="stage-role">${m.role}</span> — ${m.text} · drag to orbit`;
      tabs.forEach((t) => {
        const on = t.dataset.model === key;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", String(on));
      });
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(tab.dataset.model));
      tab.addEventListener("pointerenter", () => prefetch(tab.dataset.model));
      tab.addEventListener("focus", () => prefetch(tab.dataset.model));
      // arrow-key navigation across the tablist
      tab.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const next = (i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
        tabs[next].focus();
        select(tabs[next].dataset.model);
      });
    });
  }
})();
