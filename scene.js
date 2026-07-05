// =========================================================
// scene.js — Core Three.js scene setup & management
// Handles renderer, camera, lighting, ground, themes,
// OrbitControls, CSS2D label rendering, and camera shake.
// =========================================================

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import gsap from "gsap";

// ---------------------------------------------------------
// Theme definitions — each theme tweaks colors, fog & lights
// ---------------------------------------------------------
export const THEMES = {
  classic: {
    bg: 0x1b1030,
    fog: 0x1b1030,
    ground: 0x4b3f72,
    groundGrid: 0x6a5aa0,
    ambient: 0x8888ff,
    hemiSky: 0x9fb8ff,
    hemiGround: 0x3a2d55,
    keyLight: 0xffffff,
  },
  neon: {
    bg: 0x0a0018,
    fog: 0x120025,
    ground: 0x1a0033,
    groundGrid: 0xff2fd0,
    ambient: 0xff2fd0,
    hemiSky: 0x00eaff,
    hemiGround: 0x1a0033,
    keyLight: 0x00eaff,
  },
  space: {
    bg: 0x00020a,
    fog: 0x000210,
    ground: 0x0c1330,
    groundGrid: 0x3d5aff,
    ambient: 0x3d5aff,
    hemiSky: 0xffffff,
    hemiGround: 0x0a0a2a,
    keyLight: 0xffffff,
  },
  forest: {
    bg: 0x0c1f14,
    fog: 0x123320,
    ground: 0x1f4d2e,
    groundGrid: 0x3f8a55,
    ambient: 0x9fffb0,
    hemiSky: 0xcfffd6,
    hemiGround: 0x0c1f14,
    keyLight: 0xdfffea,
  },
  cyberpunk: {
    bg: 0x120018,
    fog: 0x1a0022,
    ground: 0x1a0a2a,
    groundGrid: 0xffe600,
    ambient: 0xff2f6d,
    hemiSky: 0xffe600,
    hemiGround: 0x1a0a2a,
    keyLight: 0xff2f6d,
  },
};

export class SceneManager {
  constructor(canvas, labelRoot) {
    this.canvas = canvas;
    this.labelRoot = labelRoot;
    this.clock = new THREE.Clock();
    this.shakeOffset = new THREE.Vector3();
    this.quality = "medium";
    this._updateCallbacks = [];

    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._initLights();
    this._initGround();
    this._initControls();
    this._initLabelRenderer();

    window.addEventListener("resize", () => this._onResize());
    this._onResize();

    this.setQuality("medium");
    this.setTheme("classic");
  }

  // -------------------------------------------------------
  onUpdate(cb) {
    this._updateCallbacks.push(cb);
  }

