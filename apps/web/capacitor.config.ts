import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.studybuddy.app',
  appName: 'studybuddy-v2',
  webDir: 'out',
  server: {
    url: 'http://studybuddy-repository.vercel.app', // Points to your machine from the Android emulator
    cleartext: true
  }
};

export default config;
