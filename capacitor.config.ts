import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'PayRemind',
  webDir: 'www',
  plugins: {
    LocalNotifications: {
      iconColor: "#488AFF"
    },
  },
};

export default config;
