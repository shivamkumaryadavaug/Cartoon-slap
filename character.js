// =========================================================
// character.js — The cartoon character
// Procedurally built from primitives (no external models),
// with idle breathing, blinking, expressions, name label,
// and squash/stretch slap reactions.
// =========================================================

import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import gsap from "gsap";

// ---------------------------------------------------------
// Helper: draw a small canvas texture (for accessory sprites
// like stars, sweat drops, birds, spiral eyes, etc.)
// ---------------------------------------------------------
function makeSpriteTexture(draw, size = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const STAR_TEX = makeSpriteTexture((ctx, s) => {
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

const SWEAT_TEX = makeSpriteTexture((ctx, s) => {
  ctx.fillStyle = "#7fd8ff";
  ctx.strokeStyle = "#3b9fd8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(s / 2, s * 0.12);
  ctx.quadraticCurveTo(s * 0.85, s * 0.65, s / 2, s * 0.9);
  ctx.quadraticCurveTo(s * 0.15, s * 0.65, s / 2, s * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
});

const BIRD_TEX = makeSpriteTexture((ctx, s) => {
  ctx.translate(s / 2, s / 2);
  ctx.strokeStyle = "#3a2d55";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-s * 0.32, 0);
  ctx.quadraticCurveTo(-s * 0.1, -s * 0.28, 0, 0);
  ctx.quadraticCurveTo(s * 0.1, -s * 0.28, s * 0.32, 0);
  ctx.stroke();
});

const SPIRAL_TEX = makeSpriteTexture((ctx, s) => {
  ctx.translate(s / 2, s / 2);
  ctx.strokeStyle = "#1a1330";
  ctx.lineWidth = 5;
  ctx.beginPath();
  let a = 0;
  let r = 2;
  ctx.moveTo(0, 0);
  for (let i = 0; i < 120; i++) {
    a += 0.35;
    r += 0.35;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.stroke();
});

// ---------------------------------------------------------
export class Character {
  constructor(scene, skinColor = 0xffcf9e) {
    this.scene = scene;
    this.skinColor = skinColor;
    this.group = new THREE.Group();
    this.group.position.set(0, 0, 0);
    scene.add(this.group);

    this._blinkTimer = 0;
    this._nextBlinkAt = 2 + Math.random() * 3;
    this._expression = "idle";
    this._accessories = [];
    this._baseScale = new THREE.Vector3(1, 1, 1);

    this._build();
  }

  // -------------------------------------------------------
  _build() {
    const skinMat = new THREE.MeshStandardMaterial({
      color: this.skinColor,
      roughness: 0.6,
      metalness: 0.02,
    });
    const outfitMat = new THREE.MeshStandardMaterial({
      color: 0x5b6bff,
      roughness: 0.7,
    });
    const cheekMat = new THREE.MeshStandardMaterial({
      color: 0xff9db3,
      roughness: 0.8,
      transparent: true,
      opacity: 0.85,
    });

    // ---- Body (rounded, squashy capsule-like torso) ----
    this.body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.55, 0.5, 8, 16),
      outfitMat
    );
    this.body.position.y = 1.0;
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.group.add(this.body);

    // ---- Legs (stubby, funny proportions) ----
    const legGeo = new THREE.CapsuleGeometry(0.16, 0.35, 6, 10);
    this.legL = new THREE.Mesh(legGeo, outfitMat);
    this.legL.position.set(-0.22, 0.35, 0);
    this.legR = this.legL.clone();
    this.legR.position.x = 0.22;
    this.legL.castShadow = this.legR.castShadow = true;
    this.group.add(this.legL, this.legR);

    // ---- Arms (attached to a pivot for reaction animation) ----
    const armGeo = new THREE.CapsuleGeometry(0.13, 0.4, 6, 10);
    this.armL = new THREE.Mesh(armGeo, skinMat);
    this.armL.position.set(-0.62, 1.05, 0);
    this.armL.rotation.z = 0.35;
    this.armR = this.armL.clone();
    this.armR.position.x = 0.62;
    this.armR.rotation.z = -0.35;
    this.armL.castShadow = this.armR.castShadow = true;
    this.group.add(this.armL, this.armR);

    // ---- Head group (pivots for shakes/tilts) ----
    this.headPivot = new THREE.Group();
    this.headPivot.position.set(0, 1.62, 0);
    this.group.add(this.headPivot);

    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), skinMat);
    this.head.castShadow = true;
    this.head.scale.set(1, 0.98, 0.95);
    this.headPivot.add(this.head);

    // Rounded ears
    const earGeo = new THREE.SphereGeometry(0.11, 16, 16);
    this.earL = new THREE.Mesh(earGeo, skinMat);
    this.earL.position.set(-0.48, 0.02, 0);
    this.earR = this.earL.clone();
    this.earR.position.x = 0.48;
    this.headPivot.add(this.earL, this.earR);

    // Cheeks (blush)
    const cheekGeo = new THREE.CircleGeometry(0.09, 16);
    this.cheekL = new THREE.Mesh(cheekGeo, cheekMat);
    this.cheekL.position.set(-0.26, -0.08, 0.44);
    this.cheekR = this.cheekL.clone();
    this.cheekR.position.x = 0.26;
    this.headPivot.add(this.cheekL, this.cheekR);

    // ---- Eyes (large, cartoon) ----
    this.eyeGroupL = new THREE.Group();
    this.eyeGroupL.position.set(-0.19, 0.08, 0.42);
    this.eyeGroupR = new THREE.Group();
    this.eyeGroupR.position.set(0.19, 0.08, 0.42);
    this.headPivot.add(this.eyeGroupL, this.eyeGroupR);

    const eyeWhiteGeo = new THREE.SphereGeometry(0.135, 20, 20);
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const pupilGeo = new THREE.SphereGeometry(0.065, 16, 16);
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x27203f, roughness: 0.4 });

    for (const [group, side] of [[this.eyeGroupL, -1], [this.eyeGroupR, 1]]) {
      const white = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat.clone());
      white.name = "white";
      group.add(white);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat.clone());
      pupil.name = "pupil";
      pupil.position.set(0, 0, 0.1);
      group.add(pupil);
      // eyelid used for blinking (flattened sphere cap)
      const lid = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: this.skinColor, roughness: 0.6 })
      );
      lid.name = "lid";
      lid.rotation.x = Math.PI;
      lid.position.set(0, 0.14, 0);
      lid.scale.set(1, 0.01, 1); // start open (hidden)
      group.add(lid);
    }

    // ---- Eyebrows (for angry/confused expressions) ----
    const browGeo = new THREE.BoxGeometry(0.18, 0.045, 0.045);
    const browMat = new THREE.MeshStandardMaterial({ color: 0x4a3826 });
    this.browL = new THREE.Mesh(browGeo, browMat);
    this.browL.position.set(-0.19, 0.24, 0.46);
    this.browR = this.browL.clone();
    this.browR.position.x = 0.19;
    this.browL.visible = this.browR.visible = false;
    this.headPivot.add(this.browL, this.browR);

    // ---- Mouth (simple bent tube via torus arc, swapped per expression) ----
    this.mouthGroup = new THREE.Group();
    this.mouthGroup.position.set(0, -0.18, 0.46);
    this.headPivot.add(this.mouthGroup);
    this._buildMouths();
    this._setMouth("smile");

    // ---- Name label (CSS2D floating text) ----
    const labelDiv = document.createElement("div");
    labelDiv.className = "name-label";
    labelDiv.textContent = "";
    labelDiv.style.display = "none";
    this.nameLabel = new CSS2DObject(labelDiv);
    this.nameLabel.position.set(0, 0.85, 0);
    this.headPivot.add(this.nameLabel);
    this.nameLabelDiv = labelDiv;

    // ---- Accessory anchor (stars/birds/sweat orbit here) ----
    this.accessoryAnchor = new THREE.Group();
    this.accessoryAnchor.position.set(0, 0.55, 0);
    this.headPivot.add(this.accessoryAnchor);
  }

  // -------------------------------------------------------
  _buildMouths() {
    this.mouths = {};
    const matDark = new THREE.MeshStandardMaterial({ color: 0x5a2233, side: THREE.DoubleSide });

    // Smile: torus arc
    const smile = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.025, 8, 20, Math.PI),
      matDark
    );
    smile.rotation.z = Math.PI;
    this.mouths.smile = smile;

    // Surprised: small "o" ring
    const o = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.025, 8, 16), matDark);
    this.mouths.surprised = o;

    // Flat / confused
    const flat = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.03), matDark);
    this.mouths.flat = flat;

    // Angry zigzag (approximate with box rotated)
    const angryGroup = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.025), matDark);
      seg.position.x = -0.09 + i * 0.09;
      seg.rotation.z = i % 2 === 0 ? 0.4 : -0.4;
      angryGroup.add(seg);
    }
    this.mouths.angry = angryGroup;

    for (const key in this.mouths) {
      this.mouths[key].visible = false;
      this.mouthGroup.add(this.mouths[key]);
    }
  }

  _setMouth(key) {
    for (const k in this.mouths) this.mouths[k].visible = k === key;
  }

  // -------------------------------------------------------
  setName(name) {
    if (!name) {
      this.nameLabelDiv.style.display = "none";
      return;
    }
    this.nameLabelDiv.textContent = name;
    this.nameLabelDiv.style.display = "block";
    gsap.fromTo(
      this.nameLabel.position,
      { y: 1.1 },
      { y: 0.85, duration: 0.5, ease: "back.out(2)" }
    );
  }

  // -------------------------------------------------------
  // Idle animation: breathing (scale pulsing) + blinking
  updateIdle(t, dt) {
    // Breathing — gentle scale on body
    const breathe = 1 + Math.sin(t * 1.6) * 0.02;
    this.body.scale.set(breathe, 1 / breathe, breathe);

    // Subtle head bob
    this.headPivot.position.y = 1.62 + Math.sin(t * 1.6 + 1) * 0.015;

    // Arm idle sway
    this.armL.rotation.z = 0.35 + Math.sin(t * 1.3) * 0.05;
    this.armR.rotation.z = -0.35 - Math.sin(t * 1.3) * 0.05;

    // Blink timer
    this._blinkTimer += dt;
    if (this._blinkTimer >= this._nextBlinkAt) {
      this._blinkTimer = 0;
      this._nextBlinkAt = 2.5 + Math.random() * 3.5;
      this._doBlink();
    }

    // Rotate any orbiting accessories (stars/birds)
    if (this.accessoryAnchor.children.length) {
      this.accessoryAnchor.rotation.y += dt * 2.2;
    }
  }

  _doBlink() {
    if (this._expression !== "idle") return; // don't blink mid-expression
    for (const group of [this.eyeGroupL, this.eyeGroupR]) {
      const lid = group.getObjectByName("lid");
      gsap.timeline()
        .to(lid.scale, { y: 1, duration: 0.07, ease: "power1.in" })
        .to(lid.scale, { y: 0.01, duration: 0.09, ease: "power1.out" });
    }
  }

  // -------------------------------------------------------
  // Apply a named cartoon expression. Automatically reverts
  // to idle after `duration` seconds (if provided).
  setExpression(name, duration = 1.4) {
    this._expression = name;
    this._clearAccessories();
    this._setMouth("smile");
    this.browL.visible = this.browR.visible = false;

    const resetEyes = () => {
      for (const group of [this.eyeGroupL, this.eyeGroupR]) {
        group.rotation.set(0, 0, 0);
        group.scale.set(1, 1, 1);
        const pupil = group.getObjectByName("pupil");
        pupil.position.set(0, 0, 0.1);
        const white = group.getObjectByName("white");
        white.material.map = null;
        white.material.needsUpdate = true;
      }
    };
    resetEyes();

    switch (name) {
      case "surprised":
        this._setMouth("surprised");
        this.eyeGroupL.scale.set(1.3, 1.3, 1.3);
        this.eyeGroupR.scale.set(1.3, 1.3, 1.3);
        break;

      case "angry":
        this._setMouth("angry");
        this.browL.visible = this.browR.visible = true;
        this.browL.rotation.z = 0.4;
        this.browR.rotation.z = -0.4;
        this.eyeGroupL.getObjectByName("pupil").position.set(0, 0.02, 0.1);
        this.eyeGroupR.getObjectByName("pupil").position.set(0, 0.02, 0.1);
        break;

      case "confused":
        this._setMouth("flat");
        this.browL.visible = true;
        this.browR.visible = false;
        this.browL.position.y = 0.28;
        this.browL.rotation.z = 0.5;
        this._spawnAccessory(SWEAT_TEX, 1, 0.4, 0.15);
        break;

      case "crossEyed":
        this._setMouth("flat");
        this.eyeGroupL.getObjectByName("pupil").position.set(0.045, 0, 0.11);
        this.eyeGroupR.getObjectByName("pupil").position.set(-0.045, 0, 0.11);
        break;

      case "dizzy":
        this._setMouth("flat");
        for (const group of [this.eyeGroupL, this.eyeGroupR]) {
          const white = group.getObjectByName("white");
          white.material.map = SPIRAL_TEX;
          white.material.color.set(0xffffff);
          white.material.needsUpdate = true;
          const pupil = group.getObjectByName("pupil");
          pupil.visible = false;
          gsap.delayedCall(duration, () => (pupil.visible = true));
        }
        this._spawnAccessory(STAR_TEX, 4, 0.55, 0.14, true);
        break;

      case "stars":
        this._setMouth("surprised");
        this._spawnAccessory(STAR_TEX, 5, 0.6, 0.16, true);
        break;

      case "birds":
        this._setMouth("flat");
        this.eyeGroupL.scale.set(0.6, 0.9, 1);
        this.eyeGroupR.scale.set(0.6, 0.9, 1);
        this._spawnAccessory(BIRD_TEX, 3, 0.55, 0.18, true);
        break;

      default:
        this._setMouth("smile");
        break;
    }

    if (duration > 0) {
      gsap.delayedCall(duration, () => {
        if (this._expression === name) this.revertToIdle();
      });
    }
  }

  revertToIdle() {
    this._expression = "idle";
    this._setMouth("smile");
    this.browL.visible = this.browR.visible = false;
    for (const group of [this.eyeGroupL, this.eyeGroupR]) {
      gsap.to(group.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
      const white = group.getObjectByName("white");
      white.material.map = null;
      white.material.needsUpdate = true;
      const pupil = group.getObjectByName("pupil");
      pupil.visible = true;
      gsap.to(pupil.position, { x: 0, y: 0, z: 0.1, duration: 0.3 });
    }
    this._clearAccessories();
  }

  // -------------------------------------------------------
  _spawnAccessory(texture, count, radius, size, orbit = false) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(size, size, size);
      const angle = (i / count) * Math.PI * 2;
      sprite.position.set(Math.cos(angle) * radius, Math.sin(angle * 0.6) * 0.1, Math.sin(angle) * radius);
      sprite.userData.baseAngle = angle;
      sprite.userData.radius = radius;
      sprite.userData.orbit = orbit;
      this.accessoryAnchor.add(sprite);
      this._accessories.push(sprite);

      gsap.fromTo(sprite.scale, { x: 0, y: 0, z: 0 }, { x: size, y: size, z: size, duration: 0.3, ease: "back.out(3)" });
    }
  }

  _clearAccessories() {
    for (const s of this._accessories) {
      this.accessoryAnchor.remove(s);
      s.material.dispose();
    }
    this._accessories = [];
  }

  // -------------------------------------------------------
  // Reaction to being slapped: head rotates, body tilts,
  // slides sideways, small bounce, then returns to idle.
  reactSlap(direction = 1) {
    const tl = gsap.timeline();

    // Squash on impact frame
    tl.to(this.body.scale, { x: 1.18, y: 0.82, z: 1.12, duration: 0.08, ease: "power1.out" }, 0);

    // Head snap rotation + tilt
    tl.to(this.headPivot.rotation, {
      z: direction * -0.55,
      y: direction * 0.35,
      duration: 0.12,
      ease: "power2.out",
    }, 0);

    // Body tilt & lateral slide
    tl.to(this.group.rotation, { z: direction * -0.18, duration: 0.12, ease: "power2.out" }, 0);
    tl.to(this.group.position, { x: direction * 0.45, duration: 0.14, ease: "power2.out" }, 0);

    // Small hop (bounce)
    tl.to(this.group.position, { y: 0.18, duration: 0.13, ease: "power2.out" }, 0);
    tl.to(this.group.position, { y: 0, duration: 0.35, ease: "bounce.out" }, 0.13);

    // Recover: overshoot back past neutral then settle (elastic)
    tl.to(this.headPivot.rotation, { z: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" }, 0.15);
    tl.to(this.group.rotation, { z: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" }, 0.15);
    tl.to(this.group.position, { x: 0, duration: 0.7, ease: "elastic.out(1, 0.35)" }, 0.15);

    // Body un-squash (stretch then settle)
    tl.to(this.body.scale, { x: 0.9, y: 1.15, z: 0.92, duration: 0.15, ease: "power1.out" }, 0.1);
    tl.to(this.body.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: "elastic.out(1, 0.4)" }, 0.25);

    return tl;
  }
}