  // -------------------------------------------------------
  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x1b1030, 8, 26);
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.cameraBase = new THREE.Vector3(0, 2.4, 7.2);
    this.camera.position.copy(this.cameraBase);
    this.camera.lookAt(0, 1.3, 0);
  }

  _initLights() {
    this.hemiLight = new THREE.HemisphereLight(0x9fb8ff, 0x3a2d55, 1.1);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0x8888ff, 0.35);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    this.keyLight.position.set(4, 7, 4);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 20;
    this.keyLight.shadow.camera.left = -6;
    this.keyLight.shadow.camera.right = 6;
    this.keyLight.shadow.camera.top = 6;
    this.keyLight.shadow.camera.bottom = -6;
    this.keyLight.shadow.bias = -0.002;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.PointLight(0xff9fe0, 0.8, 20);
    this.rimLight.position.set(-4, 3, -3);
    this.scene.add(this.rimLight);
  }

  _initGround() {
    const groundGeo = new THREE.CircleGeometry(9, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x4b3f72,
      roughness: 0.9,
      metalness: 0.05,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // Decorative grid ring for cartoon-arena look
    this.groundGrid = new THREE.GridHelper(18, 18, 0x6a5aa0, 0x6a5aa0);
    this.groundGrid.material.transparent = true;
    this.groundGrid.material.opacity = 0.18;
    this.groundGrid.position.y = 0.01;
    this.scene.add(this.groundGrid);

    // Soft glow disc under character for a cartoon spotlight feel
    const glowGeo = new THREE.CircleGeometry(2.4, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.06,
    });
    this.spotGlow = new THREE.Mesh(glowGeo, glowMat);
    this.spotGlow.rotation.x = -Math.PI / 2;
    this.spotGlow.position.y = 0.02;
    this.scene.add(this.spotGlow);
  }

  _initControls() {
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.set(0, 1.3, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 11;
    this.controls.maxPolarAngle = Math.PI / 1.9;
    this.controls.enablePan = false;
  }

  _initLabelRenderer() {
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.style.position = "absolute";
    this.labelRenderer.domElement.style.top = "0";
    this.labelRenderer.domElement.style.left = "0";
    this.labelRenderer.domElement.style.pointerEvents = "none";
    this.labelRoot.appendChild(this.labelRenderer.domElement);
  }

  // -------------------------------------------------------
  setQuality(level) {
    this.quality = level;
    const pixelRatioCap = level === "low" ? 1 : level === "medium" ? 1.5 : 2.5;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));
    this.renderer.shadowMap.enabled = level !== "low";
    if (this.keyLight) {
      const size = level === "high" ? 2048 : level === "medium" ? 1024 : 512;
      this.keyLight.shadow.mapSize.set(size, size);
      this.keyLight.shadow.map?.dispose();
      this.keyLight.shadow.map = null;
    }
    this._onResize();
  }

  // -------------------------------------------------------
  setTheme(name) {
    const t = THEMES[name] || THEMES.classic;
    this.currentTheme = name;

    gsap.to(this.scene.fog.color, { r: ((t.fog >> 16) & 255) / 255, g: ((t.fog >> 8) & 255) / 255, b: (t.fog & 255) / 255, duration: 0.8 });
    this.renderer.setClearColor(t.bg, 1);

    if (this.ground) {
      gsap.to(this.ground.material.color, {
        r: ((t.ground >> 16) & 255) / 255,
        g: ((t.ground >> 8) & 255) / 255,
        b: (t.ground & 255) / 255,
        duration: 0.8,
      });
    }
    if (this.groundGrid) {
      this.groundGrid.material.color.setHex(t.groundGrid);
    }
    if (this.hemiLight) {
      this.hemiLight.color.setHex(t.hemiSky);
      this.hemiLight.groundColor.setHex(t.hemiGround);
    }
    if (this.ambientLight) {
      this.ambientLight.color.setHex(t.ambient);
    }
    if (this.keyLight) {
      this.keyLight.color.setHex(t.keyLight);
    }

    document.documentElement.style.setProperty("--bg-deep", `#${t.bg.toString(16).padStart(6, "0")}`);
  }

  // -------------------------------------------------------
  // Cartoon camera shake — quick decaying random offset
  shake(intensity = 0.25, duration = 0.4) {
    if (this._shaking) gsap.killTweensOf(this.shakeOffset);
    this._shaking = true;
    const proxy = { t: 0 };
    gsap.to(proxy, {
      t: 1,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        const decay = 1 - proxy.t;
        this.shakeOffset.set(
          (Math.random() - 0.5) * intensity * decay,
          (Math.random() - 0.5) * intensity * decay,
          0
        );
      },
      onComplete: () => {
        this.shakeOffset.set(0, 0, 0);
        this._shaking = false;
      },
    });
  }

  // -------------------------------------------------------
  _onResize() {
    if (!this.camera || !this.renderer || !this.labelRenderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
  }

  // -------------------------------------------------------
  // Called every frame from main.js
  update() {
    const t = this.clock.getElapsedTime();
    const dt = this.clock.getDelta();

    // Gentle idle camera float
    this.camera.position.x = this.cameraBase.x + Math.sin(t * 0.35) * 0.15 + this.shakeOffset.x;
    this.camera.position.y = this.cameraBase.y + Math.sin(t * 0.5) * 0.08 + this.shakeOffset.y;

    this.controls.update();

    for (const cb of this._updateCallbacks) cb(t, dt);

    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }
}
