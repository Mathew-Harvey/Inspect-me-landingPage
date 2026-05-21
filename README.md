# Inspect-Me Landing Page

Cinematic marketing site for the **Inspect-Me** light inspection-class ROV training simulator.

## Quick start

Open `index.html` in a browser, or serve locally:

```bash
# Python
python -m http.server 8080

# Node (npx)
npx serve .
```

Then visit `http://localhost:8080`.

## Connect downloads & play links

Edit `config.js`:

```js
window.INSPECT_ME_CONFIG = {
  playUrl: "https://yourname.itch.io/inspect-me",

  downloads: {
    windows: "downloads/Inspect-Me-Windows.zip",
    mac: "downloads/Inspect-Me-macOS.zip",
    linux: "downloads/Inspect-Me-Linux.zip",
  },

  releasesPage: "https://github.com/yourorg/Inspect-Me/releases/latest",
};
```

Place built game files in the `downloads/` folder (or use external URLs).

### Unity build tips

1. **Windows / macOS / Linux**: File → Build Settings → build for each platform, zip the output, copy into `downloads/`.
2. **WebGL (Play in Browser)**: Build WebGL, host the folder (itch.io, GitHub Pages, Netlify), set `playUrl` to the hosted `index.html`.

## Deploy

Static files — deploy anywhere:

- **GitHub Pages**: push repo, enable Pages on `main`
- **Netlify / Vercel**: drag folder or connect repo
- **itch.io**: upload as HTML project

## Structure

```
Inspect-me-landingPage/
├── index.html      # Page content
├── styles.css      # Visual design
├── script.js       # Interactions, download routing
├── config.js       # Download / play URLs (edit this)
└── downloads/      # Optional local build artifacts
```

## Design notes

Inspired by high-converting indie game landing pages (cinematic hero, sticky CTA bar, feature grid, FAQ). Copy focuses on **light inspection-class ROVs** — generic industry category, no manufacturer branding.
