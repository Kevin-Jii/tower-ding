import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { computed, ref } from 'vue'

import {
  getMemberUnsettledAccounts,
  type MemberUnsettledAccountGroup,
  type StoreAccount
} from '../../services/api'

import { useAuthStore } from '../../stores/auth'

import { formatDateTime } from '../../shared/format'

export default {
  setup() {
    const auth = useAuthStore()
    const router = useRouter()
    const memberId = Number(router.params?.member_id || 0)
    const member = ref<MemberUnsettledAccountGroup | null>(null)
    const loading = ref(false)

    const accounts = computed(() => member.value?.unsettled_accounts || [])
    const totalAmount = computed(() => accounts.value.reduce((sum, account) => sum + accountAmount(account), 0))
    const totalItemCount = computed(() => accounts.value.reduce((sum, account) => sum + (account.items?.length || 0), 0))

    function accountAmount(account: StoreAccount) {
      return Number(account.gross_total_amount ?? account.total_amount ?? account.amount ?? 0)
    }

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
      const amount = Number(item.amount)
      if (Number.isFinite(amount) && amount !== 0) return amount
      return Number(item.price || 0) * Number(item.quantity || 0)
    }

    function operatorName(account: StoreAccount) {
      return account.operator?.nickname
        || account.operator?.username
        || account.operator_name
        || account.operator?.phone
        || account.operator_phone
        || '-'
    }

    async function refresh() {
      if (!auth.token) return
      loading.value = true
      try {
        if (memberId) {
          const groups = await getMemberUnsettledAccounts(auth.token, {
            store_id: auth.storeId || undefined,
            member_id: memberId
          })
          member.value = groups.find((item) => Number(item.id) === memberId) || groups[0] || null
        }
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '加载账单失败', icon: 'none' })
      } finally {
        loading.value = false
      }
    }

    useDidShow(() => {
      void refresh()
    })

    return {
      member,
      accounts,
      loading,
      totalAmount,
      totalItemCount,
      accountAmount,
      formatDateTime,
      formatMoney,
      formatQuantity,
      itemAmount,
      operatorName,
      refresh,
    }
  }
}
