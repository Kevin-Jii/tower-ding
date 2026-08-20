import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'

import { computed, ref } from 'vue'

import {
  getMemberUnsettledAccounts,
  getStoreAccountStats,
  updateStoreAccount,
  type Member,
  type MemberUnsettledAccountGroup,
  type StoreAccount
} from '../../services/api'

import { useAuthStore } from '../../stores/auth'
import BillTicket from '../../components/BillTicket.vue'
import LucideIcon from '../../components/LucideIcon.vue'

import { formatDateTime } from '../../shared/format'

export default {
  components: { BillTicket, LucideIcon },
  setup() {
    const auth = useAuthStore()
    const list = ref<MemberUnsettledAccountGroup[]>([])
    const memberKeyword = ref('')
    const loading = ref(false)
    const expandedMemberIds = ref<number[]>([])
    const stats = ref<Awaited<ReturnType<typeof getStoreAccountStats>>>({})
    const confirmOpen = ref(false)
    const confirming = ref(false)
    const confirmAccounts = ref<StoreAccount[]>([])
    const activeConfirmMemberName = ref('')

    const pageAmount = computed(() => list.value.reduce((sum, member) => {
      return sum + Number(member.unsettled_amount || 0)
    }, 0))

    const accountCount = computed(() => list.value.reduce((sum, member) => {
      return sum + (member.unsettled_accounts?.length || 0)
    }, 0))

    const unpaidAmount = computed(() => stats.value.unpaid_amount ?? pageAmount.value)
    const unpaidAccountCount = computed(() => stats.value.unpaid_count ?? accountCount.value)
    const paidAccountCount = computed(() => stats.value.paid_count ?? 0)
    const confirmAmount = computed(() => confirmAccounts.value.reduce((sum, account) => sum + Number(accountAmount(account) || 0), 0))

    function formatMoney(value: any) {
      const amount = Number(value || 0)
      return Number.isFinite(amount) ? amount.toFixed(2) : '0.00'
    }

    function memberLabel(member?: Member | null) {
      if (!member) return '-'
      const name = String(member.name || '').trim()
      const phone = String(member.phone || '').trim()
      if (name && phone) return `${name}(${phone})`
      return name || phone || `会员 #${member.id}`
    }

    function accountAmount(account?: StoreAccount | null) {
      if (!account) return 0
      return account.gross_total_amount ?? account.total_amount ?? account.amount
    }

    function normalizeGroups(value: unknown): MemberUnsettledAccountGroup[] {
      if (!Array.isArray(value)) return []

      return value
        .filter((member): member is MemberUnsettledAccountGroup => {
          return Boolean(member && typeof member === 'object' && Number((member as MemberUnsettledAccountGroup).id) > 0)
        })
        .map((member) => ({
          ...member,
          id: Number(member.id),
          unsettled_accounts: Array.isArray(member.unsettled_accounts)
            ? member.unsettled_accounts.filter((account): account is StoreAccount => {
              return Boolean(account && typeof account === 'object' && Number((account as StoreAccount).id) > 0)
            })
            : []
        }))
    }

    function isReadOnlyAccount(account: StoreAccount) {
      return account.is_read_only === true || account.source_type === 'b2b_supply_order'
    }

    function toggleMember(memberId: number) {
      if (expandedMemberIds.value.includes(memberId)) {
        expandedMemberIds.value = expandedMemberIds.value.filter((id) => id !== memberId)
      } else {
        expandedMemberIds.value = [...expandedMemberIds.value, memberId]
      }
    }

    function isExpanded(memberId: number) {
      return expandedMemberIds.value.includes(memberId)
    }

    function expandAll() {
      expandedMemberIds.value = list.value.map((member) => Number(member.id))
    }

    function expandFirst() {
      expandedMemberIds.value = list.value.length ? [Number(list.value[0].id)] : []
    }

    function collapseAll() {
      expandedMemberIds.value = []
    }

    function openDetail(account: StoreAccount) {
      if (!account?.id) return
      Taro.navigateTo({ url: `/pages/accounting/unpaid-detail?id=${account.id}` })
    }

    function openConfirm(accounts: StoreAccount[], memberName = '') {
      const available = accounts.filter((account) => !isReadOnlyAccount(account) && !account.is_canceled)
      if (!available.length) {
        Taro.showToast({ title: '当前账单不可标记为已支付', icon: 'none' })
        return
      }
      confirmAccounts.value = available
      activeConfirmMemberName.value = memberName
      confirmOpen.value = true
    }

    function closeConfirm() {
      if (!confirming.value) confirmOpen.value = false
    }

    function onKeywordInput(event: any) {
      memberKeyword.value = String(event?.detail?.value || '')
    }

    async function loadAccounts() {
      if (!auth.token) return
      const [data, summary] = await Promise.all([
        getMemberUnsettledAccounts(auth.token, {
          store_id: auth.storeId || undefined,
          keyword: memberKeyword.value.trim() || undefined
        }),
        getStoreAccountStats(auth.token, {
          store_id: auth.storeId || undefined
        }).catch(() => ({}))
      ])
      stats.value = summary
      list.value = normalizeGroups(data)
      expandFirst()
    }

    async function refresh() {
      if (!auth.token) {
        Taro.redirectTo({ url: '/pages/login/index' })
        return
      }
      loading.value = true
      try {
        await loadAccounts()
      } catch (err: any) {
        list.value = []
        Taro.showToast({ title: err?.message || '加载待结账会员失败', icon: 'none' })
      } finally {
        loading.value = false
      }
    }

    async function confirmPayment() {
      if (!auth.token || confirming.value || !confirmAccounts.value.length) return
      confirming.value = true
      try {
        for (const account of confirmAccounts.value) {
          await updateStoreAccount(auth.token, account.id, { payment_status: 1 })
        }
        Taro.showToast({ title: '账单已结清', icon: 'success' })
        confirmOpen.value = false
        await refresh()
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '修改失败', icon: 'none' })
      } finally {
        confirming.value = false
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
      ref,
      getMemberUnsettledAccounts,
      updateStoreAccount,
      useAuthStore,
      auth,
      list,
      memberKeyword,
      total: computed(() => list.value.length),
      loading,
      expandedMemberIds,
      stats,
      pageAmount,
      accountCount,
      unpaidAmount,
      unpaidAccountCount,
      paidAccountCount,
      confirmOpen,
      confirming,
      confirmAccounts,
      activeConfirmMemberName,
      confirmAmount,
      formatMoney,
      formatDateTime,
      memberLabel,
      accountAmount,
      isReadOnlyAccount,
      toggleMember,
      isExpanded,
      expandAll,
      collapseAll,
      openDetail,
      openConfirm,
      closeConfirm,
      expandFirst,
      onKeywordInput,
      loadAccounts,
      refresh,
      confirmPayment,
    }
  }
}
