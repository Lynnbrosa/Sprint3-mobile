"""gera os ícones e o splash a partir do desenho do conta-giros (sem depender de figma)."""
import math
from pathlib import Path
from PIL import Image, ImageDraw

AZUL = (0, 52, 120, 255)
AZUL_FUNDO = (0, 30, 74, 255)
BRANCO = (255, 255, 255, 255)
VERMELHO = (224, 36, 47, 255)
SS = 4  # supersampling, o arc do PIL sai serrilhado sem isso

ASSETS = Path(__file__).resolve().parent.parent / "assets"


def ponto(cx, cy, r, graus):
    a = math.radians(graus)
    return cx + r * math.cos(a), cy + r * math.sin(a)


def marca(draw, cx, cy, r, espessura, cor, cor_zona, cor_miolo=None):
    # arco de 270 graus aberto embaixo; os ultimos 55 sao a faixa de risco
    caixa = [cx - r, cy - r, cx + r, cy + r]
    draw.arc(caixa, 135, 348, fill=cor, width=espessura)
    draw.arc(caixa, 352, 405, fill=cor_zona, width=espessura)
    raio_cap = espessura / 2
    for ang, c in ((135, cor), (405, cor_zona)):
        px, py = ponto(cx, cy, r - espessura / 2, ang)
        draw.ellipse([px - raio_cap, py - raio_cap, px + raio_cap, py + raio_cap], fill=c)

    # ponteiro afinando, apontando pra entrada da faixa vermelha
    ang = 338
    ponta = ponto(cx, cy, r * 0.74, ang)
    base_a = ponto(cx, cy, espessura * 0.62, ang + 90)
    base_b = ponto(cx, cy, espessura * 0.62, ang - 90)
    cauda = ponto(cx, cy, espessura * 0.55, ang + 180)
    draw.polygon([ponta, base_a, cauda, base_b], fill=cor)
    hub = espessura * 0.78
    draw.ellipse([cx - hub, cy - hub, cx + hub, cy + hub], fill=cor)
    if cor_miolo:
        miolo = hub * 0.42
        draw.ellipse([cx - miolo, cy - miolo, cx + miolo, cy + miolo], fill=cor_miolo)


def render(tamanho, escala_marca, fundo=None, cor=BRANCO, cor_zona=VERMELHO, cor_miolo=AZUL, gradiente=False):
    n = tamanho * SS
    img = Image.new("RGBA", (n, n), fundo or (0, 0, 0, 0))
    if gradiente:
        # radial simples: centro azul ford, borda mais escura
        g = Image.new("RGBA", (n, n))
        gd = ImageDraw.Draw(g)
        passos = 60
        for i in range(passos, 0, -1):
            t = i / passos
            c = tuple(int(AZUL_FUNDO[k] + (AZUL[k] - AZUL_FUNDO[k]) * (1 - t) ** 0.8) for k in range(3)) + (255,)
            rr = n * 0.75 * t
            gd.ellipse([n / 2 - rr, n / 2 - rr, n / 2 + rr, n / 2 + rr], fill=c)
        img = Image.alpha_composite(Image.new("RGBA", (n, n), AZUL_FUNDO), g)
    d = ImageDraw.Draw(img)
    r = n * escala_marca / 2
    marca(d, n / 2, n / 2 + r * 0.08, r, int(r * 0.2), cor, cor_zona, cor_miolo)
    return img.resize((tamanho, tamanho), Image.LANCZOS)


if __name__ == "__main__":
    ASSETS.mkdir(exist_ok=True)
    render(1024, 0.62, gradiente=True).save(ASSETS / "icon.png")
    # adaptive icon: zona segura e o circulo de 66% do centro
    render(1024, 0.44).save(ASSETS / "android-icon-foreground.png")
    render(1024, 0.44, cor=BRANCO, cor_zona=BRANCO, cor_miolo=None).save(ASSETS / "android-icon-monochrome.png")
    render(1024, 0.86).save(ASSETS / "splash-icon.png")
    render(96, 0.84, cor=BRANCO, cor_zona=BRANCO, cor_miolo=None).save(ASSETS / "notification-icon.png")
    render(48, 0.9, gradiente=True).save(ASSETS / "favicon.png")
    # marca solta pra usar dentro do app (login e header)
    render(512, 0.9).save(ASSETS / "marca.png")
    print("ok")
