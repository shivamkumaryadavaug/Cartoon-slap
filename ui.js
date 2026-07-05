// =========================================================
// ui.js — DOM / UI wiring
// Connects HTML controls to app callbacks, animates the
// slap counter, positions the speech bubble over the 3D
// character, and manages the settings panel.
// =========================================================

import gsap from "gsap";

export class UIManager {
  constructor() {
    // Cache DOM elements
    this.nameInput = document.getElementById("name-input");
    this.applyNameBtn = document.getElementById("apply-name-btn");
    this.slapBtn = document.getElementById("slap-btn");
    this.counterEl = document.getElementById("slap-counter");
    this.settingsBtn = document.getElementById("settings-btn");
    this.resetBtn = document.getElementById("reset-btn");
    this.settingsOverlay = document.getElementById("settings-overlay");
    this.settingsCloseBtn = document.getElementById("settings-close-btn");
    this.speechBubble = document.getElementById("speech-bubble");
    this.themeSelect = document.getElementById("theme-select");

    this.soundToggle = document.getElementById("sound-toggle");
    this.musicToggle = document.getElementById("music-toggle");
    this.volumeSlider = document.getElementById("volume-slider");
    this.particlesToggle = document.getElementById("particles-toggle");
    this.shakeToggle = document.getElementById("shake-toggle");
    this.qualitySelect = document.getElementById("quality-select");
    this.muteBtn = document.getElementById("mute-btn");

    this._counterValue = 0;
    this._muted = false;
  }

  // -------------------------------------------------------
  // Wire up all callbacks. `handlers` is an object of functions
  // supplied by main.js — keeps ui.js decoupled from app logic.
  bind(handlers) {
    this.applyNameBtn.addEventListener("click", () => this._applyName(handlers));
    this.slapBtn.addEventListener("click", () => handlers.onSlap?.());
    this.resetBtn.addEventListener("click", () => handlers.onReset?.());

    this.settingsBtn.addEventListener("click", () => this.openSettings());
    this.settingsCloseBtn.addEventListener("click", () => this.closeSettings());
    this.settingsOverlay.addEventListener("click", (e) => {
      if (e.target === this.settingsOverlay) this.closeSettings();
    });

    this.themeSelect.addEventListener("change", (e) => handlers.onThemeChange?.(e.target.value));

    this.soundToggle.addEventListener("change", (e) => handlers.onSoundToggle?.(e.target.checked));
    this.musicToggle.addEventListener("change", (e) => handlers.onMusicToggle?.(e.target.checked));
    this.volumeSlider.addEventListener("input", (e) => handlers.onVolumeChange?.(Number(e.target.value) / 100));
    this.particlesToggle.addEventListener("change", (e) => handlers.onParticlesToggle?.(e.target.checked));
    this.shakeToggle.addEventListener("change", (e) => handlers.onShakeToggle?.(e.target.checked));
    this.qualitySelect.addEventListener("change", (e) => handlers.onQualityChange?.(e.target.value));

    this.muteBtn.addEventListener("click", () => {
      this._muted = !this._muted;
      this.muteBtn.textContent = this._muted ? "🔇 Unmute" : "🔊 Mute";
      handlers.onMuteToggle?.(this._muted);
    });

    // Enter key inside the name field also applies the name
    this.nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this._applyName(handlers);
    });
  }

  _applyName(handlers) {
    const name = this.nameInput.value.trim();
    if (name) handlers.onApplyName?.(name);
  }

  // -------------------------------------------------------
  openSettings() {
    this.settingsOverlay.classList.remove("hidden");
  }
  closeSettings() {
    this.settingsOverlay.classList.add("hidden");
  }
  isSettingsOpen() {
    return !this.settingsOverlay.classList.contains("hidden");
  }

  // -------------------------------------------------------
  setSlapButtonEnabled(enabled) {
    this.slapBtn.disabled = !enabled;
  }

  // -------------------------------------------------------
  // Animate the counter with a little "pop" each increment.
  setCounter(value) {
    this._counterValue = value;
    this.counterEl.textContent = value;
    gsap.fromTo(
      this.counterEl,
      { scale: 1.5, color: "#ff5ba0" },
      { scale: 1, color: "#5b8dff", duration: 0.4, ease: "back.out(3)" }
    );
  }

  // -------------------------------------------------------
  // Show a speech bubble anchored at a given screen-space
  // {x, y} position (in pixels) for `duration` seconds.
  showSpeech(text, screenX, screenY, duration = 2) {
    this.speechBubble.textContent = text;
    this.speechBubble.style.left = `${screenX}px`;
    this.speechBubble.style.top = `${screenY}px`;
    this.speechBubble.classList.remove("hidden");

    clearTimeout(this._speechTimeout);
    this._speechTimeout = setTimeout(() => {
      this.speechBubble.classList.add("hidden");
    }, duration * 1000);
  }

  getNameInputValue() {
    return this.nameInput.value.trim();
  }
}
