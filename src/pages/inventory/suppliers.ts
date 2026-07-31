import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'


import { computed, ref } from 'vue'


import {
  bindStoreSuppliers,
  listStoreBoundSuppliers,
  listSuppliers,
  unbindStoreSuppliers,
  type StoreSupplierBinding,
  type Supplier
} from '../../services/api'


import { useAuthStore } from '../../stores/auth'

export default {
  setup() {
    const auth = useAuthStore()
    
    
    const bound = ref<StoreSupplierBinding[]>([])
    
    
    const catalog = ref<Supplier[]>([])
    
    
    const keyword = ref('')
    
    
    const searched = ref(false)
    
    
    const searching = ref(false)
    
    
    
    const boundIds = computed(() => new Set(bound.value.map((b) => b.supplier_id).filter(Boolean) as number[]))
    
    
    
    function isBound(id: number) {
      return boundIds.value.has(id)
    }
    
    
    
    function onKw(e: any) {
      keyword.value = String(e?.detail?.value || '')
    }
    
    
    
    async function loadBound() {
      if (!auth.token) return
      try {
        bound.value = await listStoreBoundSuppliers(auth.token, {
          store_id: auth.storeId || undefined
        })
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '加载绑定失败', icon: 'none' })
      }
    }
    
    
    
    async function searchCatalog() {
      if (!auth.token) return
      searching.value = true
      searched.value = true
      try {
        catalog.value = await listSuppliers(auth.token, {
          keyword: keyword.value.trim() || undefined,
          page: 1,
          page_size: 50
        })
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '搜索失败', icon: 'none' })
        catalog.value = []
      } finally {
        searching.value = false
      }
    }
    
    
    
    function storeIdOrAbort(): number | null {
      const sid = auth.storeId
      if (!sid) {
        Taro.showToast({ title: '缺少门店信息，请重新登录', icon: 'none' })
        return null
      }
      return sid
    }
    
    
    
    async function doBind(supplierId: number) {
      const sid = storeIdOrAbort()
      if (!sid || !auth.token) return
      try {
        await bindStoreSuppliers(auth.token, { store_id: sid, supplier_ids: [supplierId] })
        Taro.showToast({ title: '已绑定', icon: 'success' })
        await loadBound()
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '绑定失败', icon: 'none' })
      }
    }
    
    
    
    function confirmUnbind(b: StoreSupplierBinding) {
      const supplierId = b.supplier_id || b.supplier?.id
      if (!supplierId) return
      Taro.showModal({
        title: '解绑供应商',
        content: `确定解绑「${b.supplier?.supplier_name || supplierId}」？解绑后该供应商商品将不再出现在本门店选品中。`,
        success: async (res) => {
          if (!res.confirm) return
          const sid = storeIdOrAbort()
          if (!sid || !auth.token) return
          try {
            await unbindStoreSuppliers(auth.token, { store_id: sid, supplier_ids: [supplierId] })
            Taro.showToast({ title: '已解绑', icon: 'success' })
            await loadBound()
          } catch (err: any) {
            Taro.showToast({ title: err?.message || '解绑失败', icon: 'none' })
          }
        }
      })
    }
    
    
    
    async function refresh() {
      await loadBound()
    }
    
    
    
    useDidShow(() => {
      void refresh()
      if (!searched.value) void searchCatalog()
    })
    
    
    
    usePullDownRefresh(async () => {
      await refresh()
      await searchCatalog()
      Taro.stopPullDownRefresh()
    })

    return {
      Taro,
      useDidShow,
      usePullDownRefresh,
      computed,
      ref,
      bindStoreSuppliers,
      listStoreBoundSuppliers,
      listSuppliers,
      unbindStoreSuppliers,
      useAuthStore,
      auth,
      bound,
      catalog,
      keyword,
      searched,
      searching,
      boundIds,
      isBound,
      onKw,
      loadBound,
      searchCatalog,
      storeIdOrAbort,
      doBind,
      confirmUnbind,
      refresh,
    }
  }
}
