import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'

import { computed, ref } from 'vue'

import {
  getMemberUnsettledAccounts,
  getStoreAccountStats,
  listB2BSupplyOrders,
  listStoreAccounts,
  updateB2BSupplyOrderPaymentStatus,
  updateStoreAccount,
  type B2BSupplyOrder,
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
    type UnpaidGroup = MemberUnsettledAccountGroup & {
      customer_kind?: 'member' | 'b2b' | 'other'
      customer_id?: number
      order_no?: string
      account_id?: number
    }

    const memberList = ref<UnpaidGroup[]>([])
    const b2bList = ref<UnpaidGroup[]>([])
    const otherList = ref<UnpaidGroup[]>([])
    const activeTab = ref<'member' | 'b2b' | 'other'>('member')
    const memberKeyword = ref('')
    const loading = ref(false)
    let refreshSequence = 0
    const expandedMemberIds = ref<number[]>([])
    const stats = ref<Awaited<ReturnType<typeof getStoreAccountStats>>>({})
    const confirmOpen = ref(false)
    const confirming = ref(false)
    const confirmAccounts = ref<StoreAccount[]>([])
    const activeConfirmMemberName = ref('')

    const list = computed(() => {
      if (activeTab.value === 'b2b') return b2bList.value
      if (activeTab.value === 'other') return otherList.value
      return memberList.value
    })

    const pageAmount = computed(() => list.value.reduce((sum, member) => {
      return sum + Number(member.unsettled_amount || 0)
    }, 0))

    const accountCount = computed(() => list.value.reduce((sum, member) => {
      return sum + (member.unsettled_accounts?.length || 0)
    }, 0))

    const unpaidAmount = computed(() => pageAmount.value)
    const unpaidAccountCount = computed(() => accountCount.value)
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

    function normalizeGroups(value: unknown): UnpaidGroup[] {
      if (!Array.isArray(value)) return []

      return value
        .filter((member): member is UnpaidGroup => {
          return Boolean(member && typeof member === 'object' && Number((member as MemberUnsettledAccountGroup).id) > 0)
        })
        .map((member) => ({
          ...member,
          customer_kind: 'member',
          id: Number(member.id),
          unsettled_accounts: Array.isArray(member.unsettled_accounts)
            ? member.unsettled_accounts.filter((account): account is StoreAccount => {
              return Boolean(account && typeof account === 'object' && Number((account as StoreAccount).id) > 0)
            })
            : []
        }))
    }

    function normalizeB2BGroups(orders: B2BSupplyOrder[]): UnpaidGroup[] {
      const groups = new Map<number, UnpaidGroup>()
      orders
        .filter((order) => Number(order.payment_status) !== 3)
        .forEach((order) => {
          const customerId = Number(order.customer_id || 0)
          if (!customerId) return
          const existing = groups.get(customerId)
          const account = {
            id: Number(order.id),
            account_no: order.order_no,
            order_no: order.order_no,
            store_id: order.store_id,
            payment_status: 2,
            channel: 'B2B供货',
            source_type: 'b2b_supply_order',
            source_id: Number(order.id),
            total_amount: Number(order.unpaid_amount ?? order.total_amount ?? 0),
            item_count: order.items?.length || 0,
            remark: order.remark,
            account_date: order.order_date,
            created_at: order.created_at,
            items: (order.items || []).map((item) => ({
              id: Number(item.id || 0),
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity,
              unit: item.unit_name,
              price: item.supply_price,
              amount: item.amount,
              spec: item.unit_name,
              remark: item.remark
            }))
          } as StoreAccount
          if (existing) {
            existing.unsettled_accounts = [...(existing.unsettled_accounts || []), account]
            existing.unsettled_amount = Number(existing.unsettled_amount || 0) + Number(account.total_amount || 0)
          } else {
            groups.set(customerId, {
              id: customerId,
              customer_id: customerId,
              customer_kind: 'b2b',
              name: order.customer_name || `B2B客户 #${customerId}`,
              phone: order.customer?.phone,
              unsettled_amount: Number(account.total_amount || 0),
              unsettled_accounts: [account]
            })
          }
        })
      return Array.from(groups.values())
    }

    function normalizeOtherGroups(accounts: StoreAccount[]): UnpaidGroup[] {
      const groups = new Map<string, UnpaidGroup>()
      accounts
        .filter((account) => {
          return Number(account.payment_status) === 2 &&
            !account.is_canceled &&
            !Number(account.member_id || account.member?.id || 0) &&
            account.source_type !== 'b2b_supply_order'
        })
        .forEach((account) => {
          const orderNo = String(account.order_no || '').trim()
          // 同一外部订单号归为一组；没有订单号时每笔记账单独成组。
          const groupKey = orderNo ? `order:${orderNo}` : `account:${account.id}`
          const existing = groups.get(groupKey)
          if (existing) {
            existing.unsettled_accounts = [...(existing.unsettled_accounts || []), account]
            existing.unsettled_amount = Number(existing.unsettled_amount || 0) + Number(accountAmount(account) || 0)
            return
          }
          groups.set(groupKey, {
            id: -Number(account.id),
            customer_kind: 'other',
            order_no: orderNo || undefined,
            account_id: orderNo ? undefined : Number(account.id),
            name: orderNo ? `订单 ${orderNo}` : (account.account_no || `账单 #${account.id}`),
            unsettled_amount: Number(accountAmount(account) || 0),
            unsettled_accounts: [account]
          })
        })
      return Array.from(groups.values())
    }

    function isB2BAccount(account: StoreAccount) {
      return account.source_type === 'b2b_supply_order'
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
      if (isB2BAccount(account)) {
        Taro.navigateTo({ url: `/pages/b2b/supply-order-detail?id=${account.source_id || account.id}` })
        return
      }
      Taro.navigateTo({ url: `/pages/accounting/detail?id=${account.id}` })
    }

    function openUnpaidDetail(member: UnpaidGroup) {
      if (member.customer_kind === 'other') {
        const query = member.order_no
          ? `order_no=${encodeURIComponent(member.order_no)}`
          : `account_id=${Number(member.account_id || Math.abs(member.id))}`
        Taro.navigateTo({ url: `/pages/accounting/unpaid-detail?customer_kind=other&${query}` })
        return
      }
      if (!member?.id) return
      Taro.navigateTo({ url: `/pages/accounting/unpaid-detail?member_id=${member.id}` })
    }

    function openConfirm(accounts: StoreAccount[], memberName = '') {
      const available = accounts.filter((account) => (isB2BAccount(account) || !isReadOnlyAccount(account)) && !account.is_canceled)
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

    function clearKeyword() {
      memberKeyword.value = ''
      void refresh()
    }

    function selectTab(tab: 'member' | 'b2b' | 'other') {
      if (activeTab.value === tab) return
      activeTab.value = tab
      // 三种客户使用不同的搜索字段，切换时不能沿用上一标签的关键词。
      memberKeyword.value = ''
      expandedMemberIds.value = []
      void refresh()
    }

    async function loadOtherAccounts() {
      if (!auth.token) return []
      const accounts: StoreAccount[] = []
      const pageSize = 100
      let currentPage = 1
      while (true) {
        const rows = await listStoreAccounts(auth.token, {
          store_id: auth.storeId || undefined,
          payment_status: 2,
          order_no: memberKeyword.value.trim() || undefined,
          page: currentPage,
          page_size: pageSize
        })
        accounts.push(...rows)
        if (rows.length < pageSize) break
        currentPage += 1
      }
      return accounts
    }

    async function loadAccounts(tab = activeTab.value) {
      if (!auth.token) return
      const summaryPromise = getStoreAccountStats(auth.token, {
        store_id: auth.storeId || undefined
      }).catch(() => ({}))
      if (tab === 'b2b') {
        const [orders, summary] = await Promise.all([
          listB2BSupplyOrders(auth.token, {
            store_id: auth.storeId || undefined,
            keyword: memberKeyword.value.trim() || undefined,
            page: 1,
            page_size: 100
          }),
          summaryPromise
        ])
        stats.value = summary
        b2bList.value = normalizeB2BGroups(orders)
        expandFirst()
        return
      }
      if (tab === 'other') {
        const [accounts, summary] = await Promise.all([
          loadOtherAccounts(),
          summaryPromise
        ])
        stats.value = summary
        otherList.value = normalizeOtherGroups(accounts)
        expandFirst()
        return
      }
      const [data, summary] = await Promise.all([
        getMemberUnsettledAccounts(auth.token, {
          store_id: auth.storeId || undefined,
          keyword: memberKeyword.value.trim() || undefined
        }),
        summaryPromise
      ])
      stats.value = summary
      memberList.value = normalizeGroups(data)
      expandFirst()
    }

    async function refresh() {
      if (!auth.token) {
        Taro.redirectTo({ url: '/pages/login/index' })
        return
      }
      const sequence = ++refreshSequence
      const requestedTab = activeTab.value
      loading.value = true
      try {
        await loadAccounts(requestedTab)
      } catch (err: any) {
        if (sequence !== refreshSequence || requestedTab !== activeTab.value) return
        if (requestedTab === 'member') memberList.value = []
        if (requestedTab === 'b2b') b2bList.value = []
        if (requestedTab === 'other') otherList.value = []
        const tabLabel = requestedTab === 'b2b' ? 'B2B客户' : requestedTab === 'other' ? '其他客户' : '会员'
        Taro.showToast({ title: err?.message || `加载待结账${tabLabel}失败`, icon: 'none' })
      } finally {
        if (sequence === refreshSequence) loading.value = false
      }
    }

    async function confirmPayment() {
      if (!auth.token || confirming.value || !confirmAccounts.value.length) return
      confirming.value = true
      try {
        for (const account of confirmAccounts.value) {
          if (isB2BAccount(account)) {
            await updateB2BSupplyOrderPaymentStatus(auth.token, Number(account.source_id || account.id), {
              payment_status: 3,
              paid_amount: Number(account.total_amount || 0)
            })
          } else {
            await updateStoreAccount(auth.token, account.id, { payment_status: 1 })
          }
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
      activeTab,
      memberList,
      b2bList,
      otherList,
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
      openUnpaidDetail,
      openConfirm,
      closeConfirm,
      expandFirst,
      onKeywordInput,
      clearKeyword,
      selectTab,
      isB2BAccount,
      normalizeOtherGroups,
      loadOtherAccounts,
      loadAccounts,
      refresh,
      confirmPayment,
    }
  }
}
