// =========================================================
// particles.js — Comic-style impact effects
// Smoke puff, stars, sparkles, and a comic impact ring.
// All effects self-clean (removed from scene automatically).
// =========================================================

import * as THREE from "three";
import gsap from "gsap";

function canvasTexture(draw, size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

const SMOKE_TEX = canvasTexture((ctx, s) => {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
});

const SPARK_TEX = canvasTexture((ctx, s) => {
  ctx.translate(s / 2, s / 2);
  ctx.fillStyle = "#fff7c2";
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i;
    ctx.lineTo(Math.cos(a) * s * 0.45, Math.sin(a) * s * 0.45);
    ctx.lineTo(Math.cos(a + 0.3) * s * 0.12, Math.sin(a + 0.3) * s * 0.12);
  }
  ctx.closePath();
  ctx.fill();
});

const STAR_TEX = canvasTexture((ctx, s) => {
  ctx.translate(s / 2, s / 2);
  ctx.fillStyle = "#ffe14d";
  ctx.strokeStyle = "#c98f00";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? s * 0.42 : s * 0.18;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
});

// ---------------------------------------------------------
function spawnSprites(scene, position, texture, count, opts = {}) {
  const {
    spread = 0.6,
    baseSize = 0.3,
    upward = 1.2,
    life = 0.7,
    fadeScale = 1.6,
  } = opts;

  const group = new THREE.Group();
  group.position.copy(position);
  scene.add(group);

  const sprites = [];
  for (let i = 0; i < count; i++) {
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.setScalar(baseSize);
    group.add(sprite);
    sprites.push(sprite);

    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * spread;
    const targetX = Math.cos(angle) * dist;
    const targetZ = Math.sin(angle) * dist;
    const targetY = Math.random() * upward;

    gsap.to(sprite.position, {
      x: targetX,
      y: targetY,
      z: targetZ,
      duration: life,
      ease: "power2.out",
    });
    gsap.to(sprite.scale, {
      x: baseSize * fadeScale,
      y: baseSize * fadeScale,
      z: baseSize * fadeScale,
      duration: life,
      ease: "power1.out",
    });
    gsap.to(mat, {
      opacity: 0,
      duration: life,
      delay: life * 0.25,
      ease: "power1.in",
    });
  }

  gsap.delayedCall(life + 0.1, () => {
    scene.remove(group);
    sprites.forEach((s) => s.material.dispose());
  });
}

// ---------------------------------------------------------
export function spawnSmokePuff(scene, position) {
  spawnSprites(scene, position, SMOKE_TEX, 6, {
    spread: 0.5,
    baseSize: 0.45,
    upward: 0.5,
    life: 0.6,
    fadeScale: 2.2,
  });
}

export function spawnStars(scene, position) {
  spawnSprites(scene, position, STAR_TEX, 5, {
    spread: 0.8,
    baseSize: 0.22,
    upward: 0.9,
    life: 0.9,
    fadeScale: 1.3,
  });
}

export function spawnSparkles(scene, position) {
  spawnSprites(scene, position, SPARK_TEX, 10, {
    spread: 1.0,
    baseSize: 0.13,
    upward: 0.7,
    life: 0.5,
    fadeScale: 1.6,
  });
}

// ---------------------------------------------------------
// Comic impact ring — a flat expanding torus/ring sprite
export function spawnImpactRing(scene, position, normal = new THREE.Vector3(0, 0, 1)) {
  const geo = new THREE.RingGeometry(0.15, 0.22, 24);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(geo, mat);
  ring.position.copy(position);
  ring.lookAt(position.clone().add(normal));
  scene.add(ring);

  gsap.to(ring.scale, { x: 3.5, y: 3.5, z: 3.5, duration: 0.35, ease: "power2.out" });
  gsap.to(mat, {
    opacity: 0,
    duration: 0.35,
    ease: "power1.in",
    onComplete: () => {
      scene.remove(ring);
      geo.dispose();
      mat.dispose();
    },
  });

  // A couple of comic "impact lines" (small elongated white boxes) radiating out
  const lineGroup = new THREE.Group();
  lineGroup.position.copy(position);
  scene.add(lineGroup);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  const lines = [];
  const lineCount = 6;
  for (let i = 0; i < lineCount; i++) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.04), lineMat.clone());
    const angle = (i / lineCount) * Math.PI * 2;
    line.position.set(Math.cos(angle) * 0.25, Math.sin(angle) * 0.25, 0);
    line.rotation.z = angle;
    line.lookAt(position.clone().add(normal));
    lineGroup.add(line);
    lines.push(line);

    gsap.to(line.position, {
      x: Math.cos(angle) * 0.7,
      y: Math.sin(angle) * 0.7,
      duration: 0.3,
      ease: "power2.out",
    });
    gsap.to(line.material, { opacity: 0, duration: 0.3, ease: "power1.in" });
  }

  gsap.delayedCall(0.4, () => {
    scene.remove(lineGroup);
    lines.forEach((l) => {
      l.geometry.dispose();
      l.material.dispose();
    });
  });
}
