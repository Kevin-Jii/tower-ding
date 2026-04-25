import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Taro from '@tarojs/taro'

import './app.less'
import { useAuthStore } from './stores/auth'

const pinia = createPinia()

const App = createApp({
  onShow() {
    const auth = useAuthStore(pinia)
    auth.hydrate()
    if (!auth.isAuthed) {
      const route = Taro.getCurrentPages()?.slice(-1)?.[0]?.route
      if (route !== 'pages/login/index') {
        Taro.redirectTo({ url: '/pages/login/index' })
      }
    }
  },
  // 入口组件不需要实现 render 方法，即使实现了也会被 taro 所覆盖
})

App.use(pinia)

export default App
