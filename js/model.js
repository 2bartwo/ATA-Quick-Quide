import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const MODEL_URL = new URL("../models/bartwo3d.glb", import.meta.url).href;

const BLACK = 0x000000;

function showLoadError(message) {
  const root = document.getElementById("three-root");
  if (!root) return;
  const p = document.createElement("p");
  p.className = "model-error";
  p.textContent = message;
  root.appendChild(p);
}

function disposeMaterial(m) {
  if (!m) return;
  if (Array.isArray(m)) {
    m.forEach(disposeMaterial);
    return;
  }
  if (m.map) m.map.dispose();
  if (m.normalMap) m.normalMap.dispose();
  if (m.roughnessMap) m.roughnessMap.dispose();
  if (m.metalnessMap) m.metalnessMap.dispose();
  m.dispose?.();
}

function starTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 28);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(0.65, "rgba(200,200,200,0.12)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function createStarfield() {
  const count = 4500;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const r = 18 + Math.random() * 42;
    const u = Math.random();
    const v = Math.random();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const sinP = Math.sin(phi);
    positions[i * 3] = r * sinP * Math.cos(theta);
    positions[i * 3 + 1] = r * sinP * Math.sin(theta) * 0.75 + (Math.random() - 0.5) * 3;
    positions[i * 3 + 2] = r * Math.cos(phi);
    colors[i * 3] = 1;
    colors[i * 3 + 1] = 1;
    colors[i * 3 + 2] = 1;
    phases[i] = Math.random() * Math.PI * 2;
    speeds[i] = 1.1 + Math.random() * 2.8;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const tex = starTexture();
  const mat = new THREE.PointsMaterial({
    vertexColors: true,
    color: 0xffffff,
    map: tex,
    size: 0.1,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: true,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });

  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.name = "starfield";
  pts.userData.twPhases = phases;
  pts.userData.twSpeeds = speeds;
  pts.userData.starCount = count;
  return pts;
}

function twinkleStarfield(starfield, t) {
  const col = starfield.geometry.attributes.color;
  if (!col) return;
  const phases = starfield.userData.twPhases;
  const speeds = starfield.userData.twSpeeds;
  const n = starfield.userData.starCount;
  const arr = col.array;
  for (let i = 0; i < n; i++) {
    const b = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(t * speeds[i] + phases[i]));
    arr[i * 3] = b;
    arr[i * 3 + 1] = b;
    arr[i * 3 + 2] = b;
  }
  col.needsUpdate = true;
}

function applyWhiteChrome(root) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    disposeMaterial(child.material);
    child.material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0x8a8a8a,
      emissiveIntensity: 0.28,
      metalness: 1,
      roughness: 0.06,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      envMapIntensity: 2.05,
      ior: 1.5,
    });
    child.castShadow = false;
    child.receiveShadow = false;
  });
}

function visibleRectAtTarget(camera, target) {
  const dist = camera.position.distanceTo(target);
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const viewH = 2 * Math.tan(vFov / 2) * dist;
  const viewW = 2 * Math.tan(hFov / 2) * dist;
  return { viewW, viewH, dist };
}

function snapshotTransform(object) {
  object.userData._fitSaved = true;
  object.userData._fitInitialPos = object.position.clone();
  object.userData._fitInitialQuat = object.quaternion.clone();
  object.userData._fitInitialScale = object.scale.clone();
}

function restoreTransform(object) {
  if (!object.userData._fitSaved) return;
  object.position.copy(object.userData._fitInitialPos);
  object.quaternion.copy(object.userData._fitInitialQuat);
  object.scale.copy(object.userData._fitInitialScale);
}

function fitModelToView(object, camera, margin = 0.78) {
  object.updateMatrixWorld(true);
  const box0 = new THREE.Box3().setFromObject(object);
  if (box0.isEmpty()) {
    console.warn("bartwo3d.glb: boş bounding box.");
    object.position.set(0, 0, 0);
    object.scale.setScalar(1);
    return;
  }

  const center = box0.getCenter(new THREE.Vector3());
  object.position.sub(center);

  object.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());

  const target = new THREE.Vector3(0, 0, 0);
  const { viewW, viewH } = visibleRectAtTarget(camera, target);
  const scaleX = (viewW * margin) / Math.max(size.x, 0.0001);
  const scaleY = (viewH * margin) / Math.max(size.y, 0.0001);
  const s = Math.min(scaleX, scaleY);
  object.scale.setScalar(s);

  object.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(object);
  const c2 = box2.getCenter(new THREE.Vector3());
  object.position.sub(c2);
}

