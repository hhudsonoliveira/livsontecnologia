/* =========================================================
   LIVSON TECNOLOGIA — Hero 3D (cena Spline)
   Referencia: edolus.com — cena 3D no hero com a camera reagindo ao
   scroll. (A edolus e feita em PlayCanvas, com ~2 MB de cena e scroll
   sequestrado; aqui fica so o principio: um objeto 3D que responde ao
   scroll com amortecimento, sem prender a rolagem da pagina.)

   Substitui o js/scene.js (rede de particulas em Three.js). As duas
   abordagens NAO convivem: esta pagina so carrega Spline.

   COMO FUNCIONA
   A ancora do hero (.hero__anchor) sempre tem a ilustracao isometrica
   em SVG. Este arquivo so troca o SVG pela cena 3D quando TUDO abaixo
   for verdade — senao nao baixa nem um byte do Spline:
     1. data-spline tem a URL de uma cena (.splinecode);
     2. tela de desktop (>= 1081px — abaixo disso o hero e estatico);
     3. sem "reduzir movimento" no sistema;
     4. sem modo economia de dados / conexao 2G;
     5. aparelho com folga (>= 4 GB de memoria e 4 nucleos, quando o
        navegador informa);
     6. WebGL com placa de video DE VERDADE (sem rasterizador por
        software — foi o que travou a pagina por segundos em 2026-08).
   Mesmo passando, o download so comeca depois da pagina carregada e
   ociosa, e uma trava mede os primeiros quadros: se a cena rodar
   pesada, ela e desmontada e o SVG continua no lugar.

   COMO LIGAR
   No Spline: Export > Code Export > Vanilla JS. Copie a URL que
   termina em .splinecode e cole em data-spline="" no index.html e no
   livson-conecta.html. O que a cena precisa ter esta no LEIA-ME.md.
   ========================================================= */

const RUNTIME = 'https://cdn.jsdelivr.net/npm/@splinetool/runtime@2.0.55/build/runtime.js';

// Nome do objeto que gira com o scroll. Se a cena nao tiver um objeto
// com esse nome, ela roda do mesmo jeito — so sem reagir ao scroll.
const OBJETO = 'Assinatura';

// Quanto o objeto gira/sobe do topo ao fim do hero (radianos / unidades
// do Spline) e o amortecimento por quadro (edolus usa .06 a .1).
const GIRO_Y = 0.9;
const GIRO_X = 0.22;
const SUBIDA = 70;
const AMORTECIMENTO = 0.08;

// Trava de desempenho: depois de 4 quadros de aquecimento, mede 24.
// Media acima de 45ms por quadro (~22fps) = o aparelho nao da conta.
const AQUECIMENTO = 4;
const AMOSTRA = 24;
const LIMITE_MS = 45;

const ancora = document.querySelector('.hero__anchor[data-spline]');
const cena = ancora ? (ancora.getAttribute('data-spline') || '').trim() : '';

if (cena && podeRodar()) quandoOciosa(iniciar);

function podeRodar() {
  if (window.innerWidth < 1081) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const rede = navigator.connection;
  if (rede && (rede.saveData || /(^|-)2g$/.test(rede.effectiveType || ''))) return false;
  if (navigator.deviceMemory && navigator.deviceMemory < 4) return false;
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return false;
  return temPlacaDeVideo();
}

/* Sem GPU real (VM, PC antigo, GPU bloqueada, robos de auditoria como o
   PageSpeed) o WebGL cai em rasterizacao por software e qualquer cena 3D
   trava a pagina. O contexto de teste e descartado logo em seguida. */
function temPlacaDeVideo() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const placa = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
    const perda = gl.getExtension('WEBGL_lose_context');
    if (perda) perda.loseContext();
    // sem como saber o nome da placa: deixa tentar — a trava de quadros
    // em iniciar() desmonta a cena se ela vier pesada
    return !/swiftshader|llvmpipe|software|basic render|microsoft basic/i.test(placa);
  } catch (e) {
    return false;
  }
}

function quandoOciosa(fn) {
  const depois = () => {
    if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 3000 });
    else setTimeout(fn, 1200);
  };
  if (document.readyState === 'complete') depois();
  else window.addEventListener('load', depois, { once: true });
}

async function iniciar() {
  let Application;
  try {
    ({ Application } = await import(RUNTIME));
  } catch (e) {
    return; // CDN fora do ar: fica o SVG
  }

  const palco = document.createElement('div');
  palco.className = 'hero__spline';
  const canvas = document.createElement('canvas');
  palco.appendChild(canvas);
  ancora.appendChild(palco);

  const app = new Application(canvas);
  const desmontar = () => {
    try { app.dispose(); } catch (e) { /* melhor esforco */ }
    palco.remove();
    ancora.classList.remove('is-3d');
  };

  try {
    await app.load(cena);
  } catch (e) {
    desmontar();
    return;
  }
  try { app.setBackgroundColor('transparent'); } catch (e) { /* cena ja transparente */ }

  if (!(await quadrosEmDia())) {
    desmontar();
    return;
  }

  // so agora o SVG sai (transicao de opacidade no CSS)
  ancora.classList.add('is-3d');

  /* ----- scroll -> objeto, com amortecimento ----- */
  const hero = ancora.closest('.hero') || document.body;
  const obj = app.findObjectByName(OBJETO);
  const base = obj ? { ry: obj.rotation.y, rx: obj.rotation.x, py: obj.position.y } : null;
  // variavel "scroll" (0 a 1) para quem preferir animar dentro do Spline
  let temVariavel = false;
  try { temVariavel = 'scroll' in (app.getVariables() || {}); } catch (e) { /* sem variaveis */ }

  let alvo = 0;
  let atual = 0;
  let rodando = false;

  const lerScroll = () => {
    const altura = hero.offsetHeight || window.innerHeight;
    alvo = Math.min(1, Math.max(0, window.scrollY / altura));
  };
  window.addEventListener('scroll', lerScroll, { passive: true });
  lerScroll();

  const quadro = () => {
    if (!rodando) return;
    atual += (alvo - atual) * AMORTECIMENTO;
    if (obj) {
      obj.rotation.y = base.ry + atual * GIRO_Y;
      obj.rotation.x = base.rx + atual * GIRO_X;
      obj.position.y = base.py + atual * SUBIDA;
    }
    if (temVariavel) app.setVariable('scroll', Math.round(atual * 1000) / 1000);
    requestAnimationFrame(quadro);
  };

  /* ----- so renderiza com o hero na tela e a aba visivel ----- */
  let heroVisivel = true;
  const ligar = () => {
    if (rodando || !heroVisivel || document.hidden) return;
    rodando = true;
    app.play();
    requestAnimationFrame(quadro);
  };
  const desligar = () => {
    if (!rodando) return;
    rodando = false;
    app.stop();
  };
  new IntersectionObserver((entradas) => {
    heroVisivel = entradas[0].isIntersecting;
    heroVisivel ? ligar() : desligar();
  }).observe(hero);
  document.addEventListener('visibilitychange', () => (document.hidden ? desligar() : ligar()));
  ligar();
}

/* Mede o intervalo REAL entre quadros entregues pelo navegador (o custo
   de GPU e assincrono e nao aparece medindo dentro do render). */
function quadrosEmDia() {
  return new Promise((resolve) => {
    let n = 0;
    let inicio = 0;
    const passo = (agora) => {
      n++;
      if (n === AQUECIMENTO) inicio = agora;
      if (n === AQUECIMENTO + AMOSTRA) {
        resolve((agora - inicio) / AMOSTRA <= LIMITE_MS);
        return;
      }
      requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  });
}
