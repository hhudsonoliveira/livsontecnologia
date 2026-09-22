# Livson Tecnologia — site

Site estático (HTML/CSS/JS puro, sem build). Hospedado na Hostinger em
https://livsontecnologia.com.br

---

## ⚠️ REGRA MAIS IMPORTANTE: trocar a versão ao mexer em CSS ou JS

A Hostinger serve os arquivos CSS e JS com **cache de 7 dias**. Isso
significa que, se você alterar um desses arquivos e subir para o servidor
**sem trocar o número de versão**, o navegador do visitante vai continuar
rodando a **versão antiga** — a sua correção simplesmente não chega nele.

Por isso todo CSS/JS é referenciado assim nas páginas:

```html
<link rel="stylesheet" href="css/style.css?v=20260802" />
<script src="js/main.js?v=20260802" defer></script>
```

Esse `?v=...` é o que obriga o navegador a baixar de novo.

### Como fazer (1 comando)

Depois de alterar qualquer arquivo em `css/` ou `js/`:

```bash
python bump-versao.py
```

Ele troca a versão nas 5 páginas HTML de uma vez. Depois é só subir para a
Hostinger:

- as **5 páginas HTML** (sempre, porque a versão mudou nelas)
- os arquivos de `css/` ou `js/` que você alterou

> **Isso já causou problema real.** Em 02/08/2026 uma otimização de
> performance ficou horas sem efeito por causa disso: o servidor tinha o
> arquivo novo, mas os navegadores rodavam o antigo. A nota de desempenho
> no celular chegou a cair para 43 por causa disso.

---

## Como testar se a atualização realmente chegou

Não confie em abrir o site e olhar — o seu navegador também tem cache.
Para conferir de verdade, veja o que está sendo servido:

```bash
curl -s https://livsontecnologia.com.br/ | grep "scene.js"
```

A versão que aparecer ali (`?v=...`) tem que ser a nova.

---

## Estrutura

```
index.html                    página principal
livson-conecta.html           página do produto
diagnostico.html              formulário de diagnóstico (calcula receita perdida)
politica-de-privacidade.html  LGPD
termos-de-uso.html
css/style.css                 todo o estilo do site
js/main.js                    navegação, animações de scroll, preloader, troca de frase, FAQ
js/hero-3d.js                 cena 3D do hero (Spline) — só desktop com placa de vídeo, e só se configurada
js/diagnostico.js             lógica e cálculo do diagnóstico
.htaccess                     URLs sem .html + regras de cache
sitemap.xml / robots.txt      SEO
bump-versao.py                troca a versão dos CSS/JS (ver acima)
```

---

## As ilustrações isométricas (no lugar dos mockups)

Até 21/09/2026 o hero e a seção Soluções mostravam telas de produto
desenhadas em HTML/CSS (site, WhatsApp, CRM, painel) com nomes e números
fictícios. Mesmo com legenda, liam como "tela falsa". Saíram todas.

No lugar entrou **uma linguagem visual só**, usada no site inteiro:
placas em perspectiva isométrica — as camadas de um sistema. A mesma
pilha de 4 placas aparece no hero das duas páginas e nos 4 passos do
Conecta (com a placa do passo acesa); a seção Soluções da home tem três
variações (vitrine com anéis de alcance, três placas com um disco
passando, grade em cascata com painel).

- **São SVG inline, sem imagem.** O truque está no
  `<g transform="matrix(.866 .5 -.866 .5 0 0)">`: ele deita o desenho no
  chão isométrico, então o conteúdo de cada placa é escrito em
  coordenadas planas comuns (`<rect>`, `<circle>`) e aparece em
  perspectiva sozinho. Para mexer, edite os retângulos dentro desse grupo.
- **Cor é só token.** A mesma ilustração fica escura no hero e clara nas
  faixas claras sem regra extra. Não coloque cor fixa (`#...`) no SVG.
