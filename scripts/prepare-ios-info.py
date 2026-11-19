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
    "O Capital do Trem usa o microfone quando você grava vídeos para Stories ou mensagens de voz."
)
info["NSLocationWhenInUseUsageDescription"] = (
    "O Capital do Trem usa sua localização somente quando você toca em “logo ali uai - localização” para encontrar eventos próximos."
)
info["NSCameraUsageDescription"] = (
    "O Capital do Trem usa a câmera somente quando você toca para tirar uma foto ou gravar um vídeo para compartilhar no aplicativo."
)
info["NSPhotoLibraryUsageDescription"] = (
    "O Capital do Trem permite escolher fotos e vídeos da sua biblioteca para publicar Stories e outros conteúdos que você selecionar."
)

# O player musical precisa poder continuar durante o bloqueio de tela.
background_modes = info.get("UIBackgroundModes", [])
if not isinstance(background_modes, list):
    raise SystemExit("UIBackgroundModes precisa ser uma lista no Info.plist.")
if "audio" not in background_modes:
    background_modes.append("audio")
info["UIBackgroundModes"] = background_modes

with path.open("wb") as stream:
    plistlib.dump(info, stream, sort_keys=False)

with path.open("rb") as stream:
    checked = plistlib.load(stream)
for key in ("NSMicrophoneUsageDescription", "NSLocationWhenInUseUsageDescription", "NSCameraUsageDescription", "NSPhotoLibraryUsageDescription"):
    if not checked.get(key):
        raise SystemExit(f"Permissão sem descrição: {key}")
if "audio" not in checked.get("UIBackgroundModes", []):
    raise SystemExit("Modo de áudio em segundo plano ausente no Info.plist.")
print("Info.plist iOS validado: permissões de mídia/localização e modo de áudio em segundo plano.")
