/**
 * glb-lib.mjs — shared procedural-geometry + GLB/PNG helpers.
 * No dependencies. Used by build-models.mjs (authoring) and preview-render.mjs (QA posters).
 *
 * Convention: +Z forward (front), +Y up, metres. Author flat-shaded primitives, then
 * place them with add(groups, material, geom, {tx,ty,tz, rx,ry,rz}). Materials are shared
 * across every model so the hero switcher reads as one designed set (see PALETTE).
 */

// ── Shared material palette (PBR metallic-roughness; emissive uses KHR_materials_emissive_strength) ──
export const PALETTE = {
  hull:     { base: [0.09, 0.12, 0.16, 1], metal: 0.30, rough: 0.55 },
  shell:    { base: [0.12, 0.15, 0.19, 1], metal: 0.40, rough: 0.5 },
  frame:    { base: [0.04, 0.05, 0.07, 1], metal: 0.80, rough: 0.4 },
  thruster: { base: [0.06, 0.08, 0.10, 1], metal: 0.55, rough: 0.5 },
  steel:    { base: [0.40, 0.45, 0.51, 1], metal: 0.85, rough: 0.32 },
  dome:     { base: [0.02, 0.03, 0.05, 1], metal: 0.20, rough: 0.06 },
  accent:   { base: [0.04, 0.18, 0.22, 1], metal: 0.20, rough: 0.3, emissive: [0.10, 0.84, 1.0], emissiveStrength: 5.0 },
  led:      { base: [0.30, 0.55, 0.62, 1], metal: 0.10, rough: 0.2, emissive: [0.72, 0.96, 1.0], emissiveStrength: 7.0 },
};

export const D = Math.PI / 180;

export function newGroups() {
  return Object.fromEntries(Object.keys(PALETTE).map((k) => [k, { pos: [], nrm: [], idx: [] }]));
}

