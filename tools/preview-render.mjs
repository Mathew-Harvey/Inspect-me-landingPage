/** Dependency-free software render of each model glb → transparent posters (model-viewer
 *  loading/no-WebGL fallback) + opaque QA images. 2× supersampled, auto-fit per model.
 *  Run: node tools/preview-render.mjs */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { encodePNG } from "./glb-lib.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_W = 640, OUT_H = 480, SS = 2, W = OUT_W * SS, H = OUT_H * SS;
const BG = [6, 16, 26];
const L = (() => { const v = [-0.4, 0.8, 0.5], m = Math.hypot(...v); return v.map((c) => c / m); })();
// per-model 3/4 view (deg) — hull looks slightly up at the stern running gear
const VIEWS = { rov: [-35, 22], submarine: [-35, 20], hull: [-54, -4] };

function loadGlb(path) {
  const glb = readFileSync(path);
  const jl = glb.readUInt32LE(12), json = JSON.parse(glb.slice(20, 20 + jl).toString("utf8")), bin = glb.slice(20 + jl + 8);
  const acc = (i) => { const a = json.accessors[i], bv = json.bufferViews[a.bufferView]; const off = bin.byteOffset + bv.byteOffset; const n = a.count * (a.type === "VEC3" ? 3 : 1); return a.componentType === 5126 ? new Float32Array(bin.buffer, off, n) : new Uint32Array(bin.buffer, off, n); };
  return { json, acc };
}

function render(name) {
  const [yawDeg, pitchDeg] = VIEWS[name] || [-35, 22];
  const yaw = yawDeg * Math.PI / 180, pitch = pitchDeg * Math.PI / 180;
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const { json, acc } = loadGlb(join(ROOT, "assets/models", `${name}.glb`));
  // bbox (centre + fit scale)
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const p of json.meshes[0].primitives) { const a = json.accessors[p.attributes.POSITION]; for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], a.min[k]); hi[k] = Math.max(hi[k], a.max[k]); } }
  const ctr = lo.map((v, k) => (v + hi[k]) / 2);
  const radius = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) || 1;
  const s = (Math.min(W, H) * 0.82) / radius;
  const project = (x, y, z) => {
    x -= ctr[0]; y -= ctr[1]; z -= ctr[2];
    let X = x * cy + z * sy, Z = -x * sy + z * cy;
    let Y = y * cp - Z * sp; Z = y * sp + Z * cp;
    return [W / 2 + X * s, H / 2 - Y * s, Z];
  };
  const col3 = new Float32Array(W * H * 3), cov = new Uint8Array(W * H), zb = new Float32Array(W * H).fill(-Infinity);
  for (const p of json.meshes[0].primitives) {
    const pos = acc(p.attributes.POSITION), idx = acc(p.indices), mat = json.materials[p.material];
    const base = mat.pbrMetallicRoughness.baseColorFactor;
    const emF = mat.emissiveFactor || [0, 0, 0], emS = mat.extensions?.KHR_materials_emissive_strength?.emissiveStrength ? 1 : (mat.emissiveFactor ? 1 : 0);
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
      const va = [pos[a], pos[a + 1], pos[a + 2]], vb = [pos[b], pos[b + 1], pos[b + 2]], vc = [pos[c], pos[c + 1], pos[c + 2]];
      const e1 = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]], e2 = [vc[0] - va[0], vc[1] - va[1], vc[2] - va[2]];
      let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
      const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      let RX = nx * cy + nz * sy, RZ = -nx * sy + nz * cy, RY = ny; const VY = RY * cp - RZ * sp;
      const diff = Math.max(0, RX * L[0] + VY * L[1] + (RY * sp + RZ * cp) * L[2]);
      const shade = 0.32 + 0.7 * diff;
      const cr = Math.min(255, (base[0] * shade + emS * emF[0]) * 255), cg = Math.min(255, (base[1] * shade + emS * emF[1]) * 255), cb = Math.min(255, (base[2] * shade + emS * emF[2]) * 255);
      const pa = project(...va), pb = project(...vb), pc = project(...vc);
      const minX = Math.max(0, Math.floor(Math.min(pa[0], pb[0], pc[0]))), maxX = Math.min(W - 1, Math.ceil(Math.max(pa[0], pb[0], pc[0])));
      const minY = Math.max(0, Math.floor(Math.min(pa[1], pb[1], pc[1]))), maxY = Math.min(H - 1, Math.ceil(Math.max(pa[1], pb[1], pc[1])));
      const area = (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0]);
      if (Math.abs(area) < 1e-6) continue;
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        const w0 = ((pb[0] - x) * (pc[1] - y) - (pb[1] - y) * (pc[0] - x)) / area;
        const w1 = ((pc[0] - x) * (pa[1] - y) - (pc[1] - y) * (pa[0] - x)) / area;
        const w2 = 1 - w0 - w1; if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const z = w0 * pa[2] + w1 * pb[2] + w2 * pc[2], o = y * W + x;
        if (z <= zb[o]) continue; zb[o] = z;
        col3[o * 3] = cr; col3[o * 3 + 1] = cg; col3[o * 3 + 2] = cb; cov[o] = 1;
      }
    }
  }
  const rgba = Buffer.alloc(OUT_W * OUT_H * 4), rgb = Buffer.alloc(OUT_W * OUT_H * 3);
  for (let y = 0; y < OUT_H; y++) for (let x = 0; x < OUT_W; x++) {
    let r = 0, gg = 0, bb = 0, n = 0;
    for (let dy = 0; dy < SS; dy++) for (let dx = 0; dx < SS; dx++) { const o = (y * SS + dy) * W + (x * SS + dx); if (cov[o]) { r += col3[o * 3]; gg += col3[o * 3 + 1]; bb += col3[o * 3 + 2]; n++; } }
    const oi = y * OUT_W + x, a = n / (SS * SS), cr = n ? r / n : 0, cg = n ? gg / n : 0, cb = n ? bb / n : 0;
    rgba[oi * 4] = cr; rgba[oi * 4 + 1] = cg; rgba[oi * 4 + 2] = cb; rgba[oi * 4 + 3] = Math.round(a * 255);
    rgb[oi * 3] = Math.round(cr * a + BG[0] * (1 - a)); rgb[oi * 3 + 1] = Math.round(cg * a + BG[1] * (1 - a)); rgb[oi * 3 + 2] = Math.round(cb * a + BG[2] * (1 - a));
  }
  writeFileSync(join(ROOT, "assets/images", `${name}-poster.png`), encodePNG(rgba, OUT_W, OUT_H, 4));
  writeFileSync(join(ROOT, "tools", `${name}-preview.png`), encodePNG(rgb, OUT_W, OUT_H, 3));
  console.log(`✓ ${name}: assets/images/${name}-poster.png + tools/${name}-preview.png`);
}

render("rov");
