#!/usr/bin/env python3
"""Gera ícones quadrados do Capital do Trem com a marca melhor enquadrada."""
from pathlib import Path
import sys
from PIL import Image, ImageChops, ImageOps

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
            print("Arte oficial carregada; preservando desenho e proporções.")
            return art
        except (OSError, ValueError):
            print("Imagem oficial inválida; usando marca vetorial local.")
    else:
        print("Imagem oficial indisponível; usando marca vetorial local.")

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


def trim_outer_white_margin(art):
    """Remove apenas a margem branca externa; preserva todas as partes da marca."""
    rgb = art.convert("RGB")
    white = Image.new("RGB", rgb.size, (255, 255, 255))
    diff = ImageChops.difference(rgb, white).convert("L")
    # Tolerância a ruído quase branco causado pela compressão JPEG.
    mask = diff.point(lambda value: 255 if value > 18 else 0)
    bounds = mask.getbbox()
    return art.crop(bounds) if bounds else art


art = trim_outer_white_margin(load_brand_art())

# Ícone quadrado: amplia a marca dentro do fundo branco, sem distorcer proporções.
legacy_art = art.copy()
legacy_art.thumbnail((940, 940), Image.Resampling.LANCZOS)
legacy = Image.new("RGBA", (SIZE, SIZE), BACKGROUND)
legacy.alpha_composite(legacy_art, ((SIZE - legacy_art.width) // 2, (SIZE - legacy_art.height) // 2))
legacy.convert("RGB").save(out / "icon-only.png", optimize=True)

# Foreground adaptativo: conserva área segura para máscaras dos launchers.
adaptive_art = art.copy()
adaptive_art.thumbnail((820, 820), Image.Resampling.LANCZOS)
foreground = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
foreground.alpha_composite(adaptive_art, ((SIZE - adaptive_art.width) // 2, (SIZE - adaptive_art.height) // 2))
foreground.save(out / "icon-foreground.png", optimize=True)
Image.new("RGB", (SIZE, SIZE), (255, 255, 255)).save(out / "icon-background.png", optimize=True)
print("Ícones gerados com a marca ampliada e área segura adaptativa.")
