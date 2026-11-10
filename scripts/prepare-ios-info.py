#!/usr/bin/env python3
"""Aplica textos de consentimento exigidos pelo iOS às permissões usadas no app."""
from pathlib import Path
import plistlib
import sys

path = Path(sys.argv[1])
if not path.is_file():
    raise SystemExit(f"Info.plist não encontrado: {path}")

with path.open("rb") as stream:
    info = plistlib.load(stream)

info["NSMicrophoneUsageDescription"] = (
    "O Capital do Trem usa o microfone quando você escolhe gravar uma mensagem de voz no Fala Trem."
)
info["NSLocationWhenInUseUsageDescription"] = (
    "O Capital do Trem usa sua localização somente quando você toca em “logo ali uai - localização” para encontrar eventos próximos."
)
info["NSCameraUsageDescription"] = (
    "O Capital do Trem usa a câmera somente quando você toca para tirar uma foto ou gravar um vídeo para compartilhar no aplicativo."
)
info["NSPhotoLibraryUsageDescription"] = (
    "O Capital do Trem permite escolher fotos e vídeos da sua biblioteca para seu perfil, mensagens e conteúdos enviados pela equipe."
)

with path.open("wb") as stream:
    plistlib.dump(info, stream, sort_keys=False)

with path.open("rb") as stream:
    checked = plistlib.load(stream)
for key in ("NSMicrophoneUsageDescription", "NSLocationWhenInUseUsageDescription", "NSCameraUsageDescription", "NSPhotoLibraryUsageDescription"):
    if not checked.get(key):
        raise SystemExit(f"Permissão sem descrição: {key}")
print("Info.plist iOS validado: microfone, localização e biblioteca de fotos.")
