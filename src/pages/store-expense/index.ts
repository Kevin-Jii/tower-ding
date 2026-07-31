import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'


import { computed, reactive, ref } from 'vue'


import {
  createStoreExpense,
  getStoreExpenseStats,
  listDictDataByTypeCode,
  listStoreExpenses,
  type DictData,
  type StoreExpense,
  type StoreExpenseStats
} from '../../services/api'


import { useAuthStore } from '../../stores/auth'



type CategoryOption = {
  label: string
  value: string
}

export default {
  setup() {
    const EXPENSE_CATEGORY_CODE = 'EXPENDITURECLASS'
    
    
    
    const auth = useAuthStore()
    
    
    const categories = ref<DictData[]>([])
    
    
    const expenses = ref<StoreExpense[]>([])
    
    
    const stats = ref<StoreExpenseStats | null>(null)
    
    
    const loading = ref(false)
    
    
    const saving = ref(false)
    
    
    const amountText = ref('')
    
    
    const categoryFilter = ref('')
    
    
    const form = reactive({
      category_code: '',
      remark: ''
    })
    
    
    
    const categoryOptions = computed<CategoryOption[]>(() =>
      categories.value
        .filter((item) => item.status !== 0)
        .map((item) => ({
          label: String(item.label || item.value || '').trim(),
          value: String(item.value || item.label || '').trim()
        }))
        .filter((item) => item.label && item.value)
    )
    
    
    const filterOptions = computed<CategoryOption[]>(() => [{ label: '全部分类', value: '' }, ...categoryOptions.value])
    
    
    const categoryIndex = computed(() => {
      const idx = categoryOptions.value.findIndex((item) => item.value === form.category_code)
      return idx >= 0 ? idx : 0
    })
    
    
    const filterIndex = computed(() => {
      const idx = filterOptions.value.findIndex((item) => item.value === categoryFilter.value)
      return idx >= 0 ? idx : 0
    })
    
    
    const selectedCategoryLabel = computed(() => categoryLabel(form.category_code))
    
    
    const selectedFilterLabel = computed(() => categoryLabel(categoryFilter.value) || '全部分类')
    
    
    
    function moneyInputValue(e: any) {
      const raw = String(e?.detail?.value || '').replace(/[^\d.]/g, '')
      const [head, ...tail] = raw.split('.')
      return tail.length ? `${head}.${tail.join('').slice(0, 2)}` : head
    }
    
    
    
    function formatMoney(v: any) {
      const n = Number(v || 0)
      return Number.isFinite(n) ? n.toFixed(2) : '0.00'
    }
    
    
    
    function formatDate(v?: string) {
      if (!v) return '-'
      return String(v).slice(0, 10)
    }
    
    
    
    function categoryLabel(code?: string) {
      if (!code) return ''
      return categoryOptions.value.find((item) => item.value === code)?.label || ''
    }
    
    
    
    function onCategoryChange(e: any) {
      const idx = Number(e?.detail?.value || 0)
      form.category_code = categoryOptions.value[idx]?.value || ''
    }
    
    
    
    function onFilterChange(e: any) {
      const idx = Number(e?.detail?.value || 0)
      categoryFilter.value = filterOptions.value[idx]?.value || ''
      void refreshListAndStats()
    }
    
    
    
    function onAmountInput(e: any) {
      amountText.value = moneyInputValue(e)
    }
    
    
    
    function onRemarkInput(e: any) {
      form.remark = String(e?.detail?.value || '')
    }
    
    
    
    async function loadCategories() {
      if (!auth.token) return
      try {
        categories.value = await listDictDataByTypeCode(auth.token, EXPENSE_CATEGORY_CODE)
      } catch (err: any) {
        categories.value = []
        Taro.showToast({ title: err?.message || '加载支出分类失败', icon: 'none' })
      }
    }
    
    
    
    async function refreshListAndStats() {
      if (!auth.token) return Taro.redirectTo({ url: '/pages/login/index' })
      loading.value = true
      try {
        const params = {
          store_id: auth.storeId || undefined,
          category_code: categoryFilter.value || undefined
        }
        const [rows, stat] = await Promise.all([
          listStoreExpenses(auth.token, { ...params, page: 1, page_size: 50 }),
          getStoreExpenseStats(auth.token, params)
        ])
        expenses.value = rows
        stats.value = stat
      } catch (err: any) {
        expenses.value = []
        stats.value = null
        Taro.showToast({ title: err?.message || '加载支出失败', icon: 'none' })
      } finally {
        loading.value = false
      }
    }
    
    
    
    async function refresh() {
      await Promise.all([loadCategories(), refreshListAndStats()])
    }
    
    
    
    function resetForm() {
      form.category_code = ''
      form.remark = ''
      amountText.value = ''
    }
    
    
    
    async function submit() {
      if (!auth.token || saving.value) return
      const amount = Number(amountText.value || 0)
      if (!form.category_code) {
        Taro.showToast({ title: '请选择支出分类', icon: 'none' })
        return
      }
      if (!(amount > 0)) {
        Taro.showToast({ title: '请输入支出金额', icon: 'none' })
        return
      }
      saving.value = true
      try {
        await createStoreExpense(auth.token, {
          store_id: auth.storeId || undefined,
          category_code: form.category_code,
          amount,
          remark: form.remark.trim() || undefined
        })
        Taro.showToast({ title: '已保存', icon: 'success' })
        resetForm()
        await refreshListAndStats()
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '保存失败', icon: 'none' })
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
      createStoreExpense,
      getStoreExpenseStats,
      listDictDataByTypeCode,
      listStoreExpenses,
      useAuthStore,
      EXPENSE_CATEGORY_CODE,
      auth,
      categories,
      expenses,
      stats,
      loading,
      saving,
      amountText,
      categoryFilter,
      form,
      categoryOptions,
      filterOptions,
      categoryIndex,
      filterIndex,
      selectedCategoryLabel,
      selectedFilterLabel,
      moneyInputValue,
      formatMoney,
      formatDate,
      categoryLabel,
      onCategoryChange,
      onFilterChange,
      onAmountInput,
      onRemarkInput,
      loadCategories,
      refreshListAndStats,
      refresh,
      resetForm,
      submit,
    }
  }
}
