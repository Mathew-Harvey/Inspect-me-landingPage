/**
 * build-models.mjs — author the hero's 3D ROV as binary glTF, plus the underwater
 * lighting environment. Generic & unbranded. Inspection *targets* are drawn as 2D
 * GA-blueprint SVG on the page (see index.html), so the ROV is the only 3D model. Run:
 *   node tools/build-models.mjs
 * Outputs: assets/models/rov.glb and assets/models/env-underwater.png
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { newGroups, add, assembleGlb, encodePNG, makeBox, makeCyl, makeSphere, makeTorus, D } from "./glb-lib.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "models");

// Reusable ducted thruster (axis via rot).
function thruster(g, { tx, ty, tz, rx = 0, ry = 0, rz = 0 }) {
  add(g, "thruster", makeCyl(0.034, 0.034, 0.05, 22, false), { rx, ry, rz, tx, ty, tz });
  add(g, "thruster", makeCyl(0.032, 0.032, 0.052, 22, false), { rx, ry, rz, tx, ty, tz });
  add(g, "steel", makeCyl(0.012, 0.012, 0.04, 14, true), { rx, ry, rz, tx, ty, tz });
  add(g, "accent", makeTorus(0.03, 0.004, 20, 6), { rx: rx + 90 * D, ry, rz, tx, ty, tz });
}

// ════════════════════════════ ROV ════════════════════════════
function buildRov() {
  const g = newGroups();
  for (const sx of [-1, 1]) {
    const px = 0.135 * sx, py = 0.06;
    add(g, "hull", makeCyl(0.05, 0.05, 0.52, 24, false), { rx: 90 * D, tx: px, ty: py });
    add(g, "hull", makeSphere(0.05, 16, 10), { tx: px, ty: py, tz: 0.26 });
    add(g, "hull", makeSphere(0.05, 16, 10), { tx: px, ty: py, tz: -0.26 });
    add(g, "accent", makeTorus(0.051, 0.008, 22, 8), { rx: 90 * D, tx: px, ty: py, tz: 0.17 });
    add(g, "shell", makeBox(0.014, 0.09, 0.34), { tx: 0.16 * sx, ty: 0.02 });
  }
  add(g, "shell", makeBox(0.20, 0.05, 0.30), { ty: 0.105, tz: -0.01 });
  add(g, "shell", makeBox(0.16, 0.02, 0.26), { ty: 0.135, tz: -0.01 });
  add(g, "shell", makeCyl(0.055, 0.055, 0.30, 26, true), { rx: 90 * D, ty: 0.02 });
  add(g, "shell", makeCyl(0.05, 0.05, 0.06, 24, true), { rx: 90 * D, ty: 0.02, tz: 0.18 });
  add(g, "dome", makeSphere(0.046, 20, 14), { ty: 0.02, tz: 0.205 });
  add(g, "accent", makeTorus(0.03, 0.006, 22, 8), { rx: 90 * D, ty: 0.02, tz: 0.224 });
  add(g, "frame", makeBox(0.24, 0.022, 0.022), { ty: 0.085, tz: 0.165 });
  for (let i = -2; i <= 2; i++) add(g, "led", makeBox(0.022, 0.016, 0.012), { tx: i * 0.045, ty: 0.085, tz: 0.177 });
  for (const sx of [-1, 1]) add(g, "frame", makeBox(0.012, 0.012, 0.5), { tx: 0.155 * sx, ty: -0.025 });
  for (const sz of [-1, 1]) add(g, "frame", makeBox(0.34, 0.012, 0.012), { ty: -0.025, tz: 0.22 * sz });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, "frame", makeBox(0.012, 0.1, 0.012), { tx: 0.15 * sx, ty: 0.02, tz: 0.2 * sz });
  thruster(g, { tx: -0.075, ty: 0.05, tz: -0.03 });
  thruster(g, { tx: 0.075, ty: 0.05, tz: -0.03 });
  thruster(g, { tx: -0.15, ty: 0, tz: 0.16, rx: 90 * D, ry: 30 * D });
  thruster(g, { tx: 0.15, ty: 0, tz: 0.16, rx: 90 * D, ry: -30 * D });
  thruster(g, { tx: -0.15, ty: 0, tz: -0.18, rx: 90 * D, ry: -30 * D });
  thruster(g, { tx: 0.15, ty: 0, tz: -0.18, rx: 90 * D, ry: 30 * D });
  add(g, "frame", makeBox(0.05, 0.04, 0.05), { ty: -0.05, tz: 0.16 });
  add(g, "steel", makeCyl(0.012, 0.012, 0.11, 14, true), { rx: 55 * D, ty: -0.085, tz: 0.21 });
  add(g, "steel", makeBox(0.016, 0.016, 0.05), { rx: 20 * D, ty: -0.125, tz: 0.255 });
  add(g, "steel", makeBox(0.008, 0.04, 0.012), { rx: 20 * D, rz: 18 * D, tx: -0.012, ty: -0.145, tz: 0.275 });
  add(g, "steel", makeBox(0.008, 0.04, 0.012), { rx: 20 * D, rz: -18 * D, tx: 0.012, ty: -0.145, tz: 0.275 });
  add(g, "frame", makeCyl(0.022, 0.026, 0.03, 16, true), { ty: 0.13, tz: -0.1 });
  add(g, "frame", makeCyl(0.01, 0.01, 0.06, 12, true), { rx: -18 * D, ty: 0.17, tz: -0.115 });
  add(g, "dome", makeSphere(0.014, 12, 8), { ty: 0.2, tz: -0.125 });
  for (const sx of [-1, 1]) add(g, "frame", makeBox(0.012, 0.06, 0.012), { tx: 0.07 * sx, ty: 0.165, tz: 0.06 });
  add(g, "frame", makeBox(0.155, 0.012, 0.012), { ty: 0.195, tz: 0.06 });
  return g;
}

// ════════════════════════ underwater environment (equirect, lighting only) ════════════════════════
function buildEnv() {
  const w = 768, h = 384, px = Buffer.alloc(w * h * 3);
  const stops = [
    [0.00, [0.62, 0.80, 0.88]],  // zenith — surface light
    [0.16, [0.18, 0.42, 0.50]],
    [0.42, [0.06, 0.20, 0.27]],
    [0.72, [0.03, 0.09, 0.14]],
    [1.00, [0.01, 0.04, 0.07]],  // nadir — abyss floor
  ];
  const lerp = (a, b, t) => a + (b - a) * t;
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1);
    let c = stops[0][1];
    for (let s = 1; s < stops.length; s++) {
      if (v <= stops[s][0]) { const [v0, c0] = stops[s - 1], [v1, c1] = stops[s]; const t = (v - v0) / (v1 - v0); c = c0.map((ch, k) => lerp(ch, c1[k], t)); break; }
    }
    for (let x = 0; x < w; x++) {
      // soft bright "surface sun" near the top-centre for a directional key
      const u = x / (w - 1);
      const sun = Math.max(0, 1 - Math.hypot((u - 0.5) * 2.2, (v - 0.04) * 6)) * 0.5;
      const o = (y * w + x) * 3;
      px[o] = Math.min(255, (c[0] + sun) * 255);
      px[o + 1] = Math.min(255, (c[1] + sun) * 255);
      px[o + 2] = Math.min(255, (c[2] + sun) * 255);
    }
  }
  writeFileSync(join(OUT, "env-underwater.png"), encodePNG(px, w, h, 3));
  return `env-underwater.png ${w}x${h}`;
}

// ── write everything ──
{
  const { glb, tris, materials } = assembleGlb(buildRov());
  writeFileSync(join(OUT, "rov.glb"), glb);
  console.log(`✓ rov.glb  ${(glb.length / 1024).toFixed(0)} KB · ${tris} tris · ${materials} materials`);
}
console.log("✓ " + buildEnv());
