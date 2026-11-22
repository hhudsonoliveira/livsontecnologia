/* =========================================================
   LIVSON TECNOLOGIA — home (identidade de 2026-11-21)
   Só a home carrega este arquivo. As outras páginas seguem no js/main.js.

   O que tem aqui:
   1. ano do rodapé, menu do celular
   2. navegação por âncora sem "#" na barra (mesma regra do js/main.js,
      inclusive a chave do sessionStorage, para os links das outras páginas
      continuarem caindo na seção certa)
   3. palavra que troca no hero (por máscara, nunca fade)
   4. o cubo do hero: gira no título, voa e vira o ponto final da frase
   5. cards do portfólio cruzando a tela com a rolagem
   6. vitrine 3D das travas (Three.js baixado só quando a vitrine se aproxima)

   Movimento reduzido: 4, 5 e 6 não ligam e o HTML fica no estado parado,
   que já é legível sozinho (o quadrado laranja no título, o ponto final,
   os cards em grade, os itens da vitrine um embaixo do outro).
   ========================================================= */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. ano e menu ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  var nav = document.getElementById('nav'), toggle = document.getElementById('navToggle');
  if (nav && toggle) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? 'Fechar' : 'Menu';
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.nav__links a')) {
        nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); toggle.textContent = 'Menu';
      }
    });
  }

  /* ---------- 2. âncora sem "#" ---------- */
  var CHAVE_ANCORA = 'livson:ancora';
  function caminhoLimpo(p) { return (p || '/').replace(/index\.html$/, '') || '/'; }
  function urlLimpaAtual() { return caminhoLimpo(location.pathname) + location.search; }
  function posicaoDe(id) {
    if (id === 'hero' || id === 'topo') return 0;
    var alvo = document.getElementById(id);
    if (!alvo) return null;
    return Math.max(0, alvo.getBoundingClientRect().top + window.scrollY - 12);
  }
  function irPara(id, suave) {
    var y = posicaoDe(id);
    if (y === null) return false;
    window.scrollTo({ top: y, behavior: suave && !reduce ? 'smooth' : 'instant' });
    return true;
  }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    if (a.origin !== location.origin) return;
    var id = (a.hash || '').slice(1);
    if (!id) return;
    if (caminhoLimpo(a.pathname) === caminhoLimpo(location.pathname)) {
      if (!irPara(id, true)) return;
      e.preventDefault();
      history.replaceState(null, '', urlLimpaAtual());
      return;
    }
    e.preventDefault();
    try { sessionStorage.setItem(CHAVE_ANCORA, id); } catch (err) {}
    location.href = caminhoLimpo(a.pathname) + a.search;
  });
  (function ancoraDeEntrada() {
    var id = '';
    try { id = sessionStorage.getItem(CHAVE_ANCORA) || ''; sessionStorage.removeItem(CHAVE_ANCORA); } catch (err) {}
    var veioNoHash = !id && location.hash.length > 1;
    if (veioNoHash) id = location.hash.slice(1);
    if (!id) return;
    /* salto seco, repetido algumas vezes: nos primeiros instantes a página
       ainda muda de altura (fontes, seções que ficam altas quando a
       animação liga). Para assim que o visitante rolar por conta própria. */
    var tentativas = 0, dele = false;
    function desistir() { dele = true; }
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) { window.addEventListener(ev, desistir, { once: true, passive: true }); });
    (function reconferir() {
      if (dele) return;
      var y = posicaoDe(id);
      if (y === null || Math.abs(window.scrollY - y) < 4 && tentativas > 2) return;
      window.scrollTo({ top: y, behavior: 'instant' });
      if (++tentativas < 12) setTimeout(reconferir, 120);
    })();
    if (veioNoHash) history.replaceState(null, '', urlLimpaAtual());
  })();

  /* ---------- 3. palavra que troca ---------- */
  var rot = document.getElementById('rot');
  if (rot && !reduce) {
    var rin = rot.querySelector('.rot__in');
    var words = ['o atendimento.', 'a planilha.', 'o site.', 'o retrabalho.'], wi = 0;
    setInterval(function () {
      rot.classList.add('is-out');
      setTimeout(function () { wi = (wi + 1) % words.length; rin.textContent = words[wi]; void rot.offsetWidth; rot.classList.remove('is-out'); }, 440);
    }, 2800);
  }

  if (reduce) return;

  var tasks = [];
  function tick(now) { for (var i = 0; i < tasks.length; i++) tasks[i](now); requestAnimationFrame(tick); }

  /* ---------- 4. o cubo do hero ---------- */
  (function () {
    var A = document.getElementById('slotA'), B = document.getElementById('dotB');
    var holder = document.getElementById('holder'), cube = document.getElementById('cube');
    if (!A || !B || !holder || !cube) return;
    root.classList.add('cube-on');
    var idle = 30, last = performance.now(), latched = null;
    function ease(p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
    tasks.push(function (now) {
      var dt = Math.min(64, now - last); last = now;
      var ra = A.getBoundingClientRect(), rb = B.getBoundingClientRect();
      var vh = window.innerHeight;
      /* os dois bem acima da tela: esconde (um salto grande de rolagem deixaria o cubo parado no meio) */
      var far = ra.bottom < -vh && rb.bottom < -vh;
      holder.style.visibility = far ? 'hidden' : 'visible';
      if (far) return;
      var y = window.scrollY || 0;
      var end = Math.max(1, rb.top + y - vh * 0.56);
      var p = Math.min(1, Math.max(0, y / end)), e = ease(p);
      if (p === 0) { idle += dt * 0.045; latched = null; }
      else if (latched === null) { latched = Math.round(idle / 360) * 360; }
      var target = latched === null ? idle : latched;
      var ry = idle + (target - idle) * e, rx = -22 * (1 - e);
      var sA = ra.height * 1.32, sB = rb.width, s = sA + (sB - sA) * e;
      var cx = (ra.left + ra.width / 2) * (1 - e) + (rb.left + rb.width / 2) * e;
      var cy = (ra.top + ra.height / 2) * (1 - e) + (rb.top + rb.height / 2) * e;
      var bob = Math.sin(now / 900) * sA * 0.06 * (1 - e);
      holder.style.transform = 'translate3d(' + (cx - 50) + 'px,' + (cy - 50 + bob) + 'px,0) scale(' + (s / 100) + ')';
      cube.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
    });
  })();

  /* ---------- 5. cards do portfólio ---------- */
  (function () {
    var team = document.getElementById('portfolio');
    var cards = team ? Array.prototype.slice.call(team.querySelectorAll('.card')) : [];
    if (!cards.length) return;
    root.classList.add('team-on');
    var lay = [
      { top: .50, z: -40, ry: -16 }, { top: .36, z: 60, ry: -12 }, { top: .58, z: -120, ry: -18 },
      { top: .42, z: 20, ry: -10 }, { top: .55, z: -70, ry: -14 }
    ];
    var grid = team.querySelector('.team__grid'), pinT = team.querySelector('.team__pin');
    tasks.push(function () {
      var r = team.getBoundingClientRect(), vh = window.innerHeight, vw = window.innerWidth;
      if (!(r.top < vh && r.bottom > 0)) return;
      var p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
      /* no celular os cards passam abaixo do texto; no computador cruzam o título, como no Noomo */
      var minTop = vw < 861 ? grid.getBoundingClientRect().bottom - pinT.getBoundingClientRect().top + 16 : 80;
      var cw = cards[0].offsetWidth;
      var STAG = Math.min(0.4, Math.max(0.17, (cw + 40) / (vw + cw + 120)));
      var SPEED = 1 + STAG * (cards.length - 1);
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i], L = lay[i % lay.length], w = c.offsetWidth;
        var local = Math.min(1, Math.max(0, p * SPEED - i * STAG));
        var x = vw + 40 - (vw + w + 120) * local;
        var top = Math.min(vh - c.offsetHeight - 90, L.top * vh);
        c.style.top = Math.max(minTop, top) + 'px';
        c.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,' + L.z + 'px) rotateY(' + L.ry + 'deg)';
        c.style.visibility = (local <= 0 || local >= 1) ? 'hidden' : 'visible';
      }
    });
  })();

  /* ---------- 6. vitrine 3D ---------- */
  (function () {
    var show = document.getElementById('solucoes');
    var pinEl = document.getElementById('pin');
    if (!show || !pinEl) return;
    var test = document.createElement('canvas');
    var hasGL = !!(window.WebGLRenderingContext && (test.getContext('webgl') || test.getContext('experimental-webgl')));
    if (!hasGL) return; /* sem WebGL: itens ficam empilhados, parados */

    var items = Array.prototype.slice.call(show.querySelectorAll('.item'));
    var wordsEl = items.map(function (it) { return it.querySelector('.item__word'); });
    var infos = items.map(function (it) { return it.querySelector('.item__info'); });
    var N = items.length, START = -0.8, SPAN = (N - 1) - START;
    root.classList.add('show-on');
    show.style.height = ((1 + SPAN * 0.95) * 100) + 'vh';

    var vw = 1, vh = 1;
    function fitWords() {
      vw = window.innerWidth; vh = window.innerHeight;
      var cs = getComputedStyle(pinEl);
      var inner = pinEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var size = Infinity;
      wordsEl.forEach(function (w) { w.style.fontSize = '100px'; size = Math.min(size, 100 * (inner * 0.96) / Math.max(1, w.scrollWidth)); });
      size = Math.min(size, vh * 0.2);
      wordsEl.forEach(function (w) { w.style.fontSize = size + 'px'; });
      if (gl) gl.resize();
    }
    window.addEventListener('resize', fitWords);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWords);

    function smooth(x) { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); }
    function offsetFor(u) {
      if (u < -0.2) return -vh + vh * smooth((u + 0.8) / 0.6);
      if (u <= 0.2) return (u + 0.2) * 60;
      return 24 + (vh - 24) * smooth((u - 0.2) / 0.6);
    }

    var gl = null; /* preenchido quando o Three.js chegar */
    fitWords();

    tasks.push(function (now) {
      var r = show.getBoundingClientRect();
      var on = r.top < vh && r.bottom > 0;
      if (gl) gl.visible(on);
      if (!on) return;
      var p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
      for (var i = 0; i < N; i++) {
        var u = START + p * SPAN - i;
        var vis = u > -0.82 && u < 0.82;
        if (!vis) { items[i].style.visibility = 'hidden'; infos[i].style.visibility = 'hidden'; if (gl) gl.place(i, null); continue; }
        items[i].style.visibility = 'visible';
        items[i].style.transform = 'translate3d(0,' + offsetFor(u).toFixed(1) + 'px,0)';
        var io = 1 - smooth((Math.abs(u) - 0.2) / 0.12);
        infos[i].style.opacity = io.toFixed(3);
        infos[i].style.visibility = io < 0.02 ? 'hidden' : 'visible';
        if (gl) gl.place(i, wordsEl[i].getBoundingClientRect(), u);
      }
      if (gl) gl.render(now, p, pinEl.getBoundingClientRect());
    });

    /* Three.js só desce quando a vitrine está a uma tela e meia de distância */
    var pedido = false;
    function carregar() {
      if (pedido) return; pedido = true;
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      s.async = true;
      s.onload = function () { try { gl = criarCena(); fitWords(); } catch (err) { gl = null; } };
      document.head.appendChild(s);
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { carregar(); io.disconnect(); } }, { rootMargin: '150% 0px 150% 0px' });
      io.observe(show);
    } else { window.addEventListener('load', carregar); }

    function criarCena() {
      var THREE = window.THREE;
      var canvas = document.getElementById('gl');
      var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      renderer.setPixelRatio(dpr);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      camera.position.set(0, 0, 16);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x445a60, 0.3));
      var key = new THREE.DirectionalLight(0xffffff, 1.05); key.position.set(4, 7, 9); scene.add(key);
      var fill = new THREE.DirectionalLight(0xffffff, 0.3); fill.position.set(-7, -2, 5); scene.add(fill);

      /* ambiente de estúdio desenhado em canvas: o reflexo dele dá o brilho de plástico e vidro */
      (function () {
        var c = document.createElement('canvas'); c.width = 1024; c.height = 512;
        var x = c.getContext('2d');
        var gr = x.createLinearGradient(0, 0, 0, 512);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.42, '#dfe7ea'); gr.addColorStop(0.56, '#8d9ba1'); gr.addColorStop(1, '#263034');
        x.fillStyle = gr; x.fillRect(0, 0, 1024, 512);
        function soft(cx, cy, rx, ry) {
          var g = x.createRadialGradient(cx, cy, 0, cx, cy, rx);
          g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          x.save(); x.translate(cx, cy); x.scale(1, ry / rx); x.translate(-cx, -cy);
          x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rx, 0, Math.PI * 2); x.fill(); x.restore();
        }
        soft(250, 130, 150, 70); soft(760, 100, 190, 60); soft(512, 330, 90, 22);
        var tex = new THREE.CanvasTexture(c);
        tex.mapping = THREE.EquirectangularReflectionMapping; tex.encoding = THREE.sRGBEncoding;
        var pm = new THREE.PMREMGenerator(renderer);
        scene.environment = pm.fromEquirectangular(tex).texture;
        tex.dispose(); pm.dispose();
      })();

      function cssVar(n, fb) { return getComputedStyle(root).getPropertyValue(n).trim() || fb; }
      function phys(o) { var b = { color: 0xffffff, roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2 }; for (var k in o) b[k] = o[k]; return new THREE.MeshPhysicalMaterial(b); }
      var mAcc = phys({}), mAcc2 = phys({});
      var mIce = phys({ transparent: true, opacity: 0.6, roughness: 0.1 });
      var mWhite = phys({ roughness: 0.25 });
      var mPlate = phys({ transparent: true, opacity: 0.6, roughness: 0.08 });
      var mFrag = phys({ transparent: true, opacity: 0.5, roughness: 0.12 });
      mAcc.color.set(cssVar('--acc', '#FF7A1A')).convertSRGBToLinear();
      mAcc2.color.set(cssVar('--acc2', '#2FC4B8')).convertSRGBToLinear();
      [mIce, mPlate, mFrag].forEach(function (m) { m.color.set(cssVar('--ice', '#D9F3F0')).convertSRGBToLinear(); });

      function rrect(w, h, r) {
        var s = new THREE.Shape(), x = -w / 2, y = -h / 2; r = Math.max(0.0001, Math.min(r, w / 2, h / 2));
        s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
        s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
        s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
      }
      function rbox(w, h, d, r) {
        var b = Math.min(r * 0.7, d * 0.45, w * 0.3, h * 0.3);
        var geo = new THREE.ExtrudeGeometry(rrect(w - 2 * b, h - 2 * b, Math.max(0.0001, r - b)), {
          depth: Math.max(0.001, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 6
        });
        geo.center(); return geo;
      }
      function bubbleGeo(w, h, d, r) {
        var b = Math.min(r * 0.7, d * 0.45);
        var W = w - 2 * b, H = h - 2 * b, R = Math.max(0.0001, r - b), x = -W / 2, y = -H / 2;
        var s = new THREE.Shape();
        s.moveTo(x + R, y); s.lineTo(x + W * 0.2, y); s.lineTo(x + W * 0.05, y - 0.5); s.lineTo(x + W * 0.44, y);
        s.lineTo(x + W - R, y); s.quadraticCurveTo(x + W, y, x + W, y + R);
        s.lineTo(x + W, y + H - R); s.quadraticCurveTo(x + W, y + H, x + W - R, y + H);
        s.lineTo(x + R, y + H); s.quadraticCurveTo(x, y + H, x, y + H - R);
        s.lineTo(x, y + R); s.quadraticCurveTo(x, y, x + R, y);
        var geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 4, curveSegments: 8 });
        geo.translate(0, 0, -(d - 2 * b) / 2); return geo;
      }
      function mesh(geo, mat, x, y, z) { var m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); return m; }

      var shadowTex = (function () {
        var c = document.createElement('canvas'); c.width = c.height = 256;
        var x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
        g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
      })();
      function plate() {
        var p = new THREE.Group();
        p.add(mesh(rbox(3.0, 2.2, 0.22, 0.16), mPlate));
        var sh = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.6), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
        sh.position.z = 0.125; p.add(sh);
        p.rotation.x = -Math.PI / 2 + 0.38; return p;
      }

      var labelDraws = [];
      function labelPlane(text, light) {
        var c = document.createElement('canvas'); c.width = c.height = 512;
        var tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding;
        function draw() {
          var x = c.getContext('2d'); x.clearRect(0, 0, 512, 512);
          x.fillStyle = light ? '#ffffff' : '#1b1b1a';
          x.font = '600 44px "Archivo", "Geist", system-ui, sans-serif';
          x.fillText(text.toUpperCase(), 44, 462);
          x.globalAlpha = 0.5; x.font = '500 26px "Geist", system-ui, sans-serif';
          x.fillText('Livson Conecta', 44, 408); x.globalAlpha = 1;
          tex.needsUpdate = true;
        }
        draw(); labelDraws.push(draw);
        return new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      }
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { labelDraws.forEach(function (d) { d(); }); });

      /* cada objeto carrega "o ponto" na cor de destaque */
      var builders = {
        bolha: function (g, anim) {
          var body = new THREE.Group();
          body.add(mesh(bubbleGeo(2.7, 1.75, 0.62, 0.5), mAcc));
          var dots = [];
          for (var i = 0; i < 3; i++) { var d = mesh(new THREE.SphereGeometry(0.17, 28, 18), mWhite, -0.62 + i * 0.62, 0, 0.4); body.add(d); dots.push(d); }
          g.add(body);
          anim.push(function (t, u) {
            body.rotation.y = -0.5 + u * 2.4 + Math.sin(t * 0.6) * 0.18;
            body.rotation.x = 0.12 + Math.sin(t * 0.8) * 0.05;
            for (var i = 0; i < 3; i++) dots[i].position.y = Math.max(0, Math.sin(t * 5 - i * 0.9)) * 0.16;
          });
        },
        planilha: function (g, anim) {
          var grid = new THREE.Group(), hot = null;
          grid.add(mesh(rbox(3.0, 0.22, 2.1, 0.1), mAcc2));
          for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) {
            var isHot = (r === 1 && c === 2);
            var tile = mesh(rbox(0.56, 0.18, 0.48, 0.07), isHot ? mAcc : mIce, -1.02 + c * 0.68, 0.2, -0.62 + r * 0.62);
            grid.add(tile); if (isHot) hot = tile;
          }
          grid.rotation.x = 0.55; g.add(grid);
          anim.push(function (t, u) {
            grid.rotation.y = 0.4 + u * 2.2 + Math.sin(t * 0.5) * 0.15;
            hot.position.y = 0.42 + Math.sin(t * 2.2) * 0.14; hot.rotation.y = t * 1.2;
          });
        },
        site: function (g, anim) {
          var win = new THREE.Group();
          win.add(mesh(rbox(2.9, 2.0, 0.2, 0.16), mAcc2));
          for (var i = 0; i < 3; i++) win.add(mesh(new THREE.SphereGeometry(0.07, 16, 12), mWhite, -1.18 + i * 0.22, 0.78, 0.12));
          win.add(mesh(rbox(1.5, 0.2, 0.08, 0.06), mWhite, -0.48, 0.3, 0.13));
          win.add(mesh(rbox(1.1, 0.2, 0.08, 0.06), mWhite, -0.68, 0.0, 0.13));
          win.add(mesh(rbox(0.95, 0.95, 0.1, 0.08), mIce, 0.78, -0.12, 0.13));
          var btn = mesh(rbox(0.78, 0.3, 0.2, 0.1), mAcc, -0.78, -0.48, 0.2); win.add(btn);
          g.add(win);
          anim.push(function (t, u) {
            win.rotation.y = 0.55 + u * 2.3 + Math.sin(t * 0.55) * 0.16;
            win.rotation.x = -0.12 + Math.sin(t * 0.7) * 0.05;
            btn.position.z = 0.2 + Math.max(0, Math.sin(t * 2.4)) * 0.18;
          });
        },
        anel: function (g, anim) {
          var ring = new THREE.Group();
          ring.add(mesh(new THREE.TorusGeometry(1.15, 0.24, 28, 96), mAcc2));
          var c = mesh(rbox(0.46, 0.46, 0.46, 0.12), mAcc); ring.add(c);
          ring.rotation.x = 1.0; g.add(ring);
          anim.push(function (t, u) {
            var a = t * 1.5 + u * 6;
            c.position.set(Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0.3);
            c.rotation.set(a, a * 0.7, 0);
            ring.rotation.z = u * 1.6 + t * 0.15;
          });
        },
        /* Conecta: a pilha dos quatro módulos, cada placa balançando por conta própria */
        pilha: function (g, anim) {
          var stack = new THREE.Group(), slabs = [];
          var names = ['Vitrine', 'Vendedor IA', 'CRM', 'Painel'];
          var mats = [mAcc2, mAcc, mIce, mAcc2];
          var geo = rbox(2.3, 2.3, 0.34, 0.42);
          for (var i = 0; i < 4; i++) {
            var s = mesh(geo, mats[i]); s.rotation.x = -Math.PI / 2;
            var lbl = labelPlane(names[i], i !== 2); lbl.position.z = 0.175; s.add(lbl);
            var h = new THREE.Group(); h.add(s); stack.add(h); slabs.push(h);
          }
          stack.rotation.x = 0.52; g.add(stack);
          anim.push(function (t, u) {
            stack.rotation.y = -0.55 + u * 2.0 + Math.sin(t * 0.4) * 0.1;
            for (var i = 0; i < 4; i++) {
              var h = slabs[i];
              h.position.set(Math.sin(t * 0.6 + i * 1.3) * 0.09, -0.75 + i * 0.5 + Math.sin(t * 1.2 + i * 0.9) * 0.07, 0);
              h.rotation.set(Math.cos(t * 0.7 + i) * 0.06, Math.sin(t * 0.5 + i * 0.7) * 0.12, Math.sin(t * 0.8 + i * 1.1) * 0.09);
            }
          });
        }
      };

      var objs = items.map(function (it) {
        var g = new THREE.Group(), inner = new THREE.Group(), anim = [];
        builders[it.getAttribute('data-obj')](inner, anim);
        var base = plate(); base.position.y = -1.75;
        g.add(inner); g.add(base); g.visible = false; scene.add(g);
        return { g: g, inner: inner, anim: anim, u: 0 };
      });

      var frags = [], fragGeo = rbox(0.42, 0.42, 0.42, 0.1);
      for (var f = 0; f < 10; f++) {
        var fm = mesh(fragGeo, f % 5 === 0 ? mAcc : mFrag);
        fm.scale.setScalar(0.4 + ((f * 37) % 10) / 20);
        fm.userData = { x: ((f * 53) % 100) / 100 * 14 - 7, y: ((f * 29) % 100) / 100 * 10 - 5, z: -5 + ((f * 17) % 100) / 100 * 5, r: f * 0.7 };
        scene.add(fm); frags.push(fm);
      }

      var visW = 1, visH = 1, shown = false;
      /* trava de segurança: se o aparelho não der conta, primeiro baixa a
         resolução, depois desliga o 3D (as palavras continuam se movendo) */
      var frames = 0, acc = 0, lastT = 0, degraded = 0, dead = false;

      function resize() {
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
        visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); visW = visH * camera.aspect;
      }
      resize();

      return {
        resize: resize,
        visible: function (on) {
          if (dead) on = false;
          if (on !== shown) { canvas.style.visibility = on ? 'visible' : 'hidden'; shown = on; lastT = 0; }
        },
        place: function (i, wr, u) {
          var o = objs[i];
          if (!wr) { o.g.visible = false; return; }
          var k = Math.min(1, visW / 7.2);
          var cx = wr.left + wr.width / 2, cy = wr.top + wr.height * 0.62;
          o.g.visible = true; o.u = u;
          o.g.position.set((cx / window.innerWidth - 0.5) * visW, -(cy / window.innerHeight - 0.5) * visH, 0);
          o.g.scale.setScalar(k);
        },
        render: function (now, p, pr) {
          if (dead) return;
          var t = now / 1000;
          for (var i = 0; i < objs.length; i++) {
            var o = objs[i]; if (!o.g.visible) continue;
            for (var a = 0; a < o.anim.length; a++) o.anim[a](t, o.u);
            o.inner.position.y = Math.sin(t * 1.1 + i) * 0.08;
          }
          for (var f2 = 0; f2 < frags.length; f2++) {
            var fr = frags[f2], d = fr.userData;
            var yy = d.y + p * 14 * (0.6 + (f2 % 4) * 0.2);
            yy = ((yy + 6) % 12 + 12) % 12 - 6;
            fr.position.set(d.x * Math.max(0.55, Math.min(1, visW / 15)), yy, d.z);
            fr.rotation.set(d.r + p * 6, d.r * 0.5 + p * 4 + t * 0.2, 0);
          }
          /* só desenha dentro da área visível da vitrine */
          var vh = window.innerHeight, vw = window.innerWidth;
          var top = Math.max(0, pr.top), bot = Math.min(vh, pr.bottom);
          renderer.setScissorTest(false); renderer.clear();
          if (bot > top) { renderer.setScissorTest(true); renderer.setScissor(0, vh - bot, vw, bot - top); renderer.render(scene, camera); }

          if (lastT) { acc += now - lastT; frames++; }
          lastT = now;
          if (frames === 90) {
            var avg = acc / frames; frames = 0; acc = 0;
            if (avg > 45 && degraded === 0) { degraded = 1; renderer.setPixelRatio(1); resize(); }
            else if (avg > 60 && degraded === 1) { dead = true; canvas.style.visibility = 'hidden'; }
          }
        }
      };
    }
  })();

  requestAnimationFrame(tick);
})();
