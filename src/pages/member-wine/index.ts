import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'


import { computed, reactive, ref } from 'vue'


import {
  depositMemberWine,
  listProductUnitSpecs,
  listMemberWineStorages,
  listMemberWineTransactions,
  listMembers,
  listStoreSupplierProducts,
  withdrawMemberWine,
  type Member,
  type MemberWineStorage,
  type MemberWineTransaction,
  type ProductUnitSpec,
  type SupplierProduct
} from '../../services/api'


import { useAuthStore } from '../../stores/auth'

export default {
  setup() {
    const auth = useAuthStore()
    
    
    const activeTab = ref<'stock' | 'flow'>('stock')
    
    
    const keyword = ref('')
    
    
    const loading = ref(false)
    
    
    const txnLoading = ref(false)
    
    
    const saving = ref(false)
    
    
    const storages = ref<MemberWineStorage[]>([])
    
    
    const transactions = ref<MemberWineTransaction[]>([])
    
    
    const members = ref<Member[]>([])
    
    
    const products = ref<SupplierProduct[]>([])
    
    
    const unitOptions = ref<Array<{ label: string; value: string }>>([{ label: '瓶', value: '瓶' }])
    
    
    const total = ref(0)
    
    
    const sheetOpen = ref(false)
    
    
    const mode = ref<'deposit' | 'withdraw'>('deposit')
    
    
    const selectedStorage = ref<MemberWineStorage | null>(null)
    
    
    const form = reactive({
      member_id: 0,
      product_id: 0,
      wine_name: '',
      unit: '瓶',
      quantity: '1',
      remark: ''
    })
    
    
    
    const memberOptions = computed(() => members.value.map((m) => ({ label: `${m.phone || ''}${m.name ? ` / ${m.name}` : ''}`, value: m.id })))
    
    
    const productOptions = computed(() =>
      products.value.map((p) => {
        const unit = String(p.unit || p.product?.unit || '').trim()
        return { label: unit ? `${productName(p)}（${unit}）` : productName(p), value: getSupplierProductId(p) }
      })
    )
    
    
    const memberIndex = computed(() => {
      const i = memberOptions.value.findIndex((item) => item.value === form.member_id)
      return i >= 0 ? i : 0
    })
    
    
    const productIndex = computed(() => {
      const i = productOptions.value.findIndex((item) => item.value === form.product_id)
      return i >= 0 ? i : 0
    })
    
    
    const unitIndex = computed(() => {
      const i = unitOptions.value.findIndex((item) => item.value === form.unit)
      return i >= 0 ? i : 0
    })
    
    
    const selectedMemberLabel = computed(() => memberOptions.value[memberIndex.value]?.label || '请选择会员')
    
    
    const selectedProductLabel = computed(() => productOptions.value[productIndex.value]?.label || '请选择商品')
    
    
    const selectedUnitLabel = computed(() => unitOptions.value[unitIndex.value]?.label || '请选择规格')
    
    
    
    function onKeywordInput(e: any) {
      keyword.value = String(e?.detail?.value || '')
    }
    
    
    
    function onMemberChange(e: any) {
      const idx = Number(e?.detail?.value || 0)
      form.member_id = Number(memberOptions.value[idx]?.value || 0)
    }
    
    
    
    function onProductChange(e: any) {
      const idx = Number(e?.detail?.value || 0)
      const productId = Number(productOptions.value[idx]?.value || 0)
      selectProduct(productId)
    }
    
    
    
    function onQtyInput(e: any) {
      form.quantity = String(e?.detail?.value || '')
    }
    
    
    
    function onUnitChange(e: any) {
      const idx = Number(e?.detail?.value || 0)
      form.unit = String(unitOptions.value[idx]?.value || '')
    }
    
    
    
    function onRemarkInput(e: any) {
      form.remark = String(e?.detail?.value || '')
    }
    
    
    
    function memberLabel(member?: Member) {
      return member?.name || member?.phone || (member?.id ? `会员 #${member.id}` : '-')
    }
    
    
    
    function formatQty(v: any) {
      const n = Number(v || 0)
      if (!Number.isFinite(n)) return '0'
      return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
    }
    
    
    
    function formatDate(v?: string) {
      const s = String(v || '').trim()
      if (!s) return '-'
      return s.slice(0, 16).replace('T', ' ')
    }
    
    
    
    async function resetForm() {
      form.member_id = memberOptions.value[0]?.value || 0
      form.product_id = 0
      form.wine_name = ''
      form.unit = '瓶'
      form.quantity = '1'
      form.remark = ''
      unitOptions.value = [{ label: '瓶', value: '瓶' }]
      if (products.value.length) await selectProduct(getSupplierProductId(products.value[0]))
    }
    
    
    
    async function openDeposit() {
      mode.value = 'deposit'
      selectedStorage.value = null
      if (!products.value.length) await loadProducts()
      if (!products.value.length) {
        Taro.showToast({ title: '暂无可选商品，请先维护商品', icon: 'none' })
        return
      }
      await resetForm()
      sheetOpen.value = true
    }
    
    
    
    function openWithdraw(row: MemberWineStorage) {
      mode.value = 'withdraw'
      selectedStorage.value = row
      form.member_id = Number(row.member_id || 0)
      form.product_id = 0
      form.wine_name = String(row.wine_name || '')
      form.unit = String(row.unit || '瓶')
      form.quantity = '1'
      form.remark = ''
      sheetOpen.value = true
    }
    
    
    
    function closeSheet() {
      if (saving.value) return
      sheetOpen.value = false
    }
    
    
    
    function openTransactions(row: MemberWineStorage) {
      activeTab.value = 'flow'
      keyword.value = String(row.wine_name || '')
      void loadTransactions(Number(row.id || 0))
    }
    
    
    
    function switchTab(tab: 'stock' | 'flow') {
      activeTab.value = tab
      if (tab === 'flow') void loadTransactions()
    }
    
    
    
    async function loadMembers() {
      if (!auth.token) return
      members.value = await listMembers(auth.token, { page: 1, page_size: 100 })
    }
    
    
    
    function productName(p?: SupplierProduct) {
      return p?.name || p?.product_name || p?.product?.name || p?.product?.product_name || `商品 #${p?.id || ''}`
    }
    
    
    
    function getSupplierProductId(product?: SupplierProduct) {
      return Number(product?.product_id || product?.product?.id || product?.id || 0)
    }
    
    
    
    function mapSpecUnits(specs: ProductUnitSpec[], fallback: string) {
      const rows = specs
        .filter((s) => s?.is_enabled !== false)
        .map((s) => {
          const unitCode = String(s?.unit_code || '').trim()
          const unitName = String(s?.unit_name || unitCode || '').trim()
          const factor = Number(s?.factor_to_base || 1)
          return {
            label: factor > 1 ? `${unitName} x${formatQty(factor)}` : unitName,
            value: unitName || unitCode
          }
        })
        .filter((u) => u.value)
      return rows.length ? rows : [{ label: fallback || '瓶', value: fallback || '瓶' }]
    }
    
    
    
    async function selectProduct(productId: number) {
      const product = products.value.find((p) => getSupplierProductId(p) === productId)
      if (!product) return
      form.product_id = getSupplierProductId(product)
      form.wine_name = productName(product)
      const fallbackUnit = String(product.unit || product.product?.unit || '瓶').trim() || '瓶'
      unitOptions.value = [{ label: fallbackUnit, value: fallbackUnit }]
      form.unit = fallbackUnit
      if (!auth.token) return
      try {
        const specs = await listProductUnitSpecs(auth.token, getSupplierProductId(product))
        unitOptions.value = mapSpecUnits(specs, fallbackUnit)
        form.unit = unitOptions.value[0]?.value || fallbackUnit
      } catch {
        unitOptions.value = [{ label: fallbackUnit, value: fallbackUnit }]
        form.unit = fallbackUnit
      }
    }
    
    
    
    async function loadProducts() {
      if (!auth.token) return
      products.value = await listStoreSupplierProducts(auth.token, {
        store_id: auth.storeId || undefined,
        page: 1,
        page_size: 100,
        showLoading: false
      })
      if (mode.value === 'deposit' && products.value.length && !form.product_id) {
        await selectProduct(getSupplierProductId(products.value[0]))
      }
    }
    
    
    
    async function loadStorages() {
      if (!auth.token) return
      loading.value = true
      try {
        const data = await listMemberWineStorages(auth.token, {
          keyword: keyword.value.trim() || undefined,
          only_stock: 1,
          page: 1,
          page_size: 50
        })
        storages.value = data.list
        total.value = data.total
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '加载存酒失败', icon: 'none' })
      } finally {
        loading.value = false
      }
    }
    
    
    
    async function loadTransactions(storageId = 0) {
      if (!auth.token) return
      txnLoading.value = true
      try {
        const data = await listMemberWineTransactions(auth.token, {
          storage_id: storageId || undefined,
          keyword: storageId ? undefined : keyword.value.trim() || undefined,
          page: 1,
          page_size: 50
        })
        transactions.value = data.list
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '加载流水失败', icon: 'none' })
      } finally {
        txnLoading.value = false
      }
    }
    
    
    
    async function refresh() {
      if (!auth.token) {
        Taro.redirectTo({ url: '/pages/login/index' })
        return
      }
      await Promise.all([
        loadMembers(),
        loadProducts(),
        activeTab.value === 'stock' ? loadStorages() : loadTransactions()
      ])
    }
    
    
    
    async function submitAdjust() {
      if (!auth.token || saving.value) return
      const payload = {
        member_id: Number(form.member_id || 0),
        wine_name: form.wine_name.trim(),
        unit: form.unit.trim() || '瓶',
        quantity: Number(form.quantity || 0),
        remark: form.remark.trim() || undefined
      }
      if (!payload.member_id) return Taro.showToast({ title: '请选择会员', icon: 'none' })
      if (mode.value === 'deposit' && !form.product_id) return Taro.showToast({ title: '请选择商品', icon: 'none' })
      if (!payload.wine_name) return Taro.showToast({ title: '请选择商品', icon: 'none' })
      if (!payload.quantity || payload.quantity <= 0) return Taro.showToast({ title: '请填写正确数量', icon: 'none' })
      saving.value = true
      try {
        if (mode.value === 'deposit') {
          await depositMemberWine(auth.token, payload)
        } else {
          await withdrawMemberWine(auth.token, payload)
        }
        Taro.showToast({ title: '已提交', icon: 'success' })
        sheetOpen.value = false
        await loadStorages()
        if (activeTab.value === 'flow') await loadTransactions()
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '提交失败', icon: 'none' })
      } finally {
        saving.value = false
      }
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
      computed,
      reactive,
      ref,
      depositMemberWine,
      listProductUnitSpecs,
      listMemberWineStorages,
      listMemberWineTransactions,
      listMembers,
      listStoreSupplierProducts,
      withdrawMemberWine,
      useAuthStore,
      auth,
      activeTab,
      keyword,
      loading,
      txnLoading,
      saving,
      storages,
      transactions,
      members,
      products,
      unitOptions,
      total,
      sheetOpen,
      mode,
      selectedStorage,
      form,
      memberOptions,
      productOptions,
      memberIndex,
      productIndex,
      unitIndex,
      selectedMemberLabel,
      selectedProductLabel,
      selectedUnitLabel,
      onKeywordInput,
      onMemberChange,
      onProductChange,
      onQtyInput,
      onUnitChange,
      onRemarkInput,
      memberLabel,
      formatQty,
      formatDate,
      resetForm,
      openDeposit,
      openWithdraw,
      closeSheet,
      openTransactions,
      switchTab,
      loadMembers,
      productName,
      getSupplierProductId,
      mapSpecUnits,
      selectProduct,
      loadProducts,
      loadStorages,
      loadTransactions,
      refresh,
      submitAdjust,
    }
  }
}
