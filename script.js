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

  // ── Theme: Dive (dark, default) ⇄ Surface (light) ──
  const themeBtn = document.getElementById("theme-btn");
  const themeLabel = document.getElementById("theme-btn-label");
  const themeColor = document.querySelector('meta[name="theme-color"]');

  const syncUI = (dark) => {
    themeBtn?.setAttribute("aria-checked", String(dark));
    if (themeLabel) themeLabel.textContent = dark ? "Dive" : "Surface";
    themeColor?.setAttribute("content", dark ? "#05121B" : "#F4F1EA");
  };

  const applyTheme = (theme) => {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem("im-theme", theme); } catch (e) {}
    syncUI(theme === "dark");
  };
  const toggleTheme = () => applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");

  themeBtn?.addEventListener("click", toggleTheme);
  syncUI(root.getAttribute("data-theme") === "dark");

  // ── Inspection capture: one beat of the real survey loop ──
  const hotspots = Array.from(document.querySelectorAll(".hotspot"));
  const countEl = document.getElementById("capture-count");
  const total = hotspots.length;
  let captured = 0;
  hotspots.forEach((hot) => {
    hot.addEventListener("click", () => {
      if (hot.classList.contains("is-captured")) return;
      hot.classList.add("is-captured");
      captured += 1;
      if (countEl) {
        countEl.textContent =
          captured >= total
            ? `✓ ${captured} / ${total} sampled · 26 on the full hull`
            : `${captured} / ${total} sampled`;
      }
    });
  });

  // ── Reduced motion: still the model ──
  if (reduceMotion) {
    document.getElementById("rov-viewer")?.removeAttribute("auto-rotate");
  }

  // ── The descent: depth gauge + scroll-driven darkening ──────────────
  root.classList.add("js");

  const rovMark = document.getElementById("dg-rov");
  const depthEl = document.getElementById("dg-depth");
  const MAX_DEPTH = 60; // metres "reached" at the seabed (bottom of the page)

  let depthTick = false;
  const updateDepth = () => {
    depthTick = false;
    const max = (document.documentElement.scrollHeight - window.innerHeight) || 1;
    const p = Math.min(1, Math.max(0, window.scrollY / max));
    root.style.setProperty("--depth", p.toFixed(4));
    if (depthEl) depthEl.textContent = Math.round(p * MAX_DEPTH);
    if (rovMark) rovMark.style.top = (p * 100).toFixed(2) + "%";
  };
  const onDepthScroll = () => {
    if (!depthTick) { depthTick = true; requestAnimationFrame(updateDepth); }
  };
  window.addEventListener("scroll", onDepthScroll, { passive: true });
  window.addEventListener("resize", onDepthScroll, { passive: true });
  updateDepth();

  // ── Reveal content as it rises out of the dark ──────────────────────
  if (!reduceMotion && "IntersectionObserver" in window) {
    const targets = document.querySelectorAll(
      ".hero-cmd, .section-head, .real-photo, .vehicle-info, .vehicle-stage, .survey-stage," +
      " .targets-intro, .harbour-banner, .vessel-card, .manifest-card, .spotlight, .spotlight-legend li," +
      " .feature, .spec-card, .walk-step, .paper-card, .follow, .faq-list details, .il-inner"
    );
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    targets.forEach((t) => {
      t.classList.add("reveal");
      // gentle cascade for items within a shared parent (grids, lists)
      const idx = t.parentElement ? Array.prototype.indexOf.call(t.parentElement.children, t) : 0;
      t.style.transitionDelay = Math.min(idx, 6) * 60 + "ms";
      io.observe(t);
    });
  }
})();
