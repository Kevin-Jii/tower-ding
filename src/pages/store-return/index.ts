import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'


import { ref } from 'vue'


import { getStoreReturnStats, listStoreReturns, type StoreReturn, type StoreReturnStats } from '../../services/api'


import { useAuthStore } from '../../stores/auth'

export default {
  setup() {
    const auth = useAuthStore()
    
    
    const returns = ref<StoreReturn[]>([])
    
    
    const stats = ref<StoreReturnStats | null>(null)
    
    
    
    function formatMoney(v: any) {
      const n = Number(v || 0)
      return Number.isFinite(n) ? n.toFixed(2) : '0.00'
    }
    
    
    
    function formatDate(v?: string) {
      if (!v) return '-'
      return String(v).slice(0, 10)
    }
    
    
    
    async function refresh() {
      if (!auth.token) return Taro.redirectTo({ url: '/pages/login/index' })
      try {
        const [rs, st] = await Promise.all([
          listStoreReturns(auth.token, { store_id: auth.storeId || undefined, page: 1, page_size: 50 }),
          getStoreReturnStats(auth.token, { store_id: auth.storeId || undefined })
        ])
        returns.value = rs
        stats.value = st
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
      }
    }
    
    
    
    function openCreate() {
      Taro.navigateTo({ url: '/pages/store-return/form' })
    }
    
    
    
    function openDetail(id: number) {
      Taro.navigateTo({ url: `/pages/store-return/detail?id=${id}` })
    }
    
    
    
    useDidShow(() => {
      void refresh()
    })
    
    
    
    usePullDownRefresh(async () => {
      await refresh()
      Taro.stopPullDownRefresh()
    })

    return {
      Taro,
      useDidShow,
      usePullDownRefresh,
      ref,
      getStoreReturnStats,
      listStoreReturns,
      useAuthStore,
      auth,
      returns,
      stats,
      formatMoney,
      formatDate,
      refresh,
      openCreate,
      openDetail,
    }
  }
}
