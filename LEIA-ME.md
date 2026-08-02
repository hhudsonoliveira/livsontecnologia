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
