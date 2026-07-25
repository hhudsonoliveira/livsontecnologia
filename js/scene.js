/* =========================================================
   LIVSON TECNOLOGIA — Hero 3D Scene (Three.js)
   Layers (motion-design "ambient"):
     · particle network (drifting points + linking lines)
     · perspective grid floor (receding tech grid)
     · floating wireframe icosahedron (brand focal object)
     · UnrealBloom postprocessing for neon glow
   Respects prefers-reduced-motion + pauses when tab hidden.
   ========================================================= */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const canvas = document.getElementById('bg-canvas');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Colors
const CYAN = new THREE.Color('#22d3ee');
const VIOLET = new THREE.Color('#8b5cf6');
const PINK = new THREE.Color('#e879f9');

let renderer, scene, camera, composer;
let particles, lineMesh, grid, icoGroup, ico, icoInner;
let linePositions, linePairs, particleData;
const PARTICLE_COUNT = window.innerWidth < 768 ? 70 : 130;
const MAX_LINK_DIST = 3.2;

const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
const clock = new THREE.Clock();
let running = true;

init();

function init() {
  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Scene + camera
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#05070d', 0.03);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 14);

  buildParticles();
  buildGrid();
  buildIco();

  // Postprocessing — bloom for the neon glow
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.85,  // strength
    0.7,   // radius
    0.15   // threshold
  );
  composer.addPass(bloom);

  // Events
  window.addEventListener('resize', onResize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) animate(); });

  animate();
}

/* ---------- Particle network ---------- */
function buildParticles() {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  particleData = [];

  const spread = 18;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const x = (Math.random() - 0.5) * spread;
    const y = (Math.random() - 0.5) * spread * 0.62;
    const z = (Math.random() - 0.5) * spread * 0.6;
    positions.set([x, y, z], i * 3);

    const c = CYAN.clone().lerp(VIOLET, Math.random());
    colors.set([c.r, c.g, c.b], i * 3);

    particleData.push({
      vx: (Math.random() - 0.5) * 0.006,
      vy: (Math.random() - 0.5) * 0.006,
      vz: (Math.random() - 0.5) * 0.006,
    });
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const sprite = makeDiscTexture();
  const mat = new THREE.PointsMaterial({
    size: 0.16,
    map: sprite,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  particles = new THREE.Points(geo, mat);
  scene.add(particles);

  // Linking lines (dynamic)
  const maxLines = PARTICLE_COUNT * 6;
  linePositions = new Float32Array(maxLines * 3);
  const lineColors = new Float32Array(maxLines * 3);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage));
  lineGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3).setUsage(THREE.DynamicDrawUsage));

  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  lineMesh = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lineMesh);
  linePairs = 0;
}

function updateLinks() {
  const pos = particles.geometry.attributes.position.array;
  const lp = linePositions;
  const lc = lineMesh.geometry.attributes.color.array;
  let idx = 0;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const ix = pos[i * 3], iy = pos[i * 3 + 1], iz = pos[i * 3 + 2];
    for (let j = i + 1; j < PARTICLE_COUNT; j++) {
      const dx = ix - pos[j * 3];
      const dy = iy - pos[j * 3 + 1];
      const dz = iz - pos[j * 3 + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < MAX_LINK_DIST && idx < lp.length - 6) {
        const a = 1 - dist / MAX_LINK_DIST;
        lp[idx] = ix; lp[idx + 1] = iy; lp[idx + 2] = iz;
        lp[idx + 3] = pos[j * 3]; lp[idx + 4] = pos[j * 3 + 1]; lp[idx + 5] = pos[j * 3 + 2];
        lc[idx] = CYAN.r * a; lc[idx + 1] = CYAN.g * a; lc[idx + 2] = CYAN.b * a;
        lc[idx + 3] = VIOLET.r * a; lc[idx + 4] = VIOLET.g * a; lc[idx + 5] = VIOLET.b * a;
        idx += 6;
      }
    }
  }
  lineMesh.geometry.attributes.position.needsUpdate = true;
  lineMesh.geometry.attributes.color.needsUpdate = true;
  lineMesh.geometry.setDrawRange(0, idx / 3);
}

/* ---------- Perspective grid floor ---------- */
function buildGrid() {
  grid = new THREE.GridHelper(60, 44, VIOLET, CYAN);
  grid.material.transparent = true;
  grid.material.opacity = 0.12;
  grid.material.blending = THREE.AdditiveBlending;
  grid.material.depthWrite = false;
  grid.position.y = -7;
  grid.rotation.x = 0.0;
  scene.add(grid);
}

/* ---------- Floating wireframe icosahedron ---------- */
function buildIco() {
  icoGroup = new THREE.Group();
  icoGroup.position.set(5.2, 1.6, 2);

  const geo = new THREE.IcosahedronGeometry(2.2, 1);
  const mat = new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true, opacity: 0.55 });
  ico = new THREE.Mesh(geo, mat);
  icoGroup.add(ico);

  const innerGeo = new THREE.IcosahedronGeometry(1.25, 0);
  const innerMat = new THREE.MeshBasicMaterial({ color: PINK, wireframe: true, transparent: true, opacity: 0.4 });
  icoInner = new THREE.Mesh(innerGeo, innerMat);
  icoGroup.add(icoInner);

  scene.add(icoGroup);

  // Hide on small screens (keeps hero text clean)
  if (window.innerWidth < 700) icoGroup.visible = false;
}

/* ---------- Helpers ---------- */
function makeDiscTexture() {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

function onPointerMove(e) {
  pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  if (icoGroup) icoGroup.visible = window.innerWidth >= 700;
}

/* ---------- Animation loop ---------- */
function animate() {
  if (!running) return;
  requestAnimationFrame(animate);

  const t = clock.getElapsedTime();

  // Smooth pointer parallax
  pointer.x += (pointer.tx - pointer.x) * 0.05;
  pointer.y += (pointer.ty - pointer.y) * 0.05;

  // Drift particles
  const pos = particles.geometry.attributes.position.array;
  const spreadX = 9, spreadY = 5.6, spreadZ = 5.4;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const d = particleData[i];
    pos[i * 3] += d.vx;
    pos[i * 3 + 1] += d.vy;
    pos[i * 3 + 2] += d.vz;
    if (pos[i * 3] > spreadX || pos[i * 3] < -spreadX) d.vx *= -1;
    if (pos[i * 3 + 1] > spreadY || pos[i * 3 + 1] < -spreadY) d.vy *= -1;
    if (pos[i * 3 + 2] > spreadZ || pos[i * 3 + 2] < -spreadZ) d.vz *= -1;
  }
  particles.geometry.attributes.position.needsUpdate = true;
  updateLinks();

  particles.rotation.y = t * 0.02;
  lineMesh.rotation.y = t * 0.02;

  // Icosahedron rotation + float
  if (icoGroup) {
    ico.rotation.x = t * 0.18;
    ico.rotation.y = t * 0.24;
    icoInner.rotation.x = -t * 0.32;
    icoInner.rotation.y = -t * 0.26;
    icoGroup.position.y = 1.6 + Math.sin(t * 0.7) * 0.4;
  }

  // Grid subtle drift
  grid.position.z = (t * 0.4) % 2.72;

  // Camera parallax (counter-motion at ~30%)
  camera.position.x += (pointer.x * 1.6 - camera.position.x) * 0.04;
  camera.position.y += (-pointer.y * 1.0 - camera.position.y) * 0.04;
  camera.lookAt(0, 0, 0);

  composer.render();

  if (reduceMotion) running = false; // render one frame then stop
}
