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
<link rel="stylesheet" href="css/base.css?v=20261121" />
<script src="js/base.js?v=20261121" defer></script>
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
curl -s https://livsontecnologia.com.br/ | grep "home.js"
```

A versão que aparecer ali (`?v=...`) tem que ser a nova.

---

## Estrutura

```
index.html                    página principal
livson-conecta.html           página do produto
diagnostico.html              formulário de diagnóstico (resultado qualitativo)
politica-de-privacidade.html  LGPD
termos-de-uso.html
css/base.css                  comum a TODAS as páginas: cores, tipografia, botões, menu, rodapé
css/home.css                  só da home
css/conecta.css               só do Conecta
css/diagnostico.css           só do diagnóstico
css/legal.css                 só das páginas legais
js/base.js                    comum: ano do rodapé, menu do celular, âncora sem "#"
js/home.js                    home: cubo do hero, vitrine 3D, cards do portfólio
js/conecta.js                 Conecta: título que troca, ilustrações, casos de uso, FAQ
js/diagnostico.js             lógica do diagnóstico e envio ao Formspree
.htaccess                     URLs sem .html + regras de cache
sitemap.xml / robots.txt      SEO
bump-versao.py                troca a versão dos CSS/JS (ver acima)
```

Até 21/11/2026 existiam `css/style.css`, `js/main.js` e `js/hero-3d.js`
(identidade anterior). Saíram quando todas as páginas migraram; estão no
histórico do git se precisar consultar.

---

## A identidade (21/11/2026)

Feita a partir de um protótipo aprovado
(claude.ai/artifact/L1VRCdn6VrYhXmnR8hiYox), com o noomoagency.com como
referência de movimento — só o princípio, nada copiado deles.

- **Paleta petróleo e laranja:** fundo `#0F2B31`, superfície `#17383F`,
  texto suave `#9EB8BD`, texto forte `#EEF5F4`, destaque `#FF7A1A`.
  `--acc2` (verde-água) e `--ice` (vidro) são só de objetos 3D e
  ilustrações. Tudo em `css/base.css`.
- **Títulos em Archivo larga, caixa alta** (`font-stretch: 125%`), texto em
  Geist. Já foi testada a versão condensada em caixa normal e ela foi
  rejeitada.
- **A ideia da marca é "o ponto"**, o quadrado do logo. Na home, o cubo
  laranja gira entre as letras de "EM UM ▢ PONTO" e, ao rolar, vira o
  ponto final de "ACHAR ESSE PONTO É A NOSSA PRIMEIRA ENTREGA". No resto do
  site ele aparece como marcador: nas listas, no "ponto" de cada objeto
  3D, na opção escolhida do diagnóstico e no nível do resultado (1 a 3
  quadrados).
- **Logo sempre sólido** (L em texto forte + quadrado laranja), em SVG no
  próprio HTML. O PNG em gradiente ainda é usado no ícone da aba e na
  imagem de compartilhamento — falta trocar.
- **Zero emoji.** As opções do diagnóstico tinham; saíram.
- **Movimento reduzido ou sem WebGL:** nada se mexe e tudo fica legível
  parado.
- As gravações de tela usadas como referência (`Gravação de Tela *.mp4`)
  estão no `.gitignore` e **não vão para a Hostinger**.

### Home

- **Vitrine 3D** (`#solucoes`): seção presa na tela; cada palavra desce do
  topo, para e sai por baixo, e volta ao contrário quando se rola para
  cima. O Three.js (r128, cdnjs) só é baixado quando a vitrine está a uma
  tela e meia de distância. Trava de segurança: se o aparelho não der
  conta, o 3D baixa a resolução e, se ainda travar, desliga sozinho — as
  palavras continuam se movendo.
- **Objeto 3D nunca em branco chapado.** Foi testado e ficou com cara de
  massinha. O brilho vem de um "estúdio" desenhado em canvas que os
  objetos refletem.
- **Cards do portfólio** cruzam a tela com a rolagem. Os depoimentos têm o
  texto exato de cada cliente — não invente outros. Card de evento com
  data marcada (FIEX) fica sem data no texto, para não envelhecer.

### Conecta: as ilustrações isométricas

A pilha de 4 placas (os 4 módulos) aparece no hero e nos 4 passos, com a
placa do passo acesa e levantada. São **SVG inline**: o
`<g transform="matrix(.866 .5 -.866 .5 0 0)">` deita o desenho no chão
isométrico, então o conteúdo de cada placa é escrito em coordenadas planas
e aparece em perspectiva sozinho. **Cor só por token** (`css/conecta.css`,
variáveis `--iso-*`): placas em vidro verde-água, conteúdo em branco
translúcido, o ponto de cada placa em laranja. Não coloque cor fixa no SVG.
O `js/conecta.js` liga a flutuação (`.is-live`) só com a ilustração na
tela.

---

## A foto do fundador é um recorte com corte reto (não dissolve)

`img/hudson-recorte.webp` (e a versão de 620px) foi gerada de
`img/DSC00714.JPG` com recorte por matte (rembg / U²-Net human-seg).

**A base tem corte reto, de propósito. Não tente dissolvê-la.** Isso já
foi tentado duas vezes e falhou nas duas (degradê cinza no terno escuro).
O que funciona é **justificar o corte**: `.founder__media` é um painel
(superfície, cantos arredondados, `overflow: hidden`) que envolve a foto
inteira, com a aresta de baixo rente à base dela — um retrato emoldurado.
O `padding-top` dá ar acima da cabeça.

- **Não use `drop-shadow` na foto** (ele segue o alpha e reintroduz cinza
  na borda de baixo) nem luz de recorte.
- **Se trocar a altura do recorte, atualize `width`/`height` no `<img>`.**
- **`img { height: auto }` no CSS é obrigatório.** Sem ele a foto mantém a
  altura do atributo e estica (aconteceu em 21/11/2026).

O original sem recorte continua em `img/DSC00714.JPG`.

---

## Onde caem os formulários

O diagnóstico envia para o **Formspree** (`js/diagnostico.js`, constante
`FORM_ENDPOINT`). O e-mail que recebe as respostas é configurado no painel
do próprio Formspree, não no código. O resultado é calculado no navegador,
então aparece mesmo se o envio falhar.

---

## Detalhes que têm motivo de ser (não mexa sem saber)

- **A frase que troca no título do Conecta** tem as quatro palavras no
  HTML, empilhadas: a largura da maior fica reservada e a linha nunca pula.
  Prefira palavras curtas ("faz follow-up" jogava a palavra para uma linha
  sozinha; virou "lembra"). A troca é por máscara, nunca por fade.
- **As fontes do Google carregam sem travar a renderização**
  (`rel="preload"` + troca no `onload`).
- **A barra de endereços nunca mostra `#`.** Os links continuam escritos
  com âncora no HTML (`href="#solucoes"`, `href="/livson-conecta#planos-conecta"`)
  — **não tire isso**: sem a âncora o link para de funcionar com JS
  desligado e o Google perde o mapa interno. Quem esconde o `#` é o
  `js/base.js`: intercepta o clique, rola e reescreve a URL. Link para
  outra página leva o destino pelo `sessionStorage` (chave
  `livson:ancora`). Armadilha: `behavior: 'auto'` **não** é salto
  instantâneo, é "usa o `scroll-behavior` do CSS" (que é `smooth`); salto
  seco é `'instant'`.
- **`diagnostico.html` é `noindex`** de propósito: a página é para ser
  acessada pelo link que você divulga, não pela busca do Google.
