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
- **Inspection capture** plays out over a **real captured hull** (the Coastal
  Defence Ship): amber hotspots sit on the actual inspection points — tap them to
  run a beat of the photo-survey loop and count toward the hull's 26 targets.
- **In-game captures carry the page.** Raw screen grabs live in
  `assets/capturedFromGame/`; `tools/process-captures.mjs` emits optimized
  WebP + JPEG derivatives into `assets/images/`. Dark game imagery is framed in a
  shared `.viewport` "ROV monitor" chrome so it reads cleanly in both themes.
- **Three-vessel showcase** (destroyer · coastal defence ship · submarine) and a
  **mission walkthrough** (brief → plan → descend) mirror the game's own flow, and
  an annotated live-HUD spotlight proves the telemetry, checklist, MJPEG stream
  and dual-stick controls.
- Type: **Inter** (display + body) · **IBM Plex Mono** (telemetry). One
  `<model-viewer>` WebGL context (the ROV at depth), with a cinematic vessel
  looming behind it in the deep.

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
| `script.js` | Theme/dive toggle + depth counter, capture hotspots, nav, reduced-motion |
| `assets/capturedFromGame/` | Raw in-game screen captures — the source of truth |
| `assets/images/*.webp` + `*.jpg` | Web-optimized derivatives built from the captures |
| `assets/models/rov.glb` + `env-underwater.png` | The 3D ROV + its lighting |
| `assets/images/rov-poster.png` | Model loading / no-WebGL fallback |
| `assets/vendor/model-viewer.min.js` | Vendored — no runtime CDN |
| `tools/process-captures.mjs` | Rebuilds the optimized imagery from the raw captures (`sharp`) |
| `tools/` | Procedural ROV + poster generators (`glb-lib.mjs`, `build-models.mjs`, `preview-render.mjs`) |

Regenerate the optimized imagery from the raw captures:

```bash
npm install sharp                 # one-time (dev only; not shipped)
node tools/process-captures.mjs   # → assets/images/*.webp + *.jpg + og-cover
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
