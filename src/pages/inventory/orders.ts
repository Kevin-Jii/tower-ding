import Taro, { useDidShow, usePullDownRefresh, useRouter } from '@tarojs/taro'


import { ref } from 'vue'


import { listInventoryOrders, type InventoryOrder } from '../../services/api'


import { useAuthStore } from '../../stores/auth'

export default {
  setup() {
    const auth = useAuthStore()
    
    
    const router = useRouter()
    
    
    const list = ref<InventoryOrder[]>([])
    
    
    const typeFilter = ref<number | undefined>(undefined)
    
    
    const routeTypeApplied = ref(false)
    
    
    
    function setType(t: number | undefined) {
      typeFilter.value = t
      void refresh()
    }
    
    
    
    function applyRouteType() {
      if (routeTypeApplied.value) return
      routeTypeApplied.value = true
      const raw = String(router.params?.type || '').trim().toLowerCase()
      if (raw === '1' || raw === 'in' || raw === 'inbound') {
        typeFilter.value = 1
      } else if (raw === '2' || raw === 'out' || raw === 'outbound') {
        typeFilter.value = 2
      }
    }
    
    
    
    function formatQty(v: any) {
      const n = Number(v)
      if (!Number.isFinite(n)) return '--'
      return Number.isInteger(n) ? String(n) : n.toFixed(2)
    }
    
    
    
    function formatDate(v?: string) {
      if (!v) return '-'
      return String(v).replace('T', ' ').slice(0, 16)
    }
    
    
    
    async function refresh() {
      if (!auth.token) return
      try {
        const params: {
          store_id?: number
          type?: number
          page: number
          page_size: number
        } = { page: 1, page_size: 50 }
        if (auth.storeId) params.store_id = auth.storeId
        if (typeFilter.value !== undefined) params.type = typeFilter.value
        list.value = await listInventoryOrders(auth.token, params)
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
      }
    }
    
    
    
    function openDetail(id: number) {
      Taro.navigateTo({ url: `/pages/inventory/order-detail?id=${id}` })
    }
    
    
    
    useDidShow(() => {
      applyRouteType()
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
      useRouter,
      ref,
      listInventoryOrders,
      useAuthStore,
      auth,
      router,
      list,
      typeFilter,
      routeTypeApplied,
      setType,
      applyRouteType,
      formatQty,
      formatDate,
      refresh,
      openDetail,
    }
  }
}
