/**
 * process-renders.mjs
 * -------------------
 * Turns the high-res concept renders in assets/ (Inspectme1..3.png) into
 * web-optimized derivatives (WebP primary + JPEG fallback) in assets/images/.
 *
 * The source PNGs are ~2 MB each — far too heavy to ship as a hero. Re-run any
 * time the renders change:
 *
 *   node tools/process-renders.mjs
 */
import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "../assets");
const OUT = resolve(__dirname, "../assets/images");

const JOBS = [
  // The finished poster (baked title + HUD) — the cinematic hero background
  { src: "Inspectme1.png", out: "hero-console", width: 1920 },
  // Clean plate (no marketing title) — used for the deeper "operations" band
  { src: "Inspectme3.png", out: "hero-plate", width: 1920 },
  // A second framing for the survey / wide showcase
  { src: "Inspectme2.png", out: "hero-wide", width: 1600 },
  // Social card (Open Graph / Twitter) — cover-cropped from the poster
  { src: "Inspectme1.png", out: "og-cover", width: 1200, height: 630 },
];

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

async function run() {
  await mkdir(OUT, { recursive: true });
  let total = 0;
  for (const job of JOBS) {
    const base = sharp(join(SRC, job.src)).rotate();
    const resized = job.height
      ? base.resize({ width: job.width, height: job.height, fit: "cover", position: "centre" })
      : base.resize({ width: job.width, fit: "inside" });

    const webpPath = join(OUT, `${job.out}.webp`);
    const jpgPath = join(OUT, `${job.out}.jpg`);

    await resized.clone().webp({ quality: 82, effort: 6 }).toFile(webpPath);
    await resized.clone().jpeg({ quality: 84, mozjpeg: true, progressive: true }).toFile(jpgPath);

    const [w, j] = await Promise.all([stat(webpPath), stat(jpgPath)]);
    total += w.size + j.size;
    console.log(`${job.out.padEnd(14)} webp ${kb(w.size).padStart(8)}   jpg ${kb(j.size).padStart(8)}`);
  }
  console.log(`\nTotal derivatives: ${kb(total)}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
