(() => {
  const config = window.INSPECT_ME_CONFIG || {};
  const comingSoon = config.comingSoon !== false;
  const downloads = config.downloads || {};
  const playUrl = config.playUrl || "";
  const releasesPage = config.releasesPage || "";
  const githubUrl = config.githubUrl || releasesPage.replace(/\/releases.*$/, "") || "";

  if (githubUrl) {
    const githubBtn = document.getElementById("btn-github");
    if (githubBtn) githubBtn.href = githubUrl;
  }

  // ── Year ──
  document.getElementById("year").textContent = new Date().getFullYear();

  // ── Header scroll ──
  const header = document.querySelector(".site-header");
  const stickyCta = document.getElementById("sticky-cta");
  const hero = document.querySelector(".hero");

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle("scrolled", y > 40);

    if (hero) {
      const heroBottom = hero.offsetTop + hero.offsetHeight * 0.6;
      stickyCta.classList.toggle("visible", y > heroBottom);
      stickyCta.setAttribute("aria-hidden", y <= heroBottom ? "true" : "false");
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ── Mobile nav ──
  const navToggle = document.querySelector(".nav-toggle");
  const mobileMenu = document.getElementById("mobile-menu");

  navToggle?.addEventListener("click", () => {
    const open = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!open));
    mobileMenu.hidden = open;
  });

  mobileMenu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu.hidden = true;
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  // ── Cursor glow ──
  const glow = document.querySelector(".cursor-glow");
  if (glow && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.addEventListener("pointermove", (e) => {
      glow.style.left = `${e.clientX}px`;
      glow.style.top = `${e.clientY}px`;
    }, { passive: true });
  }

  // ── Scroll reveal ──
  const revealEls = document.querySelectorAll(".reveal");
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

  // ── Toast ──
  const toast = document.getElementById("toast");
  let toastTimer;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 4200);
  }

  // ── Download / play logic ──
  function resolveUrl(platform) {
    if (platform === "play") return playUrl;
    return downloads[platform] || "";
  }

  function openLink(url) {
    if (!url) return false;
    window.open(url, url.startsWith("http") ? "_blank" : "_self");
    return true;
  }

  function handlePlatform(platform) {
    if (comingSoon) {
      showToast("Coming soon — star the repo on GitHub for launch updates.");
      return;
    }

    const url = resolveUrl(platform);
    if (url) {
      openLink(url);
      return;
    }

    if (releasesPage) {
      openLink(releasesPage);
      showToast("Opening releases page…");
      return;
    }

    showToast("Download not available yet.");
  }

  document.querySelectorAll("[data-platform]").forEach((btn) => {
    btn.addEventListener("click", () => handlePlatform(btn.dataset.platform));
  });

  document.querySelectorAll('[data-action="primary-cta"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      if (comingSoon) return;

      if (playUrl) {
        e.preventDefault();
        openLink(playUrl);
        return;
      }

      const firstDownload = downloads.windows || downloads.mac || downloads.linux;
      if (firstDownload) {
        e.preventDefault();
        openLink(firstDownload);
        return;
      }

      if (releasesPage) {
        e.preventDefault();
        openLink(releasesPage);
      }
    });
  });

  // ── Update download UI state ──
  const statusEl = document.getElementById("download-status");

  function updateDownloadStatus() {
    if (!statusEl) return;

    if (comingSoon) {
      statusEl.textContent = "First public release coming soon.";
      return;
    }

    const parts = [];
    if (playUrl) parts.push("Browser play ready");
    if (downloads.windows) parts.push("Windows ready");
    if (downloads.mac) parts.push("macOS ready");
    if (downloads.linux) parts.push("Linux ready");
    if (releasesPage && !parts.length) parts.push("Releases page linked");

    statusEl.textContent = parts.length
      ? parts.join(" · ")
      : "Add build URLs in config.js to enable one-click download.";
  }

  updateDownloadStatus();

  // ── Particle canvas ──
  const canvas = document.getElementById("particle-canvas");
  if (canvas && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
    window.addEventListener("resize", () => {
      resize();
      spawn();
    });
  }
})();
