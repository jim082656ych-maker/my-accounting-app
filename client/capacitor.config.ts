import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jim.accounting',
  appName: 'MyAccountingApp',
  webDir: 'build', // 👈 關鍵！一定要改成 build
  bundledWebRuntime: false
};

export default config;
