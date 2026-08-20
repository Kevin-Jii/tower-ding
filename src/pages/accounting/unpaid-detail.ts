import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { computed, ref } from 'vue'

import {
  getStoreAccountDetail,
  type StoreAccount
} from '../../services/api'

import { useAuthStore } from '../../stores/auth'

import { formatDateTime } from '../../shared/format'

export default {
  setup() {
    const auth = useAuthStore()
    const router = useRouter()
    const id = Number(router.params?.id || 0)
    const detail = ref<StoreAccount | null>(null)

    const displayTotalAmount = computed(() => {
      const account = detail.value
      return account?.gross_total_amount ?? account?.total_amount ?? account?.amount ?? 0
    })

    const displayOperator = computed(() => {
      const account = detail.value
      return account?.operator?.nickname
        || account?.operator?.username
        || account?.operator_name
        || account?.operator?.phone
        || account?.operator_phone
        || '-'
    })

    const displayOperatorPhone = computed(() => {
      const account = detail.value
      const phone = account?.operator?.phone || account?.operator_phone || ''
      return phone && phone !== displayOperator.value ? phone : ''
    })

    const itemCount = computed(() => detail.value?.items?.length || 0)

    function formatMoney(value: unknown) {
      const amount = Number(value || 0)
      return Number.isFinite(amount) ? amount.toFixed(2) : '0.00'
    }

    function formatQuantity(value: unknown) {
      const amount = Number(value)
      if (!Number.isFinite(amount)) return '0'
      return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(/\.?0+$/, '')
    }

    function itemAmount(item: NonNullable<StoreAccount['items']>[number]) {
      const directAmount = Number(item.amount)
      if (Number.isFinite(directAmount) && directAmount !== 0) return directAmount
      return Number(item.price || 0) * Number(item.quantity || 0)
    }

    async function refresh() {
      if (!auth.token || !id) return
      try {
        detail.value = await getStoreAccountDetail(auth.token, id)
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '加载账单失败', icon: 'none' })
      }
    }

    useDidShow(() => {
      void refresh()
    })

    return {
      detail,
      displayTotalAmount,
      displayOperator,
      displayOperatorPhone,
      itemCount,
      formatDateTime,
      formatMoney,
      formatQuantity,
      itemAmount,
      refresh,
    }
  }
}
