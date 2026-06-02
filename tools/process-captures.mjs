/**
 * process-captures.mjs
 * ---------------------
 * Turns the raw in-game screen captures in assets/capturedFromGame/ into
 * web-optimized derivatives (WebP primary + JPEG fallback) in assets/images/.
 *
 * The raw PNGs are the source of truth — they are never modified. Re-run any
 * time the captures change:
 *
 *   node tools/process-captures.mjs
 */
import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "../assets/capturedFromGame");
const OUT = resolve(__dirname, "../assets/images");

// out name ← source, target width (height optional → cover-crop)
const JOBS = [
  // Three-vessel showcase cards (clean cinematic renders)
  { src: "image5.png", out: "vessel-destroyer", width: 900 },
  { src: "image6.png", out: "vessel-coastal", width: 900 },
  { src: "image7.png", out: "vessel-submarine", width: 900 },

  // Survey section — real hull with the actual inspection points
  { src: "image6.png", out: "survey-hull", width: 1180 },

  // Feature spotlight — full in-mission HUD (high-res capture)
  { src: "image.png", out: "spotlight-hud", width: 1600 },

  // Mission walkthrough: select → plan → dive
  { src: "image2.png", out: "step-select", width: 1100 },
  { src: "image8.png", out: "step-launch", width: 760 },
  { src: "image9.png", out: "step-dive", width: 1200 },

  // Social card (Open Graph / Twitter)
  { src: "og-source", file: "image5.png", out: "og-cover", width: 1200, height: 630 },
];

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

async function run() {
  await mkdir(OUT, { recursive: true });
  let total = 0;
  for (const job of JOBS) {
    const srcFile = join(SRC, job.file || job.src);
    const base = sharp(srcFile).rotate();
    const resized = job.height
      ? base.resize({ width: job.width, height: job.height, fit: "cover", position: "centre" })
      : base.resize({ width: job.width, fit: "inside" });

    const webpPath = join(OUT, `${job.out}.webp`);
    const jpgPath = join(OUT, `${job.out}.jpg`);

    await resized.clone().webp({ quality: 80, effort: 6 }).toFile(webpPath);
    await resized.clone().jpeg({ quality: 82, mozjpeg: true, progressive: true }).toFile(jpgPath);

    const [w, j] = await Promise.all([stat(webpPath), stat(jpgPath)]);
    total += w.size + j.size;
    console.log(`${job.out.padEnd(18)} webp ${kb(w.size).padStart(8)}   jpg ${kb(j.size).padStart(8)}`);
  }
  console.log(`\nTotal derivatives: ${kb(total)}`);
  await makeHeroShip();
}

/**
 * The hero's floating vessel. image5 is an above-water 3/4 render on a dark
 * background. To float it on the page's flat waterline with a bit of dynamic
 * stern-up pitch, we:
 *   1. luminance-key the bright ship off its dark background,
 *   2. pitch it stern-up, then
 *   3. lay a FLAT band of render-coloured water under the hull so it sits on a
 *      level sea — a band tilted WITH the ship would lift a dark wedge above
 *      the waterline at the raised stern. The water is feathered at its top,
 *      sides and bottom so it melts into the page's dark sea in both themes.
 */
async function makeHeroShip() {
  const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const PITCH = 8.5;       // degrees of stern-up pitch
  const WATER_TOP = 0.56;  // the flat sea surface, as a fraction of the pitched canvas
  const [WR, WG, WB] = [20, 42, 58];

  const { data, info } = await sharp(join(SRC, "image5.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;

  // 1. key the bright ship out of the dark background
  const ship = Buffer.from(data);
  for (let i = 0; i < w * h; i++) {
    const o = i * c;
    const lum = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
    ship[o + 3] = Math.round(smooth(44, 82, lum) * 255);
  }

  // 2. pitch the ship stern-up (transparent corners)
  const tilt = await sharp(ship, { raw: { width: w, height: h, channels: c } })
    .rotate(-PITCH, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer({ resolveWithObject: true });
  const { width: tw, height: th } = tilt.info;
  const td = tilt.data;

  // 3. lay a flat, feathered band of water under the hull
  const out = Buffer.from(td);
  for (let y = 0; y < th; y++) {
    const yn = y / th;
    const vBand = smooth(WATER_TOP - 0.015, WATER_TOP + 0.05, yn) * smooth(0.0, 0.28, 1 - yn);
    for (let x = 0; x < tw; x++) {
      const o = (y * tw + x) * c;
      const xn = x / tw;
      const water = vBand * smooth(0.0, 0.07, xn) * smooth(0.0, 0.07, 1 - xn);
      if (td[o + 3] / 255 < water) { out[o] = WR; out[o + 1] = WG; out[o + 2] = WB; out[o + 3] = Math.round(water * 255); }
    }
  }

  const cut = sharp(out, { raw: { width: tw, height: th, channels: c } });
  await cut.clone().webp({ quality: 86, effort: 6, alphaQuality: 90 }).toFile(join(OUT, "hero-ship.webp"));
  await cut.clone().png({ compressionLevel: 9, palette: true }).toFile(join(OUT, "hero-ship.png"));
  const [wf, pf] = await Promise.all([stat(join(OUT, "hero-ship.webp")), stat(join(OUT, "hero-ship.png"))]);
  console.log(`${"hero-ship".padEnd(18)} webp ${kb(wf.size).padStart(8)}   png ${kb(pf.size).padStart(8)}  (${tw}x${th}, pitched ${PITCH}°)`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
