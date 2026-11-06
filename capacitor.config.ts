import type { CapacitorConfig } from '@capacitor/cli';

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
  }
};

export default config;
