import type { CapacitorConfig } from '@capacitor/cli';

// A chave pública é extraída do mesmo certificado que assina o aplicativo Android.
// Em builds sem credenciais, o plugin não aceita pacotes remotos sem assinatura configurada.
const liveUpdatePublicKey = process.env.CAPITAL_DO_TREM_LIVE_UPDATE_PUBLIC_KEY;

const config: CapacitorConfig = {
  appId: 'com.capitaldotrem.app',
  appName: 'Capital do Trem',
  webDir: 'www',
  backgroundColor: '#000000',
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#000000'
  },
  android: {
    backgroundColor: '#000000'
  },
  plugins: {
    LiveUpdate: {
      readyTimeout: 10000,
      autoBlockRolledBackBundles: true,
      autoDeleteBundles: true,
      ...(liveUpdatePublicKey ? { publicKey: liveUpdatePublicKey } : {})
    }
  }
};

export default config;
