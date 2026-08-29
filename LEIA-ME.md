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
js/main.js                    navegação, animações de scroll, preloader
js/scene.js                   fundo 3D (Three.js) — só em desktop com placa de vídeo
js/diagnostico.js             lógica e cálculo do diagnóstico
.htaccess                     URLs sem .html + regras de cache
sitemap.xml / robots.txt      SEO
bump-versao.py                troca a versão dos CSS/JS (ver acima)
```

---

## Os mockups de produto do index (telas em HTML/CSS)

O hero e a seção de Soluções mostram **telas do produto renderizadas em
código** — nenhuma imagem envolvida. São quatro: um site/landing, uma
conversa de WhatsApp com o vendedor IA, o pipeline do CRM e o painel de
resultado. As regras ficam em `css/style.css`, no bloco
`MOCKUPS DE PRODUTO`.

Cada mockup é um `<figure class="mock">` isolado, com esta anatomia:

```html
<figure class="mock mock--browser">
  <div class="mock__frame">
    <div class="mock__chrome">...barra do navegador...</div>
    <div class="mock__screen scr-site">...a tela...</div>
  </div>
  <figcaption class="mock__cap">Exemplo de tela — dados fictícios</figcaption>
</figure>
```

**Para trocar por um print real** basta substituir o miolo de
`.mock__screen` por `<img src="..." alt="" />`. O frame, a sombra, a
legenda e o responsivo continuam funcionando sem tocar em mais nada.

Dois detalhes que têm motivo de ser:

- **Os dados são fictícios de propósito** (Clínica Vitalis, Ateliê Bela
  Casa, os nomes nos cards). A legenda "Exemplo de tela — dados
  fictícios" existe para que nenhum número dentro do mockup seja lido
  como resultado real de cliente. Se um dia trocar por print de cliente
  real, peça autorização e ajuste a legenda.
- **A escala usa container queries** (`cqi`), não `vw`. Por isso o
  mockup encolhe inteiro junto com a coluna, em vez de virar texto
  minúsculo dentro de caixa grande. O `@supports` logo acima garante um
  tamanho fixo em navegador que não suporte.

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

- **`js/scene.js` só roda em desktop com placa de vídeo.** Em celular ou
  em máquina sem aceleração de vídeo, a cena 3D trava a página por vários
  segundos. Existe uma trava de segurança que mede o desempenho real e
  desmonta a cena sozinha se o aparelho não der conta.
- **O preloader tem teto de 700ms** (`PRELOADER_MAX_MS` em `js/main.js`).
  Ele cobre a tela inteira, então tudo que ele fica visível conta como
  página lenta para o Google.
- **As fontes do Google carregam sem travar a renderização**
  (`rel="preload"` + troca no `onload`).
- **`diagnostico.html` é `noindex`** de propósito: a página é para ser
  acessada pelo link que você divulga, não pela busca do Google.
