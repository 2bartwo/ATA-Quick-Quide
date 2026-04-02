import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const MODEL_URL = new URL("../models/bartwo3d.glb", import.meta.url).href;

const SCENE_BG = 0x020204;
const FOG_COLOR = 0x05060a;

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

function applyWhiteChrome(root) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    disposeMaterial(child.material);
    child.material = new THREE.MeshPhysicalMaterial({
      color: 0xf4f6fb,
      emissive: 0xc8d2e8,
      emissiveIntensity: 0.06,
      metalness: 1,
      roughness: 0.11,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.48,
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

function fitModelToView(object, camera, margin = 0.86) {
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

function buildStageSet(scene) {
  const floorMat = new THREE.MeshPhysicalMaterial({
    color: 0x06070c,
    metalness: 0.22,
    roughness: 0.94,
    envMapIntensity: 0.42,
    clearcoat: 0.15,
    clearcoatRoughness: 0.85,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(48, 48), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.35;
  floor.receiveShadow = false;

  const wallMat = new THREE.MeshPhysicalMaterial({
    color: 0x040508,
    metalness: 0.08,
    roughness: 0.98,
    envMapIntensity: 0.28,
  });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(32, 18), wallMat);
  wall.position.set(0, 0.35, -5.2);

  const ramp = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), wallMat);
  ramp.position.set(0, -0.85, -3.6);
  ramp.rotation.x = 0.12;

  scene.add(floor, wall, ramp);
}

function main() {
  const rootEl = document.getElementById("three-root");
  if (!rootEl) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const basePeriodSec = reducedMotion ? 96 : 28;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SCENE_BG);
  scene.fog = new THREE.FogExp2(FOG_COLOR, 0.052);

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
  renderer.toneMappingExposure = 1.32;
  renderer.setClearColor(SCENE_BG, 1);
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

  buildStageSet(scene);

  const pivot = new THREE.Group();
  scene.add(pivot);

  scene.add(new THREE.AmbientLight(0xffffff, 0.32));
  const hemi = new THREE.HemisphereLight(0xe8eaef, 0x0a0b10, 0.52);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(6, 7, 8);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.42);
  fill.position.set(-7, 2, -4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.58);
  rim.position.set(-2, 5, -8);
  scene.add(rim);
  const neonRim = new THREE.PointLight(0xd8e2f5, 0.85, 12, 2);
  neonRim.position.set(0, 0.35, 3.2);
  scene.add(neonRim);

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
    fitModelToView(modelRef, camera, 0.86);
  }

  loader.load(
    MODEL_URL,
    (gltf) => {
      const model = gltf.scene;
      applyWhiteChrome(model);
      snapshotTransform(model);
      fitModelToView(model, camera, 0.86);
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
