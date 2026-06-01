# Inspect-Me Landing Page

Marketing site for the **Inspect-Me** light inspection-class ROV training
simulator. Static HTML/CSS/JS — no build step.

## Concept — "Waterline"

One luminous, refracting waterline is the hero, the water effect, the page's
structural split, *and* the theme switch:

- **Light "Surface" (default):** warm paper above the line, ink-dark water below;
  the giant Fraunces headline *Deploy. Survey. Surface.* sits **on** the line and
  its reflection refracts in the water (SVG `feTurbulence` + `feDisplacementMap`).
- **Dark "Dive":** the toggle submerges the page; the mono readout counts
  `SURFACE 0 m → DIVE 40 m`. Persisted in `localStorage`, seeded from
  `prefers-color-scheme`.
- **Inspection targets** are crisp GA-blueprint plates (propeller/rudder,
  sea-chest/anode, pile/marine-growth) with amber **capture hotspots** — tap one
  to play a beat of the game's photo-survey loop. (No "boat" models.)
- Type: **Fraunces** (serif display) · **Inter** (body) · **IBM Plex Mono**
  (telemetry). One `<model-viewer>` WebGL context (the ROV at depth).

## Quick start

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Structure

| File | Purpose |
|---|---|
| `index.html` | Page markup (incl. the inline SVG refraction filter) |
| `styles.css` | Theme tokens (`[data-theme]`), the waterline hero, all sections |
| `script.js` | Theme/dive toggle + depth counter, capture hotspots, nav, reduced-motion |
| `assets/models/rov.glb` + `env-underwater.png` | The 3D ROV + its lighting |
| `assets/images/rov-poster.png` | Model loading / no-WebGL fallback |
| `assets/vendor/model-viewer.min.js` | Vendored — no runtime CDN |
| `tools/` | Procedural ROV + poster generators (`glb-lib.mjs`, `build-models.mjs`, `preview-render.mjs`) |

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