- **Movimento só na tela.** O `main.js` liga `.is-live` quando a
  ilustração aparece e desliga quando sai; parada, cada uma já mostra um
  quadro completo (é o que aparece com movimento reduzido).

**Quando houver print real do produto**, ele entra no lugar da
ilustração dentro do `<figure class="block__media">` (home) ou
`<figure class="passo__visual">` (Conecta) como `<img>` comum. Peça
autorização se for tela de cliente.

---

## A cena 3D do hero (Spline)

O hero sempre mostra a pilha isométrica em SVG. Por cima dela pode
entrar uma **cena 3D feita no Spline**, que o `js/hero-3d.js` carrega só
quando vale a pena: desktop, placa de vídeo de verdade, sem modo
economia de dados, sem "reduzir movimento", e depois da página pronta.
Se a cena rodar pesada nos primeiros quadros, ela é desmontada e o SVG
fica. No celular nunca é baixada.

**Hoje ela está desligada** (`data-spline=""`), porque cena do Spline é
feita no editor visual do Spline — não dá para gerar por código.

### Como ligar

1. Monte a cena no Spline seguindo o roteiro abaixo.
2. **Export → Code Export → Vanilla JS** e copie a URL que termina em
   `.splinecode`.
3. Cole em `data-spline="..."` no `<figure class="hero__anchor">` do
   `index.html` **e** do `livson-conecta.html`. Não precisa mexer em JS.
4. Não precisa rodar o `bump-versao.py` só por isso (o HTML não fica em
   cache), mas não custa.

### Roteiro da cena (para ela casar com o resto do site)

- **O objeto é a própria pilha do SVG:** 4 placas quadradas de cantos
  arredondados, empilhadas com um vão entre elas, a de cima com contorno
  de acento. Assim a troca SVG → 3D não parece outro site.
- **Agrupe as 4 placas num objeto chamado `Assinatura`.** O script gira
  esse objeto e o faz subir conforme o visitante rola o hero (inspirado
  na câmera da edolus.com). Sem esse nome a cena roda, só não reage ao
  scroll. Quem preferir animar dentro do Spline pode criar uma variável
  numérica `scroll` — o script manda o valor de 0 a 1.
- **Cores da paleta:** placas `#161d30` / `#111729`, bordas brancas bem
  finas e translúcidas, acento `#899cec`. Nada de neon, nada de arco-íris.
- **Fundo transparente** (o gradiente do hero fica atrás) e câmera numa
  vista próxima da isométrica do SVG. Deixe o objeto inteiro dentro do
  quadro, com folga — o canvas não é a tela toda, é o lado direito do hero.
- **Leve:** poucos polígonos, sem física, sem sons, arquivo `.splinecode`
  abaixo de ~1,5 MB.
- **Confira a marca d'água:** conforme o plano do Spline, a exportação
  pode incluir o selo "Built with Spline".

---

## Tipografia

- **Newsreader** (serifada, corte display): só títulos grandes (h1, h2,
  títulos de passo, tile, portfólio, manifesto, CTA).
- **Geist**: interface e texto corrido.
- **Geist Mono**: anotações — eyebrow, numeração, rótulos.

A serifada é carregada só nos pesos 300 a 500. Não peça `font-weight`
600/700 num título serifado: o navegador inventa um negrito falso.

---

## A foto do fundador é um recorte com corte reto (não dissolve)

`img/hudson-recorte.webp` (e a versão de 620px) foi gerada de
`img/DSC00714.JPG` com recorte por matte (rembg / U²-Net human-seg).

**A base tem corte reto, de propósito. Não tente dissolvê-la.** Isso já
foi tentado duas vezes e falhou nas duas:

1. Fade simples de alpha: o terno quase preto virando transparente
   produz um degradê cinza ocupando ~30% da altura da imagem. Em fundo
   escuro é invisível; em fundo claro é uma mancha.
