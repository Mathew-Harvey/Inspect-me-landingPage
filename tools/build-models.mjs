/**
 * build-models.mjs — author the hero's 3D fleet as binary glTF, plus the underwater
 * lighting environment. All models share glb-lib's PALETTE so the switcher reads as one
 * designed set. Generic & unbranded (no real-asset/manufacturer geometry). Run:
 *   node tools/build-models.mjs
 * Outputs: assets/models/{rov,submarine,hull}.glb and assets/models/env-underwater.png
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { newGroups, add, xform, assembleGlb, encodePNG, makeBox, makeCyl, makeSphere, makeTorus, D } from "./glb-lib.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "models");

// Reusable ducted thruster (axis via rot) and propeller.
function thruster(g, { tx, ty, tz, rx = 0, ry = 0, rz = 0 }) {
  add(g, "thruster", makeCyl(0.034, 0.034, 0.05, 22, false), { rx, ry, rz, tx, ty, tz });
  add(g, "thruster", makeCyl(0.032, 0.032, 0.052, 22, false), { rx, ry, rz, tx, ty, tz });
  add(g, "steel", makeCyl(0.012, 0.012, 0.04, 14, true), { rx, ry, rz, tx, ty, tz });
  add(g, "accent", makeTorus(0.03, 0.004, 20, 6), { rx: rx + 90 * D, ry, rz, tx, ty, tz });
}
function propeller(g, { tz, blades = 5, R = 0.3, hubR = 0.07, mat = "steel" }) {
  add(g, mat, makeCyl(hubR, hubR * 0.7, 0.16, 18, true), { rx: 90 * D, tz });
  for (let i = 0; i < blades; i++) {
    const blade = xform(makeBox(0.11, R, 0.022), { ry: 24 * D, ty: R / 2 + hubR * 0.6 });
    add(g, mat, blade, { rz: (i / blades) * Math.PI * 2, tz: tz - 0.01 });
  }
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

// ════════════════════════ SUBMARINE (generic, stylized) ════════════════════════
function buildSubmarine() {
  const g = newGroups();
  // pressure hull along Z: body + tapered nose (+Z) and tail (-Z)
  add(g, "hull", makeCyl(0.42, 0.42, 2.4, 30, false), { rx: 90 * D });
  add(g, "hull", makeCyl(0.06, 0.42, 0.7, 30, true), { rx: 90 * D, tz: 1.55 });   // nose
  add(g, "hull", makeCyl(0.42, 0.12, 0.95, 30, true), { rx: 90 * D, tz: -1.675 }); // tail cone
  // deck casing (flat top strip)
  add(g, "shell", makeBox(0.34, 0.06, 3.0), { ty: 0.4 });
  // conning tower / sail + faired front
  add(g, "shell", makeBox(0.34, 0.55, 0.95), { ty: 0.66, tz: 0.1 });
  add(g, "shell", makeCyl(0.17, 0.17, 0.55, 18, true), { rx: 90 * D, ty: 0.66, tz: 0.58 }); // faired sail nose
  add(g, "shell", makeBox(0.28, 0.16, 0.5), { ty: 0.95, tz: 0.1 });                          // sail top
  // fairwater (sail) planes
  add(g, "frame", makeBox(1.05, 0.05, 0.26), { ty: 0.82, tz: 0.1 });
  // masts / periscopes
  add(g, "steel", makeCyl(0.022, 0.022, 0.5, 12, true), { ty: 1.27, tz: -0.02 });
  add(g, "steel", makeCyl(0.018, 0.018, 0.42, 12, true), { ty: 1.2, tz: 0.18 });
  add(g, "led", makeSphere(0.03, 12, 8), { ty: 1.54, tz: -0.02 });   // mast head light
  // bow dive planes
  add(g, "frame", makeBox(1.15, 0.05, 0.34), { ty: 0.02, tz: 1.0 });
  // stern control surfaces (cruciform) + rudder
  add(g, "frame", makeBox(1.3, 0.05, 0.42), { ty: 0, tz: -1.45 });
  add(g, "frame", makeBox(0.05, 1.05, 0.42), { ty: 0, tz: -1.45 });
  // shaft + propeller
  add(g, "steel", makeCyl(0.05, 0.05, 0.35, 14, true), { rx: 90 * D, tz: -2.05 });
  propeller(g, { tz: -2.25, blades: 6, R: 0.34, hubR: 0.09, mat: "steel" });
  // cyan inspection markers on the hull (ties to "find & photograph")
  add(g, "accent", makeTorus(0.06, 0.012, 20, 8), { ty: 0.42, tz: -0.5 });
  add(g, "accent", makeSphere(0.03, 12, 8), { tx: 0.36, ty: 0.18, tz: 0.55 });
  return g;
}

// ════════════════════════ SHIP HULL SECTION + RUNNING GEAR ════════════════════════
// Stern quarter as seen on an underwater inspection: hull mass aft, with the propeller and
// rudder protruding toward +Z (the default camera) — the iconic "hull survey" composition.
function buildHull() {
  const g = newGroups();
  // hull mass: wide, shallow octagonal prism (reads as a curved hull bottom), stern face at +Z≈0.4
  add(g, "hull", makeCyl(0.72, 0.72, 2.0, 8, true), { rx: 90 * D, sx: 1.5, sy: 0.8, ty: 0.35, tz: -0.6 });
  // thin flush waterline strip (no overhang — this is an underwater view)
  add(g, "shell", makeBox(1.45, 0.08, 2.0), { ty: 0.86, tz: -0.6 });
  // keel + angled bilge keels
  add(g, "frame", makeBox(0.16, 0.2, 2.0), { ty: -0.34, tz: -0.6 });
  for (const sx of [-1, 1]) add(g, "frame", makeBox(0.04, 0.16, 1.2), { tx: 0.9 * sx, ty: 0.04, tz: -0.6, rz: 40 * D * sx });
  // running gear protruding toward the camera (+Z): skeg → shaft → propeller → rudder (aft)
  add(g, "shell", makeBox(0.16, 0.78, 0.5), { ty: -0.12, tz: 0.55 });
  add(g, "steel", makeCyl(0.07, 0.07, 0.55, 14, true), { rx: 90 * D, ty: -0.08, tz: 0.9 });
  propeller(g, { tz: 1.25, blades: 4, R: 0.52, hubR: 0.13, mat: "steel" });
  add(g, "frame", makeBox(0.09, 1.05, 0.62), { ty: -0.06, tz: 1.62 });
  // sea-chest grate (recessed intake — an inspection target) on the hull bottom
  add(g, "frame", makeBox(0.5, 0.06, 0.5), { ty: -0.3, tz: -0.55 });
  for (let i = -2; i <= 2; i++) add(g, "steel", makeBox(0.45, 0.03, 0.04), { ty: -0.28, tz: -0.55 + i * 0.09 });
  // sacrificial anodes + cyan inspection markers (ties to "find & photograph")
  for (const sx of [-1, 1]) {
    add(g, "steel", makeBox(0.1, 0.06, 0.3), { tx: 0.52 * sx, ty: -0.28, tz: 0.0 });
    add(g, "accent", makeSphere(0.035, 12, 8), { tx: 0.52 * sx, ty: -0.22, tz: 0.0 });
  }
  add(g, "accent", makeTorus(0.09, 0.014, 20, 8), { rx: 90 * D, ty: -0.08, tz: 1.25 }); // marker on prop hub
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
for (const [name, fn] of [["rov", buildRov], ["submarine", buildSubmarine], ["hull", buildHull]]) {
  const { glb, tris, materials } = assembleGlb(fn());
  writeFileSync(join(OUT, `${name}.glb`), glb);
  console.log(`✓ ${name}.glb  ${(glb.length / 1024).toFixed(0)} KB · ${tris} tris · ${materials} materials`);
}
console.log("✓ " + buildEnv());
