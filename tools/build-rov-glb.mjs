/**
 * build-rov-glb.mjs — procedurally generate a light inspection-class ROV as a binary glTF (.glb).
 *
 * No external dependencies. Run with:  node tools/build-rov-glb.mjs
 *
 * The geometry mirrors the part layout of the in-game ROV blockout (dual buoyancy
 * pontoons, open frame, 6 thrusters [2 vertical + 4 vectored horizontal], camera pod
 * + lens, LED bar, manipulator arm + claw, tether mount, carry handle). It is a
 * generic, unbranded vehicle — matching the project's "no manufacturer branding"
 * positioning. Output: assets/models/rov.glb
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "assets", "models", "rov.glb");

// ── Material palette (PBR metallic-roughness). Emissive parts use emissiveStrength. ──
const MAT = {
  hull:      { base: [0.09, 0.12, 0.16, 1], metal: 0.30, rough: 0.55 },
  shell:     { base: [0.11, 0.14, 0.18, 1], metal: 0.38, rough: 0.5 },
  frame:     { base: [0.04, 0.05, 0.07, 1], metal: 0.8,  rough: 0.4 },
  thruster:  { base: [0.06, 0.08, 0.10, 1], metal: 0.55, rough: 0.5 },
  steel:     { base: [0.38, 0.43, 0.49, 1], metal: 0.85, rough: 0.32 },
  dome:      { base: [0.02, 0.03, 0.05, 1], metal: 0.2,  rough: 0.06 },
  accent:    { base: [0.04, 0.18, 0.22, 1], metal: 0.2,  rough: 0.3, emissive: [0.10, 0.84, 1.0], emissiveStrength: 5.0 },
  led:       { base: [0.30, 0.55, 0.62, 1], metal: 0.1,  rough: 0.2, emissive: [0.72, 0.96, 1.0], emissiveStrength: 7.0 },
};
const MAT_ORDER = Object.keys(MAT);

// group buckets keyed by material name → { pos:[], nrm:[], idx:[] }
const groups = Object.fromEntries(MAT_ORDER.map((k) => [k, { pos: [], nrm: [], idx: [] }]));

// ── Primitive builders (return { pos:[], nrm:[], idx:[] } centered at origin) ──
function makeBox(sx, sy, sz) {
  const x = sx / 2, y = sy / 2, z = sz / 2;
  const faces = [
    { n: [0, 0, 1],  v: [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]] },
    { n: [0, 0, -1], v: [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]] },
    { n: [1, 0, 0],  v: [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]] },
    { n: [-1, 0, 0], v: [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]] },
    { n: [0, 1, 0],  v: [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]] },
    { n: [0, -1, 0], v: [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]] },
  ];
  const g = { pos: [], nrm: [], idx: [] };
  faces.forEach((f, i) => {
    const b = i * 4;
    f.v.forEach((p) => { g.pos.push(...p); g.nrm.push(...f.n); });
    g.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  });
  return g;
}

// Cylinder along +Y, centered at origin. capped adds flat top/bottom discs.
function makeCyl(rTop, rBot, h, seg = 28, capped = true) {
  const g = { pos: [], nrm: [], idx: [] };
  const y = h / 2;
  // side
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const cx = Math.cos(a), cz = Math.sin(a);
    const slope = Math.atan2(rBot - rTop, h);
    const ny = Math.sin(slope), scale = Math.cos(slope);
    g.pos.push(cx * rTop, y, cz * rTop); g.nrm.push(cx * scale, ny, cz * scale);
    g.pos.push(cx * rBot, -y, cz * rBot); g.nrm.push(cx * scale, ny, cz * scale);
  }
  for (let i = 0; i < seg; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    g.idx.push(a, b, d, a, d, c);
  }
  if (capped) {
    for (const top of [true, false]) {
      const yy = top ? y : -y, r = top ? rTop : rBot, ny = top ? 1 : -1;
      const center = g.pos.length / 3;
      g.pos.push(0, yy, 0); g.nrm.push(0, ny, 0);
      const ring = g.pos.length / 3;
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        g.pos.push(Math.cos(a) * r, yy, Math.sin(a) * r); g.nrm.push(0, ny, 0);
      }
      for (let i = 0; i < seg; i++) {
        if (top) g.idx.push(center, ring + i, ring + i + 1);
        else g.idx.push(center, ring + i + 1, ring + i);
      }
    }
  }
  return g;
}

function makeSphere(r, seg = 20, rings = 14) {
  const g = { pos: [], nrm: [], idx: [] };
  for (let y = 0; y <= rings; y++) {
    const v = (y / rings) * Math.PI;
    for (let x = 0; x <= seg; x++) {
      const u = (x / seg) * Math.PI * 2;
      const nx = Math.sin(v) * Math.cos(u), ny = Math.cos(v), nz = Math.sin(v) * Math.sin(u);
      g.pos.push(nx * r, ny * r, nz * r); g.nrm.push(nx, ny, nz);
    }
  }
  const w = seg + 1;
  for (let y = 0; y < rings; y++) {
    for (let x = 0; x < seg; x++) {
      const a = y * w + x, b = a + w;
      g.idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return g;
}

// Torus in XZ plane (ring around +Y), centered at origin.
function makeTorus(R, r, segs = 28, sides = 12) {
  const g = { pos: [], nrm: [], idx: [] };
  for (let i = 0; i <= segs; i++) {
    const u = (i / segs) * Math.PI * 2, cu = Math.cos(u), su = Math.sin(u);
    for (let j = 0; j <= sides; j++) {
      const v = (j / sides) * Math.PI * 2, cv = Math.cos(v), sv = Math.sin(v);
      g.pos.push((R + r * cv) * cu, r * sv, (R + r * cv) * su);
      g.nrm.push(cv * cu, sv, cv * su);
    }
  }
  const w = sides + 1;
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * w + j, b = a + w;
      g.idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return g;
}

// ── Transform + append into a material group ──
function rot(p, rx, ry, rz) {
  let [x, y, z] = p;
  if (rx) { const c = Math.cos(rx), s = Math.sin(rx); [y, z] = [y * c - z * s, y * s + z * c]; }
  if (ry) { const c = Math.cos(ry), s = Math.sin(ry); [x, z] = [x * c + z * s, -x * s + z * c]; }
  if (rz) { const c = Math.cos(rz), s = Math.sin(rz); [x, y] = [x * c - y * s, x * s + y * c]; }
  return [x, y, z];
}

function add(matName, geom, t = {}) {
  const { tx = 0, ty = 0, tz = 0, rx = 0, ry = 0, rz = 0 } = t;
  const g = groups[matName];
  const base = g.pos.length / 3;
  for (let i = 0; i < geom.pos.length; i += 3) {
    const p = rot([geom.pos[i], geom.pos[i + 1], geom.pos[i + 2]], rx, ry, rz);
    g.pos.push(p[0] + tx, p[1] + ty, p[2] + tz);
    let n = rot([geom.nrm[i], geom.nrm[i + 1], geom.nrm[i + 2]], rx, ry, rz);
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    g.nrm.push(n[0] / len, n[1] / len, n[2] / len);
  }
  for (const k of geom.idx) g.idx.push(base + k);
}

const D = Math.PI / 180;

// ════════════════════════════════════════════════════════════════════
//  BUILD THE ROV  (+Z = forward/front, +Y = up; ~real proportions, metres)
// ════════════════════════════════════════════════════════════════════

// — Buoyancy pontoons (left/right) running fore-aft, with rounded caps —
for (const sx of [-1, 1]) {
  const px = 0.135 * sx, py = 0.06, pz = 0;
  add("hull", makeCyl(0.05, 0.05, 0.52, 26, false), { rx: 90 * D, tx: px, ty: py, tz: pz });
  add("hull", makeSphere(0.05, 18, 12), { tx: px, ty: py, tz: 0.26 });
  add("hull", makeSphere(0.05, 18, 12), { tx: px, ty: py, tz: -0.26 });
  // cyan accent ring near the nose of each pontoon
  add("accent", makeTorus(0.051, 0.008, 24, 8), { rx: 90 * D, tx: px, ty: py, tz: 0.17 });
}

// — Side panels (outer) —
for (const sx of [-1, 1]) {
  add("shell", makeBox(0.014, 0.09, 0.34), { tx: 0.16 * sx, ty: 0.02, tz: 0 });
}

// — Top shell / electronics housing —
add("shell", makeBox(0.20, 0.05, 0.30), { tx: 0, ty: 0.105, tz: -0.01 });
add("shell", makeBox(0.16, 0.02, 0.26), { tx: 0, ty: 0.135, tz: -0.01 });

// — Central enclosure tube (fore-aft) —
add("shell", makeCyl(0.055, 0.055, 0.30, 28, true), { rx: 90 * D, tx: 0, ty: 0.02, tz: 0.0 });

// — Camera pod + lens + emissive lens ring (front) —
add("shell", makeCyl(0.05, 0.05, 0.06, 26, true), { rx: 90 * D, tx: 0, ty: 0.02, tz: 0.18 });
add("dome", makeSphere(0.046, 22, 16), { tx: 0, ty: 0.02, tz: 0.205 });
add("accent", makeTorus(0.03, 0.006, 24, 8), { rx: 90 * D, tx: 0, ty: 0.02, tz: 0.224 });

// — LED bar across the bow —
add("frame", makeBox(0.24, 0.022, 0.022), { tx: 0, ty: 0.085, tz: 0.165 });
for (let i = -2; i <= 2; i++) {
  add("led", makeBox(0.022, 0.016, 0.012), { tx: i * 0.045, ty: 0.085, tz: 0.177 });
}

// — Open frame: side rails + fore/aft cross members —
for (const sx of [-1, 1]) add("frame", makeBox(0.012, 0.012, 0.5), { tx: 0.155 * sx, ty: -0.025, tz: 0 });
for (const sz of [-1, 1]) add("frame", makeBox(0.34, 0.012, 0.012), { tx: 0, ty: -0.025, tz: 0.22 * sz });
// vertical corner struts tying frame to pontoons
for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
  add("frame", makeBox(0.012, 0.1, 0.012), { tx: 0.15 * sx, ty: 0.02, tz: 0.2 * sz });
}

// — Thrusters: duct + hub + emissive inner ring —
function thruster(matAxisRot, tx, ty, tz) {
  const { rx = 0, ry = 0, rz = 0 } = matAxisRot;
  add("thruster", makeCyl(0.034, 0.034, 0.05, 24, false), { rx, ry, rz, tx, ty, tz });
  add("thruster", makeCyl(0.032, 0.032, 0.052, 24, false), { rx, ry, rz, tx, ty, tz }); // inner duct wall
  add("steel", makeCyl(0.012, 0.012, 0.04, 16, true), { rx, ry, rz, tx, ty, tz }); // hub
  add("accent", makeTorus(0.03, 0.004, 22, 6), { rx: rx + 90 * D, ry, rz, tx, ty, tz }); // glow ring
}
// 2 vertical thrusters (axis = Y)
thruster({}, -0.075, 0.05, -0.03);
thruster({}, 0.075, 0.05, -0.03);
// 4 vectored horizontal thrusters (axis ≈ Z, splayed at corners)
thruster({ rx: 90 * D, ry: 30 * D }, -0.15, -0.0, 0.16);
thruster({ rx: 90 * D, ry: -30 * D }, 0.15, -0.0, 0.16);
thruster({ rx: 90 * D, ry: -30 * D }, -0.15, -0.0, -0.18);
thruster({ rx: 90 * D, ry: 30 * D }, 0.15, -0.0, -0.18);

// — Manipulator arm + claw (front underside, folded) —
add("frame", makeBox(0.05, 0.04, 0.05), { tx: 0, ty: -0.05, tz: 0.16 });           // arm_base
add("steel", makeCyl(0.012, 0.012, 0.11, 16, true), { rx: 55 * D, tx: 0, ty: -0.085, tz: 0.21 }); // arm_segment
add("steel", makeBox(0.016, 0.016, 0.05), { rx: 20 * D, tx: 0, ty: -0.125, tz: 0.255 });          // wrist
add("steel", makeBox(0.008, 0.04, 0.012), { rx: 20 * D, rz: 18 * D, tx: -0.012, ty: -0.145, tz: 0.275 }); // claw L
add("steel", makeBox(0.008, 0.04, 0.012), { rx: 20 * D, rz: -18 * D, tx: 0.012, ty: -0.145, tz: 0.275 }); // claw R

// — Tether mount + stub on top rear —
add("frame", makeCyl(0.022, 0.026, 0.03, 18, true), { tx: 0, ty: 0.13, tz: -0.1 });
add("frame", makeCyl(0.01, 0.01, 0.06, 12, true), { rx: -18 * D, tx: 0, ty: 0.17, tz: -0.115 });
add("dome", makeSphere(0.014, 14, 10), { tx: 0, ty: 0.2, tz: -0.125 });

// — Carry handle (inverted U) on top —
for (const sx of [-1, 1]) add("frame", makeBox(0.012, 0.06, 0.012), { tx: 0.07 * sx, ty: 0.165, tz: 0.06 });
add("frame", makeBox(0.155, 0.012, 0.012), { tx: 0, ty: 0.195, tz: 0.06 });

// ════════════════════════════════════════════════════════════════════
//  ASSEMBLE GLB
// ════════════════════════════════════════════════════════════════════
const usedGroups = MAT_ORDER.filter((k) => groups[k].idx.length > 0);

const bin = [];          // list of { data:Buffer, align:number } → concatenated
let byteLen = 0;
const bufferViews = [];
const accessors = [];
const primitives = [];

function pushView(typedArray, target, align) {
  const buf = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
  const pad = (align - (byteLen % align)) % align;
  if (pad) { bin.push(Buffer.alloc(pad)); byteLen += pad; }
  const view = { buffer: 0, byteOffset: byteLen, byteLength: buf.length };
  if (target) view.target = target;
  bufferViews.push(view);
  bin.push(buf);
  byteLen += buf.length;
  return bufferViews.length - 1;
}

const materialIndex = {};
const materials = usedGroups.map((name, i) => {
  materialIndex[name] = i;
  const m = MAT[name];
  const mat = {
    name,
    pbrMetallicRoughness: { baseColorFactor: m.base, metallicFactor: m.metal, roughnessFactor: m.rough },
  };
  if (m.emissive) {
    mat.emissiveFactor = m.emissive;
    if (m.emissiveStrength) mat.extensions = { KHR_materials_emissive_strength: { emissiveStrength: m.emissiveStrength } };
  }
  return mat;
});

for (const name of usedGroups) {
  const g = groups[name];
  const pos = new Float32Array(g.pos);
  const nrm = new Float32Array(g.nrm);
  const idx = new Uint32Array(g.idx);
  // POSITION min/max
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], pos[i + k]);
      max[k] = Math.max(max[k], pos[i + k]);
    }
  }
  const posView = pushView(pos, 34962, 4);
  const posAcc = accessors.push({ bufferView: posView, componentType: 5126, count: pos.length / 3, type: "VEC3", min, max }) - 1;
  const nrmView = pushView(nrm, 34962, 4);
  const nrmAcc = accessors.push({ bufferView: nrmView, componentType: 5126, count: nrm.length / 3, type: "VEC3" }) - 1;
  const idxView = pushView(idx, 34963, 4);
  const idxAcc = accessors.push({ bufferView: idxView, componentType: 5125, count: idx.length, type: "SCALAR" }) - 1;
  primitives.push({ attributes: { POSITION: posAcc, NORMAL: nrmAcc }, indices: idxAcc, material: materialIndex[name], mode: 4 });
}

// pad BIN to 4 bytes
{
  const pad = (4 - (byteLen % 4)) % 4;
  if (pad) { bin.push(Buffer.alloc(pad)); byteLen += pad; }
}
const binBuffer = Buffer.concat(bin);

const gltf = {
  asset: { version: "2.0", generator: "inspect-me rov procedural builder" },
  extensionsUsed: ["KHR_materials_emissive_strength"],
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ name: "ROV", mesh: 0 }],
  meshes: [{ name: "InspectionROV", primitives }],
  materials,
  accessors,
  bufferViews,
  buffers: [{ byteLength: binBuffer.length }],
};

// JSON chunk (padded with spaces to 4 bytes)
let json = Buffer.from(JSON.stringify(gltf), "utf8");
{
  const pad = (4 - (json.length % 4)) % 4;
  if (pad) json = Buffer.concat([json, Buffer.alloc(pad, 0x20)]);
}

function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n, 0); return b; }
const total = 12 + 8 + json.length + 8 + binBuffer.length;
const glb = Buffer.concat([
  Buffer.from("glTF"), u32(2), u32(total),
  u32(json.length), Buffer.from("JSON"), json,
  u32(binBuffer.length), Buffer.from("BIN\0", "binary"), binBuffer,
]);

writeFileSync(OUT, glb);
const tris = usedGroups.reduce((s, n) => s + groups[n].idx.length / 3, 0);
const verts = usedGroups.reduce((s, n) => s + groups[n].pos.length / 3, 0);
console.log(`✓ wrote ${OUT}`);
console.log(`  ${(glb.length / 1024).toFixed(1)} KB · ${verts} verts · ${tris} tris · ${usedGroups.length} materials`);
