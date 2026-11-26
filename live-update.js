// Carregador compartilhado: a PWA do Safari não baixa nem executa o SDK nativo.
(() => {
  const startNativeUpdater = () => {
    const capacitor = window.Capacitor;
    if (!capacitor || typeof capacitor.isNativePlatform !== 'function' || !capacitor.isNativePlatform()) return;
    import('./live-update-native.js').catch(error => {
      console.warn('[Capital do Trem] Módulo nativo de atualização indisponível.', error);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startNativeUpdater, { once: true });
  } else {
    startNativeUpdater();
  }
})();
