/* =========================================================
   LIVSON TECNOLOGIA — base de todas as páginas
   1. ano do rodapé
   2. menu do celular
   3. navegação por âncora sem "#" na barra de endereços

   Sobre o 3: os <a> continuam com href="#secao" no HTML (sem isso o link
   não funciona com JS desligado e o Google perde o mapa interno). O que
   muda é o depois do clique:
     - seção da MESMA página: rola aqui e limpa a URL;
     - seção de OUTRA página: guarda o destino no sessionStorage e navega
       para o caminho sem "#";
     - link antigo com "#" colado: rola até a seção e limpa a URL.
   A chave 'livson:ancora' é a mesma do js/main.js antigo: não troque, ou
   links já abertos em outras abas param de cair na seção certa.
   ========================================================= */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1. ano */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* 2. menu */
  var nav = document.getElementById('nav'), toggle = document.getElementById('navToggle');
  if (nav && toggle) {
    function fechar() { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); toggle.textContent = 'Menu'; }
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? 'Fechar' : 'Menu';
    });
    nav.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.nav__links a')) fechar(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { fechar(); toggle.focus(); } });
  }

  /* 3. âncora sem "#" */
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
      if (y === null || (Math.abs(window.scrollY - y) < 4 && tentativas > 2)) return;
      window.scrollTo({ top: y, behavior: 'instant' });
      if (++tentativas < 12) setTimeout(reconferir, 120);
    })();
    if (veioNoHash) history.replaceState(null, '', urlLimpaAtual());
  })();
})();
