import Taro from '@tarojs/taro'


import { useAuthStore } from '../../stores/auth'

export default {
  setup() {
    const auth = useAuthStore()
    
    
    
    function goOrders() {
      if (!auth.token) return Taro.redirectTo({ url: '/pages/login/index' })
      Taro.navigateTo({ url: '/pages/inventory/orders' })
    }
    
    
    
    function goForm() {
      if (!auth.token) return Taro.redirectTo({ url: '/pages/login/index' })
      Taro.navigateTo({ url: '/pages/inventory/form' })
    }
    
    
    
    function goStockList() {
      if (!auth.token) return Taro.redirectTo({ url: '/pages/login/index' })
      Taro.navigateTo({ url: '/pages/inventory/stock-list' })
    }

    return {
      Taro,
      useAuthStore,
      auth,
      goOrders,
      goForm,
      goStockList,
    }
  }
}
