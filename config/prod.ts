import type { UserConfigExport } from '@tarojs/cli'
export default {
  mini: {},
  h5: {
    // Vite runner 下如需兼容更低版本浏览器，可开启：
    // legacy: true
  }
} satisfies UserConfigExport<'vite'>
