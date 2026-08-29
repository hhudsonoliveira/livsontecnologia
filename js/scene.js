/* =========================================================
   LIVSON TECNOLOGIA — Hero 3D Scene (Three.js)
   Layers (motion-design "ambient"):
     · particle network (drifting points + linking lines)
     · perspective grid floor (receding tech grid)
     · floating wireframe icosahedron (brand focal object)
     · UnrealBloom postprocessing for neon glow
   Respects prefers-reduced-motion + pauses when tab hidden.

   Performance: skipped entirely on mobile (CPU/GPU-heavy for
   little visual payoff on small screens — .bg-overlay's CSS
   gradient carries the background alone there) and on machines
   without hardware-accelerated WebGL, where this scene renders
   via software rasterizer (SwiftShader/llvmpipe) and blocks the
   main thread for seconds. On desktop with a real GPU, Three.js
   is dynamically imported after window "load" so it never
   competes with the initial page render.
   ========================================================= */

const canvas = document.getElementById('bg-canvas');
const isMobile = window.innerWidth < 768;

/* Sem GPU real (VM, PC antigo, GPU bloqueada, robôs de auditoria como o
   PageSpeed) o WebGL cai em rasterização por software e essa cena trava a
   página por vários segundos. Nesses casos o fundo fica só com o gradiente
   CSS, que já sustenta o visual sozinho. */
function hasHardwareWebGL() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) return false;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (!dbg) return true; // sem como saber: assume que dá, em vez de punir o usuário
    const renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
    return !/swiftshader|llvmpipe|software|basic render|microsoft basic/i.test(renderer);
  } catch (e) {
    return false;
  }
}

if (isMobile || !hasHardwareWebGL()) {
  if (canvas) canvas.remove();
} else if (document.readyState === 'complete') {
  start();
} else {
  window.addEventListener('load', start, { once: true });
}

async function start() {
  const [THREE, { EffectComposer }, { RenderPass }, { UnrealBloomPass }] = await Promise.all([
    import('three'),
    import('three/addons/postprocessing/EffectComposer.js'),
    import('three/addons/postprocessing/RenderPass.js'),
    import('three/addons/postprocessing/UnrealBloomPass.js'),
  ]);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Colors — a cena segue a paleta do site (indigo/navy). O cyan
  // continua existindo, mas so como ponto alto raro, igual no CSS.
  const CYAN = new THREE.Color('#899cec');    // acento da faixa escura
  const VIOLET = new THREE.Color('#4a5aa8');  // mesmo hue, mais fundo
  const PINK = new THREE.Color('#b3c0f7');    // mesmo hue, mais claro

  let renderer, scene, camera, composer;
  let particles, lineMesh, grid, icoGroup, ico, icoInner;
  let linePositions, linePairs, particleData;
  const PARTICLE_COUNT = window.innerWidth < 992 ? 70 : 90;
  const MAX_LINK_DIST = 3.2;

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const clock = new THREE.Clock();
  let running = true;
  let frame = 0;
  let lastFrameTime = 0;

  /* Trava de segurança: a detecção de GPU acima pode falhar (navegadores que
     bloqueiam WEBGL_debug_renderer_info por privacidade). Então medimos o
     custo real dos primeiros frames — se o navegador não estiver dando conta,
     desmontamos a cena em vez de travar a página. */
  const WARMUP_FRAMES = 3;   // ignora os primeiros (compilação de shader é lenta até em GPU boa)
  const WATCHDOG_FRAMES = 15;
  const MAX_AVG_FRAME_MS = 90; // alvo é ~33ms; 90ms (≈11fps) = aparelho não dá conta
  let watchdogStart = 0;
  let disposed = false;
  const FRAME_BUDGET = 1000 / 30; // limita a ~30fps — fundo decorativo não precisa de 60fps
  const LINKS_EVERY_N_FRAMES = 4; // recalcular as linhas entre partículas é O(n²); não precisa toda hora

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
      0.42,  // strength — era 0.85: neon demais para o tom novo
      0.85,  // radius
      0.22   // threshold
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
    const mat = new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true, opacity: 0.34 });
    ico = new THREE.Mesh(geo, mat);
    icoGroup.add(ico);

    const innerGeo = new THREE.IcosahedronGeometry(1.25, 0);
    const innerMat = new THREE.MeshBasicMaterial({ color: PINK, wireframe: true, transparent: true, opacity: 0.26 });
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
  function animate(now) {
    if (!running) return;
    requestAnimationFrame(animate);

    // Cap a ~30fps — fundo decorativo não precisa de 60fps, e cada frame
    // pulado aqui é praticamente grátis (só essa comparação).
    if (now - lastFrameTime < FRAME_BUDGET) return;
    lastFrameTime = now;
    frame++;

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
    // updateLinks é O(n²) — recalcula bem menos vezes por segundo que o resto
    if (frame % LINKS_EVERY_N_FRAMES === 0) updateLinks();

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

    /* Trava de segurança: mede o intervalo REAL entre frames entregues.
       (Medir o tempo dentro de composer.render() não serve — o trabalho
       gráfico é assíncrono e não aparece ali.) Se o aparelho não sustenta
       um mínimo de fluidez, desmonta a cena em vez de travar a página. */
    if (frame === WARMUP_FRAMES) {
      watchdogStart = now;
    } else if (frame === WARMUP_FRAMES + WATCHDOG_FRAMES) {
      if ((now - watchdogStart) / WATCHDOG_FRAMES > MAX_AVG_FRAME_MS) {
        teardown();
        return;
      }
    }

    if (reduceMotion) running = false; // render one frame then stop
  }

  /* Desmonta tudo e devolve a memória de GPU. O fundo volta a ser só o
     gradiente CSS, que já sustenta o visual sozinho. */
  function teardown() {
    if (disposed) return;
    disposed = true;
    running = false;
    try {
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
        }
      });
      composer.dispose();
      renderer.dispose();
    } catch (e) { /* melhor esforço: o importante é parar o loop */ }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pointermove', onPointerMove);
    if (canvas) canvas.remove();
  }
}
