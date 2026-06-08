# Inspect-Me Landing Page

Marketing site for the **Inspect-Me** light inspection-class ROV training
simulator. Static HTML/CSS/JS — no build step.

## Concept — "Operations console"

The page is styled as a deep-sea ROV pilot console — a dark, cyan-lit HUD with
mono telemetry, corner brackets, target reticles and orange capture annotations,
taken straight from the concept renders.

- **The descent (scroll = dive):** in Dive mode a fixed "water column" backdrop
  (`.depth-backdrop`: surface gradient + god-rays + drifting marine snow) sits behind
  the whole page and **darkens toward the abyss as you scroll** (`script.js` writes a
  `--depth` 0→1 from scroll progress). A fixed **depth gauge** (`.dive-gauge`) shows the
  ROV descending a track with a live metre readout, and content **rises out of the dark**
  via an `IntersectionObserver` reveal (`.reveal` → `.is-in`). Two full-bleed
  `.interlude` "dive beats" mark the descent. All of it is gated by
  `prefers-reduced-motion` and only applied when JS is present (`html.js`).
- **Dive (dark, default):** the deep-water console look. **Surface (light)** is a
  "log-sheet on paper" alternate behind the nav toggle; the choice is persisted in
  `localStorage`. The descent backdrop is Dive-only.
- **Authentic hero:** the actual in-engine **title screen** (`assets/images/hero-title.*`
  from `assets/game1.png`) — the yellow ROV suspended over the harbour — framed as an
  ROV monitor with a scan-line and drifting god-rays, over an accessible (`sr-only`)
  headline. The harbour vessel-select (`harbour-select`, `game2`) and the full mission
  HUD (`mission-hud`, `game3`) carry the Vessels and Features sections.
- **The vehicle in the field:** cinematic renders of the ROV on the quay and at depth
  (`field-deck`, `field-reel`, `dive-clear`, `dive-deep` — watermark-cropped) ground the
  "topside" section and the two depth interludes.
- **Technical paper:** `paper.html` is a branded, math-rendered (KaTeX, built at
  compile time), illustrated reading view of the project paper, with a print
  stylesheet; `downloads/Inspect-Me-Simulator-Paper.pdf` is the matching PDF and
  `assets/images/paper-cover.jpg` is its first-page preview used on the landing page.
- **The vehicle:** one `<model-viewer>` WebGL context shows the ROV you pilot —
  the same yellow light-inspection ROV from the game's title screen
  (`assets/models/menu-rov.glb`, lit with model-viewer's neutral IBL so the hi-vis
  crown reads true), framed in the `.viewport` monitor chrome beside a live-styled
  **ROV STATUS** panel.
- **Inspection capture** plays out over a **real captured hull** (the Coastal
  Defence Ship): cyan target reticles sit on the actual inspection points — tap them
  to run a beat of the photo-survey loop and count toward the hull's targets. The
  special anode target reads orange, like the render's annotation.
- **In-game captures carry the page.** Raw screen grabs live in
  `assets/capturedFromGame/`; `tools/process-captures.mjs` emits optimized
  WebP + JPEG derivatives into `assets/images/`. Dark game imagery is framed in a
  shared `.viewport` "ROV monitor" chrome with cyan corner brackets.
- **Eight-hull dive manifest** (destroyer · coastal defence ship · submarine · ocean
  liner · harbour tug · patrol boat · wooden boat · sail yacht, with each hull's real
  inspection-point count from `InspectionVesselRegistry`) and a
  **mission walkthrough** (brief → plan → descend) mirror the game's own flow, and
  an annotated live-HUD spotlight proves the telemetry, checklist, MJPEG stream
  and dual-stick controls.
- Type: **Inter** (display + body) · **IBM Plex Mono** (telemetry).

## Quick start

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Structure

| File | Purpose |
|---|---|
| `index.html` | Page markup (incl. the inline SVG refraction filter) |
| `styles.css` | Theme tokens (`[data-theme]`), the waterline hero, the `.viewport` frame, all sections |
| `script.js` | Theme toggle, capture hotspots, nav, the descent (scroll `--depth` + depth gauge + reveal observer), reduced-motion |
| `paper.html` | Generated reading view of the technical paper (do not edit by hand) |
| `content/paper.md` | Source markdown of the paper (copied from the `Inspect-Me` repo) |
| `downloads/Inspect-Me-Simulator-Paper.pdf` | Generated PDF of the paper |
| `assets/capturedFromGame/` | Raw in-game screen captures — the source of truth |
| `assets/` real `*.jpg` photos | Original photographs of the real reference ROV |
| `assets/paper/fig-architecture.svg` | Hand-authored architecture diagram for the paper |
| `assets/vendor/katex/` | Vendored KaTeX stylesheet + woff2 fonts (offline math) |
| `assets/images/*.webp` + `*.jpg` | Web-optimized derivatives built from the captures/photos |
| `assets/models/menu-rov.glb` | The yellow title-screen ROV (interactive 3D, KHR_mesh_quantization) |
| `assets/images/rov-poster.png` | Model loading / no-WebGL fallback (rendered from `menu-rov.glb`) |
| `assets/vendor/model-viewer.min.js` | Vendored — no runtime CDN |
| `tools/process-captures.mjs` | Rebuilds the optimized imagery from the captures/photos (`sharp`) |
| `tools/build-paper.mjs` | Builds `paper.html` + the PDF + cover (`marked`, `katex`, `puppeteer-core`) |
| `tools/build-menu-rov.mjs` | Converts the game's `MenuRov.fbx` → recoloured, optimised `menu-rov.glb` + poster (`fbx2gltf`, `gltf-transform`, `puppeteer-core`) |
| `tools/process-renders.mjs` | Builds OG/concept-render derivatives (`sharp`) |
| `tools/` | Legacy procedural ROV + env generators (`glb-lib.mjs`, `build-models.mjs`, `preview-render.mjs`) |

Install the dev tooling once (none of it ships):

```bash
npm install
```

Regenerate everything (imagery + paper + PDF):

```bash
npm run build
```

Or individually:

```bash
npm run build:captures   # → assets/images/*.webp + *.jpg + og-cover
npm run build:paper      # → paper.html + downloads/*.pdf + assets/images/paper-cover.jpg
npm run build:model      # → assets/models/menu-rov.glb + assets/images/rov-poster.png
```

`build:model` reads the game's `MenuRov.fbx` from the sibling `Inspect-Me` repo
(override with `FBX_SRC=...`), re-bands it into the title-screen yellow/steel/black
palette, optimises + quantizes it, and renders the fallback poster (needs a local
Chrome/Edge for the poster step). It is intentionally excluded from `npm run build`.

The PDF is rendered by driving a locally-installed Chrome/Edge (via
`puppeteer-core` — nothing is downloaded). Set `CHROME_PATH` if it isn't found.
To refresh the paper text, re-copy it first:

```bash
cp ../Inspect-Me/Docs/Inspect-Me-Simulator-Paper.md content/paper.md
```

Regenerate the ROV + environment + poster:

```bash
node tools/build-models.mjs     # → assets/models/rov.glb + env-underwater.png
node tools/preview-render.mjs   # → assets/images/rov-poster.png
```

## Accessibility & robustness

Award-as-a-still: every layout/type/colour choice works without motion. Motion
(caustic drift, refraction shimmer, depth counter) is gated by
`prefers-reduced-motion`. With no JS, the page renders fully in light theme with
a static ROV poster. The theme control is a real `role="switch"` button.

## Deploy

Static files — pushing to `main` triggers the deploy.
