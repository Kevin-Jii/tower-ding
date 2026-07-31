import Taro, { useDidShow, useRouter } from '@tarojs/taro'


import { ref } from 'vue'


import { getInventoryOrder, type InventoryOrder } from '../../services/api'


import { useAuthStore } from '../../stores/auth'

export default {
  setup() {
    const auth = useAuthStore()
    
    
    const router = useRouter()
    
    
    const id = Number(router.params?.id || 0)
    
    
    const detail = ref<InventoryOrder | null>(null)
    
    
    
    function formatQty(v: any) {
      const n = Number(v)
      if (!Number.isFinite(n)) return '--'
      return Number.isInteger(n) ? String(n) : n.toFixed(2)
    }
    
    
    
    function formatDate(v?: string) {
      if (!v) return '-'
      return String(v).replace('T', ' ').slice(0, 19)
    }
    
    
    
    function formatDay(v?: string) {
      if (!v) return ''
      return String(v).slice(0, 10)
    }
    
    
    
    async function refresh() {
      if (!auth.token || !id) return
      try {
        detail.value = await getInventoryOrder(auth.token, id)
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
      }
    }
    
    
    
    useDidShow(() => refresh())

    return {
      Taro,
      useDidShow,
      useRouter,
      ref,
      getInventoryOrder,
      useAuthStore,
      auth,
      router,
      id,
      detail,
      formatQty,
      formatDate,
      formatDay,
      refresh,
    }
  }
}
