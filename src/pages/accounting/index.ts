import { Picker, Switch } from '@tarojs/components'


import Taro, { useDidShow, usePullDownRefresh, useReachBottom } from '@tarojs/taro'


import { computed, ref } from 'vue'


import elemeIcon from '../../assets/platforms/eleme.png'


import jdIcon from '../../assets/platforms/jd.png'


import meituanIcon from '../../assets/platforms/meituan.png'


import miniappIcon from '../../assets/platforms/miniapp.png'


import storeIcon from '../../assets/platforms/store.png'


import taobaoIcon from '../../assets/platforms/taobao.png'


import wechatIcon from '../../assets/platforms/wechat.png'


import LucideIcon from '../../components/LucideIcon.vue'


import {
  getStoreAccountStats,
  bindStoreAccountConsumables,
  cancelStoreAccount,
  getStoreAccountDetail,
  listDictDataByTypeCode,
  listMembers,
  listStoreAccounts,
  listStoreAccountConsumableProducts,
  updateStoreAccount,
  type DictData,
  type Member,
  type StoreAccount,
  type StoreAccountConsumableProduct
} from '../../services/api'


import { useAuthStore } from '../../stores/auth'


import { formatDateTime } from '../../shared/format'

export default {
  components: { LucideIcon },
  setup() {
    const auth = useAuthStore()
    
    
    const list = ref<StoreAccount[]>([])
    
    
    const stats = ref<{
      gross_total_amount?: number
      total_amount?: number
      total_turnover_amount?: number
      store_account_turnover_amount?: number
      count?: number
    } | null>(null)
    
    
    const channelDict = ref<Record<string, string>>({})
    
    
    const channelOptions = ref<Array<{ label: string; value: string }>>([])
    
    
    const members = ref<Member[]>([])
    
    
    const today = businessDateStr()
    
    
    const accountDate = ref(today)
    
    
    const metaSheetOpen = ref(false)
    
    
    const editingAccount = ref<StoreAccount | null>(null)
    
    
    const paymentStatus = ref(1)
    
    
    const editIsErrandOrder = ref(0)
    
    
    const editErrandFee = ref('')
    
    
    const editIsRounding = ref(0)
    
    
    const editRoundingAmount = ref('')
    
    
    const paymentFilter = ref(0)
    
    
    const memberKeyword = ref('')
    
    
    const filterSheetOpen = ref(false)
    
    
    const savingMeta = ref(false)
    
    
    const consumableSheetOpen = ref(false)
    
    
    const consumableSaving = ref(false)
    
    
    const consumableTarget = ref<StoreAccount | null>(null)
    
    
    const consumableProducts = ref<StoreAccountConsumableProduct[]>([])
    
    
    const consumableLines = ref<Array<{ kind: 'product' | 'custom'; consumable_product_id: number; quantity: string; name: string; amount: string }>>([])
    
    
    const page = ref(1)
    
    
    const pageSize = 10
    
    
    const hasMore = ref(true)
    
    
    const loadingMore = ref(false)
    
    
    const refreshing = ref(false)


    const swipeOpenId = ref(0)


    const swipeMovingId = ref(0)


    const swipeStartX = ref(0)


    const swipeStartY = ref(0)


    const swipeStartOpen = ref(false)


    const swipeDeltaX = ref(0)


    const cancelingId = ref(0)


    const cancelActionWidth = 132
    
    
    const paymentFilterOptions = [
      { label: '全部', value: 0 },
      { label: '已支付', value: 1 },
      { label: '未支付', value: 2 }
    ]
    
    
    
    const queryRange = computed(() => {
      return {
        start_date: accountDate.value || undefined,
        end_date: accountDate.value || undefined
      }
    })
    
    
    
    const consumableProductOptions = computed(() =>
      consumableProducts.value.map((p) => ({ label: `${p.name || `消耗品 #${p.id}`}（¥${formatMoney(p.cost_price)}）`, value: p.id }))
    )
    
    
    const consumableProductMap = computed(() => {
      const map = new Map<number, StoreAccountConsumableProduct>()
      consumableProducts.value.forEach((p) => map.set(Number(p.id || 0), p))
      return map
    })
    
    
    const consumableBindTotal = computed(() => {
      return consumableLines.value.reduce((sum, line) => {
        if (line.kind === 'custom') return sum + Number(line.amount || 0)
        const p = consumableProductMap.value.get(Number(line.consumable_product_id || 0))
        return sum + Number(p?.cost_price || 0) * Number(line.quantity || 0)
      }, 0)
    })
    
    
    const paymentFilterIndex = computed(() => {
      const i = paymentFilterOptions.findIndex((item) => item.value === paymentFilter.value)
      return i >= 0 ? i : 0
    })
    
    
    const paymentFilterLabel = computed(() => paymentFilterOptions[paymentFilterIndex.value]?.label || '全部')
    
    
    const activeFilterCount = computed(() => {
      let count = 0
      if (memberKeyword.value.trim()) count += 1
      if (paymentFilter.value) count += 1
      return count
    })
    
    
    const totalTurnoverAmount = computed(() => {
      return Number(stats.value?.total_turnover_amount ?? stats.value?.gross_total_amount ?? stats.value?.total_amount ?? 0)
    })
    
    
    function pad(n: number) {
      return n < 10 ? `0${n}` : `${n}`
    }
    
    
    
    function businessDate() {
      const now = new Date()
      if (now.getHours() < 5) now.setDate(now.getDate() - 1)
      now.setHours(0, 0, 0, 0)
      return now
    }
    
    
    
    function businessDateStr() {
      const now = businessDate()
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    }
    
    
    
    function onAccountDateChange(e: any) {
      accountDate.value = String(e?.detail?.value || '').trim()
      void refresh()
    }
    
    
    
    function formatMoney(v: any) {
      const n = Number(v || 0)
      return Number.isFinite(n) ? n.toFixed(2) : '0.00'
    }
    
    
    
    function formatQty(v: any) {
      const n = Number(v || 0)
      if (!Number.isFinite(n)) return '0'
      return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
    }
    
    
    
    function accountItems(item: StoreAccount) {
      return Array.isArray(item.items) ? item.items : []
    }
    
    
    
    function displayAccountAmount(item: StoreAccount) {
      const total = Number(item.gross_total_amount ?? item.total_amount ?? item.amount ?? 0)
      // const errandFee = Number(item.errand_fee || 0)
      const roundAmount = Number(item.round_amount || 0)
      return Math.max(0, Math.round((total - roundAmount) * 100) / 100)
    }
    
    
    
    function mapDict(rows: DictData[]) {
      const map: Record<string, string> = {}
      rows.forEach((r) => {
        const value = String(r?.value || '').trim()
        if (!value) return
        map[value] = String(r?.label || r?.value || '').trim() || value
      })
      return map
    }
    
    
    
    function channelLabel(channel?: string) {
      const code = String(channel || '').trim()
      if (!code) return '—'
      return channelDict.value[code] || code
    }
    
    
    
    function channelText(item: StoreAccount) {
      return `${item.channel || ''} ${channelLabel(item.channel)}`.toLowerCase()
    }
    
    
    
    function platformInfo(item: StoreAccount) {
      const text = channelText(item)
      if (text.includes('美团') || text.includes('meituan')) {
        return { label: '美团', icon: meituanIcon }
      }
      if (text.includes('饿了么') || text.includes('eleme') || text.includes('elm')) {
        return { label: '饿了么', icon: elemeIcon }
      }
      if (text.includes('淘宝') || text.includes('闪购') || text.includes('taobao') || text.includes('shangou')) {
        return { label: text.includes('闪购') || text.includes('shangou') ? '淘宝闪购' : '淘宝', icon: taobaoIcon }
      }
      if (text.includes('京东') || text.includes('jingdong') || text.includes('jd')) {
        return { label: '京东', icon: jdIcon }
      }
      if (text.includes('商城') || text.includes('小程序') || text.includes('mall') || text.includes('miniapp')) {
        return { label: '商城小程序', icon: miniappIcon }
      }
      if (text.includes('微信') || text.includes('wechat')) {
        return { label: '微信', icon: wechatIcon }
      }
      if (text.includes('线下') || text.includes('门店') || text.includes('offline') || text.includes('store')) {
        return { label: '线下门店', icon: storeIcon }
      }
      return null
    }
    
    
    
    function platformIcon(item: StoreAccount) {
      return platformInfo(item)?.icon || ''
    }
    
    
    
    function platformLabel(item: StoreAccount) {
      return platformInfo(item)?.label || ''
    }
    
    
    
    function orderDisplayNo(item: StoreAccount) {
      return item.order_no || item.account_no || `记账 #${item.id}`
    }
    
    
    
    function rowDisplayNo(item: StoreAccount) {
      if (item.member) return memberLabel(item.member)
      return orderDisplayNo(item)
    }
    
    
    
    function operatorLabel(item: StoreAccount) {
      const operator = item.operator
      return operator?.nickname || operator?.username || operator?.phone || '-'
    }
    
    
    
    function isOnlinePaidChannel(item: StoreAccount) {
      const text = channelText(item)
      return [
        '外卖',
        '美团',
        '饿了么',
        '淘宝',
        '闪购',
        '京东',
        '商城',
        '小程序',
        'waimai',
        'takeaway',
        'delivery',
        'meituan',
        'eleme',
        'elm',
        'taobao',
        'shangou',
        'jingdong',
        'jd',
        'mall',
        'miniapp'
      ].some((keyword) => text.includes(keyword))
    }
    
    
    
    function paymentStatusValue(item: StoreAccount) {
      return Number(item.payment_status || 1) === 2 ? 2 : 1
    }
    
    
    
    function paymentStatusLabel(v?: number) {
      return Number(v || 1) === 2 ? '未支付' : '已支付'
    }



    function isCanceledAccount(item?: StoreAccount | null) {
      return item?.is_canceled === true
    }



    function isReadOnlyAccount(item?: StoreAccount | null) {
      return item?.is_read_only === true || item?.source_type === 'b2b_supply_order'
    }



    function canCancelAccount(item: StoreAccount) {
      if (isCanceledAccount(item) || isReadOnlyAccount(item)) return false
      if (typeof item.can_cancel === 'boolean') return item.can_cancel
      return true
    }
    
    
    
    function canEditAccount(item: StoreAccount) {
      if (isCanceledAccount(item) || isReadOnlyAccount(item)) return false
      if (typeof item.can_edit === 'boolean') return item.can_edit
      const d = accountCreatedAt(item)
      if (!d) return false
      const now = new Date()
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
    }
    
    
    
    function accountCreatedAt(item: StoreAccount) {
      const s = String(item.created_at || '').trim()
      if (!s) return null
      const d = new Date(s)
      if (Number.isNaN(d.getTime())) return false
      return d
    }
    
    
    
    function canEditPaymentStatus(item: StoreAccount) {
      if (isCanceledAccount(item) || isReadOnlyAccount(item)) return false
      const d = accountCreatedAt(item)
      if (!d) return false
      const now = new Date()
      return now.getTime() - d.getTime() >= 0 && now.getTime() - d.getTime() < 5 * 24 * 60 * 60 * 1000
    }
    
    
    
    function hasConsumables(item: StoreAccount) {
      return (item.consumables?.length || 0) > 0
    }
    
    
    
    function canBindConsumables(item: StoreAccount) {
      if (isCanceledAccount(item) || isReadOnlyAccount(item)) return false
      if (typeof item.can_bind_consumables === 'boolean') return item.can_bind_consumables
      return !hasConsumables(item)
    }
    
    
    
    function canOpenMetaSheet(item: StoreAccount) {
      if (isCanceledAccount(item) || isReadOnlyAccount(item)) return false
      return !hasConsumables(item) && canEditPaymentStatus(item)
    }
    
    
    
    function memberLabel(member?: Member | null) {
      if (!member) return '-'
      const name = String(member.name || '').trim()
      const phone = String(member.phone || '').trim()
      if (name && phone) return `${name}(${phone})`
      return name || phone || `会员 #${member.id}`
    }
    
    
    
    function accountMemberLabel(item: StoreAccount) {
      if (item.member) return memberLabel(item.member)
      const mid = Number(item.member_id || 0)
      return mid > 0 ? `会员 #${mid}` : '-'
    }
    
    
    
    function onMemberKeywordInput(e: any) {
      memberKeyword.value = String(e?.detail?.value || '')
    }
    
    
    
    function onPaymentFilterChange(e: any) {
      const idx = Number(e?.detail?.value ?? 0)
      paymentFilter.value = paymentFilterOptions[idx]?.value || 0
    }
    
    
    
    function openFilterSheet() {
      filterSheetOpen.value = true
    }
    
    
    
    function closeFilterSheet() {
      filterSheetOpen.value = false
    }
    
    
    
    function resetFilters() {
      memberKeyword.value = ''
      paymentFilter.value = 0
      filterSheetOpen.value = false
      void refresh(true)
    }
    
    
    
    function applyFilters() {
      filterSheetOpen.value = false
      void refresh(true)
    }
    
    
    
    async function loadChannelDict() {
      if (!auth.token) return
      try {
        const rows = await listDictDataByTypeCode(auth.token, 'sales_channel')
        channelDict.value = mapDict(rows)
        channelOptions.value = rows
          .map((r) => ({
            label: String(r?.label || r?.value || '').trim() || String(r?.value || ''),
            value: String(r?.value || '').trim()
          }))
          .filter((o) => o.value)
      } catch {
        channelDict.value = {}
        channelOptions.value = []
      }
    }
    
    
    
    async function loadMembers(keyword = '') {
      if (!auth.token) return
      try {
        members.value = await listMembers(auth.token, {
          keyword: keyword || undefined,
          page: 1,
          page_size: 100
        })
      } catch {
        members.value = []
      }
    }
    
    
    
    async function loadConsumableProducts() {
      if (!auth.token) return
      try {
        consumableProducts.value = await listStoreAccountConsumableProducts(auth.token, {
          store_id: auth.storeId || undefined,
          page: 1,
          page_size: 500,
          showLoading: false
        })
      } catch {
        consumableProducts.value = []
      }
    }
    
    
    
    async function refresh(reset = true) {
      if (!auth.token) {
        Taro.redirectTo({ url: '/pages/login/index' })
        return
      }
      if (loadingMore.value) return
      loadingMore.value = true
      if (reset) {
        page.value = 1
        hasMore.value = true
      } else if (!hasMore.value) {
        loadingMore.value = false
        return
      }
      const q = queryRange.value
      try {
        const currentPage = page.value
        const [accounts, accountStats] = await Promise.all([
          listStoreAccounts(auth.token, {
            store_id: auth.storeId || undefined,
            start_date: q.start_date,
            end_date: q.end_date,
            member_keyword: memberKeyword.value.trim() || undefined,
            payment_status: paymentFilter.value || undefined,
            page: currentPage,
            page_size: pageSize
          }),
          getStoreAccountStats(auth.token, {
            store_id: auth.storeId || undefined,
            start_date: q.start_date,
            end_date: q.end_date
          })
        ])
        const filledAccounts = await fillAccountItems(accounts)
        list.value = reset ? filledAccounts : [...list.value, ...filledAccounts]
        hasMore.value = accounts.length >= pageSize
        if (hasMore.value) page.value = currentPage + 1
        stats.value = accountStats
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
      } finally {
        loadingMore.value = false
      }
    }
    
    
    
    async function fillAccountItems(accounts: StoreAccount[]) {
      if (!auth.token) return accounts
      return Promise.all(accounts.map(async (item) => {
        if (Array.isArray(item.items) && item.items.length) return item
        try {
          const detail = await getStoreAccountDetail(auth.token, item.id)
          return {
            ...item,
            items: detail.items || item.items || [],
            consumables: detail.consumables || item.consumables || [],
            is_canceled: detail.is_canceled ?? item.is_canceled,
            source_type: detail.source_type ?? item.source_type,
            source_id: detail.source_id ?? item.source_id,
            is_read_only: detail.is_read_only ?? item.is_read_only,
            can_edit: detail.can_edit ?? item.can_edit,
            can_bind_consumables: detail.can_bind_consumables ?? item.can_bind_consumables,
            can_cancel: detail.can_cancel ?? item.can_cancel
          }
        } catch {
          return item
        }
      }))
    }
    
    
    
    function openDetail(id: number) {
      Taro.navigateTo({ url: `/pages/accounting/detail?id=${id}` })
    }



    function pxToRpx(px: number) {
      try {
        const info = Taro.getSystemInfoSync()
        return px * 750 / Number(info.windowWidth || 375)
      } catch {
        return px * 2
      }
    }



    function closeSwipe() {
      swipeOpenId.value = 0
      swipeMovingId.value = 0
      swipeDeltaX.value = 0
      swipeStartOpen.value = false
    }



    function rowTranslateX(item: StoreAccount) {
      if (!canCancelAccount(item)) return ''
      if (swipeMovingId.value === item.id) {
        const x = Math.max(-cancelActionWidth, Math.min(0, swipeDeltaX.value))
        return `transform: translateX(${x}rpx); transition: none;`
      }
      if (swipeOpenId.value === item.id) return `transform: translateX(-${cancelActionWidth}rpx);`
      return ''
    }



    function onRowTouchStart(item: StoreAccount, e: any) {
      if (cancelingId.value || !canCancelAccount(item)) return
      const touch = e?.touches?.[0]
      if (!touch) return
      swipeStartX.value = Number(touch.pageX || 0)
      swipeStartY.value = Number(touch.pageY || 0)
      swipeStartOpen.value = swipeOpenId.value === item.id
      if (swipeOpenId.value && swipeOpenId.value !== item.id) swipeOpenId.value = 0
      swipeMovingId.value = item.id
      swipeDeltaX.value = swipeStartOpen.value ? -cancelActionWidth : 0
    }



    function onRowTouchMove(item: StoreAccount, e: any) {
      if (!canCancelAccount(item)) return
      if (swipeMovingId.value !== item.id) return
      const touch = e?.touches?.[0]
      if (!touch) return
      const dx = pxToRpx(Number(touch.pageX || 0) - swipeStartX.value)
      const dy = pxToRpx(Number(touch.pageY || 0) - swipeStartY.value)
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
      if (Math.abs(dx) <= Math.abs(dy)) return
      e?.stopPropagation?.()
      const base = swipeStartOpen.value ? -cancelActionWidth : 0
      swipeDeltaX.value = Math.max(-cancelActionWidth, Math.min(0, base + dx))
    }



    function onRowTouchEnd(item: StoreAccount) {
      if (!canCancelAccount(item)) return
      if (swipeMovingId.value !== item.id) return
      const shouldOpen = swipeDeltaX.value <= -cancelActionWidth * 0.45
      swipeOpenId.value = shouldOpen ? item.id : 0
      swipeMovingId.value = 0
      swipeDeltaX.value = 0
      swipeStartOpen.value = false
    }



    function handleRowTap(item: StoreAccount) {
      if (swipeOpenId.value) {
        closeSwipe()
        return
      }
      openDetail(item.id)
    }



    function confirmCancelAccount(item: StoreAccount) {
      if (cancelingId.value || !canCancelAccount(item)) return
      Taro.showModal({
        title: '确认作废',
        content: '作废后账单不再计入销售额，系统商品库存将自动恢复。确定继续吗？',
        confirmText: '作废',
        confirmColor: '#dc2626',
        success: (res) => {
          if (res.confirm) void cancelAccount(item)
        }
      })
    }



    async function cancelAccount(item: StoreAccount) {
      if (!auth.token || cancelingId.value || !canCancelAccount(item)) return
      cancelingId.value = item.id
      try {
        await cancelStoreAccount(auth.token, item.id, { remark: '小程序作废账单' })
        Taro.showToast({ title: '已作废', icon: 'success' })
        closeSwipe()
        await refresh(true)
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '作废失败', icon: 'none' })
      } finally {
        cancelingId.value = 0
      }
    }
    
    
    
    function openMetaSheet(item: StoreAccount) {
      if (isReadOnlyAccount(item)) {
        Taro.showToast({ title: 'B2B账单仅供查看', icon: 'none' })
        return
      }
      if (isCanceledAccount(item)) {
        Taro.showToast({ title: '已作废订单不可编辑', icon: 'none' })
        return
      }
      if (!canOpenMetaSheet(item)) {
        Taro.showToast({ title: hasConsumables(item) ? '已绑定耗材，不能修改' : '该记录已超过支付状态可修改时间', icon: 'none' })
        return
      }
      editingAccount.value = item
      paymentStatus.value = paymentStatusValue(item)
      editIsErrandOrder.value = Number(item.is_errand_order || 0) === 1 ? 1 : 0
      editErrandFee.value = String(item.errand_fee ?? '')
      editIsRounding.value = Number(item.round_amount || 0) > 0 ? 1 : 0
      editRoundingAmount.value = String(item.round_amount ?? '')
      metaSheetOpen.value = true
    }
    
    
    
    function closeMetaSheet() {
      if (savingMeta.value) return
      metaSheetOpen.value = false
    }



    function goEditAccountProducts(item?: StoreAccount) {
      const target = item || editingAccount.value
      if (isReadOnlyAccount(target)) {
        Taro.showToast({ title: 'B2B账单仅供查看', icon: 'none' })
        return
      }
      if (isCanceledAccount(target)) {
        Taro.showToast({ title: '已作废订单不可编辑', icon: 'none' })
        return
      }
      const id = Number(target?.id || 0)
      if (!id) return
      metaSheetOpen.value = false
      Taro.navigateTo({ url: `/pages/accounting/create?mode=edit&id=${id}` })
    }
    
    
    
    async function saveAccountMeta() {
      if (!auth.token || !editingAccount.value?.id || savingMeta.value) return
      if (isReadOnlyAccount(editingAccount.value)) {
        Taro.showToast({ title: 'B2B账单仅供查看', icon: 'none' })
        metaSheetOpen.value = false
        return
      }
      if (isCanceledAccount(editingAccount.value)) {
        Taro.showToast({ title: '已作废订单不可编辑', icon: 'none' })
        metaSheetOpen.value = false
        return
      }
      savingMeta.value = true
      try {
        await updateStoreAccount(auth.token, editingAccount.value.id, {
          payment_status: paymentStatus.value,
          is_errand_order: editIsErrandOrder.value,
          errand_fee: editIsErrandOrder.value === 1 ? Number(editErrandFee.value || 0) : 0,
          round_amount: editIsRounding.value === 1 ? Number(editRoundingAmount.value || 0) : 0
        })
        Taro.showToast({ title: '已保存', icon: 'success' })
        metaSheetOpen.value = false
        await refresh()
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '保存失败', icon: 'none' })
      } finally {
        savingMeta.value = false
      }
    }
    
    
    
    function onEditErrandFeeInput(e: any) {
      editErrandFee.value = moneyInputValue(e)
    }
    
    
    
    function onEditRoundingAmountInput(e: any) {
      editRoundingAmount.value = moneyInputValue(e)
    }
    
    
    
    function onPaymentStatusSwitch(e: any) {
      paymentStatus.value = e?.detail?.value ? 1 : 2
    }
    
    
    
    function onErrandSwitch(e: any) {
      editIsErrandOrder.value = e?.detail?.value ? 1 : 0
      if (editIsErrandOrder.value === 0) editErrandFee.value = ''
    }
    
    
    
    function onRoundingSwitch(e: any) {
      editIsRounding.value = e?.detail?.value ? 1 : 0
      if (editIsRounding.value === 0) editRoundingAmount.value = ''
    }
    
    
    
    function moneyInputValue(e: any) {
      const raw = String(e?.detail?.value || '').replace(/[^\d.]/g, '')
      const [head, ...tail] = raw.split('.')
      return tail.length ? `${head}.${tail.join('').slice(0, 2)}` : head
    }
    
    
    
    function goCreate(mode: 'quick' | 'custom') {
      Taro.navigateTo({ url: `/pages/accounting/create?mode=${mode}` })
    }
    
    
    
    function makeConsumableLine(kind: 'product' | 'custom' = 'product') {
      return { kind, consumable_product_id: 0, quantity: '1', name: '', amount: '' }
    }
    
    
    
    async function openConsumableSheet(item: StoreAccount) {
      if (isReadOnlyAccount(item)) {
        Taro.showToast({ title: 'B2B账单仅供查看', icon: 'none' })
        return
      }
      if (isCanceledAccount(item)) {
        Taro.showToast({ title: '已作废订单不可编辑', icon: 'none' })
        return
      }
      if (hasConsumables(item)) {
        Taro.showToast({ title: '已绑定耗材，不能再次绑定', icon: 'none' })
        return
      }
      consumableTarget.value = item
      consumableLines.value = [makeConsumableLine()]
      await loadConsumableProducts()
      try {
        if (auth.token) {
          const full = await getStoreAccountDetail(auth.token, item.id)
          if (isCanceledAccount(full)) {
            Taro.showToast({ title: '已作废订单不可编辑', icon: 'none' })
            return
          }
          if (full.consumables?.length) {
            consumableLines.value = full.consumables.map((c) => {
              const pid = Number(c.product_id || 0)
              const inCatalog = pid > 0 && consumableProductMap.value.has(pid)
              return {
                kind: inCatalog ? 'product' : 'custom',
                consumable_product_id: inCatalog ? pid : 0,
                quantity: String(c.quantity || 1),
                name: inCatalog ? '' : String(c.product_name || ''),
                amount: inCatalog ? '' : String(c.amount || '')
              }
            })
          }
        }
      } catch {
        // 空白表单仍允许绑定
      }
      consumableSheetOpen.value = true
    }
    
    
    
    function closeConsumableSheet() {
      if (consumableSaving.value) return
      consumableSheetOpen.value = false
    }
    
    
    
    function addConsumableLine() {
      consumableLines.value.push(makeConsumableLine())
    }
    
    
    
    function removeConsumableLine(idx: number) {
      consumableLines.value.splice(idx, 1)
      if (!consumableLines.value.length) consumableLines.value.push(makeConsumableLine())
    }
    
    
    
    function setConsumableKind(idx: number, kind: 'product' | 'custom') {
      consumableLines.value[idx] = makeConsumableLine(kind)
    }
    
    
    
    function consumableProductIndex(line: { consumable_product_id: number }) {
      const i = consumableProductOptions.value.findIndex((o) => o.value === Number(line.consumable_product_id || 0))
      return i >= 0 ? i : 0
    }
    
    
    
    function consumableProductLabel(line: { consumable_product_id: number }) {
      const i = consumableProductIndex(line)
      return consumableProductOptions.value[i]?.label || '请选择消耗品'
    }
    
    
    
    function onConsumableProductChange(idx: number, e: any) {
      const i = Number(e?.detail?.value ?? 0)
      consumableLines.value[idx].consumable_product_id = Number(consumableProductOptions.value[i]?.value || 0)
    }
    
    
    
    function onConsumableQtyInput(idx: number, e: any) {
      consumableLines.value[idx].quantity = moneyInputValue(e)
    }
    
    
    
    function onConsumableNameInput(idx: number, e: any) {
      consumableLines.value[idx].name = String(e?.detail?.value || '')
    }
    
    
    
    function onConsumableAmountInput(idx: number, e: any) {
      consumableLines.value[idx].amount = moneyInputValue(e)
    }
    
    
    
    async function saveConsumables() {
      if (!auth.token || !consumableTarget.value || consumableSaving.value) return
      if (isReadOnlyAccount(consumableTarget.value)) {
        Taro.showToast({ title: 'B2B账单仅供查看', icon: 'none' })
        consumableSheetOpen.value = false
        return
      }
      if (isCanceledAccount(consumableTarget.value)) {
        Taro.showToast({ title: '已作废订单不可编辑', icon: 'none' })
        consumableSheetOpen.value = false
        return
      }
      const consumables: Array<Record<string, unknown>> = []
      for (const line of consumableLines.value) {
        if (line.kind === 'custom') {
          const name = line.name.trim()
          const amount = Number(line.amount || 0)
          if (!name || !(amount > 0)) {
            Taro.showToast({ title: '请填写自定义消耗品名称和金额', icon: 'none' })
            return
          }
          consumables.push({ product_id: 0, product_name: name, quantity: 1, amount })
          continue
        }
        const productID = Number(line.consumable_product_id || 0)
        const quantity = Number(line.quantity || 0)
        if (productID > 0 && quantity > 0) consumables.push({ consumable_product_id: productID, quantity })
      }
      if (!consumables.length) {
        Taro.showToast({ title: '请至少选择一条消耗品', icon: 'none' })
        return
      }
      consumableSaving.value = true
      try {
        await bindStoreAccountConsumables(auth.token, consumableTarget.value.id, { consumables })
        Taro.showToast({ title: '已保存', icon: 'success' })
        consumableSheetOpen.value = false
        await refresh()
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '保存失败', icon: 'none' })
      } finally {
        consumableSaving.value = false
      }
    }
    
    
    
    useDidShow(() => refresh(true))
    
    
    useDidShow(() => {
      void Promise.all([loadChannelDict(), loadMembers(), loadConsumableProducts()])
    })
    
    
    
    usePullDownRefresh(async () => {
      refreshing.value = true
      await refresh(true)
      refreshing.value = false
      Taro.stopPullDownRefresh()
    })
    
    
    
    useReachBottom(() => {
      void refresh(false)
    })

    return {
      Picker,
      Switch,
      Taro,
      useDidShow,
      usePullDownRefresh,
      useReachBottom,
      computed,
      ref,
      elemeIcon,
      jdIcon,
      meituanIcon,
      miniappIcon,
      storeIcon,
      taobaoIcon,
      wechatIcon,
      LucideIcon,
      getStoreAccountStats,
      bindStoreAccountConsumables,
      getStoreAccountDetail,
      listDictDataByTypeCode,
      listMembers,
      listStoreAccounts,
      listStoreAccountConsumableProducts,
      updateStoreAccount,
      cancelStoreAccount,
      useAuthStore,
      auth,
      list,
      stats,
      channelDict,
      channelOptions,
      members,
      today,
      accountDate,
      metaSheetOpen,
      editingAccount,
      paymentStatus,
      editIsErrandOrder,
      editErrandFee,
      editIsRounding,
      editRoundingAmount,
      paymentFilter,
      memberKeyword,
      filterSheetOpen,
      savingMeta,
      consumableSheetOpen,
      consumableSaving,
      consumableTarget,
      consumableProducts,
      consumableLines,
      page,
      pageSize,
      hasMore,
      loadingMore,
      refreshing,
      swipeOpenId,
      swipeMovingId,
      swipeStartX,
      swipeStartY,
      swipeStartOpen,
      swipeDeltaX,
      cancelingId,
      cancelActionWidth,
      paymentFilterOptions,
      queryRange,
      consumableProductOptions,
      consumableProductMap,
      consumableBindTotal,
      paymentFilterIndex,
      paymentFilterLabel,
      activeFilterCount,
      totalTurnoverAmount,
      pad,
      businessDate,
      businessDateStr,
      onAccountDateChange,
      formatMoney,
      formatQty,
      formatDateTime,
      accountItems,
      displayAccountAmount,
      mapDict,
      channelLabel,
      channelText,
      platformInfo,
      platformIcon,
      platformLabel,
      orderDisplayNo,
      rowDisplayNo,
      operatorLabel,
      isOnlinePaidChannel,
      paymentStatusValue,
      paymentStatusLabel,
      isCanceledAccount,
      isReadOnlyAccount,
      canCancelAccount,
      canEditAccount,
      accountCreatedAt,
      canEditPaymentStatus,
      hasConsumables,
      canBindConsumables,
      canOpenMetaSheet,
      memberLabel,
      accountMemberLabel,
      onMemberKeywordInput,
      onPaymentFilterChange,
      openFilterSheet,
      closeFilterSheet,
      resetFilters,
      applyFilters,
      loadChannelDict,
      loadMembers,
      loadConsumableProducts,
      refresh,
      fillAccountItems,
      openDetail,
      pxToRpx,
      closeSwipe,
      rowTranslateX,
      onRowTouchStart,
      onRowTouchMove,
      onRowTouchEnd,
      handleRowTap,
      confirmCancelAccount,
      cancelAccount,
      openMetaSheet,
      closeMetaSheet,
      goEditAccountProducts,
      saveAccountMeta,
      onEditErrandFeeInput,
      onEditRoundingAmountInput,
      onPaymentStatusSwitch,
      onErrandSwitch,
      onRoundingSwitch,
      moneyInputValue,
      goCreate,
      makeConsumableLine,
      openConsumableSheet,
      closeConsumableSheet,
      addConsumableLine,
      removeConsumableLine,
      setConsumableKind,
      consumableProductIndex,
      consumableProductLabel,
      onConsumableProductChange,
      onConsumableQtyInput,
      onConsumableNameInput,
      onConsumableAmountInput,
      saveConsumables,
    }
  }
}
