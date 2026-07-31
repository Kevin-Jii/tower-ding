import Taro, { useDidShow } from '@tarojs/taro'


import { ref } from 'vue'


import { createStoreReturn, listStoreReturnProducts, type StoreReturnProduct } from '../../services/api'


import { useAuthStore } from '../../stores/auth'



type ReturnLine = {
  product_id: number
  product_name: string
  quantity: string
  deposit: string
}

export default {
  setup() {
    const auth = useAuthStore()
    
    
    const products = ref<StoreReturnProduct[]>([])
    
    
    const returnDate = ref(todayStr())
    
    
    const lines = ref<ReturnLine[]>([])
    
    
    const logisticsFee = ref('')
    
    
    const remark = ref('')
    
    
    const saving = ref(false)
    
    
    
    function pad(n: number) {
      return n < 10 ? `0${n}` : `${n}`
    }
    
    
    
    function todayStr() {
      const d = new Date()
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }
    
    
    
    function moneyInputValue(e: any) {
      const raw = String(e?.detail?.value || '').replace(/[^\d.]/g, '')
      const [head, ...tail] = raw.split('.')
      return tail.length ? `${head}.${tail.join('').slice(0, 2)}` : head
    }
    
    
    
    function formatMoney(v: any) {
      const n = Number(v || 0)
      return Number.isFinite(n) ? n.toFixed(2) : '0.00'
    }
    
    
    
    function onDateChange(e: any) {
      returnDate.value = String(e?.detail?.value || returnDate.value)
    }
    
    
    
    function isSelected(productID?: number) {
      return lines.value.some((line) => line.product_id === Number(productID || 0))
    }
    
    
    
    function toggleProduct(product: StoreReturnProduct) {
      const productID = Number(product.id || 0)
      if (!productID) return
      if (isSelected(productID)) {
        removeLineByProduct(productID)
        return
      }
      lines.value.push({
        product_id: productID,
        product_name: product.product_name || '',
        quantity: '1',
        deposit: String(product.deposit ?? '')
      })
    }
    
    
    
    function removeLineByProduct(productID: number) {
      lines.value = lines.value.filter((line) => line.product_id !== Number(productID || 0))
    }
    
    
    
    function findLine(productID: number) {
      return lines.value.find((line) => line.product_id === Number(productID || 0))
    }
    
    
    
    function onQtyInput(productID: number, e: any) {
      const line = findLine(productID)
      if (!line) return
      line.quantity = moneyInputValue(e)
    }
    
    
    
    function onDepositInput(productID: number, e: any) {
      const line = findLine(productID)
      if (!line) return
      line.deposit = moneyInputValue(e)
    }
    
    
    
    function onLogisticsInput(e: any) {
      logisticsFee.value = moneyInputValue(e)
    }
    
    
    
    function onRemarkInput(e: any) {
      remark.value = String(e?.detail?.value || '')
    }
    
    
    
    async function loadProducts() {
      if (!auth.token) return Taro.redirectTo({ url: '/pages/login/index' })
      try {
        products.value = await listStoreReturnProducts(auth.token, {
          store_id: auth.storeId || undefined,
          status: 1,
          page: 1,
          page_size: 500
        })
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '加载商品失败', icon: 'none' })
      }
    }
    
    
    
    async function submitReturn() {
      if (!auth.token || saving.value) return
      const items: any[] = []
      for (const line of lines.value) {
        const qty = Number(line.quantity || 0)
        const dep = Number(line.deposit || 0)
        if (!(line.product_id > 0) || !(qty > 0)) {
          Taro.showToast({ title: '请完善返厂商品和数量', icon: 'none' })
          return
        }
        items.push({
          product_id: line.product_id,
          product_name: line.product_name,
          quantity: qty,
          deposit: dep,
          remark: ''
        })
      }
      if (!items.length) {
        Taro.showToast({ title: '请至少选择一个返厂商品', icon: 'none' })
        return
      }
      saving.value = true
      try {
        await createStoreReturn(auth.token, {
          store_id: auth.storeId || undefined,
          return_date: returnDate.value,
          logistics_fee: Number(logisticsFee.value || 0),
          remark: remark.value.trim(),
          items
        })
        Taro.showToast({ title: '已保存', icon: 'success' })
        setTimeout(() => {
          Taro.navigateBack()
        }, 350)
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '保存失败', icon: 'none' })
      } finally {
        saving.value = false
      }
    }
    
    
    
    useDidShow(() => {
      void loadProducts()
    })

    return {
      Taro,
      useDidShow,
      ref,
      createStoreReturn,
      listStoreReturnProducts,
      useAuthStore,
      auth,
      products,
      returnDate,
      lines,
      logisticsFee,
      remark,
      saving,
      pad,
      todayStr,
      moneyInputValue,
      formatMoney,
      onDateChange,
      isSelected,
      toggleProduct,
      removeLineByProduct,
      findLine,
      onQtyInput,
      onDepositInput,
      onLogisticsInput,
      onRemarkInput,
      loadProducts,
      submitReturn,
    }
  }
}
