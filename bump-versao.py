#!/usr/bin/env python3
"""
Troca o numero de versao (?v=...) de todos os CSS/JS nas paginas HTML.

POR QUE ISSO EXISTE
-------------------
A Hostinger serve CSS e JS com cache de 7 dias. Sem trocar o ?v=, o
navegador do visitante continua rodando o arquivo ANTIGO mesmo depois
de voce subir o novo. Ja aconteceu (2026-08-02) e custou horas.

COMO USAR
---------
    python bump-versao.py

Depois suba as 5 paginas HTML + os arquivos que voce alterou.
"""

import io
import re
import sys
from datetime import date
from pathlib import Path

PAGINAS = [
    "index.html",
    "livson-conecta.html",
    "diagnostico.html",
    "politica-de-privacidade.html",
    "termos-de-uso.html",
]

# pega href/src de css/js locais, com ou sem ?v= existente
PADRAO = re.compile(r'(href|src)="((?:css|js)/[^"?]+\.(?:css|js))(\?v=[^"]*)?"')


def main():
    raiz = Path(__file__).resolve().parent
    nova_versao = date.today().strftime("%Y%m%d")

    # Se rodar mais de uma vez no mesmo dia, precisa AVANCAR o sufixo.
    #
    # A versao anterior deste trecho comparava `versoes_atuais == {nova_versao}`.
    # Isso voltava atras: estando tudo em "20260824b", o conjunto era
    # {"20260824b"}, diferente de {"20260824"}, entao o script gerava
    # "20260824" de novo — uma versao que o navegador do visitante ja podia
    # ter em cache daquele mesmo dia. Ou seja, reintroduzia exatamente o bug
    # que este arquivo existe para evitar.
    #
    # Agora a escolha e monotonica: pega o maior sufixo ja usado hoje e soma 1.
    # Sufixo 0 = "", 1 = "b", 2 = "c", ... (mantem a convencao que ja estava no ar)
    versoes_atuais = set()
    for nome in PAGINAS:
        conteudo = io.open(raiz / nome, encoding="utf-8").read()
        versoes_atuais.update(re.findall(r'\?v=([^"]*)', conteudo))

    def indice_do_sufixo(versao, base):
        """"20260824" -> 0 ; "20260824b" -> 1 ; "20260824c" -> 2 ; senao None"""
        if not versao.startswith(base):
            return None
        resto = versao[len(base):]
        if resto == "":
            return 0
        if len(resto) == 1 and "b" <= resto <= "z":
            return ord(resto) - ord("b") + 1
        return None

    usados = [i for i in (indice_do_sufixo(v, nova_versao) for v in versoes_atuais)
              if i is not None]
    if usados:
        proximo = max(usados) + 1
        nova_versao += chr(ord("b") + proximo - 1) if proximo else ""

    total = 0
    for nome in PAGINAS:
        caminho = raiz / nome
        if not caminho.exists():
            print("  !! nao encontrado:", nome)
            continue
        conteudo = io.open(caminho, encoding="utf-8").read()
        novo, n = PADRAO.subn(
            lambda m: '%s="%s?v=%s"' % (m.group(1), m.group(2), nova_versao), conteudo
        )
        io.open(caminho, "w", encoding="utf-8", newline="").write(novo)
        print("  %-32s %d arquivos versionados" % (nome, n))
        total += n

    print()
    print("Nova versao: ?v=%s  (%d referencias atualizadas)" % (nova_versao, total))
    print("Agora suba as 5 paginas HTML + os arquivos alterados para a Hostinger.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
