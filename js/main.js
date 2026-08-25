/* =========================================================
   LIVSON TECNOLOGIA — Interactions & GSAP choreography
   Motion personality: Corporate/Premium
     signature easing: power3.out  (≈ cubic-bezier(.2,0,0,1))
     durations: quick .3 / standard .6 / slow .8
     stagger: 0.09s  (standard, total < 500ms per group)
   ========================================================= */
(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined';

  document.documentElement.classList.remove('no-js');

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Preloader ----------
     O preloader cobre a tela inteira, então tudo que ele fica visível é
     tempo em que o usuário não vê conteúdo (e conta como LCP ruim). Por
     isso: barra rápida + teto absoluto, e nunca esperar o window "load"
     (que só dispara depois de TODAS as imagens baixarem). */
  const PRELOADER_MAX_MS = 700;
  const preloader = document.getElementById('preloader');
  const bar = document.getElementById('preloaderBar');
  let progress = 0;
  const tick = setInterval(() => {
    progress = Math.min(100, progress + 18 + Math.random() * 22);
    if (bar) bar.style.width = progress + '%';
    if (progress >= 100) {
      clearInterval(tick);
      hidePreloader();
    }
  }, 90);

  setTimeout(hidePreloader, PRELOADER_MAX_MS);

  function hidePreloader() {
    if (!preloader || preloader.classList.contains('is-done')) return;
    clearInterval(tick);
    preloader.classList.add('is-done');
    startHeroIntro();
  }

  /* ---------- Navbar: scrolled state + mobile toggle ---------- */
  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  const onScroll = () => {
    if (window.scrollY > 20) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    });
  }
  navLinks && navLinks.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      nav.classList.remove('is-open');
      navToggle && navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------- Hero intro (staggered entrance) ---------- */
  function startHeroIntro() {
    const lines = document.querySelectorAll('.hero__title .reveal-line');
    const heroReveals = document.querySelectorAll('.hero .reveal');

    if (prefersReduced || !hasGSAP) {
      lines.forEach((l) => (l.style.opacity = 1));
      heroReveals.forEach((b) => b.classList.add('is-in'));
      return;
    }

    // Neutralise the CSS `.reveal { opacity:0 }` so gsap tweens to a visible end.
    gsap.set(lines, { opacity: 1 });

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo('.hero__badge', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 })
      .fromTo(lines,
        { yPercent: 115, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.12, ease: 'power4.out' }, '-=0.25')
      .fromTo('.hero__sub', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, '-=0.55')
      .fromTo('.hero__actions', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, '-=0.5')
      .fromTo('.hero__trust, .hero__company', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.5');
  }

  /* ---------- Scroll reveals ---------- */
  const reveals = Array.from(document.querySelectorAll('.reveal')).filter(
    (el) => !el.closest('.hero')
  );

  if (prefersReduced) {
    reveals.forEach((el) => el.classList.add('is-in'));
  } else if (hasGSAP && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    reveals.forEach((el) => {
      gsap.fromTo(
        el,
        { y: 34, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 86%', once: true },
          onStart: () => el.classList.add('is-in'),
        }
      );
    });
  } else {
    // Fallback: IntersectionObserver
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- Animated counters ----------
     O numero REAL fica escrito no HTML (10+, 10+, 2+, 100%). Isso e de
     proposito: se o JS nao rodar, se o robo do Google ler a pagina, ou se
     o visitante nunca chegar a rolar ate a faixa, ele ve o numero certo.
     Antes o HTML trazia "0" e o JS contava ate o valor — quando a contagem
     nao disparava, a pagina exibia "0 Projetos entregues", que e pior do
     que nao animar: e um numero errado sobre o proprio negocio.
     Agora o JS so zera o contador quando tem certeza de que vai anima-lo. */
  const counters = document.querySelectorAll('.stat__num[data-count]');

  const valorFinal = (el) => {
    const casas = parseInt(el.dataset.decimals || '0', 10);
    return parseFloat(el.dataset.count).toFixed(casas) + (el.dataset.suffix || '');
  };

  const runCounter = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const suffix = el.dataset.suffix || '';
    const dur = 1600;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = valorFinal(el);
    };
    requestAnimationFrame(step);
  };

  // Sem animacao com "reduzir movimento": o HTML ja mostra o valor certo.
  if (counters.length && !prefersReduced && 'IntersectionObserver' in window) {
    // Dois observadores, de proposito:
    //   "prepara" dispara ~400px ANTES da faixa aparecer e so entao zera o
    //   numero (fora da vista, sem piscar na tela do visitante);
    //   "anima" dispara quando ela realmente entra e faz a contagem subir.
    // Se o visitante nunca chegar perto da faixa, nenhum dos dois roda e o
    // numero real escrito no HTML continua na tela.
    const pendente = new WeakMap();

    const anima = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          anima.unobserve(e.target);
          clearTimeout(pendente.get(e.target));
          runCounter(e.target);
        });
      },
      { threshold: 0.25 }
    );

    const prepara = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          prepara.unobserve(e.target);
          e.target.textContent = '0' + (e.target.dataset.suffix || '');
          // rede de seguranca: se a contagem nao comecar, devolve o numero real
          pendente.set(e.target, setTimeout(() => {
            e.target.textContent = valorFinal(e.target);
          }, 3000));
        });
      },
      { rootMargin: '0px 0px 400px 0px' }
    );

    counters.forEach((el) => { anima.observe(el); prepara.observe(el); });
  }

  /* ---------- Card spotlight (mouse-follow glow) ---------- */
  if (!prefersReduced && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
      });
    });
  }

  /* ---------- FAQ accordion (Livson Conecta) ---------- */
  document.querySelectorAll('.faq__item').forEach((item) => {
    const question = item.querySelector('.faq__question');
    question && question.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');
      item.parentElement.querySelectorAll('.faq__item').forEach((i) => i.classList.remove('is-open'));
      if (!isOpen) item.classList.add('is-open');
    });
  });
})();