2. Fade "inteligente", clareando o pixel na direção do fundo enquanto
   perde alpha: melhorou a média (desvio 87 → 44) mas **ficou pior aos
   olhos** — uma nuvem cinza suja mais que uma forma escura definida. A
   média é a métrica errada aqui; o que importa é a área afetada.

O que funciona é **justificar o corte**: o `::before` de
`.founder__media` desenha um painel (`--bg-1`, cantos arredondados) que
envolve a foto inteira, com a aresta de baixo rente à base dele — um
retrato emoldurado. Aí ela lê como enquadramento, não como mancha.

O `padding-top` de `.founder__media` é o que dá ar acima da cabeça. Sem
ele a cabeça encosta na borda do painel, porque o recorte começa
praticamente rente ao topo do crânio.

Números da versão atual: 7.389 pixels de meia-transparência (só a borda
antialiasada da silhueta) contra 164.000 da versão que dissolvia.

Outras regras:

- **Não adicione luz de recorte (rim light).** Ela existia quando a
  faixa do fundador era escura, para separar o terno preto do fundo.
  Sobre fundo claro vira halo esbranquiçado no contorno.
- **Não use `drop-shadow` na foto.** Ele segue o alpha, então a sombra
  reintroduz cinza justamente na borda de baixo.
- **Se trocar a altura do recorte, atualize `width`/`height` no
  `<img>`**, senão o navegador reserva a proporção errada e a página
  pula ao carregar.

O original sem recorte continua em `img/DSC00714.JPG`.

---

## Onde caem os formulários

O diagnóstico envia para o **Formspree** (`js/diagnostico.js`, constante
`FORM_ENDPOINT`). O e-mail que recebe as respostas é configurado no painel
do próprio Formspree, não no código.

---

## Detalhes que têm motivo de ser (não mexa sem saber)

- **`js/hero-3d.js` só roda em desktop com placa de vídeo.** Em celular ou
  em máquina sem aceleração de vídeo, qualquer cena 3D trava a página por
  vários segundos (aconteceu em 08/2026 com a cena Three.js que existia
  antes). Existe uma trava de segurança que mede o desempenho real e
  desmonta a cena sozinha se o aparelho não der conta.
- **A frase do título que troca sozinha** (home e Conecta) tem todas as
  frases no HTML, empilhadas: a largura da maior fica reservada e a linha
  nunca pula. Se trocar as frases, prefira todas curtas — a mais longa
  define o espaço de todas (no Conecta, "faz follow-up" jogava o verbo
  para uma linha sozinho; virou "lembra").
- **O preloader tem teto de 700ms** (`PRELOADER_MAX_MS` em `js/main.js`).
  Ele cobre a tela inteira, então tudo que ele fica visível conta como
  página lenta para o Google.
- **As fontes do Google carregam sem travar a renderização**
  (`rel="preload"` + troca no `onload`).
- **A barra de endereços nunca mostra `#`.** Os links de menu e rodapé
  continuam escritos com âncora no HTML (`href="#solucoes"`,
  `href="/livson-conecta#planos-conecta"`) — **não tire isso**: sem a
  âncora o link para de funcionar com JS desligado e o Google perde o mapa
  interno da página. Quem esconde o `#` é o `js/main.js`: ele intercepta o
  clique, rola por conta própria e reescreve a URL para o caminho limpo.
  Link para outra página leva o destino por `sessionStorage`, e link antigo
  com `#` colado ainda funciona (rola e limpa a URL). Duas armadilhas ali,
  se precisar mexer: `behavior: 'auto'` **não** é salto instantâneo —
  significa "usa o `scroll-behavior` do CSS", que aqui é `smooth`; para
  salto seco é `'instant'`. E o posicionamento de entrada reconfere algumas
  vezes, porque o ScrollTrigger mexe na rolagem para medir a página.
- **`diagnostico.html` é `noindex`** de propósito: a página é para ser
  acessada pelo link que você divulga, não pela busca do Google.
