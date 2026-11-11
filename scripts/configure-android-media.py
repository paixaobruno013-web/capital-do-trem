#!/usr/bin/env python3
"""Configura o WebView Android para permitir autoplay de mídia com áudio."""
from pathlib import Path
import re
import sys

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("android")
manifest = root / "app/src/main/AndroidManifest.xml"
if not manifest.is_file():
    raise SystemExit(f"AndroidManifest.xml não encontrado: {manifest}")
manifest_text = manifest.read_text(encoding="utf-8")
required_permissions = [
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO",
    "android.permission.MODIFY_AUDIO_SETTINGS",
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.ACCESS_FINE_LOCATION",
]
for permission in required_permissions:
    declaration = f'<uses-permission android:name="{permission}" />'
    if permission not in manifest_text:
        manifest_text = manifest_text.replace("<application", f"    {declaration}\n    <application", 1)
manifest.write_text(manifest_text, encoding="utf-8")
print("Permissões nativas de câmera, áudio e localização declaradas no AndroidManifest.xml.")

matches = list(root.glob("app/src/main/java/**/MainActivity.java"))
if not matches:
    raise SystemExit("MainActivity.java não encontrado após npx cap add android")
path = matches[0]
source = path.read_text(encoding="utf-8")
pattern = r"(public\s+class\s+MainActivity\s+extends\s+BridgeActivity\s*\{)"
replacement = r"""\1
    private volatile boolean storyCameraOpen = false;

    private class CapitalVolumeBridge {
        @android.webkit.JavascriptInterface
        public void setStoryCameraOpen(boolean open) {
            storyCameraOpen = open;
        }
    }

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
            getBridge().getWebView().addJavascriptInterface(new CapitalVolumeBridge(), "CapitalVolumeBridge");
        }
    }

    @Override
    public boolean dispatchKeyEvent(android.view.KeyEvent event) {
        int key = event.getKeyCode();
        if (storyCameraOpen && event.getAction() == android.view.KeyEvent.ACTION_DOWN
                && (key == android.view.KeyEvent.KEYCODE_VOLUME_UP || key == android.view.KeyEvent.KEYCODE_VOLUME_DOWN)) {
            String direction = key == android.view.KeyEvent.KEYCODE_VOLUME_UP ? "in" : "out";
            if (getBridge() != null && getBridge().getWebView() != null) {
                String script = "window.dispatchEvent(new CustomEvent('capital:volume-key',{detail:{direction:'" + direction + "'}}));";
                getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(script, null));
            }
            return true;
        }
        return super.dispatchKeyEvent(event);
    }
"""
updated, count = re.subn(pattern, replacement, source, count=1)
if count != 1:
    raise SystemExit("Não foi possível localizar a classe MainActivity gerada pelo Capacitor.")
path.write_text(updated, encoding="utf-8")
print(f"Autoplay de mídia com áudio habilitado em {path}")
