#!/usr/bin/env python3
"""Gera ícones quadrados do Capital do Trem, preservando a arte completa."""
from pathlib import Path
import sys
from PIL import Image, ImageOps

source = Path(sys.argv[1])
out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
SIZE = 1024
BACKGROUND = (255, 255, 255, 255)

def load_brand_art():
    if source.is_file():
        try:
            with Image.open(source) as original:
                art = ImageOps.exif_transpose(original).convert("RGBA")
            print("Arte oficial carregada; será preservada inteira, sem recorte circular.")
            return art
        except (OSError, ValueError):
            print("Imagem oficial inválida; usando marca vetorial local.")
    else:
        print("Imagem oficial indisponível; usando marca vetorial local.")

    # Fallback simples e quadrado: não simula foto de perfil nem cria máscara circular.
    from PIL import ImageDraw, ImageFont
    canvas = Image.new("RGBA", (SIZE, SIZE), BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    draw.polygon([(512, 110), (330, 430), (694, 430)], fill=(237, 28, 36, 255))
    draw.rounded_rectangle((190, 430, 834, 720), radius=54, fill=(16, 16, 16, 255))
    draw.rectangle((265, 500, 759, 650), fill=(237, 28, 36, 255))
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 90)
    except OSError:
        font = ImageFont.load_default()
    for label, y in (("CAPITAL", 745), ("DO TREM", 850)):
        bounds = draw.textbbox((0, 0), label, font=font)
        draw.text(((SIZE - (bounds[2] - bounds[0])) / 2, y), label, font=font, fill=(16, 16, 16, 255))
    return canvas

art = load_brand_art()
# Contain mantém toda a arte e a proporção original, com margem de segurança
# para as máscaras arredondadas aplicadas pelo Android/iOS.
art.thumbnail((820, 820), Image.Resampling.LANCZOS)
canvas = Image.new("RGBA", (SIZE, SIZE), BACKGROUND)
canvas.alpha_composite(art, ((SIZE - art.width) // 2, (SIZE - art.height) // 2))

# Ícone legado e foreground adaptativo usam a mesma composição quadrada.
# Não aplicar máscara circular: o launcher só poderá arredondar os cantos externos.
canvas.convert("RGB").save(out / "icon-only.png", optimize=True)
canvas.save(out / "icon-foreground.png", optimize=True)
Image.new("RGB", (SIZE, SIZE), (255, 255, 255)).save(out / "icon-background.png", optimize=True)
