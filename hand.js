// =========================================================
// hand.js — The big cartoon slapping hand
// Procedurally built (palm + 4 fingers + thumb), floats
// idly beside the character, swings rapidly on slap.
// =========================================================

import * as THREE from "three";
import gsap from "gsap";

export class Hand {
  constructor(scene, side = 1) {
    this.scene = scene;
    this.side = side; // 1 = right side of screen, -1 = left
    this.pivot = new THREE.Group(); // pivot point = "wrist", used for swings
    this.restPosition = new THREE.Vector3(side * 2.3, 2.1, 1.4);
    this.restRotation = new THREE.Euler(0.1, side * -0.5, side * 0.5);
    this.pivot.position.copy(this.restPosition);
    this.pivot.rotation.copy(this.restRotation);
    scene.add(this.pivot);

    this._build();
    this._busy = false;
  }

  _build() {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffcf9e,
      roughness: 0.55,
      metalness: 0.02,
    });

    this.mesh = new THREE.Group();
    this.pivot.add(this.mesh);

    // Palm — flattened rounded box
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 24), mat);
    palm.scale.set(1, 1.15, 0.55);
    palm.castShadow = true;
    this.mesh.add(palm);
    this.palm = palm;

    // Fingers — 4 capsules fanned out at the top of the palm
    this.fingers = [];
    const fingerCount = 4;
    for (let i = 0; i < fingerCount; i++) {
      const finger = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.09, 0.34, 6, 10),
        mat
      );
      const t = (i - (fingerCount - 1) / 2) / (fingerCount - 1); // -0.5..0.5
      finger.position.set(t * 0.62, 0.55, 0);
      finger.rotation.z = -t * 0.5;
      finger.castShadow = true;
      this.mesh.add(finger);
      this.fingers.push(finger);
    }

    // Thumb
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.24, 6, 10), mat);
    thumb.position.set(-0.5 * this.side, -0.05, 0.05);
    thumb.rotation.z = 0.9 * this.side;
    thumb.castShadow = true;
    this.mesh.add(thumb);
    this.thumb = thumb;

    // Rotate whole hand mesh so palm faces the character (toward -side.x)
    this.mesh.rotation.z = Math.PI / 2 * -this.side;
  }

  // -------------------------------------------------------
  updateIdle(t) {
    if (this._busy) return;
    this.pivot.position.y = this.restPosition.y + Math.sin(t * 1.4) * 0.12;
    this.pivot.rotation.z = this.restRotation.z + Math.sin(t * 1.1) * 0.05;
    this.pivot.position.x = this.restPosition.x + Math.sin(t * 0.8) * 0.05;
  }

  // -------------------------------------------------------
  // Rapid slap swing: wind up, swing fast across, impact,
  // then return to rest. Calls onImpact() at the moment of
  // contact so the caller can trigger particles/sound/shake.
  swing(onImpact) {
    this._busy = true;
    const tl = gsap.timeline({
      onComplete: () => {
        this._busy = false;
      },
    });

    const windupRot = this.restRotation.y + this.side * 0.9;
    const swingRot = this.restRotation.y - this.side * 1.6;

    // Wind up (anticipation)
    tl.to(this.pivot.rotation, { y: windupRot, x: this.restRotation.x - 0.3, duration: 0.18, ease: "power2.out" });
    tl.to(this.pivot.position, { x: this.restPosition.x + this.side * 0.3, duration: 0.18, ease: "power2.out" }, "<");
    tl.to(this.mesh.scale, { x: 1.1, y: 0.9, z: 1.1, duration: 0.18, ease: "power2.out" }, "<");

    // Fast swing toward character (the actual slap)
    tl.to(this.pivot.rotation, { y: swingRot, x: this.restRotation.x + 0.15, duration: 0.09, ease: "power4.in" });
    tl.to(this.pivot.position, { x: -this.side * 0.4, duration: 0.09, ease: "power4.in" }, "<");
    tl.to(this.mesh.scale, { x: 0.9, y: 1.15, z: 0.9, duration: 0.09, ease: "power4.in" }, "<");

    // Impact moment — trigger callback
    tl.call(() => {
      if (onImpact) onImpact();
    });
    tl.to(this.mesh.scale, { x: 1.25, y: 0.75, z: 1.25, duration: 0.06, ease: "power2.out" });

    // Snap-back overshoot then settle to rest (elastic, cartoon feel)
    tl.to(this.pivot.rotation, {
      y: this.restRotation.y,
      x: this.restRotation.x,
      duration: 0.55,
      ease: "elastic.out(1, 0.35)",
    });
    tl.to(this.pivot.position, {
      x: this.restPosition.x,
      duration: 0.55,
      ease: "elastic.out(1, 0.35)",
    }, "<");
    tl.to(this.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: "elastic.out(1, 0.4)" }, "<");

    return tl;
  }

  // World-space position of the "impact point" (front of palm)
  getImpactPoint() {
    const p = new THREE.Vector3(-0.15 * this.side, 0, 0.3);
    this.mesh.localToWorld(p);
    return p;
  }
}
