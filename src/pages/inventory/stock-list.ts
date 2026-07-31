import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'


import { computed, ref } from 'vue'


import { listAllInventories, listAllStoreSupplierProducts } from '../../services/api'


import { useAuthStore } from '../../stores/auth'

export default {
  setup() {
    const auth = useAuthStore()
    
    
    const list = ref<any[]>([])
    
    
    const loading = ref(false)
    
    
    const activeCategory = ref('all')
    
    
    const categorySource = ref<any[]>([])
    
    
    
    function qtyNum(inv) {
      const n = Number(inv?.quantity)
      return Number.isFinite(n) ? n : NaN
    }
    
    
    
    function isLowStock(inv) {
      const n = qtyNum(inv)
      return Number.isFinite(n) && n < 3
    }
    
    
    
    const categoryTabs = computed(() => {
      const seen = new Map()
      categorySource.value.forEach((i) => {
        const id = Number(i?.category_id || 0)
        const name = String(i?.category_name || '').trim()
        if (id > 0 && name && !seen.has(id)) seen.set(id, name)
      })
      const tabs = [{ label: '全部', value: 'all' }]
      seen.forEach((label, id) => {
        tabs.push({ label, value: String(id) })
      })
      return tabs
    })
    
    
    
    const activeCategoryLabel = computed(() => {
      const hit = categoryTabs.value.find((tab) => tab.value === activeCategory.value)
      return hit?.label || '全部'
    })
    
    
    
    const filteredList = computed(() => {
      if (activeCategory.value === 'all') return list.value
      return list.value.filter((i) => String(Number(i?.category_id || 0)) === activeCategory.value)
    })
    
    
    
    const lowStockCount = computed(() => filteredList.value.filter((i) => isLowStock(i)).length)
    
    
    
    const totalQty = computed(() =>
      filteredList.value.reduce((acc, i) => {
        const n = qtyNum(i)
        return acc + (Number.isFinite(n) ? n : 0)
      }, 0)
    )
    
    
    
    const sortedList = computed(() => {
      const rows = [...filteredList.value]
      rows.sort((a, b) => {
        const wa = isLowStock(a) ? 0 : 1
        const wb = isLowStock(b) ? 0 : 1
        if (wa !== wb) return wa - wb
        return qtyNum(a) - qtyNum(b)
      })
      return rows
    })
    
    
    
    function formatQty(v) {
      const n = Number(v)
      if (!Number.isFinite(n)) return '--'
      return Number.isInteger(n) ? String(n) : n.toFixed(2)
    }
    
    
    
    function getProductCategoryId(product) {
      return Number(product?.category_id || product?.category?.id || product?.product?.category_id || product?.product?.category?.id || 0)
    }
    
    
    
    function getProductCategoryName(product) {
      return String(product?.category?.name || product?.category_name || product?.product?.category?.name || product?.product?.category_name || '').trim()
    }
    
    
    
    function getSupplierProductId(product) {
      return Number(product?.product_id || product?.product?.id || product?.id || 0)
    }
    
    
    
    function getSupplierProductName(product, fallback) {
      return String(product?.product_name || product?.name || product?.product?.product_name || product?.product?.name || fallback || '').trim()
    }
    
    
    
    function getSupplierProductUnit(product, fallback) {
      return String(product?.unit || product?.product?.unit || fallback || '').trim()
    }
    
    
    
    async function refresh() {
      if (!auth.token) return
      loading.value = true
      try {
        const storeId = auth.storeId || 999
        const [inventories, products] = await Promise.all([
          listAllInventories(auth.token, { store_id: storeId }),
          listAllStoreSupplierProducts(auth.token, { store_id: storeId })
        ])
    
        const inventoryByProductId = new Map()
        inventories.forEach((inv) => {
          const pid = Number(inv?.product_id || 0)
          if (pid > 0) inventoryByProductId.set(pid, inv)
        })
    
        categorySource.value = products.map((p) => ({
          category_id: getProductCategoryId(p),
          category_name: getProductCategoryName(p)
        }))
    
        list.value = products.map((p) => {
          const pid = getSupplierProductId(p)
          const inv = inventoryByProductId.get(pid)
          const categoryId = getProductCategoryId(p)
          const categoryName = getProductCategoryName(p)
          return {
            id: inv?.id || p?.id || pid,
            store_id: inv?.store_id || storeId,
            store_name: inv?.store_name || auth.user?.store?.name || '当前门店',
            product_id: pid,
            product_name: getSupplierProductName(p, inv?.product_name || `商品 #${pid || p?.id || ''}`),
            quantity: inv?.quantity ?? 0,
            unit: inv?.unit || getSupplierProductUnit(p, ''),
            category_id: categoryId,
            category_name: categoryName
          }
        }).filter((item) => Number(item.product_id || 0) > 0 || item.product_name)
    
        if (!categoryTabs.value.some((tab) => tab.value === activeCategory.value)) {
          activeCategory.value = 'all'
        }
      } catch (err) {
        Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
      } finally {
        loading.value = false
      }
    }
    
    
    
    useDidShow(() => refresh())
    
    
    
    usePullDownRefresh(async () => {
      await refresh()
      Taro.stopPullDownRefresh()
    })

    return {
      Taro,
      useDidShow,
      usePullDownRefresh,
      computed,
      ref,
      listAllInventories,
      listAllStoreSupplierProducts,
      useAuthStore,
      auth,
      list,
      loading,
      activeCategory,
      categorySource,
      qtyNum,
      isLowStock,
      categoryTabs,
      activeCategoryLabel,
      filteredList,
      lowStockCount,
      totalQty,
      sortedList,
      formatQty,
      getProductCategoryId,
      getProductCategoryName,
      getSupplierProductId,
      getSupplierProductName,
      getSupplierProductUnit,
      refresh,
    }
  }
}
