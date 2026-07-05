# 🖐️ Cartoon Slap Simulator

A goofy, **100% cartoon** stress-relief toy built with **Three.js** and **GSAP**.
Press the big button, watch an exaggerated cartoon character get gently
"boinked" by an oversized cartoon hand, and enjoy silly squash-and-stretch
physics, comic particle effects, and random reactions.

> ⚠️ **Design intent:** This app is deliberately silly and cartoonish — no
> real people, no blood, no injuries, no realistic violence. Think classic
> Saturday-morning-cartoon slapstick, not anything harmful.

---

## ✨ Features

- Procedurally-built cartoon character & hand (no external 3D models needed)
- Idle breathing + blinking animation
- Squash-and-stretch, overshoot, and elastic "cartoon physics" via GSAP
- 7 random cartoon expressions (surprised, dizzy, angry, confused, cross-eyed,
  stars, circling birds)
- Random speech-bubble dialogue synced to the character's screen position
- Synthesized sound effects (whoosh, slap, boing, pop) — zero audio files
  required, all generated live with the Web Audio API
- Comic particle effects: smoke puff, stars, sparkles, impact ring
- 5 instant-switch themes: Classic, Neon, Space, Forest, Cyberpunk
- Persistent slap counter (LocalStorage) with animated increments
- Full settings panel: sound/music toggles, volume, particle toggle, camera
  shake toggle, render quality (Low/Medium/High), mute
- Keyboard shortcuts: `Space` = Slap, `Enter` = Apply Name, `R` = Reset Counter
- Responsive, glassmorphism UI that works on desktop and mobile/touch

---

## 📦 Installation

