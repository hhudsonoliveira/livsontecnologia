/* =========================================================
   LIVSON TECNOLOGIA — página do Livson Conecta (depois do js/base.js)
   1. palavra que troca no título (máscara, nunca fade)
   2. ilustrações isométricas: só flutuam com elas na tela (.is-live);
      a placa de cada passo sobe quando o passo entra (.is-in)
   3. casos de uso: preview dos tiles (mouse: ao passar por cima; toque:
      quando o tile está na tela, repetindo a cada 4,5s)
   4. FAQ: acordeão WAI-ARIA (sem JS as respostas ficam abertas)
   Movimento reduzido: 1, 2 e 3 não ligam; o estado parado já é o final.
   ========================================================= */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var temIO = 'IntersectionObserver' in window;

  /* 1. título */
  var rot = document.querySelector('[data-rotator]');
  if (rot && !reduce) {
    var itens = rot.querySelectorAll('.rotator__item'), at = 0;
    setInterval(function () {
      var atual = itens[at], prox = itens[(at + 1) % itens.length];
      atual.classList.remove('is-active'); atual.classList.add('is-out');
      prox.classList.remove('is-out');
      void prox.offsetWidth;
      prox.classList.add('is-active');
      /* a que saiu volta para baixo sem transição, senão ela atravessaria a linha visível */
      setTimeout(function () { atual.style.transition = 'none'; atual.classList.remove('is-out'); void atual.offsetWidth; atual.style.transition = ''; }, 520);
      at = (at + 1) % itens.length;
    }, 2400);
  }

  /* 2. ilustrações */
  var isos = Array.prototype.slice.call(document.querySelectorAll('svg.iso'));
  var passos = Array.prototype.slice.call(document.querySelectorAll('.passo'));
  if (reduce || !temIO) {
    passos.forEach(function (p) { p.classList.add('is-in'); });
  } else {
    var ioIso = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('is-live', e.isIntersecting); });
    }, { rootMargin: '80px 0px' });
    isos.forEach(function (s) { ioIso.observe(s); });
    var ioPasso = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); ioPasso.unobserve(e.target); } });
    }, { threshold: 0.35 });
    passos.forEach(function (p) { ioPasso.observe(p); });
  }

  /* 3. tiles */
  var tiles = Array.prototype.slice.call(document.querySelectorAll('.tile'));
  function tocar(t) { t.classList.remove('is-playing'); void t.offsetWidth; t.classList.add('is-playing'); }
  if (tiles.length && !reduce) {
    if (window.matchMedia('(hover: hover)').matches) {
      tiles.forEach(function (t) {
        t.addEventListener('mouseenter', function () { t.classList.add('is-playing'); });
        t.addEventListener('mouseleave', function () { t.classList.remove('is-playing'); });
      });
    } else if (temIO) {
      var ioTile = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var t = e.target;
          clearTimeout(t._espera); clearInterval(t._repete);
          if (e.isIntersecting) {
            t._espera = setTimeout(function () { tocar(t); t._repete = setInterval(function () { tocar(t); }, 4500); }, 250);
          } else { t.classList.remove('is-playing'); }
        });
      }, { threshold: 0.6 });
      tiles.forEach(function (t) { ioTile.observe(t); });
    }
  }

  /* 4. FAQ: abre uma por vez, animando a altura medida do conteúdo */
  var faq = Array.prototype.slice.call(document.querySelectorAll('.faq__item'));
  function alternar(item, abrir) {
    var botao = item.querySelector('.faq__question'), painel = item.querySelector('.faq__answer');
    if (!botao || !painel) return;
    if ((botao.getAttribute('aria-expanded') === 'true') === abrir) return;
    botao.setAttribute('aria-expanded', String(abrir));
    if (reduce || !painel.animate) { painel.hidden = !abrir; return; }
    if (painel._anim) painel._anim.cancel();
    painel.hidden = false;
    var h = painel.scrollHeight;
    painel._anim = painel.animate(abrir ? [{ height: '0px' }, { height: h + 'px' }] : [{ height: h + 'px' }, { height: '0px' }], { duration: 380, easing: 'cubic-bezier(.2, 0, 0, 1)' });
    painel._anim.onfinish = function () { painel._anim = null; if (!abrir) painel.hidden = true; };
  }
  faq.forEach(function (item) {
    var botao = item.querySelector('.faq__question'), painel = item.querySelector('.faq__answer');
    if (!botao || !painel) return;
    painel.hidden = true;
    botao.addEventListener('click', function () {
      var abrir = botao.getAttribute('aria-expanded') !== 'true';
      if (abrir) faq.forEach(function (outro) { if (outro !== item) alternar(outro, false); });
      alternar(item, abrir);
    });
  });
})();
