(() => {
  const config = window.INSPECT_ME_CONFIG || {};
  const downloads = config.downloads || {};
  const playUrl = config.playUrl || "";
  const releasesPage = config.releasesPage || "";

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

  function hasAnyDownload() {
    return Object.values(downloads).some(Boolean) || playUrl || releasesPage;
  }

  function openLink(url) {
    if (!url) return false;
    window.open(url, url.startsWith("http") ? "_blank" : "_self");
    return true;
  }

  function handlePlatform(platform) {
    const url = resolveUrl(platform);

    if (url) {
      openLink(url);
      return;
    }

    if (platform !== "play" && releasesPage) {
      openLink(releasesPage);
      showToast("Opening releases page…");
      return;
    }

    const labels = {
      play: "Web build",
      windows: "Windows build",
      mac: "macOS build",
      linux: "Linux build",
    };

    showToast(
      `${labels[platform] || "Download"} not linked yet — add the URL in config.js or drop a build in downloads/.`
    );
  }

  document.querySelectorAll("[data-platform]").forEach((btn) => {
    btn.addEventListener("click", () => handlePlatform(btn.dataset.platform));
  });

  document.querySelectorAll('[data-action="primary-cta"]').forEach((link) => {
    link.addEventListener("click", (e) => {
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
  const playBtn = document.getElementById("btn-play");

  function updateDownloadStatus() {
    const parts = [];

    if (playUrl) parts.push("Browser play ready");
    if (downloads.windows) parts.push("Windows ready");
    if (downloads.mac) parts.push("macOS ready");
    if (downloads.linux) parts.push("Linux ready");
    if (releasesPage && !parts.length) parts.push("Releases page linked");

    if (parts.length) {
      statusEl.textContent = parts.join(" · ");
    } else {
      statusEl.textContent = "Add build URLs in config.js to enable one-click download.";
    }

    if (playBtn) {
      playBtn.disabled = false;
      if (!playUrl) playBtn.title = "Set playUrl in config.js when your WebGL build is ready";
    }

    document.querySelectorAll(".btn-platform").forEach((btn) => {
      const platform = btn.dataset.platform;
      const url = downloads[platform];
      btn.disabled = !url && !releasesPage;
      if (url) btn.title = `Download for ${platform}`;
      else if (releasesPage) btn.title = "Opens releases page";
      else btn.title = "Coming soon — configure in config.js";
    });
  }

  updateDownloadStatus();

  // ── Particle canvas (underwater bubbles / plankton) ──
  const canvas = document.getElementById("particle-canvas");
  if (canvas && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const ctx = canvas.getContext("2d");
    let particles = [];
    let w = 0;
    let h = 0;

    function resize() {
      w = canvas.width = canvas.offsetWidth * devicePixelRatio;
      h = canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
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
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      resize();
      spawn();
    });
  }
})();
