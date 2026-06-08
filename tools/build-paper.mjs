/**
 * build-paper.mjs
 * ---------------
 * Turns the technical paper (content/paper.md) into:
 *   1. paper.html  — a branded, math-rendered, illustrated reading page, and
 *   2. downloads/Inspect-Me-Simulator-Paper.pdf — a print-quality PDF.
 *
 * Math is rendered with KaTeX at build time (no runtime JS / no CDN); the
 * KaTeX stylesheet + woff2 fonts are vendored under assets/vendor/katex/.
 * The PDF is produced by driving the locally-installed Chrome/Edge via
 * puppeteer-core — nothing is downloaded.
 *
 *   node tools/build-paper.mjs
 *
 * Refresh the source first if the paper changed upstream:
 *   copy ..\Inspect-Me\Docs\Inspect-Me-Simulator-Paper.md content\paper.md
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { marked } from "marked";
import katex from "katex";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = resolve(ROOT, "content/paper.md");
const OUT_HTML = resolve(ROOT, "paper.html");
const OUT_PDF = resolve(ROOT, "downloads/Inspect-Me-Simulator-Paper.pdf");
const OUT_COVER = resolve(ROOT, "assets/images/paper-cover.jpg");

// ── Figures: every illustration is a real photo, a real in-game capture, or a
//    hand-authored diagram. Nothing is synthetic. {N} is filled with the running
//    figure number once their order in the document is known. ─────────────────
const FIGURES = {
  vehicle: `
<figure class="fig fig-two">
  <div class="fig-imgs">
    <span class="subfig"><img src="assets/images/field-deck.jpg" alt="A light inspection-class ROV on a quayside with its surface tether reel" /><span class="sublbl">(a)</span></span>
    <span class="subfig"><img src="assets/images/field-reel.jpg" alt="The ROV and its tether reel staged at the waterline before deployment" /><span class="sublbl">(b)</span></span>
  </div>
  <figcaption><b>Figure {N}.</b> The reference vehicle class (illustrative renders). A light inspection-class ROV with its surface tether reel: (a) the open frame, vectored thrusters and twin pressure housings on the quay; (b) staged at the waterline before deployment. Inspect&#8209;Me models this category — a compact, near-neutrally buoyant observation vehicle flown on four degrees of freedom by a single pilot.</figcaption>
</figure>`,
  arch: `
<figure class="fig">
  <img class="fig-svg" src="assets/paper/fig-architecture.svg" alt="System architecture: a single Unity URP process containing dynamics, control, the umbilical solver, the environment model, the inspection task and rendering, with an outbound MJPEG stream to an observer" />
  <figcaption><b>Figure {N}.</b> System architecture. A single Unity (URP) process contains the dynamics, control, umbilical solver, environment model, inspection task and rendering, sharing one address space and one coordinate frame, with an optional outbound MJPEG video stream for a second-screen observer. There is no external ROS/Gazebo server, no inter-process bridge and no dual-frame conversion.</figcaption>
</figure>`,
  vis: `
<figure class="fig fig-two">
  <div class="fig-imgs">
    <span class="subfig"><img src="assets/images/paper-vis-clear.jpg" alt="An in-sim hull survey rendered at high selected visibility (clear water)" /><span class="sublbl">(a)</span></span>
    <span class="subfig"><img src="assets/images/paper-vis-murky.jpg" alt="A comparable in-sim hull survey rendered at low selected visibility (murky water)" /><span class="sublbl">(b)</span></span>
  </div>
  <figcaption><b>Figure {N}.</b> Selectable visibility as a trainable difficulty axis (in-sim captures). The same class of close hull survey at (a) high and (b) low selected visibility: reducing clarity shortens the rendered range and adds scatter, so a hard dive is genuinely murkier rather than merely darker.</figcaption>
</figure>`,
  hud: `
<figure class="fig">
  <img src="assets/images/spotlight-hud.jpg" alt="The in-mission FPV view with telemetry, the component checklist, the video-stream panel, a capture reticle and the dual-stick control guide" />
  <figcaption><b>Figure {N}.</b> The in-mission FPV photo-survey view (in-sim capture). Live telemetry sits at the left; the General-Arrangement component count, score and dive clock run along the top; the MJPEG video-stream panel is at the upper right; a capture reticle is locked onto a target component; and the dual-stick control guide sits at the lower right.</figcaption>
</figure>`,
};

function renderMath(md) {
  const store = [];
  const stash = (html) => {
    const id = `MATHPLACEHOLDER${store.length}ENDMATH`;
    store.push(html);
    return id;
  };
  // Display math first ($$ ... $$), then inline ($ ... $).
  md = md.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) =>
    "\n\n" + stash(katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false, strict: false })) + "\n\n"
  );
  md = md.replace(/\$([^$\n]+?)\$/g, (_, tex) =>
    stash(katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false, strict: false }))
  );
  return { md, store };
}

function restoreMath(html, store) {
  return html.replace(/MATHPLACEHOLDER(\d+)ENDMATH/g, (_, i) => store[Number(i)]);
}

async function buildHtmlBody() {
  let md = await readFile(SRC, "utf8");

  // Split off the title / authors / abstract so we can render a clean header.
  const title = (md.match(/^#\s+(.+)$/m)?.[1] || "Inspect-Me Technical Paper").trim();
  const absStart = md.indexOf("## Abstract");
  const introStart = md.indexOf("## 1. Introduction");
  const front = md.slice(0, absStart);
  const head = md.slice(absStart, introStart);
  let body = md.slice(introStart);

  // Authors (drop the editorial "(add co-authors…)" placeholder note).
  let authors = (front.match(/\*\*Authors:\*\*\s*(.+)/)?.[1] || "Mathew Harvey")
    .replace(/\*\(add co-authors[^)]*\)\*/i, "")
    .trim();
  const affiliation = (front.match(/\n\s*(¹[^\n]+)/)?.[1] || "").replace(/\*/g, "").trim();

  // Abstract + keywords.
  const abstract = head.replace("## Abstract", "").split("**Keywords:**")[0].replace(/---/g, "").trim();
  const keywords = (head.match(/\*\*Keywords:\*\*\s*([\s\S]*?)(?:\n\s*---|\n\s*$|$)/)?.[1] || "").replace(/\*/g, "").trim();

  // ── Figure placement ──────────────────────────────────────────────────────
  // Reference-vehicle photos close the Introduction.
  body = body.replace(/\n(## 2\. ROV Simulator Model)/, "\n\n@@FIG:vehicle@@\n\n$1");
  // Architecture diagram replaces its callout in §3.1.
  body = body.replace(/^>\s*\*Figure 1\.\*[\s\S]*?\n(?=\n|$)/m, "\n@@FIG:arch@@\n");
  // Selectable-visibility comparison replaces the §4 callout (the Fig 2 / Fig 3 block).
  body = body.replace(/^>\s*\*Figure 2\.\*[\s\S]*?LoF 5[^\n]*\n/m, "\n@@FIG:vis@@\n");
  // The in-mission HUD figure closes §5.1 (just before the umbilical subsection).
  body = body.replace(/\n(### 5\.2 Simulated umbilical)/, "\n\n@@FIG:hud@@\n\n$1");
  // Drop the remaining image-less figure callouts; the prose already covers them.
  body = body.replace(/^>\s*\*Figure \d\.\*[^\n]*\n/gm, "");
  // Remove stray horizontal rules.
  body = body.replace(/^---\s*$/gm, "");

  // Render math → placeholders, run markdown, restore math.
  const a = renderMath(body);
  let bodyHtml = restoreMath(marked.parse(a.md, { gfm: true }), a.store);

  const ha = renderMath(abstract);
  const abstractHtml = restoreMath(marked.parseInline(ha.md), ha.store);

  // Number the figures by the order they appear in the rendered document.
  let n = 0;
  bodyHtml = bodyHtml.replace(/<p>\s*@@FIG:([a-z]+)@@\s*<\/p>|@@FIG:([a-z]+)@@/g, (_, a1, a2) => {
    const key = a1 || a2;
    n += 1;
    return (FIGURES[key] || "").replace(/\{N\}/g, String(n));
  });

  return { title, authors, affiliation, abstractHtml, keywords, bodyHtml };
}

function page({ title, authors, affiliation, abstractHtml, keywords, bodyHtml }) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="description" content="${title} — a technical paper on the Inspect-Me light inspection-class ROV training simulator." />
<title>${title} — Inspect-Me</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230E2A38'/%3E%3Cpath d='M2 18h28' stroke='%230E6E8C' stroke-width='1.5'/%3E%3Ccircle cx='16' cy='12' r='3.4' fill='%23E8A13C'/%3E%3C/svg%3E" />
<link rel="stylesheet" href="assets/vendor/katex/katex.min.css" />
<style>
  :root{
    --ink:#16242c; --muted:#5b6f78; --rule:#d7ded8; --accent:#0E6E8C; --amber:#B96A12;
    --paper:#ffffff; --tint:#f4f7f5;
    --serif:"Source Serif 4",Georgia,"Times New Roman",serif;
    --sans:"Inter",-apple-system,"Segoe UI",Arial,sans-serif;
  }
  *{box-sizing:border-box;}
  html{-webkit-text-size-adjust:100%;}
  body{margin:0;background:#e9ece8;color:var(--ink);font-family:var(--serif);
    font-size:17px;line-height:1.62;-webkit-font-smoothing:antialiased;}

  /* on-screen utility bar (hidden when printing) */
  .toolbar{position:sticky;top:0;z-index:10;display:flex;gap:1rem;align-items:center;
    justify-content:space-between;padding:.7rem 1.1rem;background:#0B1F2B;color:#E9F3F6;
    font-family:var(--sans);font-size:.85rem;}
  .toolbar a{color:#E9F3F6;text-decoration:none;display:inline-flex;align-items:center;gap:.45rem;}
  .toolbar .home{opacity:.85;}
  .toolbar .home:hover{opacity:1;}
  .toolbar .dl{background:#4FD0E6;color:#04121A;font-weight:700;padding:.45rem .9rem;border-radius:6px;}
  .toolbar .dl:hover{background:#6fdcee;}

  .sheet{max-width:820px;margin:26px auto;background:var(--paper);
    padding:64px 72px;box-shadow:0 18px 50px -28px rgba(0,0,0,.5);border-radius:2px;}

  .brand{display:flex;align-items:center;justify-content:space-between;
    font-family:var(--sans);font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;
    color:var(--muted);border-bottom:1px solid var(--rule);padding-bottom:.7rem;margin-bottom:2rem;}
  .brand b{color:var(--accent);font-weight:700;}
  .brand .mark{display:inline-flex;align-items:center;gap:.5rem;}
  .brand .dot{width:9px;height:9px;border-radius:50%;background:var(--amber);display:inline-block;}

  h1.title{font-size:2.05rem;line-height:1.18;font-weight:700;letter-spacing:-.01em;margin:0 0 1rem;}
  .byline{font-family:var(--sans);font-size:.98rem;color:var(--ink);margin:0 0 .25rem;}
  .affil{font-family:var(--sans);font-size:.82rem;color:var(--muted);margin:0 0 1.8rem;font-style:italic;}

  .abstract{background:var(--tint);border:1px solid var(--rule);border-left:3px solid var(--accent);
    border-radius:4px;padding:1.1rem 1.3rem;margin:0 0 1.4rem;font-size:.96rem;line-height:1.6;}
  .abstract .lbl{font-family:var(--sans);font-size:.66rem;letter-spacing:.16em;text-transform:uppercase;
    color:var(--accent);font-weight:700;display:block;margin-bottom:.5rem;}
  .keywords{font-size:.86rem;color:var(--muted);margin:0 0 2.2rem;}
  .keywords b{font-family:var(--sans);color:var(--ink);}

  h2{font-size:1.32rem;font-weight:700;margin:2.4rem 0 .8rem;line-height:1.25;
    padding-bottom:.3rem;border-bottom:1px solid var(--rule);}
  h3{font-size:1.06rem;font-weight:700;margin:1.7rem 0 .5rem;font-family:var(--sans);}
  p{margin:0 0 1rem;}
  a{color:var(--accent);}
  strong{font-weight:700;}
  ol,ul{margin:0 0 1rem;padding-left:1.4rem;}
  li{margin:.3rem 0;}
  blockquote{margin:1rem 0;padding:.6rem 1rem;border-left:3px solid var(--rule);color:var(--muted);}
  code{font-family:"IBM Plex Mono",ui-monospace,Menlo,monospace;font-size:.86em;
    background:var(--tint);padding:.08em .35em;border-radius:3px;}

  table{width:100%;border-collapse:collapse;font-family:var(--sans);font-size:.82rem;margin:1rem 0 1.4rem;}
  th,td{border:1px solid var(--rule);padding:.5rem .65rem;text-align:left;vertical-align:top;}
  thead th{background:var(--tint);font-weight:700;}

  figure.fig{margin:1.8rem 0;text-align:center;}
  figure.fig img{max-width:100%;height:auto;border:1px solid var(--rule);border-radius:4px;}
  figure.fig img.fig-svg{border-color:#e4e9e4;background:#fff;}
  .fig-imgs{display:flex;gap:14px;justify-content:center;align-items:flex-start;}
  .fig-imgs .subfig{position:relative;flex:1 1 0;min-width:0;}
  .fig-imgs .subfig img{width:100%;}
  .sublbl{position:absolute;left:8px;top:8px;font-family:var(--sans);font-size:.68rem;font-weight:700;
    color:#fff;background:rgba(11,31,43,.78);padding:.05rem .4rem;border-radius:3px;}
  figcaption{font-family:var(--sans);font-size:.8rem;line-height:1.5;color:var(--muted);
    margin-top:.6rem;text-align:left;}
  figcaption b{color:var(--ink);}

  .katex-display{margin:1.1rem 0;overflow-x:auto;overflow-y:hidden;}
  .refs p,#references + * p{}
  hr{border:0;border-top:1px solid var(--rule);margin:2rem 0;}

  .foot{margin-top:2.6rem;padding-top:1rem;border-top:1px solid var(--rule);
    font-family:var(--sans);font-size:.76rem;color:var(--muted);}

  @media (max-width:680px){
    .sheet{padding:34px 22px;margin:0;}
    body{font-size:16px;}
    .fig-imgs{flex-direction:column;}
    h1.title{font-size:1.6rem;}
  }

  @media print{
    @page{size:A4;margin:18mm 17mm 20mm;}
    html,body{background:#fff;}
    .toolbar{display:none;}
    .sheet{max-width:none;margin:0;padding:0;box-shadow:none;border-radius:0;}
    a{color:var(--ink);text-decoration:none;}
    h2,h3{break-after:avoid;}
    figure.fig,table,.katex-display{break-inside:avoid;}
    *{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  }
</style>
</head>
<body>
  <div class="toolbar no-print">
    <a class="home" href="index.html">&#8592; Inspect-Me</a>
    <a class="dl" href="downloads/Inspect-Me-Simulator-Paper.pdf" download>Download PDF</a>
  </div>
  <article class="sheet">
    <div class="brand">
      <span class="mark"><span class="dot"></span> <b>Inspect&#8209;Me</b></span>
      <span>Technical Paper &middot; Preprint</span>
    </div>
    <h1 class="title">${title}</h1>
    <p class="byline">${authors}</p>
    ${affiliation ? `<p class="affil">${affiliation}</p>` : ""}
    <div class="abstract"><span class="lbl">Abstract</span>${abstractHtml}</div>
    ${keywords ? `<p class="keywords"><b>Keywords —</b> ${keywords}</p>` : ""}
    ${bodyHtml}
    <p class="foot">Inspect&#8209;Me &middot; light inspection-class ROV training simulator &middot; ${year}. Generated from the project paper; figures are real photographs, in-sim captures, or hand-authored diagrams.</p>
  </article>
</body>
</html>`;
}

function findBrowser() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const candidates = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
  ];
  return candidates.find((p) => existsSync(p));
}

async function makePdf() {
  const exe = findBrowser();
  if (!exe) {
    console.warn("! No Chrome/Edge found — skipped PDF. Set CHROME_PATH or open paper.html and 'Save as PDF'.");
    return;
  }
  const { default: puppeteer } = await import("puppeteer-core");
  const browser = await puppeteer.launch({ executablePath: exe, headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
  try {
    const pg = await browser.newPage();
    await pg.goto(pathToFileURL(OUT_HTML).href, { waitUntil: "networkidle0" });
    await pg.evaluate(() => document.fonts && document.fonts.ready);
    await pg.pdf({ path: OUT_PDF, printBackground: true, preferCSSPageSize: true });
    console.log(`PDF      → ${OUT_PDF}`);

    // First-page preview thumbnail for the landing-page paper card.
    await pg.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 });
    await pg.evaluate(() => { const t = document.querySelector(".toolbar"); if (t) t.style.display = "none"; });
    const sheet = await pg.$(".sheet");
    const box = await sheet.boundingBox();
    await pg.screenshot({
      path: OUT_COVER,
      type: "jpeg",
      quality: 86,
      clip: { x: box.x, y: box.y, width: box.width, height: Math.round(box.width * 1.3) },
    });
    console.log(`cover    → ${OUT_COVER}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  await mkdir(dirname(OUT_PDF), { recursive: true });
  const data = await buildHtmlBody();
  await writeFile(OUT_HTML, page(data), "utf8");
  console.log(`paper.html → ${OUT_HTML}`);
  await makePdf();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
