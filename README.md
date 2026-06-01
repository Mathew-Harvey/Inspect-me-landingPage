# Inspect-Me Landing Page

Marketing site for the **Inspect-Me** light inspection-class ROV training
simulator. Static HTML/CSS/JS — no build step. Minimal, content-first design.

## Quick start

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Structure

| File | Purpose |
|---|---|
| `index.html` | Page markup |
| `styles.css` | All styling |
| `script.js` | Header state, mobile nav, reduced-motion, 3D model switcher |
| `config.js` | `githubUrl` + `contactEmail` overrides |
| `assets/images/` | Screenshots + generated model posters (`{rov,submarine,hull}-poster.png`) |
| `assets/models/` | `{rov,submarine,hull}.glb` + `env-underwater.png` (IBL) |
| `assets/vendor/` | `model-viewer.min.js` (vendored — no runtime CDN) |
| `tools/` | Procedural model + poster generators |

## Interactive 3D fleet

The hero shows one [`<model-viewer>`](https://modelviewer.dev/) whose `src` is
swapped between three procedurally-generated, unbranded models — **ROV**
(the tool you pilot) and **Submarine** / **Hull** (the targets you inspect).
Using a single viewer keeps exactly one WebGL context alive no matter how many
models are offered. "Water" is delivered as a generated equirectangular
environment map (`env-underwater.png`) used for lighting only — the viewer
stays transparent over the page background.

Regenerate the models, environment, and fallback posters:

```bash
node tools/build-models.mjs     # → assets/models/{rov,submarine,hull}.glb + env-underwater.png
node tools/preview-render.mjs   # → assets/images/{name}-poster.png (+ tools/{name}-preview.png QA)
```

The page degrades gracefully: if the viewer script or WebGL is unavailable, the
static poster is shown instead, and all page content is plain HTML (no
JS-gated visibility).

## Deploy

Static files — GitHub Pages, Netlify, Vercel, or itch.io. Pushing to `main`
triggers the deploy.
