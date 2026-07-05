// =========================================================
// main.js — Application entry point
// Wires together scene.js, character.js, hand.js, audio.js,
// particles.js and ui.js. Drives the slap sequence timeline,
// random expressions/dialogue, counter persistence, keyboard
// shortcuts and settings.
// =========================================================

import * as THREE from "three";
import gsap from "gsap";
import { SceneManager } from "./scene.js";
import { Character } from "./character.js";
import { Hand } from "./hand.js";
import { AudioManager } from "./audio.js";
import { UIManager } from "./ui.js";
import { spawnSmokePuff, spawnStars, spawnSparkles, spawnImpactRing } from "./particles.js";

// ---------------------------------------------------------
// Constants
// ---------------------------------------------------------
const STORAGE_KEY_COUNT = "cartoonSlap.count";
const STORAGE_KEY_SETTINGS = "cartoonSlap.settings";

const EXPRESSIONS = ["surprised", "dizzy", "angry", "confused", "crossEyed", "stars", "birds"];
const DIALOGUE = ["Hey!", "Ouch!", "Seriously?", "Not again!", "What was that?"];

const DEFAULT_SETTINGS = {
  sound: true,
  music: true,
  volume: 0.7,
  particles: true,
  shake: true,
  quality: "medium",
  muted: false,
  theme: "classic",
};

// ---------------------------------------------------------
// App state
// ---------------------------------------------------------
let settings = loadSettings();
let slapCount = loadCount();
let isAnimating = false;

// ---------------------------------------------------------
// Init
// ---------------------------------------------------------
const canvas = document.getElementById("scene-canvas");
const labelRoot = document.getElementById("css2d-root");

const sceneManager = new SceneManager(canvas, labelRoot);
const character = new Character(sceneManager.scene);
const hand = new Hand(sceneManager.scene, 1);
const audio = new AudioManager();
const ui = new UIManager();

applySettingsToApp(settings, { silent: true });
ui.setCounter(slapCount);

// ---------------------------------------------------------
// Wire scene render loop
// ---------------------------------------------------------
sceneManager.onUpdate((t, dt) => {
  character.updateIdle(t, dt);
  hand.updateIdle(t);
});

function animate() {
  requestAnimationFrame(animate);
  sceneManager.update();
}
animate();

// ---------------------------------------------------------
// UI bindings
// ---------------------------------------------------------
ui.bind({
  onApplyName: (name) => {
    character.setName(name);
  },
  onSlap: () => performSlap(),
  onReset: () => resetCounter(),
  onThemeChange: (theme) => {
    settings.theme = theme;
    sceneManager.setTheme(theme);
    saveSettings();
  },
  onSoundToggle: (enabled) => {
    settings.sound = enabled;
    audio.setSfxEnabled(enabled);
    saveSettings();
  },
  onMusicToggle: (enabled) => {
    settings.music = enabled;
    audio.setMusicEnabled(enabled);
    saveSettings();
  },
  onVolumeChange: (v) => {
    settings.volume = v;
    audio.setVolume(v);
    saveSettings();
  },
  onParticlesToggle: (enabled) => {
    settings.particles = enabled;
    saveSettings();
  },
  onShakeToggle: (enabled) => {
    settings.shake = enabled;
    saveSettings();
  },
  onQualityChange: (quality) => {
    settings.quality = quality;
    sceneManager.setQuality(quality);
    saveSettings();
  },
  onMuteToggle: (muted) => {
    settings.muted = muted;
    audio.setMuted(muted);
    saveSettings();
  },
});

// Reflect loaded settings into the settings-panel controls
ui.themeSelect.value = settings.theme;
ui.soundToggle.checked = settings.sound;
ui.musicToggle.checked = settings.music;
ui.volumeSlider.value = Math.round(settings.volume * 100);
ui.particlesToggle.checked = settings.particles;
ui.shakeToggle.checked = settings.shake;
ui.qualitySelect.value = settings.quality;

// ---------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------
window.addEventListener("keydown", (e) => {
  const typing = document.activeElement === ui.nameInput;

  if (e.code === "Space" && !typing) {
    e.preventDefault();
    performSlap();
  } else if ((e.key === "r" || e.key === "R") && !typing && !ui.isSettingsOpen()) {
    resetCounter();
  }
  // Note: Enter-to-apply-name is handled inside ui.js's own
  // keydown listener on the name input field.
});

// Unlock the AudioContext on first user interaction (browser policy)
window.addEventListener(
  "pointerdown",
  () => {
    if (settings.music) audio.startMusic();
  },
  { once: true }
);

// ---------------------------------------------------------
// Core slap sequence
// ---------------------------------------------------------
function performSlap() {
  if (isAnimating) return;
  isAnimating = true;
  ui.setSlapButtonEnabled(false);

  audio.playWhoosh();

  const direction = Math.random() > 0.5 ? 1 : -1;

  // Swing the hand; the character reacts + effects fire at impact
  hand.swing(() => {
    onImpact(direction);
  });
}

function onImpact(direction) {
  audio.playSlap();

  if (settings.shake) {
    sceneManager.shake(0.28, 0.4);
  }

  // Character physical reaction (squash/stretch, slide, bounce)
  const reactionTl = character.reactSlap(direction);

  // Particle burst at the impact point (character's cheek)
  const impactPos = new THREE.Vector3();
  character.headPivot.getWorldPosition(impactPos);
  impactPos.y += 0.05;
  impactPos.z += 0.4;

  if (settings.particles) {
    spawnImpactRing(sceneManager.scene, impactPos);
    spawnSmokePuff(sceneManager.scene, impactPos);
    spawnSparkles(sceneManager.scene, impactPos);
    spawnStars(sceneManager.scene, impactPos);
  }

  // Random cartoon expression
  const expression = EXPRESSIONS[Math.floor(Math.random() * EXPRESSIONS.length)];
  character.setExpression(expression, 1.4);

  // Random dialogue in a speech bubble, positioned above the head
  const line = DIALOGUE[Math.floor(Math.random() * DIALOGUE.length)];
  showSpeechAboveHead(line);

  // Randomized secondary sound (boing/pop) shortly after impact
  gsap.delayedCall(0.12, () => audio.playRandomReaction());

  // Increment + persist counter
  slapCount += 1;
  ui.setCounter(slapCount);
  saveCount();

  // Re-enable the slap button once everything settles
  reactionTl.eventCallback("onComplete", () => {
    isAnimating = false;
    ui.setSlapButtonEnabled(true);
  });
}

// -------------------------------------------------------
// Project the character's head position to screen space so
// the speech bubble (HTML) lines up with the 3D character.
function showSpeechAboveHead(text) {
  const worldPos = new THREE.Vector3();
  character.headPivot.getWorldPosition(worldPos);
  worldPos.y += 0.75;

  const projected = worldPos.clone().project(sceneManager.camera);
  const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

  ui.showSpeech(text, x, y, 2);
}

// ---------------------------------------------------------
function resetCounter() {
  slapCount = 0;
  ui.setCounter(0);
  saveCount();
}

// ---------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------
function loadCount() {
  const raw = localStorage.getItem(STORAGE_KEY_COUNT);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

function saveCount() {
  localStorage.setItem(STORAGE_KEY_COUNT, String(slapCount));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
}

function applySettingsToApp(s) {
  sceneManager.setTheme(s.theme);
  sceneManager.setQuality(s.quality);
  audio.setSfxEnabled(s.sound);
  audio.setVolume(s.volume);
  audio.setMuted(s.muted);
  // Music only actually starts after the first user gesture (see pointerdown listener above)
}
