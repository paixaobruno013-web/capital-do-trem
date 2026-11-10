#!/usr/bin/env python3
"""Configura o WebView Android para permitir autoplay de mídia com áudio."""
from pathlib import Path
import re
import sys

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("android")
matches = list(root.glob("app/src/main/java/**/MainActivity.java"))
if not matches:
    raise SystemExit("MainActivity.java não encontrado após npx cap add android")
path = matches[0]
source = path.read_text(encoding="utf-8")
if "setMediaPlaybackRequiresUserGesture(false)" in source:
    print("Autoplay de mídia já está habilitado.")
    raise SystemExit(0)
pattern = r"(public\s+class\s+MainActivity\s+extends\s+BridgeActivity\s*\{)"
replacement = r"""\1
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
        }
    }
"""
updated, count = re.subn(pattern, replacement, source, count=1)
if count != 1:
    raise SystemExit("Não foi possível localizar a classe MainActivity gerada pelo Capacitor.")
path.write_text(updated, encoding="utf-8")
print(f"Autoplay de mídia com áudio habilitado em {path}")
