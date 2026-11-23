#!/usr/bin/env python3
"""Prepara ícones Android/PWA a partir da marca oficial em alta resolução."""
from pathlib import Path
import sys
from PIL import Image, ImageChops, ImageDraw, ImageOps

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
            print(f"Marca oficial carregada: {art.width}x{art.height}.")
            return art
        except (OSError, ValueError):
            print("Imagem oficial inválida; usando marca vetorial local.")
    else:
        print("Imagem oficial indisponível; usando marca vetorial local.")

    from PIL import ImageFont
    canvas = Image.new("RGBA", (SIZE, SIZE), BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    draw.ellipse((42, 42, 982, 982), fill=(16, 16, 16, 255), outline=(237, 28, 36, 255), width=22)
    draw.polygon([(220, 560), (804, 560), (740, 680), (284, 680)], fill=(237, 28, 36, 255))
    draw.rectangle((300, 360, 724, 535), fill=(255, 255, 255, 255))
    draw.rectangle((365, 410, 659, 490), fill=(16, 16, 16, 255))
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 88)
    except OSError:
        font = ImageFont.load_default()
    for label, y in (("CAPITAL", 245), ("DO TREM", 770)):
        bounds = draw.textbbox((0, 0), label, font=font)
        draw.text(((SIZE - (bounds[2] - bounds[0])) / 2, y), label, font=font, fill=(255, 255, 255, 255))
    return canvas


def trim_outer_white_margin(art):
    """Remove apenas a margem externa, considerando transparência como branco."""
    white = Image.new("RGBA", art.size, BACKGROUND)
    flattened = Image.alpha_composite(white, art).convert("RGB")
    diff = ImageChops.difference(flattened, Image.new("RGB", flattened.size, (255, 255, 255)))
    mask = diff.convert("L").point(lambda value: 255 if value > 18 else 0)
    bounds = mask.getbbox()
    return art.crop(bounds) if bounds else art


def centered_icon(art, size, background=BACKGROUND):
    fitted = ImageOps.contain(art, (size, size), method=Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), background)
    canvas.alpha_composite(fitted, ((size - fitted.width) // 2, (size - fitted.height) // 2))
    return canvas


art = trim_outer_white_margin(load_brand_art())

# A marca é ampliada de verdade (inclusive quando a origem tem 512 px),
# sem distorção e com margem segura para a máscara arredondada do Android.
legacy = centered_icon(art, 940)
icon = Image.new("RGBA", (SIZE, SIZE), BACKGROUND)
icon.alpha_composite(legacy, ((SIZE - legacy.width) // 2, (SIZE - legacy.height) // 2))
icon.convert("RGB").save(out / "icon-only.png", optimize=True)

for icon_size in (192, 512):
    icon.resize((icon_size, icon_size), Image.Resampling.LANCZOS).convert("RGB").save(
        out / f"pwa-icon-{icon_size}.png", optimize=True
    )

# Foreground adaptativo com área segura: o Android aplica a máscara arredondada
# do launcher sem cortar o nome ou os elementos principais da marca.
foreground = centered_icon(art, 820, (0, 0, 0, 0))
foreground.save(out / "icon-foreground.png", optimize=True)
Image.new("RGB", (SIZE, SIZE), (255, 255, 255)).save(out / "icon-background.png", optimize=True)
print("Ícones 1024/512/192 gerados com a marca ampliada e área segura adaptativa.")
