'use strict';

import * as THREE from 'three';
import { MMDLoader } from 'three/addons/loaders/MMDLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let currentModels = [];
const loader = new MMDLoader();

let response = await fetch("/ver/data.json");
const data = await response.json();

function getWidthLimit() {
  return window.innerWidth > 1024 ? Math.round(window.outerWidth / 2) : window.outerWidth;
}

function getHeightLimit() {
  const header = document.querySelector('header');
  const toolbar = document.querySelector('div[role="toolbar"]');
  return window.outerHeight - header.offsetHeight - toolbar.offsetHeight;
}

function resize() {
  if (!renderer) return;
  const widthLimit = getWidthLimit();
  const heightLimit = getHeightLimit();
  camera.aspect = widthLimit / heightLimit;
  camera.updateProjectionMatrix();
  renderer.setSize(widthLimit, heightLimit);
}

function getModelsPath(archive) {
  const paths = [];
  archive.forEach((relativePath, file) => {
    if (!file.dir && relativePath.endsWith('.pmx')) paths.push(relativePath);
  });
  paths.sort((a, b) => {
    const fileA = archive.file(a);
    const fileB = archive.file(b);
    return fileB._data.uncompressedSize - fileA._data.uncompressedSize;
  });
  return paths;
}

function initOnce() {
  const canvas = document.getElementById('modelViewer');
  if (!canvas) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1f1f21);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0x21211f })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  camera = new THREE.PerspectiveCamera(45, (getWidthLimit()) / getHeightLimit(), 0.1, 1000);
  camera.position.set(0, 20, 60);
  camera.lookAt(0, 10, 0);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.setSize(getWidthLimit(), getHeightLimit());

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 10, 0);
  controls.update();

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
  dirLight.position.set(10, 20, 15);
  dirLight.castShadow = true;
  dirLight.shadow.camera.left = -20;
  dirLight.shadow.camera.right = 20;
  dirLight.shadow.camera.top = 20;
  dirLight.shadow.camera.bottom = -20;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.bias = -0.0005;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.add(dirLight);

  const lightSourceSlider = document.getElementById('lightSourceSlider');
  lightSourceSlider.addEventListener('input', (event) => {
    const intensity = event.target.value;
    dirLight.intensity = intensity;
  });

  window.addEventListener('resize', resize);
}

async function preview(version, characterName) {
  const canvas = document.getElementById('modelViewer');
  canvas.style.display = 'block';
  const canvasToolbar = document.getElementById('canvasToolbar');
  canvasToolbar.style.display = 'flex';

  if (window.innerWidth < 1024) {
    const modelList = document.getElementById('modelList');
    modelList.style.display = 'none';
  }

  if (!renderer) initOnce();

  for (let model of currentModels) {
    scene.remove(model);
  }
  currentModels = [];

  const key = `ver/${version}/${characterName}.rar`;
  const archiveURL = key in data.zipMap ? data.zipMap[key] : `ver/${version}/${characterName}.zip`;
  const response = await fetch(archiveURL);
  const zip = await JSZip.loadAsync(await response.blob());

  const textureMap = new Map();
  const baseNameMap = new Map();
  const imageExtensions = ['.bmp', '.png', '.jpg', '.jpeg'];

  for (const name of Object.keys(zip.files)) {
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
    if (imageExtensions.includes(ext)) {
      const imgBlob = await zip.file(name).async('blob');
      const blobUrl = URL.createObjectURL(imgBlob);
      const normalized = name.replace(/\\/g, '/');
      textureMap.set(normalized, blobUrl);

      const baseName = normalized.split('/').pop();
      baseNameMap.set(baseName, blobUrl);
    }
  }

  const manager = new THREE.LoadingManager();
  manager.addHandler(/\.(bmp|png|jpg|jpeg)$/i, {
    load: function (url, onLoad, onProgress, onError) {
      let path = url;
      try {
        const u = new URL(url);
        path = u.pathname;
      } catch (e) {}
      const normalized = decodeURIComponent(path)
        .replace(/\\/g, '/')
        .replace(/^\//, '');

      let blobUrl = textureMap.get(normalized);
      if (!blobUrl) {
        const baseName = normalized.split('/').pop();
        blobUrl = baseNameMap.get(baseName);
      }
      if (!blobUrl) {
        console.warn('No preloaded texture for:', url);
        return new THREE.TextureLoader().load(url, onLoad, onProgress, onError);
      }

      const loader = new THREE.TextureLoader();
      const texture = loader.load(blobUrl, (tex) => {
        onLoad(tex);
      }, onProgress, onError);

      texture.readyCallbacks = [];
      return texture;
    }
  });

  function loadTextureFromUrl(blobUrl) {
    const loader = new THREE.TextureLoader();
    return loader.load(blobUrl);
  }

  const loader = new MMDLoader(manager);

  // space models hexagonaly
  const R = 20;
  const corners = Array.from({ length: 6 }, (_, i) => {
    const angle = ++i * -Math.PI / 3;
    return {
      x: R * Math.cos(angle),
      y: 4,
      z: R * Math.sin(angle)
    };
  });
  const modelsPos = [{ x: 0, y: 0, z: 0 }].concat(corners);
  
  let modelIdx = 0;
  for (let path of getModelsPath(zip, '.pmx')) {
    const pmxBlob = await zip.file(path).async('blob');
    const modelUrl = URL.createObjectURL(pmxBlob);

    const model = await loader.loadAsync(modelUrl);

    const modelPos = modelsPos[modelIdx++];
    if (modelIdx == 7) {
      console.warn(`No more space for the model ${path}`);
      break;
    }
    model.position.set(modelPos.x, modelPos.y, modelPos.z);

    model.traverse((child) => {
      if (child.isMesh) {
        const morphAttributes = child.geometry.morphAttributes;
        if (morphAttributes.position && morphAttributes.position.length === 0) {
          delete morphAttributes.position;
        }
        if (morphAttributes.normal && morphAttributes.normal.length === 0) {
          delete morphAttributes.normal;
        }
        if (morphAttributes.color && morphAttributes.color.length === 0) {
          delete morphAttributes.color;
        }
        child.castShadow = true;
      }
    });

    scene.add(model);
    currentModels.push(model);
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

window.modelViewer = { preview, getHeightLimit };
