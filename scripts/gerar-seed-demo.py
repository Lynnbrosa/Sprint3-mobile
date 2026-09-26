"""
gera src/demo/seed.json a partir do V3__seed_real_data.sql do backend (challenge-SOA).
o modo demonstração usa os mesmos 93 leads do banco, então o app offline e o online
mostram a mesma carteira. email/telefone vêm cifrados no seed; aqui saem já mascarados,
do jeito que a API devolve (Pii.maskEmail / Pii.maskTelefone).

uso: python scripts/gerar-seed-demo.py ../challenge-SOA/src/main/resources/db/migration/V3__seed_real_data.sql
"""
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path

DOMINIOS = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com.br", "uol.com.br"]


def tuplas(sql, tabela):
    bloco = re.search(rf"INSERT INTO {tabela} \([^)]*\) VALUES(.*?);\s*$", sql, re.S | re.M).group(1)
    out, atual, campo, em_str, i = [], [], "", False, 0
    profundidade = 0
    while i < len(bloco):
        ch = bloco[i]
        if em_str:
            if ch == "'" and i + 1 < len(bloco) and bloco[i + 1] == "'":
                campo += "'"
                i += 1
            elif ch == "'":
                em_str = False
            else:
                campo += ch
        elif ch == "'":
            em_str = True
        elif ch == "(":
            profundidade += 1
            if profundidade == 1:
                atual, campo = [], ""
            else:
                campo += ch
        elif ch == ")":
            profundidade -= 1
            if profundidade == 0:
                atual.append(campo.strip())
                out.append(atual)
            else:
                campo += ch
        elif ch == "," and profundidade == 1:
            atual.append(campo.strip())
            campo = ""
        elif profundidade >= 1:
            campo += ch
        i += 1
    return out


def h(s):
    return int(hashlib.sha256(s.encode()).hexdigest(), 16)


def sem_acento(s):
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()


def main(caminho):
    sql = Path(caminho).read_text(encoding="utf-8")
    clientes = {c[0]: c for c in tuplas(sql, "clientes")}
    veiculos = {v[0]: v for v in tuplas(sql, "veiculos")}
    leads = tuplas(sql, "leads")

    saida = []
    for idx, l in enumerate(leads):
        lid, cid, vid, score, prioridade, status, script = l[:7]
        c = clientes[cid]
        v = veiculos[vid]
        nome = c[1]
        primeiro = sem_acento(nome.split()[0]).lower()
        cpf = c[2]
        n = h(lid)
        saida.append({
            "id": lid,
            "scoreRisco": float(score),
            "prioridade": prioridade.lower(),
            "status": status.lower().replace("_", "-"),
            "scriptOferta": script,
            # o seed grava NOW(); espalho a criação nos últimos 12 dias pra lista ter cara de carteira real
            "diasAtras": n % 12,
            "cliente": {
                "id": cid,
                "nome": nome,
                "cpf": f"{cpf[:3]}.***.***-{cpf[9:]}",
                "email": f"{primeiro[0]}***@{DOMINIOS[n % len(DOMINIOS)]}",
                "telefone": f"****{n % 10000:04d}",
                "regiao": c[5],
                "perfil": c[6].lower(),
                "scoreRisco": float(c[7]),
            },
            "veiculo": {
                "id": vid,
                "modelo": v[2],
                "versao": v[3],
                "ano": int(v[4]),
                "vin": v[5],
                "dataCompra": v[6].replace("DATE", "").strip(),
                "valorCompra": f"{float(v[7]):.2f}",
                "concessionariaId": v[8],
            },
        })

    destino = Path(__file__).resolve().parent.parent / "src" / "demo" / "seed.json"
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps(saida, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(saida)} leads -> {destino}")


if __name__ == "__main__":
    main(sys.argv[1])
