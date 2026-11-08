#!/usr/bin/env python3
"""Prepara os arquivos de ícone a partir da foto oficial do perfil."""
from pathlib import Path
import sys

from PIL import Image, ImageDraw, ImageOps

source = Path(sys.argv[1])
out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)

with Image.open(source) as original:
    image = ImageOps.fit(
        original.convert("RGBA"),
        (1024, 1024),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )

# Ícone quadrado para lojas/plataformas que usam uma única imagem.
image.convert("RGB").save(out / "icon-only.png", optimize=True)

# Camada adaptativa Android: mantém a marca circular dentro da área segura.
diameter = 720
avatar = ImageOps.fit(
    image,
    (diameter, diameter),
    method=Image.Resampling.LANCZOS,
    centering=(0.5, 0.5),
)
mask = Image.new("L", (diameter, diameter), 0)
ImageDraw.Draw(mask).ellipse((0, 0, diameter - 1, diameter - 1), fill=255)
avatar.putalpha(mask)

foreground = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
foreground.alpha_composite(avatar, ((1024 - diameter) // 2, (1024 - diameter) // 2))
foreground.save(out / "icon-foreground.png", optimize=True)

# Fundo preto sólido para o ícone adaptativo.
Image.new("RGB", (1024, 1024), (8, 8, 9)).save(
    out / "icon-background.png", optimize=True
)

print("Ícones preparados a partir da imagem oficial do perfil.")
