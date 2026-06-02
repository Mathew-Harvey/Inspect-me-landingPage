(() => {
  const root = document.documentElement;
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

  // ── Theme: Surface (light) ⇄ Dive (dark) ──
  const themeBtn = document.getElementById("theme-btn");
  const themeLabel = document.getElementById("theme-btn-label");
  const diveBtn = document.getElementById("dive-handle");
  const readout = document.getElementById("dive-readout");
  const themeColor = document.querySelector('meta[name="theme-color"]');
  let depthTween;

  const setReadout = (dark, instant) => {
    if (!readout) return;
    const target = dark ? 40 : 0;
    const word = dark ? "DIVE" : "SURFACE";
    cancelAnimationFrame(depthTween);
    if (instant || reduceMotion) { readout.innerHTML = `${word} · ${target}&thinsp;m`; return; }
    const from = dark ? 0 : 40, dur = 650, t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const v = Math.round(from + (target - from) * k);
      readout.innerHTML = `${word} · ${v}&thinsp;m`;
      if (k < 1) depthTween = requestAnimationFrame(step);
    };
    depthTween = requestAnimationFrame(step);
  };

  const syncUI = (dark, instant) => {
    themeBtn?.setAttribute("aria-checked", String(dark));
    if (themeLabel) themeLabel.textContent = dark ? "Dive" : "Surface";
    themeColor?.setAttribute("content", dark ? "#06141C" : "#F4F1EA");
    setReadout(dark, instant);
  };

  const applyTheme = (theme) => {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem("im-theme", theme); } catch (e) {}
    syncUI(theme === "dark", false);
  };
  const toggleTheme = () => applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");

  themeBtn?.addEventListener("click", toggleTheme);
  diveBtn?.addEventListener("click", toggleTheme);
  syncUI(root.getAttribute("data-theme") === "dark", true); // initial, no animation

  // follow OS preference if the user hasn't chosen
  try {
    if (!localStorage.getItem("im-theme")) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", (e) => applyTheme(e.matches ? "dark" : "light"));
    }
  } catch (e) {}

  // ── Inspection target capture (one beat of the game loop) ──
  let captured = 0;
  const countEl = document.getElementById("capture-count");
  document.querySelectorAll(".hotspot").forEach((hot) => {
    hot.addEventListener("click", () => {
      const fig = hot.closest(".target");
      if (!fig || fig.classList.contains("captured")) return;
      fig.classList.add("captured");
      const cap = fig.querySelector(".t-cap");
      if (cap) cap.textContent = "✓ captured";
      captured += 1;
      if (countEl) countEl.textContent = `${captured} / 3 captured`;
    });
  });

  // ── Reduced motion: still the model + freeze the refraction shimmer ──
  if (reduceMotion) {
    document.getElementById("rov-viewer")?.removeAttribute("auto-rotate");
    document.querySelector("svg.svg-defs")?.pauseAnimations?.();
  }
})();
