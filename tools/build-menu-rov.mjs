/**
 * build-menu-rov.mjs
 * ------------------
 * Brings the game's title-screen ROV (the "Submersible+ROV" model loaded from
 * Inspect-Me/Assets/Resources/MenuRov.fbx) to the landing page as a compact,
 * web-ready GLB for <model-viewer>.
 *
 * The source FBX is a SketchUp export with ~34 arbitrary materials. The game
 * (MenuRovShowcase.cs) ignores them and re-bands the hull by height into a
 * Deep-Trekker-style palette: a hi-vis safety-yellow buoyancy crown over dark
 * steel housings and a matte-black anodized frame. We reproduce exactly that,
 * then optimise (prune / dedup / join / weld) and quantize the geometry with
 * KHR_mesh_quantization — decoded in-shader, so no runtime Draco/CDN decoder is
 * needed (consistent with the rest of the site).
 *
 *   node tools/build-menu-rov.mjs
 *   (set FBX_SRC to override the source path)
 */
import convert from "fbx2gltf";
import { NodeIO } from "@gltf-transform/core";
import { KHRMeshQuantization } from "@gltf-transform/extensions";
import { prune, dedup, flatten, join, weld, quantize } from "@gltf-transform/functions";
import { resolve, dirname, join as pjoin, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const FBX_SRC = process.env.FBX_SRC || "C:/Users/mathe/dev/Inspect-Me/Assets/Resources/MenuRov.fbx";
const TMP_GLB = resolve(ROOT, "tools/.menurov-raw.glb");
const OUT_GLB = resolve(ROOT, "assets/models/menu-rov.glb");
const OUT_POSTER = resolve(ROOT, "assets/images/rov-poster.png");

// model-viewer settings shared between the page and the rendered poster, so the
// poster matches the live viewer exactly (no pop when the model loads in).
const VIEW = { orbit: "-32deg 76deg 105%", exposure: "1.05", tone: "neutral", shadow: "0.65" };

// Palette + finish lifted from MenuRovShowcase.ApplyRealisticRovMaterials (Unity
// linear values), with the same height thresholds (top 34% crown, bottom 32% frame).
const CROWN = { name: "MenuRov_Crown", color: [0.92, 0.66, 0.05], metallic: 0.0, rough: 0.5 };
const HOUSING = { name: "MenuRov_Housing", color: [0.11, 0.12, 0.13], metallic: 0.55, rough: 0.55 };
const FRAME = { name: "MenuRov_Frame", color: [0.028, 0.032, 0.038], metallic: 0.2, rough: 0.7 };
const CROWN_AT = 0.66;
const FRAME_AT = 0.32;

// ── tiny column-major mat4 helpers (avoid a gl-matrix dependency) ──
const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}
function tp(m, x, y, z) {
  const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
  return [
    (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
    (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
    (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
  ];
}

// World-space AABB of a primitive given its node's world matrix (from POSITION min/max corners).
function primWorldAABB(prim, world) {
  const pos = prim.getAttribute("POSITION");
  const lo = pos.getMin([]);
  const hi = pos.getMax([]);
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < 8; i++) {
    const p = tp(world, i & 1 ? hi[0] : lo[0], i & 2 ? hi[1] : lo[1], i & 4 ? hi[2] : lo[2]);
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  return { minY, maxY };
}

function collectPrims(doc) {
  const out = [];
  const walk = (node, parent) => {
    const world = mul(parent, node.getMatrix());
    const mesh = node.getMesh();
    if (mesh) for (const prim of mesh.listPrimitives()) out.push({ prim, world });
    for (const child of node.listChildren()) walk(child, world);
  };
  for (const scene of doc.getRoot().listScenes()) for (const node of scene.listChildren()) walk(node, IDENT);
  return out;
}

function makeMat(doc, spec) {
  return doc
    .createMaterial(spec.name)
    .setBaseColorFactor([...spec.color, 1])
    .setMetallicFactor(spec.metallic)
    .setRoughnessFactor(spec.rough)
    .setDoubleSided(true); // SketchUp faces are single-sided; show both so the open frame has no holes
}

async function run() {
  if (!existsSync(FBX_SRC)) throw new Error(`Source FBX not found: ${FBX_SRC} (set FBX_SRC=...)`);
  mkdirSync(dirname(OUT_GLB), { recursive: true });

  console.log("Converting FBX → glTF …");
  await convert(FBX_SRC, TMP_GLB);

  const io = new NodeIO().registerExtensions([KHRMeshQuantization]);
  const doc = await io.read(TMP_GLB);

  // Re-band every primitive by its world height into the three game materials.
  const prims = collectPrims(doc);
  let minY = Infinity, maxY = -Infinity;
  const aabbs = prims.map((e) => {
    const a = primWorldAABB(e.prim, e.world);
    if (a.minY < minY) minY = a.minY;
    if (a.maxY > maxY) maxY = a.maxY;
    return a;
  });
  const sizeY = Math.max(maxY - minY, 1e-4);

  const crown = makeMat(doc, CROWN);
  const housing = makeMat(doc, HOUSING);
  const frame = makeMat(doc, FRAME);
  let nc = 0, nh = 0, nf = 0;
  prims.forEach((e, i) => {
    const n = ((aabbs[i].minY + aabbs[i].maxY) / 2 - minY) / sizeY;
    const m = n >= CROWN_AT ? (nc++, crown) : n <= FRAME_AT ? (nf++, frame) : (nh++, housing);
    e.prim.setMaterial(m);
  });
  console.log(`Re-banded ${prims.length} primitives — crown ${nc}, housing ${nh}, frame ${nf}.`);

  doc.createExtension(KHRMeshQuantization).setRequired(true);
  await doc.transform(
    prune(),
    dedup(),
    flatten(),
    join(),
    weld(),
    quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeColor: 8 }),
    prune()
  );

  await io.write(OUT_GLB, doc);
  console.log(`menu-rov.glb → ${OUT_GLB}  (${(statSync(OUT_GLB).size / 1048576).toFixed(2)} MB)`);

  await makePoster();
}

function findBrowser() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  return [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
  ].find((p) => existsSync(p));
}

