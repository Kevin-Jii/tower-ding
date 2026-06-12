import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.tower.ding',
  appName: 'Tower',
  webDir: 'dist',
  server: {
    // 本地调试时可改为局域网 dev server，例如 http://192.168.1.10:10086
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true
  }
}

export default config
