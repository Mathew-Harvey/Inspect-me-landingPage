/** Dependency-free software render of rov.glb.
 *  → tools/rov-preview.png        (opaque QA image, composited over abyss)
 *  → assets/images/rov-poster.png (transparent, AA — model-viewer poster/fallback)
 *  Renders at 2× then downsamples for anti-aliasing + soft alpha edges. */
import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const glb = readFileSync(new URL("../assets/models/rov.glb", import.meta.url));
const jsonLen = glb.readUInt32LE(12);
const json = JSON.parse(glb.slice(20, 20 + jsonLen).toString("utf8"));
const bin = glb.slice(20 + jsonLen + 8);
const acc = (i) => {
  const a = json.accessors[i], bv = json.bufferViews[a.bufferView];
  const off = bin.byteOffset + bv.byteOffset;
  const n = a.count * (a.type === "VEC3" ? 3 : 1);
  return a.componentType === 5126 ? new Float32Array(bin.buffer, off, n) : new Uint32Array(bin.buffer, off, n);
};

const OUT_W = 640, OUT_H = 480, SS = 2;        // 2× supersample
const W = OUT_W * SS, H = OUT_H * SS;
const col3 = new Float32Array(W * H * 3);        // accumulated colour
const cov = new Uint8Array(W * H);               // coverage (0/1)
const zbuf = new Float32Array(W * H).fill(-Infinity);

// camera: rotate model yaw+pitch, orthographic
const yaw = -35 * Math.PI / 180, pitch = 22 * Math.PI / 180;
const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
function project(x, y, z) {
  let X = x * cy + z * sy, Z = -x * sy + z * cy;     // yaw
  let Y = y * cp - Z * sp; Z = y * sp + Z * cp;       // pitch
  const s = 980 * SS;
  return [W / 2 + X * s, H / 2 - Y * s + 30 * SS, Z];
}
const L = (() => { const v = [-0.4, 0.8, 0.5]; const m = Math.hypot(...v); return v.map((c) => c / m); })();

for (const p of json.meshes[0].primitives) {
  const pos = acc(p.attributes.POSITION), idx = acc(p.indices);
  const mat = json.materials[p.material];
  const base = mat.pbrMetallicRoughness.baseColorFactor;
  const emi = mat.emissiveFactor ? (mat.extensions?.KHR_materials_emissive_strength?.emissiveStrength || 1) : 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const va = [pos[a], pos[a + 1], pos[a + 2]];
    const vb = [pos[b], pos[b + 1], pos[b + 2]];
    const vc = [pos[c], pos[c + 1], pos[c + 2]];
    const e1 = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
    const e2 = [vc[0] - va[0], vc[1] - va[1], vc[2] - va[2]];
    let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    // rotate normal to view for lighting (yaw+pitch)
    let RX = nx * cy + nz * sy, RZ = -nx * sy + nz * cy, RY = ny;
    const VY = RY * cp - RZ * sp;
    const diff = Math.max(0, RX * L[0] + VY * L[1] + (RY * sp + RZ * cp) * L[2]);
    const shade = 0.22 + 0.78 * diff;
    const col = [
      Math.min(255, (base[0] * shade + emi * (mat.emissiveFactor?.[0] || 0)) * 255),
      Math.min(255, (base[1] * shade + emi * (mat.emissiveFactor?.[1] || 0)) * 255),
      Math.min(255, (base[2] * shade + emi * (mat.emissiveFactor?.[2] || 0)) * 255),
    ];
    const pa = project(...va), pb = project(...vb), pc = project(...vc);
    // bbox raster
    const minX = Math.max(0, Math.floor(Math.min(pa[0], pb[0], pc[0])));
    const maxX = Math.min(W - 1, Math.ceil(Math.max(pa[0], pb[0], pc[0])));
    const minY = Math.max(0, Math.floor(Math.min(pa[1], pb[1], pc[1])));
    const maxY = Math.min(H - 1, Math.ceil(Math.max(pa[1], pb[1], pc[1])));
    const area = (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0]);
    if (Math.abs(area) < 1e-6) continue;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const w0 = ((pb[0] - x) * (pc[1] - y) - (pb[1] - y) * (pc[0] - x)) / area;
      const w1 = ((pc[0] - x) * (pa[1] - y) - (pc[1] - y) * (pa[0] - x)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const z = w0 * pa[2] + w1 * pb[2] + w2 * pc[2];
      const o = y * W + x;
      if (z <= zbuf[o]) continue;
      zbuf[o] = z;
      col3[o * 3] = col[0]; col3[o * 3 + 1] = col[1]; col3[o * 3 + 2] = col[2];
      cov[o] = 1;
    }
  }
}

// ── downsample SS×SS → RGBA (transparent) + RGB (over abyss) ──
const rgba = Buffer.alloc(OUT_W * OUT_H * 4);
const rgb = Buffer.alloc(OUT_W * OUT_H * 3);
const BG = [6, 16, 26];
for (let y = 0; y < OUT_H; y++) for (let x = 0; x < OUT_W; x++) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let dy = 0; dy < SS; dy++) for (let dx = 0; dx < SS; dx++) {
    const o = ((y * SS + dy) * W + (x * SS + dx));
    if (cov[o]) { r += col3[o * 3]; g += col3[o * 3 + 1]; b += col3[o * 3 + 2]; n++; }
  }
  const oi = y * OUT_W + x, tot = SS * SS;
  const a = n / tot;
  const cr = n ? r / n : 0, cg = n ? g / n : 0, cb = n ? b / n : 0;
  rgba[oi * 4] = cr; rgba[oi * 4 + 1] = cg; rgba[oi * 4 + 2] = cb; rgba[oi * 4 + 3] = Math.round(a * 255);
  rgb[oi * 3] = Math.round(cr * a + BG[0] * (1 - a));
  rgb[oi * 3 + 1] = Math.round(cg * a + BG[1] * (1 - a));
  rgb[oi * 3 + 2] = Math.round(cb * a + BG[2] * (1 - a));
}

// minimal PNG writer (ch = channels: 3=RGB colorType 2, 4=RGBA colorType 6)
function png(buf, w, h, ch) {
  const stride = w * ch;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; buf.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  const idat = deflateSync(raw, { level: 9 });
  const crcTab = [...Array(256)].map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTab[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([len, td, cr]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = ch === 4 ? 6 : 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}
writeFileSync(new URL("./rov-preview.png", import.meta.url), png(rgb, OUT_W, OUT_H, 3));
writeFileSync(new URL("../assets/images/rov-poster.png", import.meta.url), png(rgba, OUT_W, OUT_H, 4));
console.log("✓ tools/rov-preview.png (QA)  +  assets/images/rov-poster.png (transparent)");
