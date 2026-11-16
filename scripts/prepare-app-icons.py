#!/usr/bin/env python3
"""Prepara ícones Android a partir da foto do perfil ou da marca oficial."""
from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageFont, ImageOps

source = Path(sys.argv[1])
out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)

def branded_fallback():
    canvas = Image.new("RGBA", (1024, 1024), (8, 8, 9, 255))
    draw = ImageDraw.Draw(canvas)
    draw.ellipse((42, 42, 982, 982), fill=(16, 16, 16, 255), outline=(237, 28, 36, 255), width=28)
    draw.polygon([(512, 190), (390, 390), (634, 390)], fill=(237, 28, 36, 255))
    draw.rounded_rectangle((245, 430, 779, 730), radius=58, fill=(245, 245, 245, 255))
    draw.rectangle((305, 485, 719, 635), fill=(18, 18, 18, 255))
    draw.rounded_rectangle((350, 520, 455, 605), radius=12, fill=(237, 28, 36, 255))
    draw.rounded_rectangle((569, 520, 674, 605), radius=12, fill=(237, 28, 36, 255))
    draw.rectangle((210, 690, 814, 755), fill=(237, 28, 36, 255))
    draw.ellipse((315, 730, 425, 840), fill=(20, 20, 20, 255), outline=(245, 245, 245, 255), width=16)
    draw.ellipse((599, 730, 709, 840), fill=(20, 20, 20, 255), outline=(245, 245, 245, 255), width=16)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 78)
    except OSError:
        font = ImageFont.load_default()
    for label, y in (("CAPITAL", 95), ("DO TREM", 865)):
        bounds = draw.textbbox((0, 0), label, font=font, stroke_width=1)
        x = (1024 - (bounds[2] - bounds[0])) // 2
        draw.text((x, y), label, font=font, fill=(255, 255, 255, 255), stroke_width=1, stroke_fill=(8, 8, 9, 255))
    return canvas

if source.is_file():
    try:
        with Image.open(source) as original:
            image = ImageOps.fit(original.convert("RGBA"), (1024, 1024), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
        print("Ícones preparados a partir da foto oficial do perfil.")
    except (OSError, ValueError):
        image = branded_fallback()
        print("Foto de perfil inválida; usando ícone local da marca.")
else:
    image = branded_fallback()
    print("Foto de perfil indisponível; usando ícone local da marca.")

image.convert("RGB").save(out / "icon-only.png", optimize=True)
diameter = 720
avatar = ImageOps.fit(image, (diameter, diameter), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
mask = Image.new("L", (diameter, diameter), 0)
ImageDraw.Draw(mask).ellipse((0, 0, diameter - 1, diameter - 1), fill=255)
avatar.putalpha(mask)
foreground = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
foreground.alpha_composite(avatar, ((1024 - diameter) // 2, (1024 - diameter) // 2))
foreground.save(out / "icon-foreground.png", optimize=True)
Image.new("RGB", (1024, 1024), (8, 8, 9)).save(out / "icon-background.png", optimize=True)
