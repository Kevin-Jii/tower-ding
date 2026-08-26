import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { computed, ref } from 'vue'

import {
  getStoreAccountDetail,
  listDictDataByTypeCode,
  type DictData,
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
    const channelDict = ref<Record<string, string>>({})

    const operatorName = computed(() => {
      const operator = detail.value?.operator
      return operator?.nickname || operator?.username || operator?.phone || '-'
    })

    const displayTotalAmount = computed(() => {
      const item = detail.value
      if (!item) return 0
      return item.gross_total_amount ?? item.total_amount ?? item.amount
    })

    const itemCostAmount = computed(() => {
      return (detail.value?.items || []).reduce((sum, item: any) => {
        const direct = Number(item.cost_amount ?? item.cost_total ?? 0)
        if (direct > 0) return sum + direct
        const unitCost = Number(item.cost_price ?? item.unit_cost ?? 0)
        const qty = Number(item.quantity || 0)
        return sum + unitCost * qty
      }, 0)
    })

    const giftWineText = computed(() => {
      const item = detail.value
      if (Number(item?.is_gift_wine || 0) !== 1) return '否'
      const name = String(item?.gift_wine_product_name || '').trim() || (item?.gift_wine_product_id ? `商品 #${item.gift_wine_product_id}` : '赠酒商品')
      return `${name} ${formatQty(item?.gift_wine_quantity)} ${item?.gift_wine_unit || ''}`.trim()
    })

    function formatMoney(v: any) {
      const n = Number(v || 0)
      return Number.isFinite(n) ? n.toFixed(2) : '0.00'
    }

    function formatQty(v: any) {
      const n = Number(v || 0)
      if (!Number.isFinite(n)) return '--'
      return Number.isInteger(n) ? String(n) : n.toFixed(2)
    }

    function formatDate(v?: string) {
      if (!v) return '-'
      return String(v).slice(0, 10)
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
      if (!code) return '-'
      return channelDict.value[code] || code
    }

    async function loadChannelDict() {
      if (!auth.token) return
      try {
        const rows = await listDictDataByTypeCode(auth.token, 'sales_channel')
        channelDict.value = mapDict(rows)
      } catch {
        channelDict.value = {}
      }
    }

    async function refresh() {
      if (!auth.token || !id) return
      try {
        const data = await getStoreAccountDetail(auth.token, id)
        detail.value = data
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
      }
    }

    useDidShow(() => {
      void Promise.all([refresh(), loadChannelDict()])
    })

    return {
      Taro,
      useDidShow,
      useRouter,
      computed,
      ref,
      getStoreAccountDetail,
      listDictDataByTypeCode,
      useAuthStore,
      auth,
      router,
      id,
      detail,
      channelDict,
      operatorName,
      displayTotalAmount,
      itemCostAmount,
      giftWineText,
      formatMoney,
      formatQty,
      formatDate,
      formatDateTime,
      mapDict,
      channelLabel,
      loadChannelDict,
      refresh,
    }
  }
}
