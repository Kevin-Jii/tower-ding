import Taro, { useDidShow, usePullDownRefresh, useReachBottom, useRouter } from '@tarojs/taro'

import { computed, ref } from 'vue'

import LucideIcon from '../../components/LucideIcon.vue'
import BillTicket from '../../components/BillTicket.vue'
import {
  getStoreAccountDetail,
  getStoreAccountStats,
  listStoreAccounts,
  type Member,
  type StoreAccount
} from '../../services/api'
import { formatDateTime } from '../../shared/format'
import { useAuthStore } from '../../stores/auth'

type Preset = 'all' | '7d' | 'month'
type PaymentFilter = 0 | 1 | 2

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function dateString(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function todayString() {
  return dateString(new Date())
}

function monthStartString() {
  const date = new Date()
  date.setDate(1)
  return dateString(date)
}

function daysAgoString(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return dateString(date)
}

function readRouteParam(value: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

export default {
  components: { BillTicket, LucideIcon },
  setup() {
    const auth = useAuthStore()
    const router = useRouter()
    const memberId = Number(router.params?.id || 0)
    const member = ref<Member>({
      id: memberId,
      name: readRouteParam(router.params?.name),
      phone: readRouteParam(router.params?.phone)
    })
    const list = ref<StoreAccount[]>([])
    const stats = ref<Record<string, any>>({})
    const loading = ref(false)
    const loadingMore = ref(false)
    const page = ref(1)
    const pageSize = 10
    const hasMore = ref(true)
    const startDate = ref(monthStartString())
    const endDate = ref(todayString())
    const preset = ref<Preset>('month')
    const paymentFilter = ref<PaymentFilter>(0)
    const filterOpen = ref(false)

    const displayName = computed(() => member.value.name || member.value.phone || `会员 #${memberId}`)
    const displayPhone = computed(() => member.value.phone || '未填写手机号')
    const totalAmount = computed(() => {
      const paid = stats.value.paid_amount
      const unpaid = stats.value.unpaid_amount
      if (paid !== undefined || unpaid !== undefined) {
        return Number(paid || 0) + Number(unpaid || 0)
      }
      return list.value.reduce((sum, item) => sum + accountAmount(item), 0)
    })
    const paidAmount = computed(() => {
      if (stats.value.paid_amount !== undefined) return Number(stats.value.paid_amount || 0)
      return list.value.reduce((sum, item) => sum + (paymentStatus(item) === 1 ? accountAmount(item) : 0), 0)
    })
    const unpaidAmount = computed(() => {
      if (stats.value.unpaid_amount !== undefined) return Number(stats.value.unpaid_amount || 0)
      return Math.max(0, totalAmount.value - paidAmount.value)
    })
    const accountCount = computed(() => Number(stats.value.count ?? list.value.length ?? 0))

    function formatMoney(value: any) {
      const amount = Number(value || 0)
      return Number.isFinite(amount) ? amount.toFixed(2) : '0.00'
    }

    function accountAmount(item: StoreAccount) {
      return Number(item.gross_total_amount ?? item.total_amount ?? item.amount ?? 0)
    }

    function paymentStatus(item: StoreAccount): 1 | 2 {
      return Number(item.payment_status || 1) === 2 ? 2 : 1
    }

    function paymentLabel(item: StoreAccount) {
      return paymentStatus(item) === 2 ? '未支付' : '已支付'
    }

    function accountNo(item: StoreAccount) {
      return item.account_no || item.order_no || `记账 #${item.id}`
    }

    function operatorLabel(item: StoreAccount) {
      return item.operator?.nickname || item.operator?.username || item.operator?.phone || '-'
    }

    function itemCount(item: StoreAccount) {
      if (item.item_count !== undefined) return Number(item.item_count || 0)
      return item.items?.length || 0
    }

    function setPreset(value: Preset, immediate = true) {
      preset.value = value
      if (value === 'all') {
        startDate.value = ''
        endDate.value = ''
      } else if (value === '7d') {
        startDate.value = daysAgoString(6)
        endDate.value = todayString()
      } else {
        startDate.value = monthStartString()
        endDate.value = todayString()
      }
      if (immediate) void refresh(true)
    }

    function onStartDateChange(event: any) {
      const value = String(event?.detail?.value || '').trim()
      if (!value) return
      if (endDate.value && value > endDate.value) {
        Taro.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' })
        return
      }
      preset.value = 'all'
      startDate.value = value
    }

    function onEndDateChange(event: any) {
      const value = String(event?.detail?.value || '').trim()
      if (!value) return
      if (startDate.value && value < startDate.value) {
        Taro.showToast({ title: '结束日期不能早于开始日期', icon: 'none' })
        return
      }
      preset.value = 'all'
      endDate.value = value
    }

    function onPaymentChange(event: any) {
      paymentFilter.value = Number(event?.detail?.value || 0) as PaymentFilter
    }

    function openAccount(item: StoreAccount) {
      Taro.navigateTo({ url: `/pages/accounting/detail?id=${item.id}` })
    }

    async function fillAccountItems(accounts: StoreAccount[]) {
      if (!auth.token) return accounts
      return Promise.all(accounts.map(async (item) => {
        if (Array.isArray(item.items) && item.items.length) return item
        try {
          const detail = await getStoreAccountDetail(auth.token, item.id)
          return { ...item, items: detail.items || [] }
        } catch {
          return item
        }
      }))
    }

    async function refresh(reset = true) {
      if (!auth.token) {
        await Taro.redirectTo({ url: '/pages/login/index' })
        return
      }
      if (!memberId || loading.value || loadingMore.value) return
      if (reset) {
        page.value = 1
        hasMore.value = true
        loading.value = true
      } else {
        if (!hasMore.value) return
        loadingMore.value = true
      }
      try {
        const query = {
          store_id: auth.storeId || undefined,
          member_id: memberId,
          start_date: startDate.value || undefined,
          end_date: endDate.value || undefined,
          payment_status: paymentFilter.value || undefined,
          page: page.value,
          page_size: pageSize
        }
        const [accounts, accountStats] = await Promise.all([
          listStoreAccounts(auth.token, query),
          reset
            ? getStoreAccountStats(auth.token, {
                store_id: auth.storeId || undefined,
                member_id: memberId,
                start_date: startDate.value || undefined,
                end_date: endDate.value || undefined
              })
            : Promise.resolve(stats.value)
        ])
        const filledAccounts = await fillAccountItems(accounts)
        list.value = reset ? filledAccounts : [...list.value, ...filledAccounts]
        stats.value = accountStats
        hasMore.value = accounts.length >= pageSize
        if (hasMore.value) page.value += 1
      } catch (error: any) {
        Taro.showToast({ title: error?.message || '加载失败', icon: 'none' })
      } finally {
        loading.value = false
        loadingMore.value = false
      }
    }

    function applyFilter() {
      filterOpen.value = false
      void refresh(true)
    }

    function resetFilter() {
      setPreset('month', false)
      paymentFilter.value = 0
    }

    useDidShow(() => {
      void refresh(true)
    })

    usePullDownRefresh(async () => {
      await refresh(true)
      Taro.stopPullDownRefresh()
    })

    useReachBottom(() => {
      void refresh(false)
    })

    return {
      Taro,
      member,
      displayName,
      displayPhone,
      list,
      loading,
      loadingMore,
      hasMore,
      startDate,
      endDate,
      preset,
      paymentFilter,
      filterOpen,
      totalAmount,
      paidAmount,
      unpaidAmount,
      accountCount,
      formatMoney,
      formatDateTime,
      accountAmount,
      paymentStatus,
      paymentLabel,
      accountNo,
      operatorLabel,
      itemCount,
      setPreset,
      onStartDateChange,
      onEndDateChange,
      onPaymentChange,
      openAccount,
      applyFilter,
      resetFilter,
      refresh
    }
  }
}