function main() {
  const rootEl = document.getElementById("three-root");
  if (!rootEl) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const basePeriodSec = reducedMotion ? 96 : 28;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BLACK);
  scene.fog = new THREE.FogExp2(BLACK, 0.012);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 500);
  camera.position.set(0, 0.08, 4.25);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.42;
  renderer.setClearColor(BLACK, 1);
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.margin = "0";
  canvas.style.padding = "0";
  canvas.style.verticalAlign = "top";
  canvas.setAttribute("tabindex", "-1");
  rootEl.appendChild(canvas);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const starfield = createStarfield();
  scene.add(starfield);

  const pivot = new THREE.Group();
  scene.add(pivot);

  scene.add(new THREE.AmbientLight(0xffffff, 0.34));
  const hemi = new THREE.HemisphereLight(0xf0f0f0, 0x080808, 0.52);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.65);
  key.position.set(6, 7, 8);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.48);
  fill.position.set(-7, 2, -4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.68);
  rim.position.set(-2, 5, -8);
  scene.add(rim);

  const neonFront = new THREE.PointLight(0xffffff, 2.65, 18, 1.65);
  neonFront.position.set(0, 0.2, 4.1);
  scene.add(neonFront);
  const neonL = new THREE.PointLight(0xffffff, 1.25, 16, 1.9);
  neonL.position.set(-2.8, 0.5, 3.2);
  scene.add(neonL);
  const neonR = new THREE.PointLight(0xffffff, 1.25, 16, 1.9);
  neonR.position.set(2.8, 0.5, 3.2);
  scene.add(neonR);

  const clock = new THREE.Clock();
  let loaded = false;
  let modelRef = null;

  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
  loader.setDRACOLoader(draco);

  function applyCameraAndFit() {
    if (!modelRef) return;
    restoreTransform(modelRef);
    fitModelToView(modelRef, camera, 0.78);
  }

  loader.load(
    MODEL_URL,
    (gltf) => {
      const model = gltf.scene;
      applyWhiteChrome(model);
      snapshotTransform(model);
      fitModelToView(model, camera, 0.78);
      pivot.add(model);
      modelRef = model;
      loaded = true;
      resize();
    },
    undefined,
    (err) => {
      console.error("bartwo3d.glb yüklenemedi:", err);
      const is404 = err?.message?.includes("404") || String(err).includes("404");
      showLoadError(
        is404
          ? "Model bulunamadı (404). models/bartwo3d.glb repoda ve doğru isimle mi?"
          : "Model yüklenemedi. Konsolu kontrol et (Draco/ağ hatası)."
      );
    }
  );

  function resize() {
    const w = Math.max(1, rootEl.clientWidth);
    const h = Math.max(1, rootEl.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    applyCameraAndFit();
  }

  const ro = new ResizeObserver(() => resize());
  ro.observe(rootEl);
  requestAnimationFrame(() => resize());

  function tick() {
    const dt = clock.getDelta();
    const t = clock.elapsedTime;

    if (!reducedMotion) {
      starfield.rotation.y += 0.0001 * (dt * 60);
      twinkleStarfield(starfield, t);
      neonFront.intensity = 2.35 + Math.sin(t * 2.2) * 0.4;
      neonL.intensity = 1.05 + Math.sin(t * 1.7 + 1) * 0.22;
      neonR.intensity = 1.05 + Math.sin(t * 1.7 + 2.2) * 0.22;
    } else {
      twinkleStarfield(starfield, t * 0.25);
    }

    if (loaded && !reducedMotion) {
      const breathe = 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(t * 0.62));
      pivot.rotation.y += ((Math.PI * 2) / basePeriodSec) * breathe * dt;
      pivot.position.y = Math.sin(t * 0.48) * 0.038;
      pivot.rotation.x = Math.sin(t * 0.37) * 0.03;
      pivot.rotation.z = Math.sin(t * 0.29) * 0.018;
    } else if (loaded) {
      pivot.rotation.y += ((Math.PI * 2) / basePeriodSec) * dt;
    }

    const lookY = loaded && !reducedMotion ? pivot.position.y : 0;
    camera.lookAt(0, lookY, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  tick();
}

main();