Requires [Node.js](https://nodejs.org/) 18+.

```bash
npm install
```

## ▶️ Run in development

```bash
npm run dev
```

This starts the Vite dev server (usually at `http://localhost:5173`) and
opens the app automatically. Hot-reload is enabled — edit any `.js`/`.css`
file and the browser updates instantly.

## 🏗️ Build for production

```bash
npm run build
```

Outputs an optimized static bundle to `dist/`. Preview the production build
locally with:

```bash
npm run preview
```

---

## 🗂️ Project structure

```
cartoon-slap/
├── index.html        # Page markup + UI overlay (name input, slap button, settings panel)
├── style.css          # Glassmorphism dark UI, blue/purple gradients, responsive layout
├── main.js            # App entry point — wires everything together, drives the slap sequence
├── scene.js           # Three.js renderer, camera, lights, ground, themes, CSS2D labels, shake
├── character.js       # Procedural cartoon character: body, face, expressions, name label
├── hand.js            # Procedural cartoon hand: idle float + swing/slap animation
├── particles.js        # Comic particle effects: smoke, stars, sparkles, impact ring
├── audio.js           # Web Audio API sound synthesis: whoosh, slap, boing, pop, music
├── ui.js              # DOM wiring: buttons, counter, speech bubble, settings panel
├── vite.config.js     # Vite build configuration
└── assets/            # Optional folders for custom models/textures/sounds (see assets/README.md)
```

---

## 🎨 Customization

### Changing themes / colors

Themes live in `scene.js` inside the `THEMES` object. Each theme is a plain
object of hex colors:

```js
export const THEMES = {
  myTheme: {
    bg: 0x101020,        // renderer clear color / fog base
    fog: 0x101020,
    ground: 0x2a2a55,
    groundGrid: 0x5566ff,
    ambient: 0x8899ff,
    hemiSky: 0xaabbff,
    hemiGround: 0x202040,
    keyLight: 0xffffff,
  },
};
```

Add your theme, then add a matching `<option>` in `index.html`'s
`#theme-select`.

### Adding new expressions

Expressions are handled in `character.js`'s `setExpression(name, duration)`
method. Add a new `case` in the `switch` statement that mutates eyes/brows/
mouth and optionally calls `this._spawnAccessory(texture, count, radius,
size, orbit)` for orbiting sprites (stars, birds, sweat, etc.). Then add the
new expression name to the `EXPRESSIONS` array in `main.js` so it's picked
randomly on slap.

### Adding new dialogue lines

Edit the `DIALOGUE` array at the top of `main.js`:

```js
const DIALOGUE = ["Hey!", "Ouch!", "Seriously?", "Not again!", "What was that?", "Your new line!"];
```

### Adding new animations

All physical animation is done with GSAP timelines:

- `character.reactSlap(direction)` in `character.js` — the character's
  physical reaction (squash, tilt, slide, bounce, elastic recovery).
- `hand.swing(onImpact)` in `hand.js` — the hand's wind-up → swing → impact →
  elastic return, calling `onImpact()` at the moment of contact.

To add a new animation, create a new GSAP timeline (`gsap.timeline()`),
chain `.to(...)` calls with the object/property/duration/easing you want, and
trigger it from `main.js` (e.g., on a new button or condition). Favor
`elastic.out`, `back.out`, and `bounce.out` easings to keep the "cartoon
physics" feel consistent with the rest of the app.

### Changing models

The character and hand are built procedurally from Three.js primitives
(spheres, capsules, boxes) in `character.js` / `hand.js` — no `.glb`/`.gltf`
loading is required to run the app. If you'd like to swap in a real 3D model:

1. Place your `.glb`/`.gltf` file in `assets/models/`.
2. Import `GLTFLoader` from `three/examples/jsm/loaders/GLTFLoader.js`.
3. Load it inside the relevant class's constructor, add the loaded scene to
   `this.group` (character) or `this.pivot`/`this.mesh` (hand), and keep
   the existing animation code (it targets `THREE.Object3D` positions/
   rotations/scales, which works the same for loaded models).

### Adding real sound files

All audio is synthesized in `audio.js` via the Web Audio API — no files are
required. To use recorded audio instead:

1. Place `.mp3`/`.wav` files in `assets/sounds/`.
2. In `audio.js`, replace a method (e.g. `playSlap()`) with an `<audio>` or
   `AudioBufferSourceNode`-based loader, e.g.:

```js
async loadSound(url) {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  return this.ctx.decodeAudioData(buf);
}

playBuffer(buffer) {
  const src = this.ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(this.sfxGain);
  src.start();
}
```

3. Preload buffers on startup and call `playBuffer()` in place of the
   synthesized methods.

---

## 🚀 Deployment

The build output in `dist/` is a fully static site — deploy it anywhere that
serves static files:

- **Netlify / Vercel:** point the build command to `npm run build` and the
  publish directory to `dist`.
- **GitHub Pages:** run `npm run build`, then push the contents of `dist/` to
  a `gh-pages` branch (or use an action like `peaceiris/actions-gh-pages`).
- **Any static host (S3, Cloudflare Pages, Firebase Hosting, nginx, etc.):**
  upload the contents of `dist/` as-is. `vite.config.js` uses a relative
  `base: "./"` so it works from any sub-path.

---

## ♿ Accessibility & Performance

- Keyboard shortcuts: `Space` (Slap), `Enter` (Apply Name), `R` (Reset)
- Respects `prefers-reduced-motion` for CSS transitions
- Render quality setting (Low/Medium/High) adjusts pixel ratio and shadow map
  resolution for lower-end/mobile devices
- Touch-friendly buttons sized for mobile tapping; `touch-action: none` on
  the canvas prevents scroll-jank while orbiting the camera

---

## 🧑‍💻 Tech stack

- **Three.js** — 3D rendering, OrbitControls, CSS2DRenderer for the floating
  name label
- **GSAP** — all animation timelines (character reactions, hand swings,
  particles, camera shake, UI counter)
- **Vite** — dev server & production bundling
- **Vanilla JS (ES Modules)** — no framework, no UI library

Enjoy the slaps! 🎉
