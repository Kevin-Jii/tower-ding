import Taro, { useDidShow, usePullDownRefresh, useRouter } from '@tarojs/taro'


import { ref } from 'vue'


import LucideIcon from '../../components/LucideIcon.vue'


import {
  listB2BSupplyOrders,
  updateB2BSupplyOrderDeliveryStatus,
  updateB2BSupplyOrderPaymentStatus,
  type B2BSupplyOrder
} from '../../services/api'


import { useAuthStore } from '../../stores/auth'

export default {
  components: { LucideIcon },
  setup() {
    const auth = useAuthStore()
    
    
    const router = useRouter()
    
    
    const customerId = Number(router.params?.customer_id || 0)
    
    
    const customerName = decodeURIComponent(String(router.params?.customer_name || ''))
    
    
    const orders = ref<B2BSupplyOrder[]>([])
    
    
    const loading = ref(false)


    const actionLoading = ref('')
    
    
    
    function formatMoney(v: any) {
      const n = Number(v || 0)
      return Number.isFinite(n) ? n.toFixed(2) : '0.00'
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



    function paymentTone(v?: number) {
      if (Number(v) === 3) return 'success'
      if (Number(v) === 2) return 'warning'
      return 'pending'
    }



    function deliveryTone(v?: number) {
      if (Number(v) === 2) return 'success'
      if (Number(v) === 3) return 'cancelled'
      return 'pending'
    }
    
    
    
    function canEditToday(row: B2BSupplyOrder) {
      const s = String(row.created_at || '').trim()
      if (!s) return false
      const d = new Date(s)
      if (Number.isNaN(d.getTime())) return false
      const now = new Date()
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
    }



    function canMarkDelivered(row: B2BSupplyOrder) {
      return canEditToday(row) && Number(row.delivery_status) !== 2 && Number(row.delivery_status) !== 3
    }



    function canMarkPaid(row: B2BSupplyOrder) {
      return canEditToday(row) && Number(row.payment_status) !== 3
    }



    function hasAvailableActions(row: B2BSupplyOrder) {
      return canMarkDelivered(row) || canMarkPaid(row)
    }



    function isActionLoading(row: B2BSupplyOrder, action: 'delivery' | 'payment') {
      return actionLoading.value === `${action}:${row.id}`
    }
    
    
    
    async function refresh() {
      if (!auth.token) {
        Taro.redirectTo({ url: '/pages/login/index' })
        return
      }
      loading.value = true
      try {
        orders.value = await listB2BSupplyOrders(auth.token, {
          store_id: auth.storeId || undefined,
          customer_id: customerId || undefined,
          page: 1,
          page_size: 50
        })
      } catch (err: any) {
        orders.value = []
        Taro.showToast({ title: err?.message || '加载供货单失败', icon: 'none' })
      } finally {
        loading.value = false
      }
    }
    
    
    
    async function markDelivered(row: B2BSupplyOrder) {
      if (!auth.token || actionLoading.value || !canMarkDelivered(row)) return
      actionLoading.value = `delivery:${row.id}`
      try {
        await updateB2BSupplyOrderDeliveryStatus(auth.token, row.id, { delivery_status: 2 })
        await refresh()
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '操作失败', icon: 'none' })
      } finally {
        actionLoading.value = ''
      }
    }
    
    
    
    async function markPaid(row: B2BSupplyOrder) {
      if (!auth.token || actionLoading.value || !canMarkPaid(row)) return
      actionLoading.value = `payment:${row.id}`
      try {
        await updateB2BSupplyOrderPaymentStatus(auth.token, row.id, {
          payment_status: 3,
          paid_amount: Number(row.total_amount || 0)
        })
        await refresh()
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '操作失败', icon: 'none' })
      } finally {
        actionLoading.value = ''
      }
    }
    
    
    
    function openCreate() {
      Taro.navigateTo({ url: `/pages/b2b/supply-order-form${customerId ? `?customer_id=${customerId}` : ''}` })
    }
    
    
    
    function openDetail(id: number) {
      Taro.navigateTo({ url: `/pages/b2b/supply-order-detail?id=${id}` })
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
      useRouter,
      ref,
      LucideIcon,
      listB2BSupplyOrders,
      updateB2BSupplyOrderDeliveryStatus,
      updateB2BSupplyOrderPaymentStatus,
      useAuthStore,
      auth,
      router,
      customerId,
      customerName,
      orders,
      loading,
      actionLoading,
      formatMoney,
      formatDate,
      paymentLabel,
      deliveryLabel,
      paymentTone,
      deliveryTone,
      canEditToday,
      canMarkDelivered,
      canMarkPaid,
      hasAvailableActions,
      isActionLoading,
      refresh,
      markDelivered,
      markPaid,
      openCreate,
      openDetail,
    }
  }
}
