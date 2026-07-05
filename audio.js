// =========================================================
// audio.js — Cartoon sound effects via Web Audio API
// All sounds are synthesized on the fly (oscillators/noise),
// so the app needs zero external audio files to run.
// =========================================================

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.volume = 0.7;
    this._musicNodes = null;
  }

  // Web Audio requires a user gesture to start — call this on first click.
  _ensureContext() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 1;
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.18;
    this.musicGain.connect(this.masterGain);
  }

  setVolume(v) {
    this.volume = v;
    if (this.masterGain) this.masterGain.gain.setTargetAtTime(this.muted ? 0 : v, this.ctx.currentTime, 0.05);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = enabled;
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (!this.ctx) return;
    if (enabled) this.startMusic();
    else this.stopMusic();
  }

  // -------------------------------------------------------
  // Simple ambient background pad — two detuned oscillators
  // slowly drifting, very quiet, purely atmospheric.
  startMusic() {
    this._ensureContext();
    if (this._musicNodes || !this.musicEnabled) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.value = 110;
    osc2.frequency.value = 110 * 1.5;

    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 6;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.musicGain);

    osc1.start();
    osc2.start();
    lfo.start();
    gain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 1.5);

    this._musicNodes = { osc1, osc2, lfo, gain };
  }

  stopMusic() {
    if (!this._musicNodes) return;
    const { osc1, osc2, lfo, gain } = this._musicNodes;
    const now = this.ctx.currentTime;
    gain.gain.linearRampToValueAtTime(0, now + 0.4);
    setTimeout(() => {
      osc1.stop();
      osc2.stop();
      lfo.stop();
    }, 500);
    this._musicNodes = null;
  }

  // -------------------------------------------------------
  _playIfEnabled(fn) {
    if (!this.sfxEnabled) return;
    this._ensureContext();
    if (this.ctx.state === "suspended") this.ctx.resume();
    fn();
  }

  // Whoosh — filtered noise sweep, rising then falling
  playWhoosh() {
    this._playIfEnabled(() => {
      const ctx = this.ctx;
      const bufferSize = ctx.sampleRate * 0.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 1.2;
      filter.frequency.setValueAtTime(300, ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(2200, ctx.currentTime + 0.18);
      filter.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.4);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.4);

      noise.connect(filter).connect(gain).connect(this.sfxGain);
      noise.start();
      noise.stop(ctx.currentTime + 0.42);
    });
  }

  // Cartoon slap — short noise burst + low thump
  playSlap() {
    this._playIfEnabled(() => {
      const ctx = this.ctx;
      const now = ctx.currentTime;

      // Crack (filtered noise burst)
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "highpass";
      noiseFilter.frequency.value = 900;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.9, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      noise.connect(noiseFilter).connect(noiseGain).connect(this.sfxGain);
      noise.start(now);
      noise.stop(now + 0.15);

      // Thump (low sine)
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.8, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(oscGain).connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.22);
    });
  }

  // Boing — pitch-bending triangle wave (classic cartoon spring)
  playBoing() {
    this._playIfEnabled(() => {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(500, now + 0.08);
      osc.frequency.linearRampToValueAtTime(140, now + 0.35);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain).connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.42);
    });
  }

  // Pop — very short high blip
  playPop() {
    this._playIfEnabled(() => {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.06);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain).connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.1);
    });
  }

  // Randomized post-impact sound (boing or pop, for comic variety)
  playRandomReaction() {
    this._playIfEnabled(() => {
      Math.random() > 0.5 ? this.playBoing() : this.playPop();
    });
  }
}
