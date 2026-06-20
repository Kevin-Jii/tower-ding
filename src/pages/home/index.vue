<template>
  <view class="page">
    <view class="home">
      <view class="hero">
        <view class="heroText">
          <view class="greeting">{{ greeting }}，{{ userName }}</view>
          <view class="brand">Tower 中台</view>
        </view>
        <view class="avatarBtn" @tap="go('/pages/mine/index')">{{ initials }}</view>
      </view>

      <view class="panel overviewPanel">
        <view class="panelTitle">经营数据概览</view>
        <view class="overviewGrid">
          <view class="overviewItem" @tap="go('/pages/accounting/index')">
            <view class="overviewMain">
              <view>
                <view class="metricLabel">今日销售额</view>
                <view class="metricValue">¥{{ formatMoney(todayAmount) }}</view>
              </view>
              <view class="metricIcon metricIcon--sales">
                <LucideIcon name="chart-column-increasing" color="#287fe5" :size="15" />
              </view>
            </view>
          </view>

          <view class="overviewItem" @tap="go('/pages/accounting/index')">
            <view class="overviewMain">
              <view>
                <view class="metricLabel">待支付订单</view>
                <view class="metricValue">{{ unpaidCount }}</view>
              </view>
              <view class="metricIcon metricIcon--payment">
                <LucideIcon name="receipt-text" color="#697789" :size="15" />
              </view>
            </view>
          </view>

          <view class="overviewItem" @tap="go('/pages/inventory/stock-list')">
            <view class="overviewMain">
              <view>
                <view class="metricLabel warningLabel">
                  库存预警
                  <text v-if="lowStockCount > 0" class="warningDot" />
                </view>
                <view class="metricValue metricValue--danger">{{ lowStockCount }}</view>
              </view>
              <view class="metricIcon metricIcon--stock">
                <LucideIcon name="bell-ring" color="#ff3f48" :size="15" />
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="panel">
        <view class="panelTitle">快捷操作</view>
        <view class="actionGrid">
          <view v-for="item in quickActions" :key="item.title" class="actionCard" @tap="go(item.url)">
            <view :class="['actionIcon', `actionIcon--${item.tone}`]">
              <LucideIcon :name="item.icon" :color="item.color" :size="30" :stroke-width="1.75" />
            </view>
            <view class="actionTitle">{{ item.title }}</view>
          </view>
        </view>
      </view>

      <view class="panel">
        <view class="panelHead">
          <view class="panelTitle">业务管理</view>
          <view class="moreLink" @tap="go('/pages/home/more')">
            查看更多
            <text class="moreArrow">›</text>
          </view>
        </view>
        <view class="actionGrid">
          <view v-for="item in businessActions" :key="item.title" class="actionCard" @tap="go(item.url)">
            <view :class="['actionIcon', `actionIcon--${item.tone}`]">
              <LucideIcon :name="item.icon" :color="item.color" :size="30" :stroke-width="1.75" />
            </view>
            <view class="actionTitle">{{ item.title }}</view>
          </view>
        </view>
      </view>

      <view class="panel todoPanel">
        <view class="panelTitle">待办提醒</view>
        <view class="todoList">
          <view v-for="todo in todos" :key="todo.text" class="todoRow" @tap="go(todo.url)">
            <view :class="['todoIcon', `todoIcon--${todo.tone}`]">
              <LucideIcon :name="todo.icon" :color="todo.color" :size="22" />
            </view>
            <view class="todoText">{{ todo.text }}</view>
            <view class="chevron">›</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
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
import type { LucideIconName } from '../../utils/lucide-icons'
import './index.less'

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

const auth = useAuthStore()
const today = businessDateStr()
const todayAmount = ref(0)
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
    url: '/pages/accounting/index'
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

function formatMoney(v: any) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
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
        start_date: today,
        end_date: today,
        payment_status: 2,
        page: 1,
        page_size: 100
      }),
      listAllInventories(auth.token, { store_id: storeID }),
      listStoreReturns(auth.token, { store_id: storeID, start_date: today, end_date: today, page: 1, page_size: 100 })
    ])
    todayAmount.value = Number(accountStats?.total_amount || 0)
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
</script>
