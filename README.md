# Chronodōmō

Interactive 3D scroll experience: one building across five European architectural epochs — Pre-Romanesque, Romanesque, Gothic, Renaissance, and Baroque.

**Live:** https://chronodomo.com  
**Studio:** [asymetric.studio](https://asymetric.studio)  
**Author:** Dalibor Itze

Stack: **Vite** · **Three.js** · **Lenis** · **nginx** (Docker)

---

## What you see

1. A loading screen downloads the main house model and shows progress.
2. An intro animation lifts and rotates the house into place.
3. Scrolling drives a GLTF animation that morphs the building through architectural styles.
4. Epoch copy sits left of a dashed timeline; titles sit on the right.
5. **Scroll** mode (default) ties animation to scroll; **View** mode frees the camera for orbit/zoom.

---

## How it works

### Boot & loading (`src/main.js`)

1. **Lenis** is created but stopped; `no-scroll` locks the page until assets are ready.
2. Three.js scene, camera, renderer, lights, and `OrbitControls` are set up. The WebGL canvas is moved to `document.body` so `position: fixed` stays viewport-relative (the scroll container uses a CSS transform that would otherwise trap `fixed`).
3. **DRACO** decoders load from Google’s CDN; GLTF parsing uses that decoder.
4. `house.glb` is fetched with a streaming reader:
   - Bytes received map to **0–89%** on the loading UI.
   - Font weight (`--headline-width`) eases with progress.
5. Decode maps to **90–100%** (first decode uses a short eased fake ramp so the bar doesn’t jump).
6. After the house is in the scene, `clipping.glb` and `ground.glb` load in parallel.
7. A bounding box from the (hidden) clipping mesh becomes **six clipping planes** on every house material — so as the clip volume moves/rotates with the intro, the house is carved to match.
8. UI classes `loaded` fade out the progress screen and slide in the mode switcher; Lenis starts when the intro finishes.

### Intro

Over ~5s with cubic ease-out:

- House, ground, and clipping volume rise from `y = -12` → `-2.8` and rotate from `π` → `0`.
- Clipping planes are rebuilt each frame from the clipping object’s box.
- The GLTF mixer advances through the first **125 “intro frames”** of the clip so the morph starts mid-timeline when scrolling begins.

### Scroll → animation

- Document height comes from `#canvas-container` (~`800svh` of scrollable content).
- Each frame: `progress = scrollY / (scrollHeight - viewport)`.
- That progress maps onto the remaining animation frames after the intro segment.
- Mixer action times are set directly (not left running freely), so scrubbing scroll scrubbing the morph.

### Modes

| Mode | Scroll | Camera |
|------|--------|--------|
| **Scroll** | Lenis on; epoch articles visible | Orbit on desktop without zoom; locked further on small screens |
| **View** | Lenis stopped; articles disabled | Orbit + zoom |

Mobile (&lt;740px): epoch bodies slide in via the **+** control on each section header.

### Markup & layout

- Epochs are `<article>` blocks inside `#canvas-container` with date + title in `.meta` and body in `.content`.
- CSS variables `--page-pad`, `--left-col`, `--timeline-left` keep body copy **left of** the dashed `.timeline` rule.
- Footer (`About Chronodōmō`) sits after Baroque with links to the studio and this repo.

### Assets (`public/`)

| Path | Role |
|------|------|
| `models/house.glb` | Main morphing building (DRACO-compressed) |
| `models/clipping.glb` | Invisible volume → clipping planes |
| `models/ground.glb` | Ground plane / landscape |
| `fonts/*` | Synonym + Mona Sans |
| `img/timeline.svg` | Vertical dashed ruler |

---

## Project layout

```text
├── index.html          # Structure, SEO, articles, footer
├── src/
│   ├── main.js         # Three.js scene, load, scroll scrub, modes
│   └── style.css       # Layout, timeline, modes, footer
├── public/             # Static assets copied as-is by Vite
├── Dockerfile          # Multi-stage: npm build → nginx:alpine
└── nginx.conf          # Static serve + www → apex redirect
```

---

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/
npm run preview
```

---

## Deploy

Production is a static Vite build served by nginx inside Docker.

```bash
docker build -t chronodomo .
docker run --rm -p 8080:80 chronodomo
```

Coolify (or any host): connect this GitHub repo, **Dockerfile** build pack, container port **80**, domains `chronodomo.com` / `www.chronodomo.com`, auto-deploy on `main`. No environment variables required.

`www` is redirected to the apex host inside `nginx.conf`; TLS terminates at the reverse proxy in front of the container.

---

## License / credit

© Dalibor Itze / [Studio Asymetric](https://asymetric.studio). Source published for transparency; ask before reusing assets commercially.
