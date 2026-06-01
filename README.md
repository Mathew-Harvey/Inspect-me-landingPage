# Inspect-Me Landing Page

Marketing site for the **Inspect-Me** light inspection-class ROV training
simulator. Static HTML/CSS/JS — no build step.

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
| `script.js` | Scroll/reveal, mobile nav, particle canvas, reduced-motion handling |
| `config.js` | `githubUrl` + `contactEmail` overrides |
| `assets/images/` | Screenshots + the generated ROV poster (`rov-poster.png`) |
| `assets/models/rov.glb` | Interactive 3D ROV shown in the hero |
| `tools/` | Generators for the 3D model + poster |

## Interactive 3D ROV

The hero renders an interactive 3D model of a generic light inspection-class ROV
with [`<model-viewer>`](https://modelviewer.dev/) (loaded from a CDN). The model
is generated procedurally — no manufacturer branding — and committed as
`assets/models/rov.glb`.

To regenerate the model and its fallback poster:

```bash
node tools/build-rov-glb.mjs     # → assets/models/rov.glb
node tools/preview-render.mjs    # → assets/images/rov-poster.png (+ tools/rov-preview.png QA)
```

The page degrades gracefully: if the viewer script or WebGL is unavailable, the
static `rov-poster.png` is shown instead.

## Deploy

Static files — GitHub Pages, Netlify, Vercel, or itch.io. Pushing to `main`
triggers the deploy.
