/* =========================================================
   LIVSON TECNOLOGIA — Interactions & GSAP choreography
   Motion personality: Corporate/Premium
     signature easing: power3.out  (≈ cubic-bezier(.2,0,0,1))
     durations: quick .3 / standard .6 / slow .8
     stagger: 0.08s  (total < 500ms per group)

   Tempos medidos nas referencias (2026-09-21) e o que foi usado:
     - allia (Webflow IX2): outCubic 500ms na maioria -> o reveal
       daqui fica em .9s power3.out, um pouco mais lento e sem pulo.
     - edolus (PlayCanvas): camera com amortecimento .06–.1 por quadro
       e transicoes de 1.2s power2.inOut -> "Hero: camadas" usa scrub
       .8 (amortecido) e a cena Spline, lerp .08.
     - melius: troca de frase em easeInOutCubic (.65,0,.35,1) ->
       "Troca de frase" usa power3.inOut .75s.
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

  /* ---------- Mascara do titulo ----------
     Divide uma linha do <h1> em "janelas" que recortam o texto. Cada
     pedaco vira <span class="w"><span class="w__in">palavra</span></span>:
     a de fora recorta, a de dentro e o que a timeline move.

     Duas regras que importam:
     - o <span class="grad"> entra INTEIRO como um pedaco so. Se as duas
       palavras dele virassem pedacos separados, cada uma ganharia uma
       rampa de gradiente completa em vez de uma rampa atravessando as
       duas.
     - pontuacao solta ("." depois do gradiente) e grudada no pedaco
       anterior, senao o ponto final sobe sozinho, atrasado. */
  function mascararLinha(linha, porPalavra) {
    const frag = document.createDocumentFragment();
    const moveis = [];
    let ultimaJanela = null;

    const janela = (conteudo) => {
      const fora = document.createElement('span');
      fora.className = 'w';
      const dentro = document.createElement('span');
      dentro.className = 'w__in';
      if (typeof conteudo === 'string') dentro.textContent = conteudo;
      else dentro.appendChild(conteudo);
      fora.appendChild(dentro);
      moveis.push(dentro);
      ultimaJanela = dentro;
      return fora;
    };

    if (!porPalavra) {
      // linha inteira dentro de uma janela so
      const dentro = document.createDocumentFragment();
      while (linha.firstChild) dentro.appendChild(linha.firstChild);
      const fora = document.createElement('span');
      fora.className = 'w';
      const alvo = document.createElement('span');
      alvo.className = 'w__in';
      alvo.appendChild(dentro);
      fora.appendChild(alvo);
      linha.appendChild(fora);
      return [alvo];
    }

    Array.prototype.slice.call(linha.childNodes).forEach((no) => {
      if (no.nodeType === 3) {
        no.textContent.split(/(\s+)/).forEach((parte) => {
          if (!parte) return;
          if (/^\s+$/.test(parte)) { frag.appendChild(document.createTextNode(' ')); return; }
          if (/^[.,;:!?)\]]+$/.test(parte) && ultimaJanela) {
            ultimaJanela.appendChild(document.createTextNode(parte));
            return;
          }
          frag.appendChild(janela(parte));
        });
      } else {
        frag.appendChild(janela(no));
      }
    });

    while (linha.firstChild) linha.removeChild(linha.firstChild);
    linha.appendChild(frag);
    return moveis;
  }

  /* ---------- Hero intro (staggered entrance) ---------- */
  function startHeroIntro() {
    const lines = document.querySelectorAll('.hero__title .reveal-line');
    const heroReveals = document.querySelectorAll('.hero .reveal');

    if (prefersReduced || !hasGSAP) {
      // sem GSAP ou com movimento reduzido: tudo aparece parado, e a
      // troca de frase nao roda (fica a primeira, que e a do HTML)
      lines.forEach((l) => (l.style.opacity = 1));
      heroReveals.forEach((b) => b.classList.add('is-in'));
      return;
    }

    // Neutralise the CSS `.reveal { opacity:0 }` so gsap tweens to a visible end.
    gsap.set(lines, { opacity: 1 });

    // O titulo so e dividido em palavras aqui dentro, depois de checar
    // GSAP e movimento reduzido: se qualquer um dos dois falhar, o HTML
    // original continua intacto na tela.
    const titulo = document.querySelector('.hero__title');
    const alvos = [];
    lines.forEach((linha) => {
      // linha 1 sobe inteira (e o preparo); linha 2, palavra a palavra
      const porPalavra = !linha.classList.contains('hero__line-1');
      alvos.push.apply(alvos, mascararLinha(linha, porPalavra));
    });
    titulo && titulo.classList.add('is-revealing');

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: () => {
        titulo && titulo.classList.remove('is-revealing');
        // a troca de frase so comeca depois que o titulo terminou de
        // subir: duas mascaras mexendo ao mesmo tempo viram ruido
        document.querySelectorAll('[data-rotator]').forEach(iniciarRotativo);
      },
    });
    tl.fromTo('.hero__badge', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 })
      // Sem opacidade de proposito: quem revela e a mascara. Misturar os
      // dois devolve o fade generico que estamos tirando.
      .fromTo(alvos,
        { yPercent: 118 },
        { yPercent: 0, duration: 0.78, stagger: 0.038, ease: 'power3.out' }, '-=0.25')
      .fromTo('.hero__sub', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, '-=0.55')
      .fromTo('.hero__actions', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, '-=0.5')
      .fromTo('.hero__trust, .hero__company', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.5')
      // A ancora visual entra por ultimo e de baixo: o texto le primeiro,
      // a ilustracao confirma. Sem isso ela ficaria em opacity:0,
      // porque .reveal zera tudo e so a timeline devolve.
      .fromTo('.hero__anchor', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, '-=0.75');
  }

  /* ---------- Troca de frase no titulo (referencia: melius.com) ----------
     As frases ja estao todas no HTML, empilhadas na mesma celula de grid
     (ver .rotator no CSS) — a largura da maior esta reservada desde o
     primeiro quadro, entao nada aqui mede ou redimensiona coisa alguma.
     O JS so faz a troca: a atual sai por cima da aresta, a proxima entra
     por baixo. Mascara, sem opacidade, igual ao reveal do titulo.

     Para quando o hero sai da tela (IntersectionObserver). Aba em segundo
     plano o proprio GSAP ja pausa, porque o relogio dele e o rAF. */
  const ROTATIVO_PAUSA = 2.6;   // s parado em cada frase
  const ROTATIVO_TROCA = 0.75;  // s de troca

  function iniciarRotativo(el) {
    const itens = Array.prototype.slice.call(el.querySelectorAll('.rotator__item'));
    if (itens.length < 2 || !hasGSAP || prefersReduced) return;

    let atual = Math.max(0, itens.findIndex((i) => i.classList.contains('is-active')));
    let espera = null;

    const trocar = () => {
      const sai = itens[atual];
      atual = (atual + 1) % itens.length;
      const entra = itens[atual];
      entra.classList.add('is-active');
      el.classList.add('is-rolling');
      gsap.timeline({
        defaults: { duration: ROTATIVO_TROCA, ease: 'power3.inOut' },
        onComplete: () => {
          sai.classList.remove('is-active');
          el.classList.remove('is-rolling');
        },
      })
        .fromTo(sai, { yPercent: 0 }, { yPercent: -115 }, 0)
        .fromTo(entra, { yPercent: 115 }, { yPercent: 0 }, 0.06);
    };

    const agendar = () => {
      espera = gsap.delayedCall(ROTATIVO_PAUSA, () => { trocar(); agendar(); });
    };
    const ligar = () => { if (!espera) agendar(); };
    const desligar = () => { if (espera) { espera.kill(); espera = null; } };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entradas) => {
        entradas[0].isIntersecting ? ligar() : desligar();
      }).observe(el);
    } else {
      ligar();
    }
  }

  /* ---------- Scroll reveals ----------
     Em lote (ScrollTrigger.batch): o que entra na tela junto sobe junto,
     com 80ms entre um e outro. Antes cada elemento tinha o proprio gatilho
     e uma grade de 4 itens subia como 4 eventos soltos. Timing sobrio de
     proposito — 28px e .9s, nada de escala, nada de rotacao. */
  const reveals = Array.from(document.querySelectorAll('.reveal')).filter(
    (el) => !el.closest('.hero')
  );

  if (prefersReduced) {
    reveals.forEach((el) => el.classList.add('is-in'));
  } else if (hasGSAP && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    ScrollTrigger.batch(reveals, {
      start: 'top 88%',
      once: true,
      onEnter: (lote) => {
        lote.forEach((el) => el.classList.add('is-in'));
        gsap.fromTo(lote,
          { y: 28, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.08, overwrite: true });
      },
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

  /* ---------- Navegacao por ancora sem "#" na barra de enderecos ----------
     Os <a> continuam com href="#secao" no HTML: sem isso o link nao
     funciona com JS desligado, e o Google perde o mapa interno da pagina.
     O que muda e o que acontece DEPOIS do clique — a gente rola por conta
     propria e reescreve a URL para o caminho limpo, entao o visitante ve
     livsontecnologia.com.br e nunca livsontecnologia.com.br/#solucoes.

     Sao tres caminhos, e todos terminam com a URL limpa:
       1. link para uma secao da MESMA pagina -> rola aqui e limpa a URL;
       2. link para uma secao de OUTRA pagina -> guarda o destino em
          sessionStorage e navega para o caminho sem "#", para o hash nao
          chegar a aparecer nem durante o carregamento;
       3. alguem abriu um link antigo com "#" colado -> rola ate a secao e
          troca a URL pela versao limpa. */
  const CHAVE_ANCORA = 'livson:ancora';

  const caminhoLimpo = (p) => (p || '/').replace(/index\.html$/, '') || '/';
  const urlLimpaAtual = () => caminhoLimpo(location.pathname) + location.search;

  const alturaNav = () => (nav && nav.offsetHeight ? nav.offsetHeight : 0);

  // ATENCAO ao terceiro estado do behavior: "auto" NAO quer dizer "salto
  // instantaneo" — quer dizer "use o scroll-behavior do CSS", e o nosso CSS
  // diz smooth (html { scroll-behavior: smooth }). Quem precisa de salto
  // seco tem que pedir "instant" com todas as letras. Com "auto" o
  // posicionamento de entrada virava uma animacao longa que o refresh do
  // ScrollTrigger cancelava no meio, e a pagina ficava parada no topo.
  const posicaoDe = (id) => {
    // "#hero" e o topo da pagina: rolar ate o elemento deixaria uma sobra
    // de alguns pixels acima dele, e o topo tem que ser topo mesmo.
    if (id === 'hero') return 0;
    const alvo = document.getElementById(id);
    if (!alvo) return null;
    return Math.max(0, alvo.getBoundingClientRect().top + window.scrollY - alturaNav() - 12);
  };

  function irPara(id, suave) {
    const y = posicaoDe(id);
    if (y === null) return false;
    window.scrollTo({ top: y, behavior: suave && !prefersReduced ? 'smooth' : 'instant' });
    return true;
  }

  document.addEventListener('click', (e) => {
    // Deixa passar o que o visitante pediu de proposito: nova aba, download,
    // clique do meio. Interceptar isso quebraria expectativa do navegador.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    if (a.origin !== location.origin) return;

    const id = (a.hash || '').slice(1);
    if (!id) return;

    if (caminhoLimpo(a.pathname) === caminhoLimpo(location.pathname)) {
      if (!irPara(id, true)) return;      // secao inexistente: deixa o navegador tentar
      e.preventDefault();
      history.replaceState(null, '', urlLimpaAtual());
      return;
    }

    // Outra pagina: o destino viaja pelo sessionStorage, nao pela URL.
    e.preventDefault();
    try { sessionStorage.setItem(CHAVE_ANCORA, id); } catch (err) { /* modo privado */ }
    location.href = caminhoLimpo(a.pathname) + a.search;
  });

  (function ancoraDeEntrada() {
    let id = '';
    try {
      id = sessionStorage.getItem(CHAVE_ANCORA) || '';
      sessionStorage.removeItem(CHAVE_ANCORA);
    } catch (err) { /* modo privado */ }

    const veioNoHash = !id && location.hash.length > 1;
    if (veioNoHash) id = location.hash.slice(1);
    if (!id) return;

    // Salto seco, sem "smooth": numa pagina que acabou de abrir, a rolagem
    // animada disputa com a intro do hero e o visitante ve a tela deslizando
    // sozinha antes de conseguir ler qualquer coisa.
    //
    // E repetido algumas vezes de proposito. Nos primeiros segundos a pagina
    // ainda esta mudando de altura (fontes, imagens preguicosas) e o
    // ScrollTrigger faz os proprios refreshes, que mexem na rolagem para
    // medir. Uma tentativa unica cai no lugar errado ou e desfeita; entao a
    // gente reconfere ate a posicao bater e para assim que bater.
    let tentativas = 0;
    let assumiuOControle = false;
    const desistir = () => { assumiuOControle = true; };
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) =>
      window.addEventListener(ev, desistir, { once: true, passive: true }));

    const posicionar = () => {
      // Se o visitante ja comecou a rolar por conta propria, a posicao passa
      // a ser dele. Continuar corrigindo aqui seria arrancar a pagina da mao
      // de quem esta lendo.
      if (assumiuOControle) return true;
      const y = posicaoDe(id);
      if (y === null) return true;                       // secao sumiu: desiste
      if (Math.abs(window.scrollY - y) < 4) return true;  // ja esta no lugar
      window.scrollTo({ top: y, behavior: 'instant' });
      return ++tentativas >= 12;
    };

    const reconferir = () => {
      if (posicionar()) {
        ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) =>
          window.removeEventListener(ev, desistir));
        return;
      }
      setTimeout(reconferir, 120);
    };
    requestAnimationFrame(reconferir);

    if (veioNoHash) history.replaceState(null, '', urlLimpaAtual());
  })();

  /* ---------- Ilustracoes isometricas: so animam na tela ----------
     Cada <svg class="iso"> ganha .is-live enquanto esta visivel (o CSS so
     aplica animacao com essa classe) e perde quando sai. As que usam SMIL
     (o disco que percorre as placas) tambem pausam o relogio proprio do
     SVG. Com movimento reduzido nada liga: fica o quadro parado. */
  const isos = Array.prototype.slice.call(document.querySelectorAll('svg.iso'));
  const pausarSmil = (svg) => { try { svg.pauseAnimations(); } catch (e) { /* sem SMIL */ } };
  const tocarSmil = (svg) => { try { svg.unpauseAnimations(); } catch (e) { /* sem SMIL */ } };

  isos.forEach(pausarSmil);
  if (!prefersReduced && 'IntersectionObserver' in window) {
    const ioIso = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        e.target.classList.toggle('is-live', e.isIntersecting);
        e.isIntersecting ? tocarSmil(e.target) : pausarSmil(e.target);
      });
    }, { rootMargin: '80px 0px' });
    isos.forEach((svg) => ioIso.observe(svg));
  }

  /* ---------- Hero: camadas reagindo ao scroll (referencia: edolus.com) ----------
     Na edolus a camera anda conforme o scroll, com amortecimento. Aqui a
     versao leve disso no SVG: enquanto o hero sai da tela, as placas da
     pilha se afastam umas das outras (vista explodida) e a pilha sobe um
     pouco mais devagar que a pagina. scrub .8 = o amortecimento.
     So desktop: no celular o hero e estatico, como pedido. Quando a cena
     Spline carrega, o SVG some e quem reage ao scroll e o hero-3d.js. */
  if (hasGSAP && window.ScrollTrigger && !prefersReduced &&
      window.matchMedia('(min-width: 1081px)').matches) {
    const pilhaHero = document.querySelector('.hero__anchor .iso');
    const camadas = pilhaHero ? pilhaHero.querySelectorAll('.iso__layer') : [];
    if (camadas.length) {
      gsap.timeline({
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.8 },
      })
        .to(camadas, { y: (i) => -i * 30, ease: 'none' }, 0)
        .to(pilhaHero, { yPercent: -10, ease: 'none' }, 0);
    }
  }

  /* ---------- Casos de uso: preview dos tiles ----------
     Uma classe so (.is-playing) dispara a animacao nos dois mundos:
     - mouse: liga ao entrar no tile, desliga ao sair (tirar e por a
       classe reinicia a animacao do zero a cada passada);
     - toque: liga quando o tile esta bem visivel na tela.
     Movimento reduzido: nunca liga — o tile mostra o quadro final. */
  const tiles = document.querySelectorAll('.tile');
  if (tiles.length && !prefersReduced) {
    if (window.matchMedia('(hover: hover)').matches) {
      tiles.forEach((t) => {
        t.addEventListener('mouseenter', () => t.classList.add('is-playing'));
        t.addEventListener('mouseleave', () => t.classList.remove('is-playing'));
      });
    } else if ('IntersectionObserver' in window) {
      const ioTile = new IntersectionObserver((entradas) => {
        entradas.forEach((e) => e.target.classList.toggle('is-playing', e.isIntersecting));
      }, { threshold: 0.6 });
      tiles.forEach((t) => ioTile.observe(t));
    }
  }

  /* ---------- FAQ (Livson Conecta) — acordeao WAI-ARIA ----------
     Sem JS as respostas ficam abertas (conteudo nunca preso). Aqui elas
     fecham e a abertura anima a ALTURA MEDIDA do conteudo — o limite fixo
     de 260px que existia antes cortava resposta longa no celular. Abre
     uma por vez, como antes. */
  const faqItens = Array.prototype.slice.call(document.querySelectorAll('.faq__item'));

  function alternarFaq(item, abrir) {
    const botao = item.querySelector('.faq__question');
    const painel = item.querySelector('.faq__answer');
    if (!botao || !painel) return;
    if ((botao.getAttribute('aria-expanded') === 'true') === abrir) return;
    botao.setAttribute('aria-expanded', String(abrir));

    if (prefersReduced || !painel.animate) {
      painel.hidden = !abrir;
      return;
    }
    if (painel._anim) painel._anim.cancel();
    painel.hidden = false;
    const altura = painel.scrollHeight;
    const quadros = abrir ? [{ height: '0px' }, { height: altura + 'px' }]
                          : [{ height: altura + 'px' }, { height: '0px' }];
    painel._anim = painel.animate(quadros, { duration: 380, easing: 'cubic-bezier(.2, 0, 0, 1)' });
    painel._anim.onfinish = () => {
      painel._anim = null;
      if (!abrir) painel.hidden = true;
    };
  }

  faqItens.forEach((item) => {
    const botao = item.querySelector('.faq__question');
    const painel = item.querySelector('.faq__answer');
    if (!botao || !painel) return;
    painel.hidden = true;
    botao.addEventListener('click', () => {
      const abrir = botao.getAttribute('aria-expanded') !== 'true';
      if (abrir) faqItens.forEach((outro) => { if (outro !== item) alternarFaq(outro, false); });
      alternarFaq(item, abrir);
    });
  });
})();
