import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.studybuddy.app',
  appName: 'studybuddy-v2',
  webDir: 'out',
  server: {
    url: 'https://studybuddy-repository.vercel.app',
    cleartext: true
  }
};

export default config;
