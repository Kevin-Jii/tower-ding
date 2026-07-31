import Taro, { useDidShow, useRouter } from '@tarojs/taro'


import { ref } from 'vue'


import { getB2BSupplyOrder, type B2BSupplyOrder } from '../../services/api'


import { useAuthStore } from '../../stores/auth'

export default {
  setup() {
    const auth = useAuthStore()
    
    
    const router = useRouter()
    
    
    const id = Number(router.params?.id || 0)
    
    
    const detail = ref<B2BSupplyOrder | null>(null)
    
    
    
    function formatMoney(v: any) {
      const n = Number(v || 0)
      return Number.isFinite(n) ? n.toFixed(2) : '0.00'
    }
    
    
    
    function formatQty(v: any) {
      const n = Number(v || 0)
      if (!Number.isFinite(n)) return '--'
      return Number.isInteger(n) ? String(n) : n.toFixed(2)
    }
    
    
    
    function formatDate(v?: string) {
      if (!v) return '-'
      return String(v).slice(0, 10)
    }
    
    
    
    function paymentLabel(v?: number) {
      if (Number(v) === 3) return '已收款'
      if (Number(v) === 2) return '部分收款'
      return '未收款'
    }
    
    
    
    function deliveryLabel(v?: number) {
      if (Number(v) === 2) return '已配送'
      if (Number(v) === 3) return '已取消'
      return '待配送'
    }
    
    
    
    async function refresh() {
      if (!auth.token || !id) return
      try {
        detail.value = await getB2BSupplyOrder(auth.token, id)
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
      getB2BSupplyOrder,
      useAuthStore,
      auth,
      router,
      id,
      detail,
      formatMoney,
      formatQty,
      formatDate,
      paymentLabel,
      deliveryLabel,
      refresh,
    }
  }
}
