import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const MODEL_URL = "models/bartwo3d.glb";

function main() {
  const rootEl = document.getElementById("three-root");
  if (!rootEl) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const periodSec = reducedMotion ? 90 : 18;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(42, 1, 0.08, 200);
  camera.position.set(0, 0.1, 4.2);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  rootEl.appendChild(renderer.domElement);

  const pivot = new THREE.Group();
  scene.add(pivot);

  const amb = new THREE.AmbientLight(0xffffff, 0.42);
  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(4, 6, 5);
  const rim = new THREE.DirectionalLight(0xffffff, 0.55);
  rim.position.set(-5, 2, -4);
  scene.add(amb, key, rim);

  const clock = new THREE.Clock();
  let loaded = false;

  function fitAndCenter(object) {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    object.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z, 0.0001);
    object.scale.setScalar(2.35 / maxDim);
  }

  const loader = new GLTFLoader();
  loader.load(
    MODEL_URL,
    (gltf) => {
      const model = gltf.scene;
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
          if (child.material) {
            child.material.depthWrite = true;
          }
        }
      });
      fitAndCenter(model);
      pivot.add(model);
      loaded = true;
    },
    undefined,
    (err) => {
      console.error("bartwo3d.glb yüklenemedi:", err);
    }
  );

  function resize() {
    const w = rootEl.clientWidth;
    const h = rootEl.clientHeight;
    if (w < 1 || h < 1) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(rootEl);
  resize();

  function tick() {
    const dt = clock.getDelta();
    if (loaded) {
      pivot.rotation.y += ((Math.PI * 2) / periodSec) * dt;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  tick();
}

main();