// ── Primitive builders → { pos:[], nrm:[], idx:[] } centered at origin ──
export function makeBox(sx, sy, sz) {
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

// Cylinder/cone along +Y, centered at origin.
export function makeCyl(rTop, rBot, h, seg = 28, capped = true) {
  const g = { pos: [], nrm: [], idx: [] };
  const y = h / 2;
  const slope = Math.atan2(rBot - rTop, h), ny = Math.sin(slope), sc = Math.cos(slope);
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2, cx = Math.cos(a), cz = Math.sin(a);
    g.pos.push(cx * rTop, y, cz * rTop); g.nrm.push(cx * sc, ny, cz * sc);
    g.pos.push(cx * rBot, -y, cz * rBot); g.nrm.push(cx * sc, ny, cz * sc);
  }
  for (let i = 0; i < seg; i++) { const a = i * 2; g.idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  if (capped) {
    for (const top of [true, false]) {
      const yy = top ? y : -y, r = top ? rTop : rBot, nny = top ? 1 : -1;
      if (r < 1e-5) continue;
      const center = g.pos.length / 3;
      g.pos.push(0, yy, 0); g.nrm.push(0, nny, 0);
      const ring = g.pos.length / 3;
      for (let i = 0; i <= seg; i++) { const a = (i / seg) * Math.PI * 2; g.pos.push(Math.cos(a) * r, yy, Math.sin(a) * r); g.nrm.push(0, nny, 0); }
      for (let i = 0; i < seg; i++) { if (top) g.idx.push(center, ring + i, ring + i + 1); else g.idx.push(center, ring + i + 1, ring + i); }
    }
  }
  return g;
}

export function makeSphere(r, seg = 20, rings = 14) {
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
  for (let y = 0; y < rings; y++) for (let x = 0; x < seg; x++) { const a = y * w + x, b = a + w; g.idx.push(a, b, a + 1, a + 1, b, b + 1); }
  return g;
}

// Torus in XZ plane (ring around +Y).
export function makeTorus(R, r, segs = 28, sides = 12) {
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
  for (let i = 0; i < segs; i++) for (let j = 0; j < sides; j++) { const a = i * w + j, b = a + w; g.idx.push(a, b, a + 1, a + 1, b, b + 1); }
  return g;
}

function rot(p, rx, ry, rz) {
  let [x, y, z] = p;
  if (rx) { const c = Math.cos(rx), s = Math.sin(rx); [y, z] = [y * c - z * s, y * s + z * c]; }
  if (ry) { const c = Math.cos(ry), s = Math.sin(ry); [x, z] = [x * c + z * s, -x * s + z * c]; }
  if (rz) { const c = Math.cos(rz), s = Math.sin(rz); [x, y] = [x * c - y * s, x * s + y * c]; }
  return [x, y, z];
}

export function add(groups, matName, geom, t = {}) {
  const g = groups[matName];
  const base = g.pos.length / 3;
  const out = xform(geom, t);
  g.pos.push(...out.pos); g.nrm.push(...out.nrm);
  for (const k of geom.idx) g.idx.push(base + k);
}

// Return a NEW geom transformed by scale → rotate(rx,ry,rz) → translate. Lets you compose
// (e.g. pitch a blade about Y, push it out to radius, then arrange it around an axis via add()).
export function xform(geom, t = {}) {
  const { tx = 0, ty = 0, tz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = t;
  const out = { pos: [], nrm: [], idx: geom.idx };
  for (let i = 0; i < geom.pos.length; i += 3) {
    const p = rot([geom.pos[i] * sx, geom.pos[i + 1] * sy, geom.pos[i + 2] * sz], rx, ry, rz);
    out.pos.push(p[0] + tx, p[1] + ty, p[2] + tz);
    const n = rot([geom.nrm[i] / sx, geom.nrm[i + 1] / sy, geom.nrm[i + 2] / sz], rx, ry, rz);
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    out.nrm.push(n[0] / len, n[1] / len, n[2] / len);
  }
  return out;
}

// ── Assemble a binary glTF from material groups ──
export function assembleGlb(groups) {
  const used = Object.keys(PALETTE).filter((k) => groups[k] && groups[k].idx.length > 0);
  const bin = []; let byteLen = 0;
  const bufferViews = [], accessors = [], primitives = [];
  const pushView = (ta, target, align = 4) => {
    const buf = Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength);
    const pad = (align - (byteLen % align)) % align;
    if (pad) { bin.push(Buffer.alloc(pad)); byteLen += pad; }
    const view = { buffer: 0, byteOffset: byteLen, byteLength: buf.length };
    if (target) view.target = target;
    bufferViews.push(view); bin.push(buf); byteLen += buf.length;
    return bufferViews.length - 1;
  };
  const matIndex = {};
  const materials = used.map((name, i) => {
    matIndex[name] = i; const m = PALETTE[name];
    const mat = { name, pbrMetallicRoughness: { baseColorFactor: m.base, metallicFactor: m.metal, roughnessFactor: m.rough } };
    if (m.emissive) { mat.emissiveFactor = m.emissive; if (m.emissiveStrength) mat.extensions = { KHR_materials_emissive_strength: { emissiveStrength: m.emissiveStrength } }; }
    return mat;
  });
  for (const name of used) {
    const g = groups[name];
    const pos = new Float32Array(g.pos), nrm = new Float32Array(g.nrm), idx = new Uint32Array(g.idx);
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], pos[i + k]); max[k] = Math.max(max[k], pos[i + k]); }
    const pv = pushView(pos, 34962); const pa = accessors.push({ bufferView: pv, componentType: 5126, count: pos.length / 3, type: "VEC3", min, max }) - 1;
    const nv = pushView(nrm, 34962); const na = accessors.push({ bufferView: nv, componentType: 5126, count: nrm.length / 3, type: "VEC3" }) - 1;
    const iv = pushView(idx, 34963); const ia = accessors.push({ bufferView: iv, componentType: 5125, count: idx.length, type: "SCALAR" }) - 1;
    primitives.push({ attributes: { POSITION: pa, NORMAL: na }, indices: ia, material: matIndex[name], mode: 4 });
  }
  { const pad = (4 - (byteLen % 4)) % 4; if (pad) { bin.push(Buffer.alloc(pad)); byteLen += pad; } }
  const binBuffer = Buffer.concat(bin);
  const gltf = {
    asset: { version: "2.0", generator: "inspect-me procedural builder" },
    extensionsUsed: ["KHR_materials_emissive_strength"],
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: "model", mesh: 0 }],
    meshes: [{ primitives }], materials, accessors, bufferViews, buffers: [{ byteLength: binBuffer.length }],
  };
  let json = Buffer.from(JSON.stringify(gltf), "utf8");
  { const pad = (4 - (json.length % 4)) % 4; if (pad) json = Buffer.concat([json, Buffer.alloc(pad, 0x20)]); }
  const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n, 0); return b; };
  const total = 12 + 8 + json.length + 8 + binBuffer.length;
  const tris = used.reduce((s, n) => s + groups[n].idx.length / 3, 0);
  return {
    glb: Buffer.concat([Buffer.from("glTF"), u32(2), u32(total), u32(json.length), Buffer.from("JSON"), json, u32(binBuffer.length), Buffer.from("BIN\0", "binary"), binBuffer]),
    tris, materials: used.length,
  };
}

// ── Minimal PNG writer (ch: 3=RGB type2, 4=RGBA type6) ──
import { deflateSync } from "node:zlib";
export function encodePNG(buf, w, h, ch) {
  const stride = w * ch, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; buf.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  const idat = deflateSync(raw, { level: 9 });
  const tab = [...Array(256)].map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = tab[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([len, td, cr]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = ch === 4 ? 6 : 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}
