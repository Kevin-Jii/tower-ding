import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'


import { computed, ref } from 'vue'


import LucideIcon from '../../components/LucideIcon.vue'


import {
  getStoreAccountStats,
  listAllInventories,
  listStoreAccounts,
  listStoreReturns,
  type StoreAccount,
  type StoreReturn
} from '../../services/api'


import { useAuthStore } from '../../stores/auth'
import { formatMoney } from '../../shared/format'


import type { LucideIconName } from '../../utils/lucide-icons'



type HomeAction = {
  title: string
  icon: LucideIconName
  tone: string
  color: string
  url: string
}



type HomeTodo = {
  text: string
  icon: LucideIconName
  tone: string
  color: string
  url: string
}

export default {
  components: { LucideIcon },
  setup() {
    const auth = useAuthStore()
    
    
    const today = businessDateStr()
    
    
    const todayAmount = ref(0)
    
    
    const totalTurnoverAmount = ref(0)
    
    
    const unpaidCount = ref(0)
    
    
    const lowStockCount = ref(0)
    
    
    const pendingReturnCount = ref(0)
    
    
    
    const userName = computed(() => auth.user?.nickname || auth.user?.username || '井科伟')
    
    
    const initials = computed(() => {
      const text = auth.user?.nickname || auth.user?.username || auth.user?.phone || '井'
      return String(text).slice(0, 1).toUpperCase()
    })
    
    
    const greeting = computed(() => {
      const h = new Date().getHours()
      if (h < 11) return '早上好'
      if (h < 18) return '下午好'
      return '晚上好'
    })
    
    
    
    const quickActions: HomeAction[] = [
      { title: '会员存酒', icon: 'bottle-wine', tone: 'sky', color: '#2f80ed', url: '/pages/member-wine/index' },
      { title: '快速记账', icon: 'wallet-cards', tone: 'blue', color: '#287fe5', url: '/pages/accounting/create?mode=quick' },
      { title: '库存查询', icon: 'package-search', tone: 'violet', color: '#6b5cff', url: '/pages/inventory/stock-list' },
      { title: '入库出库', icon: 'arrow-down-up', tone: 'cyan', color: '#2f80ed', url: '/pages/inventory/form' }
    ]
    
    
    
    const businessActions: HomeAction[] = [
      { title: '会员管理', icon: 'users-round', tone: 'indigo', color: '#3f7df4', url: '/pages/member/index' },
      { title: 'B2B供货', icon: 'warehouse', tone: 'green', color: '#35a853', url: '/pages/b2b/supply-orders' },
      { title: '门店返厂', icon: 'shopping-bag', tone: 'orange', color: '#ff8b2c', url: '/pages/store-return/index' },
      { title: '报损自用', icon: 'wallet', tone: 'purple', color: '#7c5ce8', url: '/pages/inventory-loss/index' }
    ]
    
    
    
    const todos = computed<HomeTodo[]>(() => [
      {
        text: unpaidCount.value > 0 ? `有 ${unpaidCount.value} 笔未支付账单` : '暂无未支付账单',
        icon: 'file-text',
        tone: 'blue',
        color: '#287fe5',
        url: '/pages/accounting/unpaid'
      },
      {
        text: lowStockCount.value > 0 ? `有 ${lowStockCount.value} 个商品库存偏低` : '暂无库存预警',
        icon: 'triangle-alert',
        tone: 'orange',
        color: '#ff9d2d',
        url: '/pages/inventory/stock-list'
      },
      {
        text: pendingReturnCount.value > 0 ? `今日有 ${pendingReturnCount.value} 条返厂记录` : '今日暂无返厂记录',
        icon: 'clock',
        tone: 'blue',
        color: '#287fe5',
        url: '/pages/store-return/index'
      }
    ])
    
    
    
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
    
    
    
    function isLowStock(row: any) {
      const qty = Number(row?.quantity || 0)
      return Number.isFinite(qty) && qty < 3
    }
    
    
    
    function countUnpaid(rows: StoreAccount[]) {
      return rows.filter((row) => Number(row.payment_status || 1) === 2).length
    }
    
    
    
    async function refresh() {
      if (!auth.token) {
        Taro.redirectTo({ url: '/pages/login/index' })
        return
      }
      const storeID = auth.storeId || undefined
      try {
        const [accountStats, unpaidRows, inventories, returnRows] = await Promise.all([
          getStoreAccountStats(auth.token, { store_id: storeID, start_date: today, end_date: today }),
          listStoreAccounts(auth.token, {
            store_id: storeID,
            payment_status: 2,
            page: 1,
            page_size: 100
          }),
          listAllInventories(auth.token, { store_id: storeID }),
          listStoreReturns(auth.token, { store_id: storeID, start_date: today, end_date: today, page: 1, page_size: 100 })
        ])
        todayAmount.value = Number(accountStats?.gross_total_amount || 0)
        totalTurnoverAmount.value = Number(accountStats?.total_turnover_amount || 0)
        unpaidCount.value = countUnpaid(unpaidRows)
        lowStockCount.value = inventories.filter(isLowStock).length
        pendingReturnCount.value = (returnRows as StoreReturn[]).length
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '首页数据加载失败', icon: 'none' })
      }
    }
    
    
    
    function go(url: string) {
      if (!auth.token) {
        Taro.redirectTo({ url: '/pages/login/index' })
        return
      }
      Taro.navigateTo({ url })
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
      LucideIcon,
      getStoreAccountStats,
      listAllInventories,
      listStoreAccounts,
      listStoreReturns,
      useAuthStore,
      auth,
      today,
      todayAmount,
      totalTurnoverAmount,
      unpaidCount,
      lowStockCount,
      pendingReturnCount,
      userName,
      initials,
      greeting,
      quickActions,
      businessActions,
      todos,
      pad,
      businessDate,
      businessDateStr,
      formatMoney,
      isLowStock,
      countUnpaid,
      refresh,
      go,
    }
  }
}