// Render a transparent fallback poster that matches the live <model-viewer>.
async function makePoster() {
  const exe = findBrowser();
  if (!exe) {
    console.warn("! No Chrome/Edge found — skipped poster render (kept existing rov-poster.png).");
    return;
  }
  const page = `<!doctype html><meta charset=utf8><body style="margin:0;background:transparent">
<script type="module" src="/assets/vendor/model-viewer.min.js"></script>
<model-viewer id=mv src="/assets/models/menu-rov.glb" exposure="${VIEW.exposure}" tone-mapping="${VIEW.tone}"
 shadow-intensity="${VIEW.shadow}" shadow-softness="0.9" camera-orbit="${VIEW.orbit}" interaction-prompt=none
 disable-zoom style="width:1000px;height:720px;background:transparent"></model-viewer>`;
  const types = { ".html": "text/html", ".js": "text/javascript", ".glb": "model/gltf-binary", ".png": "image/png", ".jpg": "image/jpeg" };
  const srv = http.createServer(async (req, res) => {
    const u = decodeURIComponent(req.url.split("?")[0]);
    if (u === "/" || u === "/poster.html") { res.writeHead(200, { "content-type": "text/html" }); return res.end(page); }
    try {
      const d = await readFile(pjoin(ROOT, normalize(u)));
      res.writeHead(200, { "content-type": types[extname(u)] || "application/octet-stream" });
      res.end(d);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => srv.listen(0, r));
  const port = srv.address().port;
  const { default: puppeteer } = await import("puppeteer-core");
  const browser = await puppeteer.launch({
    executablePath: exe, headless: "new",
    args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  try {
    const pg = await browser.newPage();
    await pg.setViewport({ width: 1000, height: 720, deviceScaleFactor: 2 });
    await pg.goto(`http://localhost:${port}/poster.html`, { waitUntil: "networkidle0" });
    await pg.evaluate(async () => {
      const mv = document.getElementById("mv");
      await mv.updateComplete;
      await new Promise((r) => setTimeout(r, 2500));
    });
    await pg.screenshot({ path: OUT_POSTER, omitBackground: true });
    console.log(`rov-poster.png → ${OUT_POSTER}`);
  } finally {
    await browser.close();
    srv.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
