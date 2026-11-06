import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.capitaldotrem.app',
  appName: 'Capital do Trem',
  webDir: 'www',
  bundledWebRuntime: false,
  backgroundColor: '#000000',
  ios: {
    contentInset: 'automatic'
  },
  android: {
    backgroundColor: '#000000'
  }
};

export default config;
