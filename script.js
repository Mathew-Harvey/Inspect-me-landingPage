(() => {
  const config = window.INSPECT_ME_CONFIG || {};
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── GitHub links (config override, optional) ──
  if (config.githubUrl) {
    document.querySelectorAll('[data-github], #btn-github').forEach((el) => {
      if (el.tagName === "A") el.href = config.githubUrl;
    });
  }

  // ── Year ──
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ── Header scroll + sticky CTA ──
  const header = document.querySelector(".site-header");
  const stickyCta = document.getElementById("sticky-cta");
  const hero = document.querySelector(".hero");

  const onScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle("scrolled", y > 40);

    if (hero && stickyCta) {
      const heroBottom = hero.offsetTop + hero.offsetHeight * 0.6;
      const show = y > heroBottom;
      stickyCta.classList.toggle("visible", show);
      stickyCta.setAttribute("aria-hidden", show ? "false" : "true");
    }
  };

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

  navToggle?.addEventListener("click", () => {
    setMenu(navToggle.getAttribute("aria-expanded") !== "true");
  });

  mobileMenu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navToggle?.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      navToggle.focus();
    }
  });

  // ── Cursor glow ──
  const glow = document.querySelector(".cursor-glow");
  if (glow && !reduceMotion) {
    window.addEventListener("pointermove", (e) => {
      glow.style.left = `${e.clientX}px`;
      glow.style.top = `${e.clientY}px`;
    }, { passive: true });
  }

  // ── Scroll reveal ──
  const revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length && "IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("visible"));
  }

  // ── 3D ROV viewer: honour reduced motion (no auto-spin) ──
  const rov = document.getElementById("rov-viewer");
  if (rov && reduceMotion) rov.removeAttribute("auto-rotate");

  // ── Particle canvas (marine snow) ──
  const canvas = document.getElementById("particle-canvas");
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext("2d");
    let particles = [];

    function resize() {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }

    function spawn() {
      particles = Array.from({ length: 55 }, () => ({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        r: Math.random() * 2.5 + 0.5,
        speed: Math.random() * 0.4 + 0.15,
        drift: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.35 + 0.1,
      }));
    }

    function tick() {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      particles.forEach((p) => {
        p.y -= p.speed;
        p.x += p.drift;
        if (p.y < -10) {
          p.y = canvas.offsetHeight + 10;
          p.x = Math.random() * canvas.offsetWidth;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 230, 255, ${p.alpha})`;
        ctx.fill();
      });
      requestAnimationFrame(tick);
    }

    resize();
    spawn();
    tick();
    window.addEventListener("resize", () => { resize(); spawn(); });
  }
})();
