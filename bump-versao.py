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

    # se rodar duas vezes no mesmo dia, adiciona um sufixo pra forcar mudanca
    versoes_atuais = set()
    for nome in PAGINAS:
        conteudo = io.open(raiz / nome, encoding="utf-8").read()
        versoes_atuais.update(re.findall(r'\?v=([^"]*)', conteudo))
    if versoes_atuais == {nova_versao}:
        nova_versao += "b"
        while versoes_atuais == {nova_versao}:
            nova_versao += "b"

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
